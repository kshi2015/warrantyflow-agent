# WarrantyFlow – AI-Inspired Supplier Warranty & Returns Agent

WarrantyFlow is a prototype supplier issue triage tool. It takes in supplier warranty / returns issues, classifies the case, and recommends an action (auto-approve RMA, escalate to finance, request more info) with reasoning.

## Tech stack

- Next.js (App Router) + TypeScript
- API routes for backend logic (`/api/issues`)
- Tailwind CSS for UI

## Current functionality (v0)

- Supplier-facing intake form:
  - Supplier ID, Order ID, SKU, quantity, free-text description
- Backend “agent” endpoint:
  - Applies simple rules based on the issue description
  - Returns a structured decision:
    - `outcome` (e.g. `auto_approve_rma`, `escalate_to_human`)
    - `reasoning`
    - follow-up questions, when needed
- UI renders the agent’s decision in a clean, two-panel layout.

## Roadmap

- Replace heuristic rules with an LLM-powered agent (OpenAI)
- Add mock order + warranty data and let the agent call "tools" to:
  - Fetch order info
  - Check warranty eligibility
- Add policy documents + vector search (RAG) so the agent cites policies
- Add a dashboard of historical issues and decisions
