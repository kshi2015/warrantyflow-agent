# WarrantyFlow — Supplier Warranty & Returns Agent

WarrantyFlow is a prototype AI agent that triages supplier warranty and returns issues and **enforces quality via automated evaluation and CI gating**.

It accepts a structured issue intake (supplier, order, SKU, quantity, description), looks up order and warranty context, applies policy-aware reasoning, and returns a structured decision and action. Changes to agent behavior are evaluated automatically and blocked if quality regresses.

---

## What it does

### Issue intake (Next.js + TypeScript UI)
- Supplier ID, Order ID, SKU, quantity
- Free-text issue description
- Ops-style interface for rapid triage

### LLM-based classification & decisioning
- Maps issues into types such as:
  - `damaged`
  - `duplicate_charge`
  - `wrong_item`
  - `warranty_expired`
- Produces a structured `IssueDecision` with:
  - `outcome` (e.g. `auto_approve_rma`, `escalate_to_human`)
  - `reasoning`
  - `requiresFollowup` and `followupQuestions`
  - `action` (e.g. `create_rma`, `flag_finance_dispute`, `request_photos`)

### Policy-aware reasoning
- Loads local markdown policy documents (returns & warranty)
- Retrieves relevant sections into the prompt to ground decisions

### Tool execution (mocked)
- `getOrder(orderId)` — mock order lookup
- `getWarrantyTerms(sku)` — mock warranty lookup
- Executes a virtual action tool and returns an `actionResult`

### Ops visibility
- In-page session history of recent issues and decisions
- Intended to resemble lightweight internal operations tooling

---

## Evaluation & quality control

WarrantyFlow includes an **automated evaluation harness** that tests agent behavior across realistic scenarios.

### Eval system
- Test cases defined in `eval/cases.jsonl`
- Each case specifies:
  - expected outcome(s)
  - required follow-up questions
  - forbidden actions (safety constraints)

### Scoring dimensions
- Outcome correctness
- Action correctness
- Follow-up quality (`mustAsk`)
- Safety constraints (`mustNot`)
- Latency per decision
- Token usage and estimated cost

### Regression gating
- Evals run automatically in CI (GitHub Actions) on every push and pull request
- The build fails if:
  - a safety constraint is violated
  - overall pass rate drops below a threshold

This prevents silent regressions as prompts, tools, or policies change.

---

## Cost & performance tracking

Each eval run records:
- Input and output token usage
- Estimated USD cost per run and per case
- Average latency

This makes tradeoffs between model quality, speed, and cost explicit.

---

## Tech stack

- **Frontend:** Next.js (App Router) + TypeScript
- **Backend:** Next.js API routes
- **Styling:** Tailwind CSS
- **LLM:** OpenAI Responses API
- **Evaluation:** Custom eval harness + GitHub Actions CI
- **Runtime:** Node.js

---

## Why this project exists

WarrantyFlow focuses on **operating an AI system responsibly**:

- Measuring behavior, not just generating outputs
- Enforcing safety and quality with automated gates
- Tracking cost and latency as first-class concerns

The goal is to demonstrate how AI agents can be built, evaluated, and iterated on like real production systems.

---

## Ideas for next steps

- Persist issues to a real store (Supabase / Postgres)
- Integrate ticketing feature for escalations
- Add policy search as a retrieval tool (RAG)
- Compare multiple models using the same eval suite
- Add confidence scoring for auto-approve vs escalate
- Export eval results as artifacts or dashboards
