// src/app/api/issues/route.ts

import { NextRequest, NextResponse } from "next/server";
import {
  IssuePayload,
  Issue,
  IssueDecision,
} from "@/lib/types";

// For now: basic heuristic logic.
// Later: we'll replace this with a full AI agent + tool calls.
function basicHeuristicDecision(payload: IssuePayload): IssueDecision {
  const desc = payload.description.toLowerCase();

  if (desc.includes("damaged") || desc.includes("broken") || desc.includes("cracked")) {
    return {
      outcome: "auto_approve_rma",
      reasoning:
        "Issue description indicates physical damage. Policies allow auto-approval for damaged goods reported promptly.",
      requiresFollowup: false,
    };
  }

  if (desc.includes("duplicate") || desc.includes("charged twice") || desc.includes("double charge")) {
    return {
      outcome: "escalate_to_human",
      reasoning:
        "This appears to be a duplicate charge. Finance-related claims require human verification.",
      requiresFollowup: true,
      followupQuestions: [
        "Please upload a screenshot of the duplicate charge.",
        "Can you confirm the last four digits of the payment method used?",
      ],
    };
  }

  return {
    outcome: "request_more_info",
    reasoning:
      "The issue description does not contain enough details. Asking clarifying questions.",
    requiresFollowup: true,
    followupQuestions: [
      "When did you receive the item?",
      "Can you describe the issue in more detail?",
    ],
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IssuePayload;

    const issue: Issue = {
      ...body,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      issueType: "other", // later: classify with LLM
      status: "decided",
    };

    const decision = basicHeuristicDecision(body);

    return NextResponse.json(
      {
        issue,
        decision,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }
}
