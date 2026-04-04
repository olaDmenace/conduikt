"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { useToast } from "@/src/components/ui/toast";

interface PdfDownloadButtonProps {
  href: string;
  filename?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
}

export function PdfDownloadButton({
  href,
  filename = "export.pdf",
  size = "sm",
  variant = "secondary",
  className,
}: PdfDownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleDownload() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(href);
      if (!res.ok) throw new Error("Failed to generate PDF");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast("Failed to generate PDF. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleDownload}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      {loading ? "Generating…" : "Export PDF"}
    </Button>
  );
}
