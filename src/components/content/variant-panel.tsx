"use client";

import { useState } from "react";
import { Copy, Trophy, Sparkles } from "@/src/components/ui/lucide-icons";
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
  // `activeTab` and `winner` are positional indices into `allVariants`. This
  // is safe because variants are set once via `setVariants(data.variants)`
  // (full replace, never insert/delete/reorder) and the Generate button only
  // shows when `variants.length === 0`. If reorder/edit-variant UI is ever
  // added, switch this state to be keyed by a stable id (e.g., variant label
  // or a generated uid) so the active selection survives mutations.
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
      toast("2 variants ready", "success");
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
        variant="outline"
        onClick={handleGenerate}
        disabled={generating || !originalContent}
      >
        {!generating && <Sparkles className="h-3.5 w-3.5" />}
        {generating ? "Writing variants…" : "Generate variants"}
      </Button>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-ground overflow-hidden">
      {/* Variant tabs */}
      <div className="flex items-center border-b border-line bg-surface">
        {allVariants.map((_, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            className={`relative px-4 py-2.5 text-body-s font-medium transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
              activeTab === i
                ? "bg-ground text-accent"
                : "text-text-3 hover:text-text-2"
            }`}
          >
            Variant {labels[i]}
            {i === 0 && (
              <Badge variant="secondary" className="ml-1.5">
                Original
              </Badge>
            )}
            {winner === i && (
              <Trophy className="inline ml-1 h-3 w-3 text-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="whitespace-pre-wrap text-body text-text-2 max-h-[300px] overflow-y-auto">
          {allVariants[activeTab]}
        </div>

        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-line">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleCopy(allVariants[activeTab])}
          >
            <Copy className="h-3.5 w-3.5" />
            Copy
          </Button>
          {winner !== activeTab && (
            <Button
              size="sm"
              onClick={() => handlePickWinner(activeTab)}
            >
              <Trophy className="h-3.5 w-3.5" />
              Pick as winner
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
