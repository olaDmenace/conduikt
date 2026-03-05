"use client";

import { useState } from "react";
import { Loader2, Copy, Trophy, Sparkles } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { useToast } from "@/src/components/ui/toast";

interface VariantPanelProps {
  originalContent: string;
  projectId: string;
  agentId: string;
  assetId?: string;
  onPickWinner?: (content: string, label: string) => void;
}

export function VariantPanel({
  originalContent,
  projectId,
  agentId,
  onPickWinner,
}: VariantPanelProps) {
  const { toast } = useToast();
  const [variants, setVariants] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [winner, setWinner] = useState<number | null>(null);

  const allVariants = [originalContent, ...variants];
  const labels = ["A", "B", "C", "D"];

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          agentId,
          originalContent,
          variantCount: 2,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        toast(err.error || "Failed to generate variants", "error");
        return;
      }

      const data = await res.json();
      setVariants(data.variants);
      toast("2 variants generated!", "success");
    } catch {
      toast("Failed to generate variants", "error");
    } finally {
      setGenerating(false);
    }
  }

  function handlePickWinner(index: number) {
    setWinner(index);
    toast(`Variant ${labels[index]} selected as winner`, "success");
    onPickWinner?.(allVariants[index], `Variant ${labels[index]}`);
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    toast("Copied to clipboard", "info");
  }

  if (variants.length === 0) {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={handleGenerate}
        disabled={generating || !originalContent}
      >
        {generating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1" />
        )}
        {generating ? "Generating Variants..." : "Generate Variants"}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-border-default bg-surface-0 overflow-hidden">
      {/* Variant tabs */}
      <div className="flex items-center border-b border-border-default bg-surface-1">
        {allVariants.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`relative px-4 py-2.5 text-small font-medium transition-colors ${
              activeTab === i
                ? "text-accent bg-surface-0"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Variant {labels[i]}
            {i === 0 && (
              <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0">
                Original
              </Badge>
            )}
            {winner === i && (
              <Trophy className="inline ml-1 h-3 w-3 text-warning" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="whitespace-pre-wrap text-body text-text-secondary max-h-[300px] overflow-y-auto">
          {allVariants[activeTab]}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-default">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => handleCopy(allVariants[activeTab])}
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            Copy
          </Button>
          {winner !== activeTab && (
            <Button
              size="sm"
              onClick={() => handlePickWinner(activeTab)}
            >
              <Trophy className="h-3.5 w-3.5 mr-1" />
              Pick as Winner
            </Button>
          )}
          {winner === activeTab && (
            <Badge variant="success" className="ml-1">
              Winner
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
