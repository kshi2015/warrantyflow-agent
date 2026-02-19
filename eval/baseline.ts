import fs from "node:fs";
import path from "node:path";

export type BaselineData = {
  runId: string;
  passRate: number;
  avgLatencyMs: number;
  costPerCase: number;
  categoryBreakdown: Record<string, { passRate: number }>;
  checkStats: {
    outcomeOk: number;
    actionOk: number;
    mustAskOk: number;
    mustNotOk: number;
  };
};

export function saveBaseline(resultData: any, baselineDir: string) {
  const { summary, rows } = resultData;

  // Calculate category breakdown
  const categoryBreakdown: Record<string, { passed: number; total: number }> = {};
  rows.forEach((row: any) => {
    const category = row.input.category || "uncategorized";
    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { passed: 0, total: 0 };
    }
    categoryBreakdown[category].total++;
    if (row.score.passed) {
      categoryBreakdown[category].passed++;
    }
  });

  const baseline: BaselineData = {
    runId: summary.runId,
    passRate: summary.passRate,
    avgLatencyMs: summary.avgLatencyMs,
    costPerCase: summary.costUsd.perCase,
    categoryBreakdown: Object.fromEntries(
      Object.entries(categoryBreakdown).map(([cat, stats]) => [
        cat,
        { passRate: stats.passed / stats.total },
      ])
    ),
    checkStats: {
      outcomeOk: rows.filter((r: any) => r.score.checks.outcomeOk).length,
      actionOk: rows.filter((r: any) => r.score.checks.actionOk).length,
      mustAskOk: rows.filter((r: any) => r.score.checks.mustAskOk).length,
      mustNotOk: rows.filter((r: any) => r.score.checks.mustNotOk).length,
    },
  };

  fs.mkdirSync(baselineDir, { recursive: true });
  const baselinePath = path.join(baselineDir, "baseline.json");
  fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2), "utf8");

  console.log("Baseline saved:", baselinePath);
  return baseline;
}

export function loadBaseline(baselineDir: string): BaselineData | null {
  const baselinePath = path.join(baselineDir, "baseline.json");
  if (!fs.existsSync(baselinePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(baselinePath, "utf8"));
}

export function compareToBaseline(
  current: BaselineData,
  baseline: BaselineData | null
) {
  if (!baseline) {
    console.log("\n⚠️  No baseline found. Run with --save-baseline to create one.");
    return null;
  }

  console.log("\n📊 Baseline Comparison");
  console.log("━".repeat(60));
  console.log(`Baseline: ${baseline.runId}`);
  console.log(`Current:  ${current.runId}`);
  console.log();

  const comparison = {
    passRate: {
      baseline: baseline.passRate,
      current: current.passRate,
      delta: current.passRate - baseline.passRate,
      regression: current.passRate < baseline.passRate - 0.05, // 5% threshold
    },
    avgLatencyMs: {
      baseline: baseline.avgLatencyMs,
      current: current.avgLatencyMs,
      delta: current.avgLatencyMs - baseline.avgLatencyMs,
      regression: current.avgLatencyMs > baseline.avgLatencyMs * 1.2, // 20% slower
    },
    costPerCase: {
      baseline: baseline.costPerCase,
      current: current.costPerCase,
      delta: current.costPerCase - baseline.costPerCase,
      regression: current.costPerCase > baseline.costPerCase * 1.2, // 20% more expensive
    },
  };

  // Print comparison
  const formatDelta = (delta: number, suffix: string = "", invert = false) => {
    const sign = delta > 0 ? "+" : "";
    const color = invert
      ? delta < 0
        ? "🟢"
        : "🔴"
      : delta > 0
        ? "🟢"
        : "🔴";
    return `${color} ${sign}${delta.toFixed(4)}${suffix}`;
  };

  console.log(
    `Pass Rate:     ${(baseline.passRate * 100).toFixed(1)}% → ${(current.passRate * 100).toFixed(1)}% ${formatDelta((comparison.passRate.delta * 100), "%")}`
  );
  console.log(
    `Avg Latency:   ${baseline.avgLatencyMs}ms → ${current.avgLatencyMs}ms ${formatDelta(comparison.avgLatencyMs.delta, "ms", true)}`
  );
  console.log(
    `Cost/Case:     $${baseline.costPerCase.toFixed(6)} → $${current.costPerCase.toFixed(6)} ${formatDelta(comparison.costPerCase.delta, "", true)}`
  );

  // Check for regressions
  const regressions: string[] = [];
  if (comparison.passRate.regression) {
    regressions.push(
      `Pass rate dropped by ${(Math.abs(comparison.passRate.delta) * 100).toFixed(1)}%`
    );
  }
  if (comparison.avgLatencyMs.regression) {
    regressions.push(
      `Latency increased by ${((current.avgLatencyMs / baseline.avgLatencyMs - 1) * 100).toFixed(1)}%`
    );
  }
  if (comparison.costPerCase.regression) {
    regressions.push(
      `Cost increased by ${((current.costPerCase / baseline.costPerCase - 1) * 100).toFixed(1)}%`
    );
  }

  if (regressions.length > 0) {
    console.log("\n⚠️  REGRESSIONS DETECTED:");
    regressions.forEach((r) => console.log(`   - ${r}`));
  } else {
    console.log("\n✅ No regressions detected");
  }

  console.log("━".repeat(60));

  return comparison;
}
