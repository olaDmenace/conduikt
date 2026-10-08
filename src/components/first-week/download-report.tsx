"use client";

import * as React from "react";
import { Button } from "@/src/components/ui/button";
import { Download } from "@/src/components/ui/lucide-icons";

// Download a server-rendered PDF (GET, or POST with a JSON body) and save
// it with a sensible filename. Shows "Preparing PDF…" while the server
// renders, and a plain message if it fails.
export function DownloadReport({
  href,
  body,
  filename,
  label = "Download report",
  variant = "outline",
  size = "md",
}: {
  href: string;
  /** When set, the report is requested with POST and this JSON body. */
  body?: unknown;
  filename: string;
  label?: string;
  variant?: "outline" | "primary" | "quiet";
  size?: "sm" | "md" | "lg";
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        href,
        body === undefined
          ? undefined
          : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setError("The PDF didn't download. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant={variant} size={size} onClick={download} disabled={busy}>
        <Download className="h-4 w-4" />
        {busy ? "Preparing PDF…" : label}
      </Button>
      {error && (
        <span role="alert" className="text-caption text-danger">
          {error}
        </span>
      )}
    </span>
  );
}
