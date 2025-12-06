# WarrantyFlow – Supplier Warranty & Returns Agent

WarrantyFlow is a prototype agent that triages supplier warranty and returns issues.  
It takes a structured issue intake (supplier, order, SKU, quantity, description), looks up mock order & warranty data, applies policy docs, and returns a decision + action.

## What it does

- **Intake form** (Next.js + TypeScript)
  - Supplier ID, Order ID, SKU, quantity, free-text description
- **LLM-based classification**
  - Maps issues into types like `damaged`, `duplicate_charge`, `warranty_expired`, `wrong_item`, etc.
- **Mock tools**
  - `getOrder(orderId)` and `getWarrantyTerms(sku)` against in-memory data
- **Policy-aware reasoning**
  - Loads local markdown policies (returns & warranty) and retrieves relevant sections into the prompt
- **Decision + action**
  - Returns a structured `IssueDecision`:
    - `outcome` (e.g. `auto_approve_rma`, `escalate_to_human`)
    - `reasoning`
    - `requiresFollowup` + `followupQuestions`
    - `action` (e.g. `create_rma`, `flag_finance_dispute`, `request_photos`)
  - Executes a “virtual tool” for the action and returns an `actionResult`
- **Session history**
  - In-page table of recent issues for lightweight ops visibility

## Tech stack

- Next.js (App Router) + TypeScript
- API routes as the agent backend
- Tailwind CSS for UI
- OpenAI Responses API

## Ideas for next steps

- Persist issues to a real store (Supabase/Postgres)
- Add a confidence score and thresholds for auto-approve vs. escalate
- Add more tools (notify buyer, update internal ticketing, etc.)
