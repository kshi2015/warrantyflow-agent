// 1️⃣ Load environment FIRST
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

// 2️⃣ Imports
import fs from "node:fs";
import OpenAI from "openai";
import { scoreOne, type EvalCase } from "./score";
import { generateReport } from "./report";
import { saveBaseline, loadBaseline, compareToBaseline, type BaselineData } from "./baseline";

// 3️⃣ Pricing config
type ModelPricing = {
  input: number;
  output: number;
};

const PRICING: Record<string, ModelPricing> = {
  "gpt-4.1-mini": {
    input: 0.15 / 1_000_000,
    output: 0.60 / 1_000_000,
  },
};

// 4️⃣ OpenAI client (after env load)
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/* -------------------- helpers -------------------- */

function readJsonl(filePath: string): EvalCase[] {
  const lines = fs.readFileSync(filePath, "utf8").split("\n").filter(Boolean);
  return lines.map((l) => JSON.parse(l));
}

function nowIso() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function safeJsonParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/* -------------------- agent call -------------------- */

async function callAgent(input: any) {
  const systemPrompt = `
You are WarrantyFlow, an AI agent that triages supplier warranty and returns issues.

Analyze the warranty/returns issue and return ONLY valid JSON with this exact shape:
{
  "outcome": string,
  "reasoning": string,
  "requiresFollowup": boolean,
  "followupQuestions": string[] | null,
  "action": string
}

**IMPORTANT - Use EXACTLY these outcome values:**
- "auto_approve_rma" - clear damage/defect within warranty period
- "conditional_approve" - approve with conditions (e.g., pending photos)
- "reject" - claim denied (out of warranty, policy violation)
- "escalate_to_human" - complex/edge case requiring human judgment
- "request_more_info" - insufficient information to decide

**IMPORTANT - Use EXACTLY these action values:**
- "create_rma" - create return merchandise authorization
- "flag_finance_dispute" - billing/invoice issue
- "request_photos" - need visual evidence
- "notify_supplier" - inform supplier of issue
- "no_action" - no immediate action needed

When information is vague or incomplete, set requiresFollowup=true and provide specific followupQuestions.
`;

  const t0 = Date.now();

  const response = await client.responses.create({
    model: process.env.EVAL_MODEL || "gpt-4.1-mini",
    input: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(input, null, 2) },
    ],
  });

  const latencyMs = Date.now() - t0;

  const rawText = response.output_text || "";
  const parsed =
    safeJsonParse(rawText) ?? {
      outcome: null,
      action: null,
      reasoning: rawText,
      requiresFollowup: false,
      followupQuestions: null,
    };

  const usage =
    (response as any).usage ??
    (response as any).response?.usage ??
    null;

  return { parsed, rawText, latencyMs, usage };
}

/* -------------------- main runner -------------------- */

async function main() {
  let totalLatencyMs = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  const casesPath = path.join(process.cwd(), "eval", "cases.jsonl");
  const cases = readJsonl(casesPath);

  const resultsDir = path.join(process.cwd(), "eval", "results");
  fs.mkdirSync(resultsDir, { recursive: true });

  const runId = nowIso();
  const outPath = path.join(resultsDir, `eval-${runId}.json`);

  const rows: any[] = [];
  let hardFails = 0;

  for (const c of cases) {
    const { parsed, rawText, latencyMs, usage } = await callAgent(c.input);
    const scored = scoreOne(c, parsed);

    if (!scored.checks.mustNotOk) hardFails += 1;

    rows.push({
      id: c.id,
      input: c.input,
      expected: c.expected,
      output: parsed,
      rawText,
      score: scored,
      metrics: { latencyMs, usage },
    });

    console.log(
      `${scored.passed ? "✅" : "❌"} ${c.id} (${latencyMs}ms)`
    );

    if (!scored.passed) {
      console.log("   ", scored);
    }

    totalLatencyMs += latencyMs;

    if (usage) {
      totalInputTokens += usage.input_tokens || 0;
      totalOutputTokens += usage.output_tokens || 0;
    }
  }

  // ---- cost calculation (once per run) ----
  const modelName = process.env.EVAL_MODEL || "gpt-4.1-mini";
  const pricing = PRICING[modelName];

  if (!pricing) {
    console.warn(`No pricing configured for model: ${modelName}`);
  }

  const inputCost = pricing
    ? totalInputTokens * pricing.input
    : 0;

  const outputCost = pricing
    ? totalOutputTokens * pricing.output
    : 0;

  const totalCost = inputCost + outputCost;

  const passRate =
    rows.filter((r) => r.score.passed).length / rows.length;

  const summary = {
    runId,
    total: rows.length,
    passRate,
    hardFails,
    avgLatencyMs: Math.round(totalLatencyMs / rows.length),
    tokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalInputTokens + totalOutputTokens,
    },
    costUsd: {
      input: Number(inputCost.toFixed(6)),
      output: Number(outputCost.toFixed(6)),
      total: Number(totalCost.toFixed(6)),
      perCase: Number((totalCost / rows.length).toFixed(6)),
    },
  };

  console.log(
    `Cost: $${summary.costUsd.total} total ($${summary.costUsd.perCase}/case)`
  );

  const resultData = { summary, rows };

  fs.writeFileSync(
    outPath,
    JSON.stringify(resultData, null, 2),
    "utf8"
  );

  console.log("\nSummary:", summary);
  console.log("Wrote:", outPath);

  // Generate HTML report
  generateReport(resultData, outPath);

  // Baseline comparison
  const baselineDir = path.join(process.cwd(), "eval");
  const shouldSaveBaseline = process.argv.includes("--save-baseline");

  const currentBaseline: BaselineData = {
    runId,
    passRate,
    avgLatencyMs: summary.avgLatencyMs,
    costPerCase: summary.costUsd.perCase,
    categoryBreakdown: {},
    checkStats: {
      outcomeOk: rows.filter((r) => r.score.checks.outcomeOk).length,
      actionOk: rows.filter((r) => r.score.checks.actionOk).length,
      mustAskOk: rows.filter((r) => r.score.checks.mustAskOk).length,
      mustNotOk: rows.filter((r) => r.score.checks.mustNotOk).length,
    },
  };

  if (shouldSaveBaseline) {
    saveBaseline(resultData, baselineDir);
  } else {
    const baseline = loadBaseline(baselineDir);
    compareToBaseline(currentBaseline, baseline);
  }

  const minPassRate = Number(process.env.EVAL_MIN_PASSRATE || "0.75");
  if (hardFails > 0) process.exit(2);
  if (passRate < minPassRate) process.exit(3);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
