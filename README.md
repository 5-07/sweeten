# Sweeten  
**AI-Resilient Health Planning for Diabetes Management**

Sweeten is a research-driven health planning system that investigates how **hybrid AI and deterministic architectures** can maintain safe, personalized diabetes support under real-world constraints such as API limits, missing data, and system failure.

Rather than assuming constant AI availability, Sweeten is built around a **failure-first design philosophy**: the system must remain functional, interpretable, and useful even when AI services are unavailable.

---
## Table of Contents

- [Research Motivation](#research-motivation)
- [Research Contributions](#research-contributions)
- [System Overview](#system-overview)
- [Software Architecture](#software-architecture)
  - [Frontend](#frontend)
  - [Data Model (Firestore)](#data-model-firestore)
  - [Plan Generation Pipeline](#plan-generation-pipeline)
    - [AI-Assisted Generation](#ai-assisted-generation)
    - [Deterministic Fallback Engine](#deterministic-fallback-engine)
  - [Analytics Layer](#analytics-layer)
  - [Persistence and Safety Controls](#persistence-and-safety-controls)
- [Evaluation Approach](#evaluation-approach)
- [Why This Is Research](#why-this-is-research)
- [One-Sentence Pitch](#one-sentence-pitch)
- [Status](#status)


## Research Motivation

Many modern health applications rely entirely on large language models for personalization. In low-resource or high-constraint environments, this introduces critical failure modes:

- API quota exhaustion or downtime  
- Inconsistent outputs under sparse or incomplete data  
- Unsafe degradation when AI is unavailable  

**Research question:**

> Can a health-planning system remain reliable and personalized even when AI components fail?

Sweeten was designed as a system-level experiment to explore this question.

---

## Research Contributions

- A hybrid AI + deterministic plan-generation pipeline  
- Graceful degradation strategies for AI failure in healthcare contexts  
- Structured handling of real-world data sparsity  
- A reference architecture for AI-resilient health applications  

Sweeten is explicitly framed as a **decision-support system**, not a diagnostic or clinical tool.

---

## System Overview

User → Vitals Logging → Weekly Aggregation
↓
Plan Generation Pipeline
(AI-assisted → deterministic fallback)
↓
Weekly Health Plan


---

## Software Architecture

### Frontend

- Framework: Next.js 15 (App Router)
- Language: TypeScript
- Styling: Tailwind CSS
- Authentication: Firebase Auth (client-side)

The frontend is responsible for vitals entry, plan visualization, and enforcing UX-level constraints such as weekly plan limits.

src/app/
├── dashboard/ # Plan preview and generation entry point
├── vitals/ # Calendar-based vitals logging interface
├── plan/ # Displays latest generated weekly plan
└── api/ # Server-side routes (AI, usage, persistence)


The calendar-based vitals interface enforces **structured, date-indexed data entry**, mirroring real clinical logging behavior.

---

### Data Model (Firestore)

Vitals are stored per-user, per-day using a deterministic document structure:
users/{uid}/vitals/{YYYY-MM-DD}

- Required: glucose (mg/dL)
- Optional: insulin, carbohydrates, weight, blood pressure, steps, mood, notes

This schema intentionally supports **partial and sparse data**, a key aspect of the research problem.

---

### Plan Generation Pipeline

The core research contribution of Sweeten is its **two-tier plan generation architecture**.

#### AI-Assisted Generation

- Implemented via server-side API routes
- Uses Google Gemini (`gemini-2.5-flash`)
- Enforced constraints:
  - One plan per user per week
  - Regeneration only on significant vitals change
- AI is never invoked client-side

src/app/api/plan/ # AI plan generation endpoint
src/app/api/usage/ # AI usage and quota tracking


This design enables controlled experimentation with AI availability, cost, and reliability.

---

#### Deterministic Fallback Engine

When AI services fail (quota exhaustion, error, or unavailability), Sweeten automatically falls back to a **rule-based planning engine**.

src/lib/planEngine.ts

The fallback engine:
- Aggregates weekly vitals
- Computes trends and summary statistics
- Generates structured weekly plans using deterministic logic
- Produces the same output schema as AI-generated plans

This ensures:
- No hard system failure
- Predictable, explainable behavior
- Continued personalization without AI dependency

---

### Analytics Layer

Shared analytics logic is used by both AI and fallback pipelines.

src/lib/planAnalytics.ts
src/lib/planEngine.ts

Computed metrics include:
- Average glucose levels
- Week-over-week glucose trends
- Activity changes
- Data completeness indicators

This allows direct comparison between AI-generated and deterministic plans.

---

### Persistence and Safety Controls

- Generated plans are stored in Firestore
- Weekly limits prevent over-generation
- No real-time recommendations
- No medication dosage adjustments
- No emergency or diagnostic logic

Sweeten prioritizes **system safety and predictability** over real-time intervention.

---

## Evaluation Approach

Sweeten is evaluated as a **software system**, not a medical treatment.

- Robustness testing under AI availability and failure
- Behavioral consistency between AI and fallback outputs
- Failure simulations with missing or extreme data
- Qualitative analysis of plan completeness and tone

This enables meaningful evaluation without clinical trials.

---

## Why This Is Research

Sweeten explicitly studies:
- AI failure modes in health systems
- Hybrid intelligence architectures
- Graceful degradation strategies
- Ethical constraints on AI usage in healthcare

The codebase is structured to support experimentation and analysis, not just deployment.

---

## One-Sentence Pitch

> Sweeten is a research-driven health planning system that explores how hybrid AI and deterministic architectures can deliver safe, reliable diabetes support under real-world constraints.

---

## Status

Sweeten is a solo-developed project intended for:
- science fairs
- research showcases
- hackathons
- further academic expansion

