# WarrantyFlow Evaluation Framework

A comprehensive evaluation system for testing and validating the WarrantyFlow AI agent's behavior across warranty and returns scenarios.

## Overview

The evaluation framework provides:

- **Automated Testing**: 20 test cases covering diverse warranty scenarios
- **Behavioral Scoring**: Multi-dimensional evaluation of agent decisions
- **Reasoning Quality Analysis**: Assessment of decision rationale
- **Performance Tracking**: Latency, token usage, and cost metrics
- **Regression Detection**: Baseline comparison to catch quality drops
- **Visual Reports**: HTML reports with detailed breakdowns
- **CI/CD Integration**: Automated evaluation in GitHub Actions

## Quick Start

### Run Evaluations

```bash
npm run eval
```

### Save a New Baseline

```bash
npm run eval -- --save-baseline
```

### View Results

After running evaluations, check:
- JSON results: `eval/results/eval-[timestamp].json`
- HTML report: `eval/results/eval-[timestamp].html`

## Test Case Structure

Each test case in `eval/cases.jsonl` includes:

```jsonl
{
  "id": "unique-test-id",
  "category": "damage|billing|warranty|defect|...",
  "difficulty": "easy|medium|hard",
  "input": {
    "supplierId": "S-123",
    "orderId": "ORD-456",
    "sku": "SKU-789",
    "quantity": 2,
    "description": "Issue description text"
  },
  "expected": {
    "allowedOutcomes": ["auto_approve_rma", "conditional_approve"],
    "allowedActions": ["create_rma", "request_photos"],
    "mustAsk": ["keyword1", "keyword2"],
    "mustNot": ["reject"]
  }
}
```

### Test Categories

- **damage**: Physical damage during shipping or handling
- **billing**: Invoice and payment issues
- **warranty**: Warranty expiration and coverage questions
- **defect**: Product defects and malfunctions
- **wrong_item**: Incorrect items shipped
- **wrong_qty**: Quantity discrepancies
- **incomplete**: Missing parts or accessories
- **security**: Potential fraud or abuse cases
- **policy**: Policy interpretation edge cases
- **technical**: Compatibility and technical issues
- **shipping**: Delivery timing and logistics

### Difficulty Levels

- **easy**: Clear-cut cases with obvious decisions
- **medium**: Require judgment or additional information
- **hard**: Edge cases, ambiguous situations, or security concerns

## Scoring Dimensions

### 1. Outcome Correctness
- Checks if the agent selected an allowed outcome
- Allowed outcomes: `auto_approve_rma`, `conditional_approve`, `reject`, `escalate_to_human`, `request_more_info`

### 2. Action Correctness
- Validates the proposed action is appropriate
- Allowed actions: `create_rma`, `flag_finance_dispute`, `request_photos`, `notify_supplier`, `no_action`

### 3. Follow-up Quality (`mustAsk`)
- Verifies the agent asks for necessary information
- Keywords must appear in reasoning or followup questions
- Example: For vague issues, must ask about "what happens" and "photos"

### 4. Safety Constraints (`mustNot`)
- Hard fails if forbidden outcomes/actions occur
- Example: Cannot `auto_approve_rma` for expired warranties
- Exit code 2 if any safety violation detected

### 5. Reasoning Quality
- **Good**: Evidence-based reasoning with policy context (>50 chars)
- **Acceptable**: Some evidence provided (>30 chars)
- **Poor**: Too brief or generic

Checks for:
- Evidence keywords: "because", "since", "given", "based on"
- Domain terms: "order", "warranty", "damaged", "defective"
- Context awareness: "policy", "condition", "standard"

### 6. Followup Quality
- Counts number of followup questions
- Assesses if questions are specific vs. generic

## Metrics Tracked

### Performance Metrics
- **Pass Rate**: Percentage of tests passing all checks
- **Avg Latency**: Mean response time in milliseconds
- **Cost per Case**: USD cost per evaluation (input + output tokens)
- **Token Usage**: Total input/output tokens consumed

### Quality Metrics
- **Check Statistics**: Pass rates for each scoring dimension
- **Category Breakdown**: Performance across test categories
- **Difficulty Breakdown**: Performance by difficulty level
- **Reasoning Distribution**: Good/acceptable/poor reasoning counts

## Baseline Comparison

### Creating a Baseline

When you're satisfied with agent performance:

```bash
npm run eval -- --save-baseline
```

This saves `eval/baseline.json` with current metrics.

### Regression Detection

On subsequent runs, the framework automatically compares to baseline:

