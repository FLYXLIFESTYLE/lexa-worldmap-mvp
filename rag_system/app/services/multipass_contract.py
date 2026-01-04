"""
LEXA Brain v2 - Multipass Extraction Contract

This module defines the JSON-first contract we expect from the
ingestion/extraction pipeline. It keeps the shape explicit and
centralized so we can:
- Prompt Claude with a fixed schema
- Validate responses across passes (outline → expand → validate/dedupe → report)
- Persist canonical nodes/edges to Neo4j and audit trails to Postgres/pgvector
"""

from typing import Dict, List, Literal, TypedDict, Optional
from datetime import datetime


PassName = Literal["outline", "expand", "validate", "report"]


class Citation(TypedDict, total=False):
    source_span: str  # snippet or page/section reference
    evidence: str     # why this claim is supported
    confidence: float # 0–1


class EmotionSignal(TypedDict, total=False):
    name: str
    intensity: int             # 1–10
    evidence: str
    confidence: float          # 0–1
    citations: List[Citation]


class SubExperience(TypedDict, total=False):
    title: str
    category: str              # e.g., dining|wellness|excursion|ritual|moment
    description: str
    location: str
    duration: Optional[str]
    emotional_goal: Optional[str]
    highlights: List[str]
    citations: List[Citation]
    confidence: float          # 0–1


class Venue(TypedDict, total=False):
    name: str
    kind: str                  # restaurant|hotel|spa|beach|venue|provider
    location: str
    description: str
    coordinates: Optional[Dict[str, float]]
    tags: List[str]
    citations: List[Citation]
    confidence: float          # 0–1


class ClientArchetype(TypedDict, total=False):
    name: str
    description: str
    emotional_drivers: List[str]
    pain_points: List[str]
    budget_bracket: Optional[str]
    citations: List[Citation]
    confidence: float          # 0–1


class ScriptSeed(TypedDict, total=False):
    theme: str
    hook: str
    emotional_description: str
    signature_highlights: List[str]  # no venue names; moments only


class RelationshipEdge(TypedDict, total=False):
    start_node: str            # e.g., poi_id or archetype_id
    end_node: str
    type: str                  # e.g., HAS_THEME, LOCATED_IN, EVOKES_EMOTION
    properties: Dict[str, object]
    citations: List[Citation]
    confidence: float          # 0–1


class Counts(TypedDict, total=False):
    real_extracted: Dict[str, int]   # counts backed by citations
    estimated_potential: Dict[str, int]  # model-estimated potential coverage


class Package(TypedDict, total=False):
    experience_overview: str
    emotional_map: List[EmotionSignal]
    sub_experiences: List[SubExperience]
    destinations: List[Venue]
    venues: List[Venue]
    service_providers: List[Venue]
    client_archetypes: List[ClientArchetype]
    script_seed: ScriptSeed
    relationships: List[RelationshipEdge]
    citations: List[Citation]
    confidence: Dict[str, float]  # per-section confidence
    counts: Counts
    metadata: Dict[str, object]


class PassResult(TypedDict, total=False):
    pass_name: PassName
    status: Literal["ok", "needs_review", "failed"]
    findings: List[str]
    warnings: List[str]
    package: Package


class ExtractionContract(TypedDict, total=False):
    source: Dict[str, object]
    passes: List[PassResult]
    final_package: Package
    report: Dict[str, object]


def empty_package() -> Package:
    """Template for an empty package."""
    return Package(
        experience_overview="",
        emotional_map=[],
        sub_experiences=[],
        destinations=[],
        venues=[],
        service_providers=[],
        client_archetypes=[],
        script_seed={
            "theme": "",
            "hook": "",
            "emotional_description": "",
            "signature_highlights": [],
        },
        relationships=[],
        citations=[],
        confidence={},
        counts={
            "real_extracted": {},
            "estimated_potential": {},
        },
        metadata={"created_at": datetime.utcnow().isoformat()},
    )


def empty_contract(source: Dict[str, object]) -> ExtractionContract:
    """Return a baseline contract skeleton for a given source."""
    base_package = empty_package()
    return ExtractionContract(
        source=source,
        passes=[],
        final_package=base_package,
        report={
            "warnings": [],
            "validation": [],
            "notes": [],
        },
    )


def describe_contract() -> Dict[str, object]:
    """
    Human-readable description of the schema to include in prompts.
    This keeps the prompt small and consistent.
    """
    return {
        "passes": ["outline", "expand", "validate", "report"],
        "package_fields": {
            "experience_overview": "Short narrative of what this experience/product is.",
            "emotional_map": "List of emotions with intensity 1–10, evidence, citations, confidence.",
            "sub_experiences": "50+ possible moments/activities with descriptions, locations, highlights.",
            "destinations": "Cities/regions mentioned with context.",
            "venues": "Hotels/restaurants/spas/places mentioned.",
            "service_providers": "Vendors/operators/brands mentioned.",
            "client_archetypes": "Who this is for; drivers, pain points.",
            "script_seed": "Theme, hook, emotional description, signature highlights (no venue names).",
            "relationships": "Edges for Neo4j with properties and citations.",
            "citations": "Source-backed evidence snippets.",
            "counts": "real_extracted vs estimated_potential per section.",
            "confidence": "Per-section confidence 0–1.",
        },
        "rules": [
            "Return strict JSON, no markdown.",
            "Source-backed claims only; generic fallbacks must be labeled 'generic'.",
            "Keep/dump file decision handled by captains after review.",
            "No venue booking links in base package; upsells add those later.",
        ],
    }
