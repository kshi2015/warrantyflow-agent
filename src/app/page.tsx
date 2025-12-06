"use client";

import { useState } from "react";
import { IssuePayload, IssueDecision, Issue } from "@/lib/types";

interface ApiResponse {
  issue: Issue;
  decision: IssueDecision;
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
      <div className="w-full max-w-4xl grid gap-8 md:grid-cols-2">
        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
          <h1 className="text-2xl font-semibold mb-2">
            WarrantyFlow – Supplier Issue Intake
          </h1>
          <p className="text-sm text-slate-400 mb-4">
            Submit a supplier warranty or returns issue. The agent will classify
            the issue and propose a decision.
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

        <section className="bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-2">Agent decision</h2>
          <p className="text-sm text-slate-400 mb-4">
            The agent&apos;s recommended action, reasoning, and any follow-up
            questions will appear here.
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
            <div className="space-y-3">
              <div>
                <span className="inline-flex items-center rounded-full bg-slate-800 px-3 py-1 text-xs font-medium uppercase tracking-wide">
                  Outcome: {result.decision.outcome}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-1">Reasoning</h3>
                <p className="text-sm text-slate-200">
                  {result.decision.reasoning}
                </p>
              </div>
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
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-500">
                Issue ID: {result.issue.id}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
