// src/app/api/issues/route.ts

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import {
  IssuePayload,
  Issue,
  IssueDecision,
  IssueType,
} from "@/lib/types";
import { getOrder, getWarrantyTerms } from "@/lib/mockData";
import { retrieveRelevantPolicies } from "@/lib/policies";
import { performAction } from "@/lib/tools";


// Initialize OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function classifyIssue(payload: IssuePayload): Promise<IssueType> {
    const prompt = `
  Classify the following supplier issue into exactly ONE of these categories:
  
  Valid categories:
  - "damaged"            → arrived broken, cracked, missing parts
  - "defect"             → malfunctioning, manufacturing flaw
  - "duplicate_charge"   → billing or finance dispute
  - "warranty_expired"   → beyond warranty coverage window
  - "wrong_item"         → incorrect SKU shipped
  - "not_needed"         → buyer remorse, mistaken order
  - "warranty_claim"     → generic warranty claim
  - "other"              → unclear or none of the above
  
  Issue to classify:
  ${JSON.stringify(payload, null, 2)}
  
  Respond with ONLY the category string. No quotes, no JSON, no punctuation.
  `;
  
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });
  
    // Clean the text
    const raw = response.output_text?.trim().toLowerCase() || "other";
  
    // Guardrail list
    const valid: IssueType[] = [
      "damaged",
      "defect",
      "duplicate_charge",
      "warranty_expired",
      "wrong_item",
      "not_needed",
      "warranty_claim",
      "other",
    ];
  
    return valid.includes(raw as IssueType) ? (raw as IssueType) : "other";
  }
  


// --------------------
//  LLM Decision Agent
// --------------------

async function llmDecision(payload: any): Promise<IssueDecision> {
    // Fetch tool results
    const order = getOrder(payload.orderId);
    const warranty = getWarrantyTerms(payload.sku);
  
    // Retrieve relevant policy text (RAG-lite)
    const relevantPolicies = retrieveRelevantPolicies(payload.description);
  
    const systemPrompt = `
  You are WarrantyFlow, an AI agent that triages supplier warranty and returns issues.
  
  Use the following policies when making decisions:
  ${relevantPolicies}
  
  Always return JSON matching this exact TypeScript type:
  
  {
    "outcome": "auto_approve_rma" | "conditional_approve" | "request_more_info" | "reject" | "escalate_to_human",
    "reasoning": string,
    "requiresFollowup": boolean,
    "followupQuestions": string[] | null,
    "action": "create_rma" | "flag_finance_dispute" | "request_photos" | "notify_supplier" | "no_action"
  }
  
  Action rules:
  - If outcome = "auto_approve_rma" → action: "create_rma"
  - If issueType = "duplicate_charge" (finance dispute) → action: "flag_finance_dispute"
  - If requiresFollowup = true → action: "request_photos"
  - If issueType = "wrong_item" → action: "notify_supplier"
  - Otherwise → action: "no_action"
  
  Return ONLY the JSON object. No commentary.
  `;
  
    const toolContext = `
  Order data (via tool):
  ${JSON.stringify(order, null, 2)}
  
  Warranty terms (via tool):
  ${JSON.stringify(warranty, null, 2)}
  `;
  
    const userPrompt = `
  Issue data:
  ${JSON.stringify(payload, null, 2)}
  
  ${toolContext}
  `;
  
    // Call the OpenAI model
    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  
    // The Responses API returns raw text under `output_text`
    const rawText = response.output_text || "";
  
    // Safe JSON parsing with fallback + defaults
    try {
      const parsed = JSON.parse(rawText) as Partial<IssueDecision>;
  
      const decision: IssueDecision = {
        outcome: parsed.outcome ?? "request_more_info",
        reasoning:
          parsed.reasoning ??
          "Defaulted to request_more_info because the AI response was incomplete.",
        requiresFollowup: parsed.requiresFollowup ?? true,
        followupQuestions:
          parsed.followupQuestions ?? [
            "Can you share more detail so I can process this issue?",
          ],
        action: parsed.action ?? "no_action",
      };
  
      return decision;
    } catch (err) {
      console.error("LLM JSON parse error:", rawText);
  
      return {
        outcome: "request_more_info",
        reasoning:
          "The AI response could not be parsed. Asking the user for more detail.",
        requiresFollowup: true,
        followupQuestions: [
          "Can you describe the issue in more detail so I can process it?",
        ],
        action: "no_action", // 👈 add default action here
      };
    }
  }
  

// --------------------
//  POST Route Handler
// --------------------
export async function POST(req: NextRequest) {
    try {
      const body = (await req.json()) as IssuePayload;
  
      // you likely already have this from classification:
      const issueType = await classifyIssue(body);
  
      const issue: Issue = {
        ...body,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        issueType,
        status: "decided",
      };
  
      const decision = await llmDecision({ ...body, issueType });
  
      // 👇 This is what we’re adding
      const actionResult = await performAction(decision.action, issue.id);
  
      return NextResponse.json(
        {
          issue,
          decision,
          actionResult,
        },
        { status: 200 }
      );
    } catch (err) {
      console.error("POST /api/issues error:", err);
      return NextResponse.json(
        { error: "Invalid request payload" },
        { status: 400 }
      );
    }
  }
  
