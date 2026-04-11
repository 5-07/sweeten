# sweeten

**AI-Resilient Health Planning for Diabetes Management**

Sweeten is a research-driven digital health system that investigates how hybrid AI and deterministic architectures can deliver safe, personalized diabetes support under real-world constraints — including API failure, data sparsity, and limited infrastructure.

Built on a **failure-first design philosophy**: the system must remain functional, interpretable, and clinically grounded even when AI is unavailable.

> Live: [sweeten-3aa2.vercel.app](https://sweeten-3aa2.vercel.app)
> Detailed Documentation: [sweeten_narrative.pdf](https://github.com/5-07/sweeten/blob/main/sweeten_narrative.pdf)
---

## Research Question

> Can a health-planning system remain reliable and personalized even when AI components fail — and can the outputs of deterministic and AI-assisted pipelines be meaningfully compared?

Sweeten was built as a system-level experiment to answer this question.

---

## Research Contributions

- A **hybrid AI + deterministic plan-generation pipeline** with automatic graceful degradation
- A **shared analytics layer** enabling direct, controlled comparison of AI vs. rule-based plan outputs
- **ADA guideline-to-code traceability** — clinical thresholds mapped explicitly to conditional logic
- **Structured handling of real-world data sparsity** — the system functions with partial weekly data
- A **reference architecture** for AI-resilient health applications in resource-constrained settings

---

## System Overview

```
User → Vitals Logging (calendar interface)
         ↓
   Weekly Aggregation + Analytics (planAnalytics.ts)
         ↓
   Plan Generation Pipeline
   ├── AI-Assisted: Gemini (gemini-2.5-flash), server-gated, rate-limited
   └── Deterministic Fallback: planEngine.ts, rule-based, always available
         ↓
   Weekly Health Plan (diet · activity · behavioral guidance)
```

---

## Software Architecture

### Frontend

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Firebase Auth |

The calendar-based vitals interface enforces structured, date-indexed data entry — mirroring real clinical logging behavior. UX design prioritizes low cognitive load and non-punitive framing.

```
src/app/
├── dashboard/     # Plan preview and generation entry point
├── vitals/        # Calendar-based vitals logging interface
├── plan/          # Displays latest generated weekly plan
└── api/           # Server-side routes (AI, usage, persistence)
```

### Data Model (Firestore)

Vitals stored per-user, per-day:

```
users/{uid}/vitals/{YYYY-MM-DD}
```

| Field | Type | Required |
|---|---|---|
| glucose | mg/dL | ✓ |
| insulin | units | optional |
| carbohydrates | grams | optional |
| weight | kg | optional |
| steps | count | optional |
| mood | enum | optional |
| notes | string | optional |

Schema intentionally supports **partial and sparse data** — a core aspect of the research problem.

### Plan Generation Pipeline

The core research contribution: a two-tier architecture where the deterministic engine is primary and AI is an optional enhancement.

#### Tier 1 — AI-Assisted Generation

- Implemented via server-side API routes (never client-side)
- Model: `gemini-2.5-flash`
- Enforced constraints: one plan per user per week, regeneration only on significant vitals change
- AI refines tone, sequencing, and phrasing — it does not modify safety-critical logic

```
src/app/api/plan/    # AI plan generation endpoint
src/app/api/usage/   # Quota tracking and enforcement
```

#### Tier 2 — Deterministic Fallback Engine

Automatically activates on AI failure (quota exhaustion, error, or unavailability).

```
src/lib/planEngine.ts
```

The fallback engine:
- Aggregates last 7 days of vitals
- Computes trends and summary statistics
- Applies ADA-grounded threshold classification
- Generates structured weekly plans using conditional templates
- Produces the **same output schema** as AI-generated plans

This ensures no hard system failure and continued personalization without AI.

### Shared Analytics Layer

```
src/lib/planAnalytics.ts
src/lib/planEngine.ts
```

Both pipelines consume identical computed metrics:

- Average glucose levels
- Week-over-week glucose trend (improving / stable / worsening)
- Activity level changes
- Data completeness indicators

This shared foundation enables **direct, controlled comparison** between AI-generated and deterministic plans — a key evaluation capability.

---

## Guideline-to-Logic Traceability

Every threshold in the plan engine maps to a published clinical guideline:

| ADA Guideline | Threshold / Trigger | Plan Focus |
|---|---|---|
| Postprandial glucose target | avg BG > 180 mg/dL | Glucose Stability Focus Week |
| Physical activity ≥150 min/wk | < 5,000 steps/day | Activity Rebuild Week |
| Medication consistency | insulin consistency score | Adherence & Routine Week |
| Glycemic variability management | high SD in BG readings | Dietary Carb Awareness Week |

---

## Evaluation Approach

Sweeten is evaluated as a **software research system**, not a medical treatment.

- **Robustness testing** — AI availability simulated as present, degraded, and absent
- **Behavioral consistency** — AI and deterministic plan outputs compared on structure and focus selection via shared analytics
- **Failure simulation** — missing data, extreme glucose values, zero-entry weeks
- **Qualitative analysis** — plan completeness, tone, and clinical alignment against ADA mappings

---

## Key Findings

Deterministic and AI-generated plans agreed on **plan focus selection** in the majority of tested cases, but diverged on tone, sequencing, and recommendation specificity. This suggests the AI layer's primary value is **communication quality**, not correctness — with implications for how hybrid health systems should be evaluated.

---

## Safety and Ethics

- Not a medical device; no diagnostic or clinical use
- No medication dosing logic
- AI never invoked client-side; all calls server-gated
- Weekly limits prevent over-generation
- Data privacy enforced via Firestore security rules
- No personal health data used for model training

---

## Why This Is Research

Sweeten explicitly studies:

- AI failure modes in health-adjacent software systems
- Hybrid intelligence architectures and graceful degradation strategies
- Ethical constraints on AI usage in healthcare contexts
- Clinical guideline operationalization in rule-based systems

The codebase is structured to support experimentation and analysis, not just deployment.

---

## Future Directions

- Clinician-validated evaluation of plan clinical alignment
- Localized guideline adaptation for South Asian metabolic profiles
- Formal ablation study: AI vs. deterministic plan quality metrics
- Integration with glucometers and consumer wearables
- Extension of this architecture to other chronic condition domains

---

## Stack

`Next.js 15` · `TypeScript` · `Tailwind CSS` · `Firebase Auth` · `Firestore` · `Google Gemini`

---

## Status

Solo-developed research system. Built for science fairs, research showcases, and academic expansion.

**Developer & Researcher:** Muzaina Munir

---

*Sweeten is a decision-support and habit-structuring tool. It is not a medical device and does not provide diagnostic or clinical advice.*
