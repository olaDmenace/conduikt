"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  ArrowUpRight,
} from "@/src/components/ui/lucide-icons";
import { Card, CardContent } from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";
import { BUSINESS_TYPES, PLAYBOOKS, playbookFor, type BusinessType } from "@/src/lib/playbooks";

// The new-project wizard: one adaptive questionnaire (audit §5.8).
// 1 What kind of business  2 Your website  3 Questions from the playbook
// 4 About your business (the old brand profile)  5 Site check.

type Step = "type" | "site" | "questions" | "profile" | "audit";

const STEPS: { id: Step; label: string }[] = [
  { id: "type", label: "Business" },
  { id: "site", label: "Website" },
  { id: "questions", label: "Questions" },
  { id: "profile", label: "About you" },
  { id: "audit", label: "Check" },
];

interface AuditProgress {
  fetching: "pending" | "running" | "done" | "error";
  analyzing: "pending" | "running" | "done" | "error";
  saving: "pending" | "running" | "done" | "error";
}

// Brand-profile choices, the same as /projects/[id]/onboarding so the two
// pages edit the same answers.
const INDUSTRIES = [
  "SaaS",
  "Ecommerce",
  "Agency",
  "Healthcare",
  "Finance",
  "Education",
  "Real Estate",
  "Food & Beverage",
  "Fitness & Wellness",
  "Legal",
  "Travel",
  "Non-profit",
  "Media & Entertainment",
  "Retail",
  "Construction",
  "Consulting",
  "Fashion",
  "Technology",
  "Hospitality",
  "Other",
] as const;

const BRAND_VOICES = [
  "Professional",
  "Conversational",
  "Bold",
  "Friendly",
  "Educational",
  "Inspirational",
  "Witty",
  "Authoritative",
] as const;

const MARKETING_GOALS = [
  "Drive traffic",
  "Generate leads",
  "Build brand awareness",
  "Increase sales",
  "Grow social following",
  "Retain customers",
] as const;

const NAME_PLACEHOLDER: Record<BusinessType, string> = {
  saas: "Try: Acme Analytics",
  local: "Try: Ade's Plumbing",
  agency: "Try: Client name — Bright Bakery",
  creator: "Try: Your name or channel",
};

const AUDIENCE_PLACEHOLDER: Record<BusinessType, string> = {
  saas: "Try: founders of small online shops who do their own marketing",
  local: "Try: homeowners in Lekki who need a plumber the same day",
  agency: "Try: restaurant owners in Lagos with no marketing team",
  creator: "Try: first-time managers who want to lead better",
};

const textareaClass =
  "w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none";

const chip = (selected: boolean) =>
  `rounded-md border px-3 py-2 text-body-s text-left transition-colors ${
    selected
      ? "border-accent bg-accent-soft text-text"
      : "border-line bg-surface text-text-2 hover:bg-surface-2"
  }`;

