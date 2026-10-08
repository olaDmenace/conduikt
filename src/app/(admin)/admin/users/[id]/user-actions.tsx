"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/ui/button";

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
        setMessage({ text: "Done.", type: "success" });
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
      <div className="flex flex-wrap items-center gap-3">
        {/* Change Plan */}
        {planMode ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value)}
              className="h-9 rounded-md border border-line-strong bg-surface px-3 text-body-s text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {PLANS.map((p) => (
                <option key={p} value={p} className="capitalize">
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
            <Button
              onClick={() => callAction("change_plan", { plan: selectedPlan })}
              disabled={loading === "change_plan" || selectedPlan === currentPlan}
            >
              {loading === "change_plan" ? "Saving…" : "Confirm"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => { setPlanMode(false); setSelectedPlan(currentPlan); }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setPlanMode(true)}>
            Change plan
          </Button>
        )}

        {/* Reset Count */}
        <Button
          variant="outline"
          onClick={() => {
            if (confirm("Reset this user's content count to 0?")) {
              callAction("reset_count");
            }
          }}
          disabled={loading === "reset_count"}
        >
          {loading === "reset_count" ? "Resetting…" : "Reset content count"}
        </Button>

        {/* Disable Account */}
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Disable this account? The user will be unable to sign in.")) {
              callAction("disable");
            }
          }}
          disabled={loading === "disable"}
        >
          {loading === "disable" ? "Disabling…" : "Disable account"}
        </Button>

        {/* Re-enable Account */}
        <Button
          variant="outline"
          onClick={() => {
            if (confirm("Re-enable this account?")) {
              callAction("enable");
            }
          }}
          disabled={loading === "enable"}
        >
          {loading === "enable" ? "Enabling…" : "Re-enable account"}
        </Button>
      </div>

      {message && (
        <p
          className={`text-body-s ${message.type === "success" ? "text-teal" : "text-danger"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
