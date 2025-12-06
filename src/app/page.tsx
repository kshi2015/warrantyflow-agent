"use client";

import { useState } from "react";
import { IssuePayload, IssueDecision, Issue } from "@/lib/types";

interface ApiResponse {
  issue: Issue;
  decision: IssueDecision;
  actionResult?: {
    message: string;
  };
}

export default function HomePage() {
  const [form, setForm] = useState<IssuePayload>({
    supplierId: "",
    orderId: "",
    sku: "",
    quantity: 1,
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<Issue[]>([]);


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/issues", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      const data = (await res.json()) as ApiResponse;
      setResult(data);
      setHistory((prev) => [data.issue, ...prev]);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function updateField<K extends keyof IssuePayload>(
    key: K,
    value: IssuePayload[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl space-y-8">
        {/* Top: 2-column layout */}
        <div className="grid gap-8 md:grid-cols-2">
          {/* LEFT: Intake form */}
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
            <h1 className="text-2xl font-semibold mb-2">
              WarrantyFlow – Supplier Issue Intake
            </h1>
            <p className="text-sm text-slate-400 mb-4">
              Submit a supplier warranty or returns issue. The agent will classify
              the issue, apply policy and order context, and propose a decision.
            </p>
  
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Supplier ID
                </label>
                <input
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                  value={form.supplierId}
                  onChange={(e) => updateField("supplierId", e.target.value)}
                  required
                />
              </div>
  
              <div>
                <label className="block text-sm font-medium mb-1">
                  Order ID
                </label>
                <input
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                  value={form.orderId}
                  onChange={(e) => updateField("orderId", e.target.value)}
                  required
                />
              </div>
  
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">SKU</label>
                  <input
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                    value={form.sku}
                    onChange={(e) => updateField("sku", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm"
                    value={form.quantity}
                    onChange={(e) =>
                      updateField("quantity", Number(e.target.value) || 1)
                    }
                    required
                  />
                </div>
              </div>
  
              <div>
                <label className="block text-sm font-medium mb-1">
                  Issue description
                </label>
                <textarea
                  className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm min-h-[100px]"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Example: 10 units arrived damaged with cracked housings..."
                  required
                />
              </div>
  
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? "Submitting..." : "Submit issue"}
              </button>
  
              {error && (
                <p className="text-sm text-red-400 mt-2">Error: {error}</p>
              )}
            </form>
          </section>
  
          {/* RIGHT: Agent decision */}
          <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-2">Agent decision</h2>
            <p className="text-sm text-slate-400 mb-4">
              The agent&apos;s classification, recommended action, reasoning, and
              any follow-up questions will appear here.
            </p>
  
            {!result && !loading && (
              <p className="text-sm text-slate-500">
                Submit an issue to see the agent&apos;s decision.
              </p>
            )}
  
            {loading && (
              <p className="text-sm text-slate-400">Thinking like an agent…</p>
            )}
  
            {result && (
              <div className="space-y-4">
                {/* Chips */}
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                    Outcome: {result.decision.outcome}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                    Issue type: {result.issue.issueType}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                    Action: {result.decision.action}
                  </span>
                </div>
  
                {/* Reasoning */}
                <div>
                  <h3 className="text-sm font-semibold mb-1">Reasoning</h3>
                  <p className="text-sm text-slate-200">
                    {result.decision.reasoning}
                  </p>
                </div>
  
                {/* Follow-up questions */}
                {result.decision.requiresFollowup &&
                  result.decision.followupQuestions &&
                  result.decision.followupQuestions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-1">
                        Follow-up questions
                      </h3>
                      <ul className="list-disc list-inside text-sm text-slate-200 space-y-1">
                        {result.decision.followupQuestions.map((q, idx) => (
                          <li key={idx}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
  
                {/* Agent action result */}
                {result.actionResult && (
                  <div className="border-t border-slate-800 pt-3">
                    <h3 className="text-sm font-semibold mb-1">
                      Agent action result
                    </h3>
                    <p className="text-sm text-slate-300">
                      {result.actionResult.message}
                    </p>
                  </div>
                )}
  
                {/* Footer */}
                <div className="pt-2 border-t border-slate-800 text-xs text-slate-500">
                  Issue ID: {result.issue.id}
                </div>
              </div>
            )}
          </section>
        </div>
  
        {/* NEW: Recent issues history */}
        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
          <h2 className="text-lg font-semibold mb-2">Recent issues</h2>
          <p className="text-sm text-slate-400 mb-4">
            Lightweight history of issues triaged in this session.
          </p>
  
          {history.length === 0 ? (
            <p className="text-sm text-slate-500">
              Submit an issue to start building history.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="text-left py-2 pr-4 font-medium">Issue ID</th>
                    <th className="text-left py-2 pr-4 font-medium">Order</th>
                    <th className="text-left py-2 pr-4 font-medium">SKU</th>
                    <th className="text-left py-2 pr-4 font-medium">Type</th>
                    <th className="text-left py-2 pr-4 font-medium">Qty</th>
                    <th className="text-left py-2 pr-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((issue) => (
                    <tr
                      key={issue.id}
                      className="border-b border-slate-900 hover:bg-slate-800/60"
                    >
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {issue.id}
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-100">
                            {issue.orderId}
                          </span>
                          <span className="text-xs text-slate-500">
                            Supplier: {issue.supplierId}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 pr-4 text-slate-100">{issue.sku}</td>
                      <td className="py-2 pr-4 text-slate-100">
                        {issue.issueType}
                      </td>
                      <td className="py-2 pr-4 text-slate-100">
                        {issue.quantity}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-400">
                        {issue.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}