export default function NewProjectPage() {
  const [step, setStep] = useState<Step>("type");

  // Step 1
  const [businessType, setBusinessType] = useState<BusinessType | null>(null);

  // Step 2
  const [projectName, setProjectName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [noWebsite, setNoWebsite] = useState(false);
  const [businessLocation, setBusinessLocation] = useState("");
  const [servicesText, setServicesText] = useState("");
  const [description, setDescription] = useState("");

  // Step 3
  const [setupAnswers, setSetupAnswers] = useState<Record<string, string | string[]>>({});
  const [currentQ, setCurrentQ] = useState(0);

  // Step 4
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [audiencePainPoint, setAudiencePainPoint] = useState("");
  const [valueProposition, setValueProposition] = useState("");
  const [brandVoice, setBrandVoice] = useState("");
  const [brandVoiceExample, setBrandVoiceExample] = useState("");
  const [primaryGoal, setPrimaryGoal] = useState("");
  const [competitors, setCompetitors] = useState<string[]>(["", "", ""]);

  // Step 5
  const [loading, setLoading] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [auditProgress, setAuditProgress] = useState<AuditProgress>({
    fetching: "pending",
    analyzing: "pending",
    saving: "pending",
  });
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");

  const router = useRouter();
  const { toast } = useToast();

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const playbook = playbookFor(businessType);
  const questions = playbook.questions;
  const q = questions[Math.min(currentQ, questions.length - 1)];

  function chooseBusinessType(t: BusinessType) {
    if (t !== businessType) {
      // The questions change with the playbook, so earlier answers no longer fit.
      setSetupAnswers({});
      setCurrentQ(0);
    }
    setBusinessType(t);
  }

  function handleSiteStep(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!projectName.trim()) {
      setError(noWebsite ? "Tell us the business name." : "Give the project a name.");
      return;
    }
    if (!noWebsite && !websiteUrl.trim()) {
      setError("Add your website, or tell us you don't have one yet.");
      return;
    }
    setStep("questions");
  }

  function handleSelectOption(questionId: string, option: string, multi?: boolean) {
    setSetupAnswers((prev) => {
      if (multi) {
        const current = (prev[questionId] as string[]) || [];
        const updated = current.includes(option)
          ? current.filter((o) => o !== option)
          : [...current, option];
        return { ...prev, [questionId]: updated };
      }
      return { ...prev, [questionId]: option };
    });
  }

  function isOptionSelected(questionId: string, option: string): boolean {
    const val = setupAnswers[questionId];
    if (Array.isArray(val)) return val.includes(option);
    return val === option;
  }

  function canAdvanceQuestion(): boolean {
    const val = setupAnswers[q.id];
    if (!val) return false;
    if (Array.isArray(val) && val.length === 0) return false;
    return true;
  }

  function updateCompetitor(index: number, value: string) {
    setCompetitors((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const services = servicesText
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    const activeChannels = setupAnswers.active_channels;
    const onlineChannels = (Array.isArray(activeChannels) ? activeChannels : []).filter(
      (c) => c !== "None yet"
    );
    const competitorUrls = competitors.map((c) => c.trim()).filter(Boolean);

    // Everything in one POST: project, playbook, answers and profile.
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: projectName,
        website_url: noWebsite ? null : websiteUrl,
        description: description || null,
        business_type: businessType,
        wants_hosted_page: noWebsite,
        business_location: businessLocation || null,
        services,
        onboarding_answers: setupAnswers,
        target_audience:
          targetAudience || audiencePainPoint
            ? {
                personas: targetAudience ? [targetAudience] : [],
                pain_points: audiencePainPoint ? [audiencePainPoint] : [],
              }
            : null,
        value_proposition: valueProposition || null,
        industry: industry || null,
        audience_pain_point: audiencePainPoint || null,
        online_channels: onlineChannels,
        brand_voice: brandVoice || null,
        brand_voice_example: brandVoiceExample || null,
        primary_goal: primaryGoal || null,
        competitors: competitorUrls,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(data.error || "We couldn't create the project. Try again.");
      setErrorCode(data.code ?? "");
      setLoading(false);
      return;
    }

    const newProjectId = data.id as string;
    setProjectId(newProjectId);
    toast("Project created", "success");
    setLoading(false);

    if (noWebsite || !websiteUrl) {
      // Nothing to check yet: Missing Pages builds their first page from the
      // answers (services + location). Start one page in the background and
      // land them where they can watch it.
      fetch(`/api/projects/${newProjectId}/missing-pages/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxPages: 1 }),
      }).catch(() => {});
      router.push(`/projects/${newProjectId}/missing-pages`);
      return;
    }

    setStep("audit");

    // Put every agent on the plan to work on the new site; the first-week
    // page shows them live. If that can't start, fall back to the audit.
    const started = await fetch("/api/onboarding/first-week", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: newProjectId }),
    })
      .then((r) => r.ok)
      .catch(() => false);
    if (started) {
      window.dispatchEvent(new Event("conduikt:generation"));
      router.push(`/projects/${newProjectId}/first-week`);
      return;
    }
    runAudit(newProjectId);
  }

  async function runAudit(auditProjectId?: string) {
    const pid = auditProjectId || projectId;
    setAuditProgress({
      fetching: "running",
      analyzing: "pending",
      saving: "pending",
    });

    try {
      const res = await fetch("/api/ai/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: pid, url: websiteUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAuditProgress((p) => ({ ...p, fetching: "error" }));
        toast(err.error || "Audit failed", "error");
        setTimeout(() => router.push(`/projects/${pid}`), 2000);
        return;
      }

      setAuditProgress({ fetching: "done", analyzing: "done", saving: "done" });
      toast("Site audit finished", "success");
      setTimeout(() => router.push(`/projects/${pid}/audit`), 1500);
    } catch {
      setAuditProgress((p) => ({ ...p, fetching: "error" }));
      toast(
        "Failed to run audit. You can retry from the project page.",
        "error"
      );
      setTimeout(() => router.push(`/projects/${pid}`), 2000);
    }
  }

  const errorBox = error && (
    <div className="rounded-lg border border-danger bg-surface-2 px-4 py-3 text-body-s text-danger">
      <p>{error}</p>
      {errorCode === "PROJECT_LIMIT" && (
        <Button size="sm" className="mt-3" asChild>
          <Link href="/settings/billing">
            Upgrade plan
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );

  return (
    // data-hide-chat: the support bubble sits exactly where Next lands on
    // narrow screens and opens the chat over the form. Hide it on the wizard.
    <div className="max-w-2xl mx-auto" data-hide-chat>
      <PageHeader
        title="New project"
        description="Five quick steps. Your answers shape what every agent does."
      />

      {/* Progress Steps */}
      <div className="flex items-center gap-3 mb-8" aria-label={`Step ${stepIndex + 1} of ${STEPS.length}`}>
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3">
            <div
              title={s.label}
              className={`flex h-8 w-8 items-center justify-center rounded-full font-mono text-body-s transition-colors ${
                step === s.id
                  ? "bg-accent text-white"
                  : i < stepIndex
                  ? "bg-teal-soft text-teal"
                  : "bg-surface-2 text-text-3"
              }`}
            >
              {i < stepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-10 ${i < stepIndex ? "bg-teal" : "bg-line"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: What kind of business */}
      {step === "type" && (
        <Card className="animate-in">
          <CardContent>
            <div className="mb-6 space-y-1">
              <h2 className="text-heading text-text">What kind of business is this?</h2>
              <p className="text-body-s text-text-2">
                This picks your channels, your first week, and the words we use.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup" aria-label="Kind of business">
              {BUSINESS_TYPES.map((t) => {
                const p = PLAYBOOKS[t];
                const selected = businessType === t;
                return (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => chooseBusinessType(t)}
                    className={`text-left rounded-lg border p-4 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] ${
                      selected
                        ? "border-accent bg-accent-soft"
                        : "border-line bg-surface hover:border-line-strong hover:bg-surface-2"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-title text-text">{p.label}</p>
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          selected ? "border-accent bg-accent" : "border-line-strong bg-ground"
                        }`}
                        aria-hidden
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </span>
                    </div>
                    <p className="mt-1.5 text-body-s text-text-2">{p.blurb}</p>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-6">
              <Button type="button" disabled={!businessType} onClick={() => setStep("site")}>
                Next
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Your website */}
      {step === "site" && businessType && (
        <Card className="animate-in">
          <CardContent>
            <div className="mb-6 space-y-1">
              <h2 className="text-heading text-text">Your website</h2>
              <p className="text-body-s text-text-2">
                {noWebsite
                  ? "We'll build your first page from your answers."
                  : "We'll create your project and check your site."}
              </p>
            </div>
            <form onSubmit={handleSiteStep} className="space-y-4">
              <Input
                label={noWebsite ? "Business name" : "Project name"}
                placeholder={NAME_PLACEHOLDER[businessType]}
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                required
              />

              {!noWebsite && (
                <Input
                  label="Website address"
                  type="url"
                  placeholder="Try: https://example.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              )}

              <button
                type="button"
                role="checkbox"
                aria-checked={noWebsite}
                onClick={() => setNoWebsite((v) => !v)}
                className={`flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left text-body transition-colors ${
                  noWebsite
                    ? "border-accent bg-accent-soft text-text"
                    : "border-line bg-surface text-text-2 hover:border-line-strong hover:bg-surface-2"
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border transition-colors ${
                    noWebsite ? "border-accent bg-accent" : "border-line-strong bg-ground"
                  }`}
                  aria-hidden
                >
                  {noWebsite && <Check className="h-3 w-3 text-white" />}
                </span>
                I don&apos;t have a website yet
              </button>

              {noWebsite && (
                <>
                  <Input
                    label="Where you work"
                    placeholder="Try: Lekki, Lagos"
                    hint="The city or area your customers are in."
                    value={businessLocation}
                    onChange={(e) => setBusinessLocation(e.target.value)}
                  />
                  <div>
                    <label htmlFor="services" className="text-body-s text-text-2 block mb-1.5">
                      What you offer
                    </label>
                    <textarea
                      id="services"
                      value={servicesText}
                      onChange={(e) => setServicesText(e.target.value)}
                      placeholder="Try: pipe repairs, water heater installs, drain cleaning"
                      rows={2}
                      className={textareaClass}
                    />
                    <p className="mt-1 text-caption text-text-3">Separate each service with a comma.</p>
                  </div>
                </>
              )}

              <Input
                label="One line about the business (optional)"
                placeholder="Try: Same-day plumbing for homes in Lekki"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              {errorBox}

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep("type")}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit">
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Questions from the playbook */}
      {step === "questions" && (
        <Card className="animate-in">
          <CardContent>
            <div className="mb-6 space-y-1">
              <h2 className="text-heading text-text">Tell us about your marketing</h2>
              <p className="text-label text-text-3">
                Question {currentQ + 1} of {questions.length}
              </p>
            </div>

            <div className="mb-2">
              <div className="h-1 rounded-full bg-surface-2 overflow-hidden mb-6">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                />
              </div>

              <p className="text-title text-text mb-4">{q.question}</p>

              <div className="grid grid-cols-1 gap-2.5">
                {q.options.map((option) => {
                  const selected = isOptionSelected(q.id, option);
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleSelectOption(q.id, option, q.multi)}
                      className={`text-left rounded-md border px-4 py-3.5 text-body transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] ${
                        selected
                          ? "border-accent bg-accent-soft text-text"
                          : "border-line bg-surface text-text-2 hover:border-line-strong hover:bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-5 w-5 shrink-0 items-center justify-center ${
                            q.multi ? "rounded-sm" : "rounded-full"
                          } border transition-colors ${
                            selected ? "border-accent bg-accent" : "border-line-strong bg-ground"
                          }`}
                        >
                          {selected && <CheckCircle2 className="h-3 w-3 text-white" />}
                        </div>
                        {option}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (currentQ > 0) setCurrentQ(currentQ - 1);
                  else setStep("site");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              {currentQ < questions.length - 1 ? (
                <Button
                  type="button"
                  disabled={!canAdvanceQuestion()}
                  onClick={() => setCurrentQ(currentQ + 1)}
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={!canAdvanceQuestion()}
                  onClick={() => setStep("profile")}
                >
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: About your business (the brand profile) */}
      {step === "profile" && businessType && (
        <Card className="animate-in">
          <CardContent>
            <div className="mb-6 space-y-1">
              <h2 className="text-heading text-text">About your business</h2>
              <p className="text-body-s text-text-2">
                All optional. The more you tell us, the more every agent sounds like you. You can change any of it later under Settings.
              </p>
            </div>
            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <p className="text-body-s text-text-2 mb-2">Industry</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {INDUSTRIES.map((ind) => (
                    <button
                      key={ind}
                      type="button"
                      aria-pressed={industry === ind}
                      onClick={() => setIndustry(industry === ind ? "" : ind)}
                      className={chip(industry === ind)}
                    >
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="audience" className="text-body-s text-text-2 block mb-1.5">
                  Who you sell to
                </label>
                <textarea
                  id="audience"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value.slice(0, 300))}
                  placeholder={AUDIENCE_PLACEHOLDER[businessType]}
                  rows={2}
                  className={textareaClass}
                />
              </div>

              <Input
                label="The problem they want solved"
                placeholder="Try: no time to post, so customers forget they exist"
                value={audiencePainPoint}
                onChange={(e) => setAudiencePainPoint(e.target.value.slice(0, 150))}
                maxLength={150}
              />

              <div>
                <label htmlFor="different" className="text-body-s text-text-2 block mb-1.5">
                  What makes you different
                </label>
                <textarea
                  id="different"
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  placeholder="Try: we answer within the hour and fix it the same day"
                  rows={3}
                  className={textareaClass}
                />
              </div>

              <div>
                <p className="text-body-s text-text-2 mb-2">How you sound</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BRAND_VOICES.map((voice) => (
                    <button
                      key={voice}
                      type="button"
                      aria-pressed={brandVoice === voice}
                      onClick={() => setBrandVoice(brandVoice === voice ? "" : voice)}
                      className={chip(brandVoice === voice)}
                    >
                      {voice}
                    </button>
                  ))}
                </div>
                <textarea
                  aria-label="A sentence that sounds like you"
                  value={brandVoiceExample}
                  onChange={(e) => setBrandVoiceExample(e.target.value.slice(0, 300))}
                  placeholder="Try: paste a sentence or two that sounds like you"
                  rows={2}
                  maxLength={300}
                  className={`${textareaClass} mt-2`}
                />
                <p className="mt-1 text-caption text-text-3">
                  <span className="font-mono">{brandVoiceExample.length}/300</span>
                </p>
              </div>

              <div>
                <p className="text-body-s text-text-2 mb-2">Main goal</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {MARKETING_GOALS.map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      aria-pressed={primaryGoal === goal}
                      onClick={() => setPrimaryGoal(primaryGoal === goal ? "" : goal)}
                      className={chip(primaryGoal === goal)}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-body-s text-text-2 mb-2">Competitors</p>
                <div className="space-y-2">
                  {competitors.map((url, i) => (
                    <Input
                      key={i}
                      label={`Competitor ${i + 1}`}
                      hideLabel
                      type="url"
                      value={url}
                      onChange={(e) => updateCompetitor(i, e.target.value)}
                      placeholder={`Try: https://competitor${i + 1}.com`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-caption text-text-3">
                  Up to three websites. We&apos;ll watch what they do.
                </p>
              </div>

              {errorBox}

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setStep("questions")}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    "Creating…"
                  ) : noWebsite ? (
                    <>
                      Create my project
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Create and check my site
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Running the site check */}
      {step === "audit" && (
        <Card className="animate-in">
          <CardContent className="flex flex-col items-center text-center">
            <div className="mb-4 flex items-center gap-2 text-label text-text-3">
              {auditProgress.saving === "done" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-teal" />
                  <span className="text-teal">Done</span>
                </>
              ) : (
                <>
                  <span className="live-dot" aria-hidden />
                  Running
                </>
              )}
            </div>
            <h2 className="text-heading text-text">
              {auditProgress.saving === "done" ? "Site check finished" : "Checking your site"}
            </h2>
            <p className="mt-2 text-body text-text-2 max-w-md">
              {auditProgress.saving === "done" ? (
                "Taking you to your results…"
              ) : (
                <>
                  Checking <span className="font-mono text-text">{websiteUrl}</span> for search issues
                  and things to write about.
                </>
              )}
            </p>
            <div className="mt-8 w-full max-w-sm space-y-3">
              {(
                [
                  { key: "fetching", label: "Fetching page content" },
                  { key: "analyzing", label: "Checking your site" },
                  { key: "saving", label: "Saving results" },
                ] as const
              ).map((item) => (
                <div key={item.key} className="flex items-center justify-between text-body-s">
                  <span className={auditProgress[item.key] === "pending" ? "text-text-3" : "text-text-2"}>
                    {item.label}
                  </span>
                  <span
                    className={
                      auditProgress[item.key] === "done"
                        ? "text-teal"
                        : auditProgress[item.key] === "running"
                        ? "text-accent"
                        : auditProgress[item.key] === "error"
                        ? "text-danger"
                        : "text-text-3"
                    }
                  >
                    {auditProgress[item.key] === "done"
                      ? "Done"
                      : auditProgress[item.key] === "running"
                      ? "Running…"
                      : auditProgress[item.key] === "error"
                      ? "Failed"
                      : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
