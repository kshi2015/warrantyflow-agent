// src/lib/types.ts

export type IssueType =
  | "damaged"            // product arrived broken or cracked
  | "defect"             // malfunction / manufacturing defect
  | "duplicate_charge"   // finance dispute
  | "warranty_expired"   // outside policy window
  | "wrong_item"         // incorrect SKU sent
  | "not_needed"         // buyer remorse / unwanted
  | "warranty_claim"     // general warranty request
  | "other";             // fallback

export type IssueStatus = "pending" | "decided" | "needs_more_info";

export interface IssuePayload {
  supplierId: string;
  orderId: string;
  sku: string;
  quantity: number;
  description: string;

  // Optional — classifier will add it
  issueType?: IssueType;
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

  export type AgentAction =
  | "create_rma"
  | "flag_finance_dispute"
  | "request_photos"
  | "notify_supplier"
  | "no_action";


  export interface IssueDecision {
    outcome: DecisionOutcome;
    reasoning: string;
    requiresFollowup: boolean;
    followupQuestions?: string[];
      action: AgentAction;
  }
  
