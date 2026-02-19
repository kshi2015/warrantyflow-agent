import fs from "node:fs";
import path from "node:path";

export type EvalResult = {
  summary: {
    runId: string;
    total: number;
    passRate: number;
    hardFails: number;
    avgLatencyMs: number;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    costUsd: {
      input: number;
      output: number;
      total: number;
      perCase: number;
    };
  };
  rows: any[];
};

export function generateReport(result: EvalResult, outPath: string) {
  const { summary, rows } = result;

  // Calculate category breakdown
  const categoryBreakdown: Record<string, { passed: number; total: number }> = {};
  const difficultyBreakdown: Record<string, { passed: number; total: number }> = {};

  rows.forEach((row) => {
    const category = row.input.category || "uncategorized";
    const difficulty = row.input.difficulty || "unknown";

    if (!categoryBreakdown[category]) {
      categoryBreakdown[category] = { passed: 0, total: 0 };
    }
    if (!difficultyBreakdown[difficulty]) {
      difficultyBreakdown[difficulty] = { passed: 0, total: 0 };
    }

    categoryBreakdown[category].total++;
    difficultyBreakdown[difficulty].total++;

    if (row.score.passed) {
      categoryBreakdown[category].passed++;
      difficultyBreakdown[difficulty].passed++;
    }
  });

  // Calculate check breakdown
  const checkStats = {
    outcomeOk: rows.filter((r) => r.score.checks.outcomeOk).length,
    actionOk: rows.filter((r) => r.score.checks.actionOk).length,
    mustAskOk: rows.filter((r) => r.score.checks.mustAskOk).length,
    mustNotOk: rows.filter((r) => r.score.checks.mustNotOk).length,
  };

  // Reasoning quality breakdown
  const reasoningStats = {
    good: rows.filter((r) => r.score.reasoningQuality?.quality === "good").length,
    acceptable: rows.filter((r) => r.score.reasoningQuality?.quality === "acceptable").length,
    poor: rows.filter((r) => r.score.reasoningQuality?.quality === "poor").length,
    avgLength: Math.round(
      rows.reduce((sum, r) => sum + (r.score.reasoningQuality?.length || 0), 0) / rows.length
    ),
  };

  // Generate HTML report
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WarrantyFlow Evaluation Report - ${summary.runId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .header h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .header .subtitle { opacity: 0.9; font-size: 0.9rem; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .card-title { font-size: 0.875rem; color: #666; margin-bottom: 0.5rem; }
    .card-value { font-size: 2rem; font-weight: bold; color: #333; }
    .card-subtitle { font-size: 0.75rem; color: #999; margin-top: 0.25rem; }
    .pass-rate { color: ${summary.passRate >= 0.75 ? "#10b981" : summary.passRate >= 0.5 ? "#f59e0b" : "#ef4444"}; }
    .section { background: white; padding: 2rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section-title { font-size: 1.25rem; margin-bottom: 1rem; color: #333; border-bottom: 2px solid #667eea; padding-bottom: 0.5rem; }
    .breakdown-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
    .breakdown-item { padding: 1rem; background: #f9fafb; border-radius: 6px; }
    .breakdown-item-title { font-weight: 600; margin-bottom: 0.5rem; text-transform: capitalize; }
    .breakdown-bar {
      height: 24px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin: 0.5rem 0;
    }
    .breakdown-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .test-results { margin-top: 1rem; }
    .test-case {
      padding: 1rem;
      margin-bottom: 1rem;
      border-radius: 6px;
      border-left: 4px solid #e5e7eb;
    }
    .test-case.passed { background: #f0fdf4; border-left-color: #10b981; }
    .test-case.failed { background: #fef2f2; border-left-color: #ef4444; }
    .test-case-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .test-case-id { font-weight: 600; }
    .test-case-badge {
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: 600;
    }
    .badge-passed { background: #d1fae5; color: #065f46; }
    .badge-failed { background: #fee2e2; color: #991b1b; }
    .badge-easy { background: #dbeafe; color: #1e40af; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-hard { background: #fee2e2; color: #991b1b; }
    .test-case-meta { font-size: 0.875rem; color: #666; margin-bottom: 0.5rem; }
    .test-case-checks { display: flex; gap: 1rem; font-size: 0.75rem; margin-top: 0.5rem; }
    .check { display: flex; align-items: center; gap: 0.25rem; }
    .check.ok { color: #10b981; }
    .check.fail { color: #ef4444; }
    .check-icon { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; }
    .footer {
      text-align: center;
      color: #666;
      font-size: 0.875rem;
      margin-top: 2rem;
      padding-top: 2rem;
      border-top: 1px solid #e5e7eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>WarrantyFlow Evaluation Report</h1>
      <div class="subtitle">Run ID: ${summary.runId}</div>
    </div>

    <div class="summary-grid">
      <div class="card">
        <div class="card-title">Pass Rate</div>
        <div class="card-value pass-rate">${(summary.passRate * 100).toFixed(1)}%</div>
        <div class="card-subtitle">${rows.filter((r) => r.score.passed).length}/${summary.total} tests passed</div>
      </div>
      <div class="card">
        <div class="card-title">Hard Failures</div>
        <div class="card-value" style="color: ${summary.hardFails > 0 ? "#ef4444" : "#10b981"};">${summary.hardFails}</div>
        <div class="card-subtitle">Safety constraint violations</div>
      </div>
      <div class="card">
        <div class="card-title">Avg Latency</div>
        <div class="card-value">${summary.avgLatencyMs}ms</div>
        <div class="card-subtitle">Per test case</div>
      </div>
      <div class="card">
        <div class="card-title">Total Cost</div>
        <div class="card-value">$${summary.costUsd.total.toFixed(4)}</div>
        <div class="card-subtitle">$${summary.costUsd.perCase.toFixed(6)} per case</div>
      </div>
      <div class="card">
        <div class="card-title">Total Tokens</div>
        <div class="card-value">${summary.tokens.total.toLocaleString()}</div>
        <div class="card-subtitle">${summary.tokens.input.toLocaleString()} in / ${summary.tokens.output.toLocaleString()} out</div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Performance by Category</h2>
      <div class="breakdown-grid">
        ${Object.entries(categoryBreakdown)
          .map(
            ([cat, stats]) => `
          <div class="breakdown-item">
            <div class="breakdown-item-title">${cat}</div>
            <div class="breakdown-bar">
              <div class="breakdown-bar-fill" style="width: ${(stats.passed / stats.total) * 100}%">
                ${stats.passed}/${stats.total}
              </div>
            </div>
            <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">
              ${((stats.passed / stats.total) * 100).toFixed(1)}% pass rate
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Performance by Difficulty</h2>
      <div class="breakdown-grid">
        ${Object.entries(difficultyBreakdown)
          .map(
            ([diff, stats]) => `
          <div class="breakdown-item">
            <div class="breakdown-item-title">${diff}</div>
            <div class="breakdown-bar">
              <div class="breakdown-bar-fill" style="width: ${(stats.passed / stats.total) * 100}%">
                ${stats.passed}/${stats.total}
              </div>
            </div>
            <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">
              ${((stats.passed / stats.total) * 100).toFixed(1)}% pass rate
            </div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Check Statistics</h2>
      <table>
        <thead>
          <tr>
            <th>Check Type</th>
            <th>Passed</th>
            <th>Pass Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Outcome Correctness</td>
            <td>${checkStats.outcomeOk}/${summary.total}</td>
            <td>${((checkStats.outcomeOk / summary.total) * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Action Correctness</td>
            <td>${checkStats.actionOk}/${summary.total}</td>
            <td>${((checkStats.actionOk / summary.total) * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Follow-up Quality</td>
            <td>${checkStats.mustAskOk}/${summary.total}</td>
            <td>${((checkStats.mustAskOk / summary.total) * 100).toFixed(1)}%</td>
          </tr>
          <tr>
            <td>Safety Constraints</td>
            <td>${checkStats.mustNotOk}/${summary.total}</td>
            <td>${((checkStats.mustNotOk / summary.total) * 100).toFixed(1)}%</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="section">
      <h2 class="section-title">Reasoning Quality Analysis</h2>
      <div class="breakdown-grid">
        <div class="breakdown-item">
          <div class="breakdown-item-title">Good Reasoning</div>
          <div class="breakdown-bar">
            <div class="breakdown-bar-fill" style="width: ${(reasoningStats.good / summary.total) * 100}%; background: linear-gradient(90deg, #10b981 0%, #059669 100%);">
              ${reasoningStats.good}/${summary.total}
            </div>
          </div>
          <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">
            Evidence-based with context
          </div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-item-title">Acceptable Reasoning</div>
          <div class="breakdown-bar">
            <div class="breakdown-bar-fill" style="width: ${(reasoningStats.acceptable / summary.total) * 100}%; background: linear-gradient(90deg, #f59e0b 0%, #d97706 100%);">
              ${reasoningStats.acceptable}/${summary.total}
            </div>
          </div>
          <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">
            Has some evidence
          </div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-item-title">Poor Reasoning</div>
          <div class="breakdown-bar">
            <div class="breakdown-bar-fill" style="width: ${(reasoningStats.poor / summary.total) * 100}%; background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);">
              ${reasoningStats.poor}/${summary.total}
            </div>
          </div>
          <div style="font-size: 0.75rem; color: #666; margin-top: 0.25rem;">
            Too brief or generic
          </div>
        </div>
        <div class="breakdown-item">
          <div class="breakdown-item-title">Avg Reasoning Length</div>
          <div style="font-size: 2rem; font-weight: bold; margin: 0.5rem 0;">
            ${reasoningStats.avgLength}
          </div>
          <div style="font-size: 0.75rem; color: #666;">
            characters
          </div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2 class="section-title">Test Results</h2>
      <div class="test-results">
        ${rows
          .map(
            (row) => `
          <div class="test-case ${row.score.passed ? "passed" : "failed"}">
            <div class="test-case-header">
              <span class="test-case-id">${row.id}</span>
              <div style="display: flex; gap: 0.5rem;">
                <span class="test-case-badge badge-${row.input.difficulty || "unknown"}">${row.input.difficulty || "unknown"}</span>
                <span class="test-case-badge ${row.score.passed ? "badge-passed" : "badge-failed"}">
                  ${row.score.passed ? "✓ PASSED" : "✗ FAILED"}
                </span>
              </div>
            </div>
            <div class="test-case-meta">
              <strong>Category:</strong> ${row.input.category || "uncategorized"} |
              <strong>Latency:</strong> ${row.metrics.latencyMs}ms |
              <strong>Tokens:</strong> ${row.metrics.usage?.input_tokens || 0} in / ${row.metrics.usage?.output_tokens || 0} out
            </div>
            <div class="test-case-meta">
              <strong>Description:</strong> ${row.input.description}
            </div>
            <div class="test-case-meta">
              <strong>Reasoning Quality:</strong> ${row.score.reasoningQuality?.quality || "unknown"}
              (${row.score.reasoningQuality?.length || 0} chars${row.score.reasoningQuality?.hasEvidence ? ", has evidence" : ""}${row.score.reasoningQuality?.hasContext ? ", has context" : ""})
            </div>
            <div class="test-case-checks">
              <span class="check ${row.score.checks.outcomeOk ? "ok" : "fail"}">
                <span class="check-icon">${row.score.checks.outcomeOk ? "✓" : "✗"}</span>
                Outcome
              </span>
              <span class="check ${row.score.checks.actionOk ? "ok" : "fail"}">
                <span class="check-icon">${row.score.checks.actionOk ? "✓" : "✗"}</span>
                Action
              </span>
              <span class="check ${row.score.checks.mustAskOk ? "ok" : "fail"}">
                <span class="check-icon">${row.score.checks.mustAskOk ? "✓" : "✗"}</span>
                Follow-up
              </span>
              <span class="check ${row.score.checks.mustNotOk ? "ok" : "fail"}">
                <span class="check-icon">${row.score.checks.mustNotOk ? "✓" : "✗"}</span>
                Safety
              </span>
            </div>
            ${
              !row.score.passed
                ? `
            <div style="margin-top: 0.5rem; font-size: 0.875rem; color: #666;">
              ${
                !row.score.checks.outcomeOk
                  ? `<div>Expected outcome: ${row.expected.allowedOutcomes.join(" or ")} | Got: ${row.output.outcome}</div>`
                  : ""
              }
              ${
                !row.score.checks.actionOk
                  ? `<div>Expected action: ${row.expected.allowedActions.join(" or ")} | Got: ${row.output.action}</div>`
                  : ""
              }
              ${
                row.score.mustAskMissing?.length > 0
                  ? `<div>Missing keywords: ${row.score.mustAskMissing.join(", ")}</div>`
                  : ""
              }
              ${
                row.score.mustNotHits?.length > 0
                  ? `<div style="color: #ef4444; font-weight: 600;">⚠️ Safety violation: ${row.score.mustNotHits.join(", ")}</div>`
                  : ""
              }
            </div>
            `
                : ""
            }
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="footer">
      Generated by WarrantyFlow Evaluation Harness<br>
      ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;

  const reportPath = outPath.replace(".json", ".html");
  fs.writeFileSync(reportPath, html, "utf8");
  console.log("HTML report:", reportPath);
}
