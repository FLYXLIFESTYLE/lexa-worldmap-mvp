# Score Conventions (LEXA)

This project uses **three different kinds of scores**, and they serve different jobs.

## 1) Luxury (quality) scores

- **`luxury_score_base` (0.0 → 1.0)**: offline/open-only “how premium is this?” score for POIs and Providers.
- **`luxury_score_verified` (0.0 → 1.0)**: optional “verified/enriched” score when we have extra verification (e.g., compliant Google-derived signals).

**Important:** These are **not** “theme match” scores. A place can be ultra-luxury but terrible for romance (too loud, too public).

## 2) Theme-fit scores (the differentiator)

Theme-fit is always **0.0 → 1.0** and lives primarily on relationships in Neo4j:

- `(:POI|Provider)-[:MATCHES_THEME { theme_fit, confidence, evidence }]->(:theme_category)`

Examples:
- A discreet sunset viewpoint could have `theme_fit=0.92` for “Romance & Intimacy”.
- The same viewpoint might have `theme_fit=0.20` for “Celebration & Milestones”.

## 3) Confidence scores (trustworthiness)

- **`confidence_score` (0.0 → 1.0)**: record-level confidence (freshness, completeness, agreement across sources, risk flags).
- **`relationship.confidence` (0.0 → 1.0)**: edge-level confidence in Neo4j (“how sure are we this relationship is true?”).

## Score evidence (required)

All scoring systems must provide **traceability**:

- `score_evidence`: JSON that contains *which rules/signals fired*, which sources contributed, and timestamps.

This is what lets captains quickly curate and helps the system stay honest.


