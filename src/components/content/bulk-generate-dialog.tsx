"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, Zap, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";
import { useToast } from "@/src/components/ui/toast";
import { QuotaBadge } from "@/src/components/generation/quota-badge";

interface BulkGenerateDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  agentId: string;
  agentName: string;
}

export function BulkGenerateDialog({
  open,
  onClose,
  projectId,
  agentId,
  agentName,
}: BulkGenerateDialogProps) {
  const { toast } = useToast();
  const [inputText, setInputText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ completed: 0, failed: 0, total: 0, status: "running" });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const inputs = inputText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function handleSubmit() {
    if (inputs.length === 0) return;
    setSubmitting(true);

    try {
      const res = await fetch("/api/bulk-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, agentId, inputs }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to start bulk job", "error");
        setSubmitting(false);
        return;
      }

      const data = await res.json();
      setJobId(data.jobId);
      setProgress({ completed: 0, failed: 0, total: data.total, status: "running" });

      // Poll for progress
      pollRef.current = setInterval(async () => {
        const statusRes = await fetch(`/api/bulk-jobs/${data.jobId}`);
        if (statusRes.ok) {
          const job = await statusRes.json();
          setProgress({
            completed: job.completed,
            failed: job.failed,
            total: job.total,
            status: job.status,
          });
          if (job.status !== "running") {
            if (pollRef.current) clearInterval(pollRef.current);
            toast(
              `Bulk generation complete: ${job.completed}/${job.total} pieces ready`,
              job.failed > 0 ? "warning" : "success"
            );
          }
        }
      }, 3000);
    } catch {
      toast("Failed to start bulk generation", "error");
    }
    setSubmitting(false);
  }

  const pct = progress.total > 0
    ? Math.round(((progress.completed + progress.failed) / progress.total) * 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bulk Generate — {agentName}</DialogTitle>
          <DialogDescription>
            Paste up to 30 topics or keywords, one per line. Each will generate a separate piece of content.
          </DialogDescription>
        </DialogHeader>

        {!jobId ? (
          <div className="space-y-4 mt-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={"social media marketing tips\nemail marketing best practices\nSEO for startups\n..."}
              className="w-full h-40 rounded-lg border border-border-default bg-surface-1 px-3 py-2 text-body text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            {/* Cost = min(inputs, 30) — bulk jobs charge one generation per
                processed item. Passing the accurate count lets QuotaBadge
                render the "will exceed remaining" warning up-front. */}
            <QuotaBadge cost={Math.max(1, Math.min(inputs.length, 30))} />

            <div className="flex items-center justify-between">
              <p className="text-small text-text-tertiary">
                {inputs.length} item{inputs.length !== 1 ? "s" : ""} (max 30)
              </p>
              <Button
                onClick={handleSubmit}
                disabled={submitting || inputs.length === 0}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Zap className="h-4 w-4 mr-1" />
                )}
                Generate {Math.min(inputs.length, 30)} Pieces
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-small">
                <span className="text-text-secondary">
                  {progress.status === "running"
                    ? `Generating ${progress.total} pieces...`
                    : "Generation complete"}
                </span>
                <span className="text-text-tertiary font-mono">
                  {progress.completed + progress.failed}/{progress.total}
                </span>
              </div>
              <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-4 text-small">
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {progress.completed} completed
              </span>
              {progress.failed > 0 && (
                <span className="flex items-center gap-1 text-error">
                  <XCircle className="h-3.5 w-3.5" />
                  {progress.failed} failed
                </span>
              )}
            </div>

            {progress.status !== "running" && (
              <Button className="w-full" onClick={onClose}>
                Done
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
