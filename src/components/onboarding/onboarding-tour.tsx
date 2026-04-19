"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  FolderPlus,
  Search,
  PenLine,
  Calendar,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to Conduikt",
    description:
      "Your AI marketing command center. We'll walk you through the key features in 60 seconds.",
    hint: "Let's get started!",
  },
  {
    icon: FolderPlus,
    title: "Create a Project",
    description:
      "Connect your website URL to unlock all AI agents. Each project gets its own audit history, content library, and analytics.",
    hint: "Head to Dashboard > New Project",
  },
  {
    icon: Search,
    title: "Run an SEO Audit",
    description:
      "Get a comprehensive technical and on-page analysis with specific, actionable fixes. Your AI agents will use these insights to create better content.",
    hint: "Project > SEO Audit > Run Audit",
  },
  {
    icon: PenLine,
    title: "Generate Content",
    description:
      "Use 10 AI agents to create blog posts, social content, email sequences, copywriting, keyword research, and more — all tailored to your brand voice.",
    hint: "Project > Content Studio",
  },
  {
    icon: Calendar,
    title: "Schedule & Publish",
    description:
      "Manage your content calendar, schedule posts, and publish directly to X and LinkedIn. Email sequences export to your ESP. Track performance and let the AI learn from results.",
    hint: "Project > Calendar",
  },
];

interface OnboardingTourProps {
  onComplete: () => void;
}

export function OnboardingTour({ onComplete }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;
  const step = steps[currentStep];
  const Icon = step.icon;

  async function finish() {
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboarding_completed: true }),
      });
    } catch {
      // Silent fail — onboarding still completes locally
    }
    onComplete();
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-surface-0/80 backdrop-blur-sm"
      >
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-lg mx-4 rounded-2xl border border-border-default bg-surface-1 p-8 shadow-[var(--shadow-elevated)]"
        >
          {/* Close button */}
          <button
            onClick={finish}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step indicator */}
          <div className="flex items-center gap-1.5 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-300 ${
                  i === currentStep
                    ? "w-8 bg-accent"
                    : i < currentStep
                    ? "w-4 bg-accent/40"
                    : "w-4 bg-surface-3"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <div className="mb-6 rounded-xl bg-accent-muted p-4 w-fit">
            <Icon className="h-8 w-8 text-accent" />
          </div>

          {/* Content */}
          <h2 className="text-h2 text-text-primary mb-2">{step.title}</h2>
          <p className="text-body text-text-secondary mb-2">
            {step.description}
          </p>
          <p className="text-small text-text-tertiary italic">{step.hint}</p>

          {/* Step counter */}
          <p className="text-caption text-text-tertiary mt-6 mb-4">
            Step {currentStep + 1} of {steps.length}
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div>
              {!isFirst && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep((s) => s - 1)}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={finish}>
                Skip
              </Button>
              {isLast ? (
                <Button size="sm" onClick={finish}>
                  <CheckCircle2 className="h-4 w-4" />
                  Get Started
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setCurrentStep((s) => s + 1)}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
