"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  GripVertical,
} from "@/src/components/ui/lucide-icons";
import { Button, IconButton } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { AGENT_REGISTRY } from "@/src/lib/ai/agents/registry";

interface WizardStep {
  // Client-only stable id for React keys. Same agent can appear twice in
  // a pipeline (e.g., two blog-post steps), so agent_id alone isn't unique.
  // Stripped before sending to the API.
  _uid: string;
  agent_id: string;
  config: Record<string, unknown>;
}

function newUid() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
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
    name: "Blog post, then social posts",
    description: "Write a blog post, then posts to share it",
    steps: [
      { agent_id: "blog-post", config: {} },
      { agent_id: "social-content", config: {} },
    ],
  },
  {
    name: "Check, fix, plan",
    description: "Check your site, rewrite the copy that needs it, then make a growth plan",
    steps: [
      { agent_id: "seo-audit", config: {} },
      { agent_id: "copywriting", config: {} },
      { agent_id: "growth-playbook", config: {} },
    ],
  },
  {
    name: "A month of content",
    description: "Find what people search for, then write blog posts, social posts and an email series",
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
    setSteps((prev) => [...prev, { _uid: newUid(), agent_id: agentId, config: {} }]);
  }

  function removeStep(index: number) {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    setCreating(true);
    setError("");

    // Strip client-only _uid before sending to the API.
    const apiSteps = steps.map((s) => ({ agent_id: s.agent_id, config: s.config }));

    const res = await fetch(`/api/projects/${projectId}/campaigns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, steps: apiSteps }),
    });

    if (res.ok) {
      onCreated();
      onClose();
    } else {
      const err = await res.json();
      setError(err.error || "Couldn't make the campaign. Try again.");
    }
    setCreating(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-overlay/60"
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-wizard-title"
        className="relative mx-4 max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)]"
      >
        <IconButton
          label="Close"
          size="sm"
          onClick={onClose}
          className="absolute right-4 top-4"
        >
          <X className="h-4 w-4" />
        </IconButton>

        <h2 id="campaign-wizard-title" className="mb-1 text-heading text-text">
          New campaign
        </h2>
        <p className="mb-6 text-body-s text-text-2">
          Chain agents into one run. Each step uses what the last one made.
        </p>

        <AnimatePresence mode="wait">
          {/* Phase 1: Name */}
          {phase === "name" && (
            <motion.div
              key="name"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              {/* Quick-start templates */}
              <p className="mb-2 text-label text-text-3">
                Start from a template
              </p>
              <div className="grid gap-2 mb-6">
                {CAMPAIGN_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => {
                      setName(tpl.name);
                      setSteps(tpl.steps.map((s) => ({ ...s, _uid: newUid() })));
                      setPhase("review");
                    }}
                    className="hover-card hover-card-quiet rounded-md border border-line bg-surface p-3 text-left"
                  >
                    <p className="text-title text-text">
                      {tpl.name}
                    </p>
                    <p className="text-body-s text-text-3 mt-0.5">
                      {tpl.description} ({tpl.steps.length} steps)
                    </p>
                  </button>
                ))}
              </div>

              <div className="relative flex items-center mb-6">
                <div className="flex-1 border-t border-line" />
                <span className="px-3 text-caption text-text-3">or build your own</span>
                <div className="flex-1 border-t border-line" />
              </div>

              <label htmlFor="campaign-name" className="mb-1.5 block text-body-s text-text-2">
                Campaign name
              </label>
              <input
                id="campaign-name"
                type="text"
                placeholder="Try: Spring launch"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                className="mb-6 h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <p className="mb-3 text-label text-text-3">
                Steps ({steps.length})
              </p>

              {/* Current steps */}
              {steps.length > 0 && (
                <div className="space-y-2 mb-4">
                  {steps.map((step, i) => {
                    const def = AGENT_REGISTRY.find(
                      (a) => a.id === step.agent_id
                    );
                    return (
                      <div
                        key={step._uid}
                        className="flex items-center gap-3 rounded-md border border-line bg-ground p-3"
                      >
                        <GripVertical className="h-4 w-4 shrink-0 text-text-3" />
                        <span className="w-6 font-mono text-caption text-text-3">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-body text-text">
                          {def?.name || step.agent_id}
                        </span>
                        <Badge variant="secondary">{def?.category}</Badge>
                        <IconButton
                          label="Remove step"
                          size="sm"
                          onClick={() => removeStep(i)}
                          className="hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Agent picker */}
              <p className="text-body-s text-text-2 mb-2">
                Add an agent:
              </p>
              <div className="grid grid-cols-2 gap-2 mb-6 max-h-48 overflow-y-auto">
                {availableAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => addStep(agent.id)}
                    className="flex items-center gap-2 rounded-md border border-line bg-surface p-2.5 text-left transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:bg-surface-2"
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0 text-text-3" />
                    <div className="min-w-0">
                      <p className="text-body-s font-medium text-text truncate">
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
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <Card className="mb-4 bg-ground">
                <p className="mb-1 text-label text-text-3">Campaign</p>
                <p className="text-title text-text">{name}</p>
                <p className="mt-1 text-body-s text-text-2">
                  {steps.length} step{steps.length !== 1 ? "s" : ""}. Each one
                  uses what the last one made.
                </p>
              </Card>

              <div className="space-y-2 mb-6">
                {steps.map((step, i) => {
                  const def = AGENT_REGISTRY.find(
                    (a) => a.id === step.agent_id
                  );
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-3 rounded-md border border-line bg-ground p-3"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-caption text-text-2">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-title text-text">
                          {def?.name}
                        </p>
                        <p className="text-body-s text-text-3">
                          {def?.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && (
                <p className="mb-4 text-body-s text-danger">{error}</p>
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
                  {!creating && <Plus className="h-4 w-4" />}
                  {creating ? "Making…" : "Make campaign"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
