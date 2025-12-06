// src/lib/types.ts

export type IssueType =
  | "warranty_claim"
  | "damaged"
  | "wrong_item"
  | "duplicate_charge"
  | "other";

export type IssueStatus = "pending" | "decided" | "needs_more_info";

export interface IssuePayload {
  supplierId: string;
  orderId: string;
  sku: string;
  quantity: number;
  description: string;
}

export interface Issue extends IssuePayload {
  id: string;
  createdAt: string;
  issueType: IssueType;
  status: IssueStatus;
}

export type DecisionOutcome =
  | "auto_approve_rma"
  | "conditional_approve"
  | "request_more_info"
  | "reject"
  | "escalate_to_human";

export interface IssueDecision {
  outcome: DecisionOutcome;
  reasoning: string;
  requiresFollowup: boolean;
  followupQuestions?: string[];
}
