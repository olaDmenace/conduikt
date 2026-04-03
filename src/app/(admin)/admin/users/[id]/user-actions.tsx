"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = ["free", "pro", "growth", "agency"] as const;

export function UserActions({
  userId,
  currentPlan,
}: {
  userId: string;
  currentPlan: string;
}) {
  const router = useRouter();
  const [planMode, setPlanMode] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(currentPlan);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  async function callAction(action: string, extra?: Record<string, string>) {
    setLoading(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ text: data.error ?? "Something went wrong", type: "error" });
      } else {
        setMessage({ text: "Done!", type: "success" });
        setPlanMode(false);
        router.refresh();
      }
    } catch {
      setMessage({ text: "Network error", type: "error" });
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 items-center">
        {/* Change Plan */}
        {planMode ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="rounded-lg border border-border-default bg-surface-2 px-3 py-2 text-[0.8125rem] text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
            >
              {PLANS.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
            <button
              onClick={() => callAction("change_plan", { plan: selectedPlan })}
              disabled={loading === "change_plan" || selectedPlan === currentPlan}
              className="rounded-lg border border-accent bg-accent/10 px-4 py-2 text-[0.8125rem] font-medium text-accent hover:bg-accent/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "change_plan" ? "Saving…" : "Confirm"}
            </button>
            <button
              onClick={() => { setPlanMode(false); setSelectedPlan(currentPlan); }}
              className="rounded-lg border border-border-default bg-surface-2 px-4 py-2 text-[0.8125rem] font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setPlanMode(true)}
            className="rounded-lg border border-border-default bg-surface-2 px-4 py-2 text-[0.8125rem] font-medium text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors"
          >
            Change Plan
          </button>
        )}

        {/* Reset Count */}
        <button
          onClick={() => {
            if (confirm("Reset this user's generation count to 0?")) {
              callAction("reset_count");
            }
          }}
          disabled={loading === "reset_count"}
          className="rounded-lg border border-border-default bg-surface-2 px-4 py-2 text-[0.8125rem] font-medium text-text-secondary hover:text-text-primary hover:border-accent/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "reset_count" ? "Resetting…" : "Reset Generation Count"}
        </button>

        {/* Disable Account */}
        <button
          onClick={() => {
            if (confirm("Disable this account? The user will be unable to sign in.")) {
              callAction("disable");
            }
          }}
          disabled={loading === "disable"}
          className="rounded-lg border border-error/30 bg-error/5 px-4 py-2 text-[0.8125rem] font-medium text-error hover:bg-error/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "disable" ? "Disabling…" : "Disable Account"}
        </button>

        {/* Re-enable Account */}
        <button
          onClick={() => {
            if (confirm("Re-enable this account?")) {
              callAction("enable");
            }
          }}
          disabled={loading === "enable"}
          className="rounded-lg border border-success/30 bg-success/5 px-4 py-2 text-[0.8125rem] font-medium text-success hover:bg-success/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading === "enable" ? "Enabling…" : "Re-enable Account"}
        </button>
      </div>

      {message && (
        <p
          className={`text-small ${message.type === "success" ? "text-success" : "text-error"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
