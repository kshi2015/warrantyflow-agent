// 1️⃣ Load env FIRST (before anything else)
import dotenv from "dotenv";
import path from "node:path";

dotenv.config({
  path: path.resolve(process.cwd(), ".env.local"),
});

// 2️⃣ Now safe to import everything else
import fs from "node:fs";
import OpenAI from "openai";
import { scoreOne, type EvalCase } from "./score";

// 3️⃣ Create OpenAI client AFTER env is loaded
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
You are WarrantyFlow evaluator mode.

Return ONLY valid JSON with this exact shape:
{
  "outcome": string,
  "reasoning": string,
  "requiresFollowup": boolean,
  "followupQuestions": string[] | null,
  "action": "create_rma" | "flag_finance_dispute" | "request_photos" | "notify_supplier" | "no_action"
}
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
    safeJsonParse(rawText) ??
    {
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
  }

  const passRate = rows.filter((r) => r.score.passed).length / rows.length;

  const summary = {
    runId,
    total: rows.length,
    passRate,
    hardFails,
    avgLatencyMs: Math.round(
      rows.reduce((a, r) => a + r.metrics.latencyMs, 0) / rows.length
    ),
  };

  fs.writeFileSync(
    outPath,
    JSON.stringify({ summary, rows }, null, 2),
    "utf8"
  );

  console.log("\nSummary:", summary);
  console.log("Wrote:", outPath);

  const minPassRate = Number(process.env.EVAL_MIN_PASSRATE || "0.75");
  if (hardFails > 0) process.exit(2);
  if (passRate < minPassRate) process.exit(3);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
