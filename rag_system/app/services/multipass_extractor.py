"""
LEXA Brain v2 - Multipass Extraction Engine

Passes:
1) outline  - high-level structure, sections present, rough counts
2) expand   - detailed fields (sub-experiences, venues, archetypes, script seed)
3) validate - dedupe, add confidence, citations, separate real vs estimated counts
4) report   - summarize warnings and validation notes

All passes target the JSON contract defined in `multipass_contract.py`.
"""

import json
import os
import re
from typing import Dict, Optional
from datetime import datetime
import anthropic

from app.services.multipass_contract import (
    empty_contract,
    describe_contract,
    ExtractionContract,
    PassResult,
    Package,
)
from app.services.lexa_extraction_context import get_lexa_extraction_context


class MultipassExtractor:
    def __init__(self):
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            print("WARNING: ANTHROPIC_API_KEY not set. Multipass extraction will fail.")
            self.client = None
        else:
            self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-sonnet-4-20250514"
        self.contract_brief = describe_contract()

    async def extract(self, text: str, source: Dict[str, object]) -> ExtractionContract:
        """
        Run the multipass pipeline on provided text.
        Returns an ExtractionContract with per-pass results and final_package.
        """
        if not self.client:
            raise RuntimeError("Anthropic client not initialized.")

        contract = empty_contract(source=source)

        outline = await self._run_pass(
            pass_name="outline",
            text=text,
            previous_package=None,
            extra_rules=[
                "Identify all sections present in the source.",
                "Estimate counts for sub_experiences/venues/archetypes if needed.",
                "Return strict JSON with package + findings + warnings + status.",
            ],
        )
        contract["passes"].append(outline)

        expand = await self._run_pass(
            pass_name="expand",
            text=text,
            previous_package=outline.get("package"),
            extra_rules=[
                "Expand to detailed fields; target 50+ sub_experiences when possible.",
                "Populate script_seed (no venue names in signature_highlights).",
                "Keep counts.real_extracted for source-backed items; estimated_potential for inferred volume.",
            ],
        )
        contract["passes"].append(expand)

        validate = await self._run_pass(
            pass_name="validate",
            text=text,
            previous_package=expand.get("package"),
            extra_rules=[
                "Deduplicate items; add confidence 0–1 per section.",
                "Attach citations for concrete claims; label generic items with `generic`: true in properties if added.",
                "Flag missing sections in warnings.",
            ],
        )
        contract["passes"].append(validate)

        # Final package is from validate pass (best effort)
        final_package: Package = validate.get("package", expand.get("package", outline.get("package", {})))  # type: ignore

        report = await self._run_pass(
            pass_name="report",
            text=text,
            previous_package=final_package,
            extra_rules=[
                "Summarize validation warnings and data quality gaps.",
                "Restate counts (real_extracted vs estimated_potential).",
                "No new content; only reflect/assess.",
            ],
        )
        contract["passes"].append(report)

        contract["final_package"] = final_package
        contract["report"] = {
            "warnings": report.get("warnings", []),
            "findings": report.get("findings", []),
            "generated_at": datetime.utcnow().isoformat(),
        }
        return contract

    async def extract_fast(self, text: str, source: Dict[str, object]) -> ExtractionContract:
        """
        Fast extraction mode (single LLM call).
        Designed for production request/response flows to avoid timeouts.
        """
        if not self.client:
            raise RuntimeError("Anthropic client not initialized.")

        contract = empty_contract(source=source)
        expand = await self._run_pass(
            pass_name="expand",
            text=text,
            previous_package=None,
            extra_rules=[
                # Goal: match direct Claude chat quality - investor-pitch level intelligence
                "Extract with INVESTOR-PITCH quality. Map every hotel/experience to LEXA's 9 emotions with intensities (1-10) and evidence.",
                "Match to LEXA's 5 client archetypes with match scores (0-100) and explain why each archetype would love it.",
                "Identify luxury travel trends and explain why they matter for LEXA's competitive positioning.",
                "Include conversation trigger examples for each major experience/hotel.",
                "Extract pricing intelligence and map to LEXA's tier/upsell system (Spark/Inspired/Connoisseur + Discovery/Blueprint/Concierge/White Glove).",
                "For articles about hotels/resorts: Extract room counts, opening dates, historical context, unique selling points, pricing if mentioned.",
                "Target 50+ sub_experiences for multi-day itineraries, each with emotional mapping.",
                "Prefer source-backed specificity over generic filler. If something is inferred, mark it `generic`: true and lower confidence.",
                "Do NOT extract or output personal data (names of individuals, emails, phone numbers, passport/ID numbers, booking references).",
                "Populate script_seed with emotional description and signature highlights (no venue names).",
                "Add per-item confidence 0–1 and include citations (snippets) for concrete claims.",
                "Fill counts.real_extracted for citation-backed items; counts.estimated_potential for inferred items.",
                # Claude-style outputs for Captain UI
                "In package.metadata, include `captain_summary` (Claude-style 'Perfect! I've extracted [X] hotels with [Y] emotional mappings...' with key insights and top emotions).",
                "In package.metadata, include `report_markdown` (full markdown: Overview → Emotional Mapping → Client Archetypes → Trends → Investor Insights → Neo4j Examples → Next Steps).",
                "In package.metadata, include `investor_insights` object with: market_validation, competitive_positioning, monetization_angle, demo_opportunities.",
                # Structured metadata
                "In package.metadata, include: experience_type, duration_days, route (array), primary_theme, luxury_tier, price_tier, and emotional_intensities_summary (top 3 emotions with scores).",
                # Provider insights
                "In package.metadata for provider pages, include: core_offerings (with emotional_drivers per offering), customer_pain_points (deduped), value_propositions, competitive_gaps_for_lexa.",
                "Return strict JSON with package + findings + warnings + status.",
            ],
        )
        contract["passes"].append(expand)
        contract["final_package"] = expand.get("package", {})  # type: ignore
        contract["report"] = {
            "warnings": expand.get("warnings", []),
            "findings": expand.get("findings", []),
            "generated_at": datetime.utcnow().isoformat(),
            "mode": "fast",
        }
        return contract

    async def _run_pass(
        self,
        pass_name: str,
        text: str,
        previous_package: Optional[Package],
        extra_rules: Optional[list],
    ) -> PassResult:
        """
        Run one pass and return a PassResult (with package + findings + warnings).
        """
        prompt = self._build_prompt(pass_name, text, previous_package, extra_rules or [])
        response = self.client.messages.create(  # type: ignore
            model=self.model,
            max_tokens=9000,
            temperature=0.3 if pass_name != "report" else 0.2,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = self._extract_response_text(response)
        parsed = self._parse_pass_response(response_text)
        parsed["pass_name"] = pass_name  # ensure present
        if "status" not in parsed:
            parsed["status"] = "ok"
        return parsed  # type: ignore

    def _build_prompt(
        self,
        pass_name: str,
        text: str,
        previous_package: Optional[Package],
        extra_rules: list,
    ) -> str:
        contract_desc = json.dumps(self.contract_brief, indent=2)
        prior = json.dumps(previous_package, indent=2) if previous_package else "{}"
        rules = "\n".join([f"- {r}" for r in extra_rules])

        # Use a larger text window for the single-pass (fast) expand mode.
        # This is critical for itinerary-style documents where details are spread across many pages.
        text_limit = 60000 if (pass_name == "expand" and not previous_package) else 18000

        # Inject LEXA's rich domain context for intelligence-level extraction
        lexa_context = get_lexa_extraction_context()

        return f"""You are LEXA's senior intelligence analyst. Extract with investor-pitch quality.

{lexa_context if pass_name == "expand" else ""}

---

Pass: {pass_name}

Contract (abbreviated):
{contract_desc}

Previous package (if any):
{prior}

Rules:
- Follow the contract keys exactly.
- For "expand" pass: Map emotions with intensities (1-10), match client archetypes, identify trends.
- For "validate" pass: Verify emotion intensities are evidence-backed, archetype matches are logical.
- Do not wrap JSON in markdown.
- Concrete claims need citations with confidence; otherwise mark as generic.
- Separate counts.real_extracted vs estimated_potential.
- {rules}

Source text (truncate if huge, but extract as much as possible):
{text[:text_limit]}
"""

    def _extract_response_text(self, response) -> str:
        if hasattr(response, "content") and response.content:
            first = response.content[0]
            if hasattr(first, "text"):
                return first.text
            if isinstance(first, dict) and "text" in first:
                return first["text"]
        return str(response)

    def _parse_pass_response(self, response_text: str) -> Dict:
        """
        Attempt to parse JSON from Claude response robustly.
        """
        json_str = None

        # Try code block
        m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", response_text, re.DOTALL)
        if m:
            json_str = m.group(1)

        if not json_str:
            m = re.search(r"\{[\s\S]*\}", response_text)
            if m:
                json_str = m.group(0)

        if not json_str:
            print(f"[multipass] Could not find JSON in response. First 500 chars:\n{response_text[:500]}")
            return {
                "status": "failed",
                "findings": [],
                "warnings": ["No JSON parsed"],
                "package": {},
            }

        try:
            data = json.loads(json_str)
            # If model returned final_package only, normalize to package
            if "package" not in data:
                data["package"] = data.get("final_package", {})

            # Claude sometimes returns the package fields at the top-level and leaves `package` empty.
            # Detect that and wrap the known package keys into `package`.
            package_keys = {
                "experience_overview",
                "emotional_map",
                "sub_experiences",
                "destinations",
                "venues",
                "service_providers",
                "client_archetypes",
                "script_seed",
                "relationships",
                "citations",
                "confidence",
                "counts",
                "metadata",
            }
            has_top_level_package_fields = any(k in data for k in package_keys)
            package_val = data.get("package")
            package_is_empty = not isinstance(package_val, dict) or len(package_val.keys()) == 0
            if has_top_level_package_fields and package_is_empty:
                wrapped = {}
                for k in list(data.keys()):
                    if k in package_keys:
                        wrapped[k] = data.pop(k)
                data["package"] = wrapped
            return data
        except json.JSONDecodeError as e:
            print(f"[multipass] JSON parsing error: {e}")
            print(f"[multipass] snippet: {json_str[:500]}")
            return {
                "status": "failed",
                "findings": [],
                "warnings": [f"JSON parse error: {e}"],
                "package": {},
            }


# Singleton helper
_mp_extractor = None


def get_multipass_extractor() -> MultipassExtractor:
    global _mp_extractor
    if _mp_extractor is None:
        _mp_extractor = MultipassExtractor()
    return _mp_extractor


async def run_multipass_extraction(text: str, source: Dict[str, object]) -> ExtractionContract:
    extractor = get_multipass_extractor()
    return await extractor.extract(text, source)


async def run_fast_extraction(text: str, source: Dict[str, object]) -> ExtractionContract:
    extractor = get_multipass_extractor()
    return await extractor.extract_fast(text, source)
