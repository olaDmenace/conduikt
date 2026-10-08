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
} from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { AI_AGENT_COUNT } from "@/src/lib/ai/agents/display";

const steps = [
  {
    icon: Sparkles,
    title: "Welcome to Conduikt",
    description:
      "Your marketing, done every week. Here's how it works in about a minute.",
    hint: "Let's start.",
  },
  {
    icon: FolderPlus,
    title: "Create a project",
    description:
      "Add your website to unlock every agent. Each project keeps its own audits, content library and analytics.",
    hint: "Dashboard > New project",
  },
  {
    icon: Search,
    title: "Check your site",
    description:
      "Site Audit looks at your pages and gives you specific fixes. The other agents use what it finds to write better content.",
    hint: "Project > Site Audit > Run audit",
  },
  {
    icon: PenLine,
    title: "Write something",
    description:
      `${AI_AGENT_COUNT} agents write blog posts, social posts, email series, sales copy, keyword lists and more, all in your brand voice.`,
    hint: "Project > Content Studio",
  },
  {
    icon: Calendar,
    title: "Schedule and post",
    description:
      "Plan your calendar, schedule posts and publish straight to X and LinkedIn. Conduikt watches how each one does and gets better next week.",
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
        className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay/60"
      >
        <motion.div
          key={currentStep}
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-tour-title"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          className="relative mx-4 w-full max-w-lg rounded-lg border border-line bg-surface p-6 shadow-[var(--shadow-float)] md:p-8"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={finish}
            className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-text-3 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:bg-surface-2 hover:text-text"
            aria-label="Skip tour"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Step indicator */}
          <div className="mb-6 flex items-center gap-1.5" aria-hidden>
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all duration-[var(--duration-base)] ${
                  i === currentStep
                    ? "w-8 bg-accent"
                    : i < currentStep
                    ? "w-4 bg-text-3"
                    : "w-4 bg-surface-2"
                }`}
              />
            ))}
          </div>

          {/* Icon */}
          <Icon className="mb-4 h-6 w-6 text-text-3" aria-hidden />

          {/* Content */}
          <p className="mb-2 text-label text-text-3">
            Step {currentStep + 1} of {steps.length}
          </p>
          <h2 id="onboarding-tour-title" className="mb-2 text-heading text-text">{step.title}</h2>
          <p className="mb-3 text-body text-text-2">
            {step.description}
          </p>
          <p className="font-mono text-caption text-text-3">{step.hint}</p>

          {/* Actions */}
          <div className="mt-8 flex items-center justify-between">
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
                  Get started
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