```
📊 Baseline Comparison
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Baseline: 2025-12-13T12-00-00-000Z
Current:  2025-12-13T14-30-15-123Z

Pass Rate:     85.0% → 82.0% 🔴 -3.0%
Avg Latency:   1500ms → 1800ms 🔴 +300ms
Cost/Case:     $0.000150 → $0.000180 🔴 +0.000030

⚠️  REGRESSIONS DETECTED:
   - Latency increased by 20.0%
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Regression Thresholds:**
- Pass Rate: >5% decrease
- Latency: >20% increase
- Cost: >20% increase

## CI/CD Integration

The evaluation runs automatically in GitHub Actions on:
- Every push to `main`
- Every pull request

### Exit Codes

- **0**: All tests passed above minimum threshold
- **1**: Runtime error (e.g., API key missing)
- **2**: Safety constraint violated (hard fail)
- **3**: Pass rate below `EVAL_MIN_PASSRATE` threshold

### Environment Variables

Set in `.github/workflows/eval.yml`:

```yaml
env:
  OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
  EVAL_MODEL: gpt-4.1-mini
  EVAL_MIN_PASSRATE: "0.50"  # 50% minimum pass rate
```

## HTML Reports

HTML reports include:

1. **Summary Cards**: Pass rate, hard failures, latency, cost, tokens
2. **Category Performance**: Visual breakdown by test category
3. **Difficulty Performance**: Results by difficulty level
4. **Check Statistics**: Table of all scoring dimensions
5. **Reasoning Quality Analysis**: Distribution of reasoning quality
6. **Detailed Test Results**: Expandable results for each test case

### Sample Report View

```
┌─────────────────────────────────────────────────┐
│  Pass Rate        Hard Failures    Avg Latency  │
│  ✓ 85.0%         ✓ 0               1500ms      │
│  17/20 passed    No violations     Per test     │
└─────────────────────────────────────────────────┘

Performance by Category
┌──────────────┬──────────────┬──────────────┐
│   Damage     │   Billing    │   Warranty   │
│ ████████ 80% │ ██████ 60%   │ ██████████ 100% │
└──────────────┴──────────────┴──────────────┘
```

## Adding New Test Cases

1. Add a new line to `eval/cases.jsonl`:

```jsonl
{
  "id": "my-new-test",
  "category": "defect",
  "difficulty": "medium",
  "input": {
    "supplierId": "S-XXX",
    "orderId": "ORD-XXX",
    "sku": "SKU-XXX",
    "quantity": 1,
    "description": "Your test scenario description"
  },
  "expected": {
    "allowedOutcomes": ["auto_approve_rma"],
    "allowedActions": ["create_rma"],
    "mustAsk": [],
    "mustNot": ["reject"]
  }
}
```

2. Run evaluations to validate:

```bash
npm run eval
```

## Best Practices

### Writing Test Cases

1. **Be Specific**: Clear descriptions help the agent make correct decisions
2. **Cover Edge Cases**: Test boundaries (expired warranties, old orders, etc.)
3. **Include Adversarial Cases**: Test fraud attempts, abuse, edge cases
4. **Vary Difficulty**: Mix easy, medium, and hard cases
5. **Test Safety**: Use `mustNot` to enforce critical constraints

### Interpreting Results

- **Low Pass Rate**: Review failed test details, adjust prompts or expectations
- **High Latency**: Consider model optimization or prompt reduction
- **Poor Reasoning**: Agent may need more context in system prompt
- **Safety Violations**: Immediate attention required, don't deploy

### Maintaining Quality

1. Save baseline after validating good performance
2. Run evals before every commit
3. Review HTML reports for patterns in failures
4. Update test cases as business logic evolves
5. Monitor cost and latency trends over time

## Troubleshooting

### All Tests Failing

- Check system prompt in `eval/run_eval.ts`
- Verify outcome/action values match expected values
- Ensure `OPENAI_API_KEY` is set

### Flaky Tests

- Check if expected outcomes are too restrictive
- Consider adding multiple allowed outcomes
- Review if `mustAsk` keywords are too specific

### High Costs

- Reduce number of test cases for development
- Use a smaller model for quick iterations
- Optimize prompt length

### CI Failures

- Check GitHub Secrets has `OPENAI_API_KEY`
- Verify `EVAL_MIN_PASSRATE` is reasonable
- Review recent changes that may have broken logic

## Architecture

```
eval/
├── cases.jsonl          # Test case definitions
├── run_eval.ts          # Main evaluation runner
├── score.ts             # Scoring logic and metrics
├── report.ts            # HTML report generator
├── baseline.ts          # Baseline comparison utilities
├── results/             # Generated JSON and HTML reports
│   ├── eval-[timestamp].json
│   └── eval-[timestamp].html
└── baseline.json        # Saved baseline for comparison
```

## Future Enhancements

- Model comparison (evaluate multiple models side-by-side)
- Confidence scoring for auto-approve decisions
- A/B testing framework for prompt variations
- Export results to dashboards (Grafana, Datadog, etc.)
- Synthetic test case generation
- Regression test suite with historical data
