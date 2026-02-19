export type EvalExpected = {
    allowedOutcomes: string[];
    mustAsk: string[];     // keywords that should appear in followupQuestions or reasoning
    mustNot: string[];     // forbidden outcomes/actions/phrases
    allowedActions: string[];
  };

  export type EvalCase = {
    id: string;
    input: any;
    expected: EvalExpected;
    category?: string;
    difficulty?: string;
  };
  
  export type EvalModelOutput = {
    outcome?: string;
    action?: string;
    reasoning?: string;
    requiresFollowup?: boolean;
    followupQuestions?: string[] | null;
  };
  
  // Reasoning quality metrics
  function assessReasoningQuality(reasoning: string | undefined): {
    length: number;
    hasEvidence: boolean;
    hasContext: boolean;
    quality: "poor" | "acceptable" | "good";
  } {
    const text = reasoning || "";
    const length = text.length;

    // Check for evidence-based reasoning (mentions specific details)
    const hasEvidence = /\b(because|since|as|given|based on|considering|due to)\b/i.test(text) ||
                       /\b(order|sku|supplier|quantity|days|warranty|damaged|defective)\b/i.test(text);

    // Check for context awareness (mentions policies, conditions, edge cases)
    const hasContext = /\b(policy|condition|warranty|period|standard|typical|usual|normally)\b/i.test(text);

    let quality: "poor" | "acceptable" | "good" = "poor";
    if (length > 50 && hasEvidence && hasContext) {
      quality = "good";
    } else if (length > 30 && hasEvidence) {
      quality = "acceptable";
    }

    return { length, hasEvidence, hasContext, quality };
  }

  export function scoreOne(c: EvalCase, out: EvalModelOutput) {
    const reasoning = (out.reasoning || "").toLowerCase();
    const followups = (out.followupQuestions || []).join(" ").toLowerCase();
    const blob = `${reasoning} ${followups} ${(out.outcome || "").toLowerCase()} ${(out.action || "").toLowerCase()}`;

    const outcomeOk = !!out.outcome && c.expected.allowedOutcomes.includes(out.outcome);
    const actionOk = !!out.action && c.expected.allowedActions.includes(out.action);

    const mustAskHits = c.expected.mustAsk.filter(k => blob.includes(k.toLowerCase()));
    const mustAskOk = mustAskHits.length === c.expected.mustAsk.length;

    const mustNotHits = c.expected.mustNot.filter(k => blob.includes(k.toLowerCase()));
    const mustNotOk = mustNotHits.length === 0;

    // Assess reasoning quality
    const reasoningQuality = assessReasoningQuality(out.reasoning);

    // Check if followup questions are specific enough (not generic)
    const followupQuality = {
      count: out.followupQuestions?.length || 0,
      specific: (out.followupQuestions || []).some(q =>
        q.length > 20 && !/^(can you|could you|please provide|what|why|how)/i.test(q.trim())
      ),
    };

    const passed = outcomeOk && actionOk && mustAskOk && mustNotOk;

    return {
      id: c.id,
      passed,
      checks: { outcomeOk, actionOk, mustAskOk, mustNotOk },
      mustAskMissing: c.expected.mustAsk.filter(k => !blob.includes(k.toLowerCase())),
      mustNotHits,
      reasoningQuality,
      followupQuality,
    };
  }
  