"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Loader2,
  GripVertical,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";

interface WizardStep {
  agent_id: string;
  config: Record<string, unknown>;
}

interface CampaignWizardProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

const availableAgents = AGENT_REGISTRY.filter(
  (a) => a.status === "active" && a.id !== "campaigns"
);

const CAMPAIGN_TEMPLATES = [
  {
    name: "Blog → Social Promotion",
    description: "Write a blog post, then generate social promotion for it",
    steps: [
      { agent_id: "blog-post", config: {} },
      { agent_id: "social-content", config: {} },
    ],
  },
  {
    name: "Audit → Fix → Report",
    description: "Run an SEO audit, generate copy fixes, then create a growth plan",
    steps: [
      { agent_id: "seo-audit", config: {} },
      { agent_id: "copywriting", config: {} },
      { agent_id: "growth-playbook", config: {} },
    ],
  },
  {
    name: "Monthly Content Sprint",
    description: "Keyword research → blog posts → social content → email sequence",
    steps: [
      { agent_id: "keyword-research", config: {} },
      { agent_id: "blog-post", config: {} },
      { agent_id: "social-content", config: {} },
      { agent_id: "email-sequence", config: {} },
    ],
  },
];

export function CampaignWizard({
  projectId,
  onClose,
  onCreated,
}: CampaignWizardProps) {
  const [phase, setPhase] = useState<"name" | "steps" | "review">("name");
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<WizardStep[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  function addStep(agentId: string) {
    setSteps((prev) => [...prev, { agent_id: agentId, config: {} }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setCreating(true);
    setError("");

    const res = await fetch(`/api/projects/${projectId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, steps }),
    });

    if (res.ok) {
      onCreated();
      onClose();
    } else {
      const err = await res.json();
      setError(err.error || "Failed to create campaign");
    }
    setCreating(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-surface-0/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative w-full max-w-2xl mx-4 max-h-[85vh] overflow-y-auto rounded-2xl border border-border-default bg-surface-1 p-6 shadow-[var(--shadow-elevated)]"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="text-h2 text-text-primary mb-1">Create Campaign</h2>
        <p className="text-small text-text-secondary mb-6">
          Chain AI agents together to build a multi-step marketing pipeline.
        </p>

        <AnimatePresence mode="wait">
          {/* Phase 1: Name */}
          {phase === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              {/* Quick-start templates */}
              <p className="text-caption text-text-tertiary mb-2">
                Start from a template
              </p>
              <div className="grid gap-2 mb-6">
                {CAMPAIGN_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => {
                      setName(tpl.name);
                      setSteps(tpl.steps.map((s) => ({ ...s })));
                      setPhase("review");
                    }}
                    className="text-left rounded-lg border border-border-default bg-surface-0 p-3 hover:border-accent hover:bg-surface-2 transition-colors"
                  >
                    <p className="text-body font-medium text-text-primary">
                      {tpl.name}
                    </p>
                    <p className="text-small text-text-tertiary mt-0.5">
                      {tpl.description} ({tpl.steps.length} steps)
                    </p>
                  </button>
                ))}
              </div>

              <div className="relative flex items-center mb-6">
                <div className="flex-1 border-t border-border-default" />
                <span className="px-3 text-caption text-text-tertiary">or build custom</span>
                <div className="flex-1 border-t border-border-default" />
              </div>

              <label className="text-caption text-text-tertiary mb-2 block">
                Campaign Name
              </label>
              <input
                type="text"
                placeholder="e.g., Q1 Launch Sequence"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] mb-6"
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  disabled={!name.trim()}
                  onClick={() => setPhase("steps")}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Phase 2: Add Steps */}
          {phase === "steps" && (
            <motion.div
              key="steps"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <label className="text-caption text-text-tertiary mb-3 block">
                Pipeline Steps ({steps.length})
              </label>

              {/* Current steps */}
              {steps.length > 0 && (
                <div className="space-y-2 mb-4">
                  {steps.map((step, i) => {
                    const def = AGENT_REGISTRY.find(
                      (a) => a.id === step.agent_id
                    );
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-0 p-3"
                      >
                        <GripVertical className="h-4 w-4 text-text-tertiary shrink-0" />
                        <span className="text-caption text-accent font-mono w-6">
                          {i + 1}
                        </span>
                        <span className="text-body text-text-primary flex-1">
                          {def?.name || step.agent_id}
                        </span>
                        <Badge variant="secondary">{def?.category}</Badge>
                        <button
                          onClick={() => removeStep(i)}
                          className="p-1.5 rounded text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Agent picker */}
              <p className="text-small text-text-secondary mb-2">
                Add an agent to the pipeline:
              </p>
              <div className="grid grid-cols-2 gap-2 mb-6 max-h-48 overflow-y-auto">
                {availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => addStep(agent.id)}
                    className="flex items-center gap-2 rounded-lg border border-border-default bg-surface-0 p-2.5 text-left hover:border-accent hover:bg-surface-2 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5 text-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-small font-medium text-text-primary truncate">
                        {agent.shortName}
                      </p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase("name")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="sm"
                  disabled={steps.length === 0}
                  onClick={() => setPhase("review")}
                >
                  Review
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* Phase 3: Review */}
          {phase === "review" && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <Card className="mb-4">
                <CardContent>
                  <p className="text-caption text-text-tertiary mb-1">
                    Campaign
                  </p>
                  <p className="text-h3 text-text-primary">{name}</p>
                  <p className="text-small text-text-secondary mt-1">
                    {steps.length} step{steps.length !== 1 ? "s" : ""} — output
                    from each step feeds into the next
                  </p>
                </CardContent>
              </Card>

              <div className="space-y-2 mb-6">
                {steps.map((step, i) => {
                  const def = AGENT_REGISTRY.find(
                    (a) => a.id === step.agent_id
                  );
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-lg bg-surface-0 border border-border-default p-3"
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/10 text-accent text-caption font-mono">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-body font-medium text-text-primary">
                          {def?.name}
                        </p>
                        <p className="text-small text-text-tertiary">
                          {def?.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="text-small text-error mb-4">{error}</p>
              )}

              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase("steps")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  {creating ? "Creating..." : "Create Campaign"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
