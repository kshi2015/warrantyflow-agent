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
  };
  
  export type EvalModelOutput = {
    outcome?: string;
    action?: string;
    reasoning?: string;
    requiresFollowup?: boolean;
    followupQuestions?: string[] | null;
  };
  
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
  
    const passed = outcomeOk && actionOk && mustAskOk && mustNotOk;
  
    return {
      id: c.id,
      passed,
      checks: { outcomeOk, actionOk, mustAskOk, mustNotOk },
      mustAskMissing: c.expected.mustAsk.filter(k => !blob.includes(k.toLowerCase())),
      mustNotHits,
    };
  }
  