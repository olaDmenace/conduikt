"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Building2,
  Users,
  MessageSquare,
  Globe,
  SkipForward,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";

// ── Constants ──────────────────────────────────────────────

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

const ONLINE_CHANNELS = [
  "X/Twitter",
  "LinkedIn",
  "Instagram",
  "TikTok",
  "YouTube",
  "Facebook",
  "Reddit",
  "Email newsletters",
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

// ── Types ──────────────────────────────────────────────────

interface OnboardingData {
  // Step 1
  businessName: string;
  websiteUrl: string;
  industry: string;
  businessDescription: string;
  // Step 2
  targetAudience: string;
  audiencePainPoint: string;
  onlineChannels: string[];
  // Step 3
  brandVoice: string;
  brandVoiceExample: string;
  primaryGoal: string;
  // Step 4
  competitors: string[];
}

interface ProjectData {
  id: string;
  name: string;
  website_url: string | null;
  industry: string | null;
  business_description: string | null;
  target_audience: unknown;
  audience_pain_point: string | null;
  online_channels: string[] | null;
  brand_voice: unknown;
  brand_voice_example: string | null;
  primary_goal: string | null;
  competitors: unknown;
  onboarding_completed: boolean | null;
}

const TOTAL_STEPS = 5;

// ── Component ──────────────────────────────────────────────

export default function OnboardingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [data, setData] = useState<OnboardingData>({
    businessName: "",
    websiteUrl: "",
    industry: "",
    businessDescription: "",
    targetAudience: "",
    audiencePainPoint: "",
    onlineChannels: [],
    brandVoice: "",
    brandVoiceExample: "",
    primaryGoal: "",
    competitors: ["", "", ""],
  });

  // Load existing project data to pre-fill
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const project: ProjectData = await res.json();

      // If onboarding already completed, redirect to overview
      if (project.onboarding_completed) {
        router.replace(`/projects/${id}`);
        return;
      }

      // Pre-fill from existing project data
      const existingAudience =
        typeof project.target_audience === "string"
          ? project.target_audience
          : (project.target_audience as { personas?: string[] })?.personas?.join(
              ", "
            ) ?? "";

      const existingVoice =
        typeof project.brand_voice === "string"
          ? project.brand_voice
          : (project.brand_voice as { tone?: string })?.tone ?? "";

      const existingCompetitors = Array.isArray(project.competitors)
        ? (project.competitors as { url?: string }[])
            .map((c) => (typeof c === "string" ? c : c.url ?? ""))
            .slice(0, 3)
        : [];

      setData((prev) => ({
        ...prev,
        businessName: project.name || prev.businessName,
        websiteUrl: project.website_url || prev.websiteUrl,
        industry: project.industry || prev.industry,
        businessDescription:
          project.business_description || prev.businessDescription,
        targetAudience: existingAudience || prev.targetAudience,
        audiencePainPoint:
          project.audience_pain_point || prev.audiencePainPoint,
        onlineChannels: project.online_channels?.length
          ? project.online_channels
          : prev.onlineChannels,
        brandVoice: existingVoice || prev.brandVoice,
        brandVoiceExample:
          project.brand_voice_example || prev.brandVoiceExample,
        primaryGoal: project.primary_goal || prev.primaryGoal,
        competitors:
          existingCompetitors.length > 0
            ? [
                ...existingCompetitors,
                ...Array(3 - existingCompetitors.length).fill(""),
              ].slice(0, 3)
            : prev.competitors,
      }));
      setLoading(false);
    }
    load();
  }, [id, router]);

  function toggleChannel(channel: string) {
    setData((prev) => ({
      ...prev,
      onlineChannels: prev.onlineChannels.includes(channel)
        ? prev.onlineChannels.filter((c) => c !== channel)
        : [...prev.onlineChannels, channel],
    }));
  }

  function updateCompetitor(index: number, value: string) {
    setData((prev) => {
      const updated = [...prev.competitors];
      updated[index] = value;
      return { ...prev, competitors: updated };
    });
  }

  function canAdvance(): boolean {
    switch (step) {
      case 1:
        return (
          data.businessName.trim().length > 0 && data.industry.length > 0
        );
      case 2:
        return data.targetAudience.trim().length > 0;
      case 3:
        return data.brandVoice.length > 0 && data.primaryGoal.length > 0;
      case 4:
        return true; // optional step
      case 5:
        return true;
      default:
        return false;
    }
  }

  async function handleComplete() {
    setSaving(true);
    try {
      const competitorUrls = data.competitors.filter(
        (c) => c.trim().length > 0
      );

      await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.businessName,
          website_url: data.websiteUrl || undefined,
          industry: data.industry,
          business_description: data.businessDescription || undefined,
          target_audience: data.targetAudience,
          audience_pain_point: data.audiencePainPoint || undefined,
          online_channels: data.onlineChannels,
          brand_voice: data.brandVoice,
          brand_voice_example: data.brandVoiceExample || undefined,
          primary_goal: data.primaryGoal,
          competitors: competitorUrls.length > 0 ? competitorUrls : undefined,
          onboarding_completed: true,
        }),
      });

      router.push(`/projects/${id}`);
    } catch {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 animate-in">
      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-caption text-text-tertiary">
            Step {step} of {TOTAL_STEPS}
          </p>
          <p className="text-caption text-text-tertiary">
            {step === 1
              ? "About your business"
              : step === 2
                ? "Your audience"
                : step === 3
                  ? "Your brand voice"
                  : step === 4
                    ? "Competitors (optional)"
                    : "Confirmation"}
          </p>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${
                i < step
                  ? "bg-accent"
                  : i === step
                    ? "bg-accent/40"
                    : "bg-border-default"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1 — About your business */}
      {step === 1 && (
        <Card className="animate-in">
          <CardContent className="space-y-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-accent-muted p-3">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-h2 text-text-primary">
                  About your business
                </h2>
                <p className="text-small text-text-secondary">
                  Help us understand what you do
                </p>
              </div>
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Business name
              </label>
              <input
                type="text"
                value={data.businessName}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    businessName: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                placeholder="Your business name"
                autoFocus
              />
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Website URL
              </label>
              <input
                type="url"
                value={data.websiteUrl}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    websiteUrl: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                placeholder="https://yoursite.com"
              />
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Industry
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() =>
                      setData((prev) => ({ ...prev, industry: ind }))
                    }
                    className={`rounded-lg border px-3 py-2 text-caption text-left transition-colors ${
                      data.industry === ind
                        ? "border-accent bg-accent-muted text-text-primary"
                        : "border-border-default bg-surface-0 text-text-secondary hover:bg-surface-2"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Business description
              </label>
              <textarea
                value={data.businessDescription}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    businessDescription: e.target.value.slice(0, 300),
                  }))
                }
                className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                placeholder="We help [who] to [what] by [how]"
                rows={3}
                maxLength={300}
              />
              <p className="mt-1 text-caption text-text-tertiary">
                {data.businessDescription.length}/300
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Your audience */}
      {step === 2 && (
        <Card className="animate-in">
          <CardContent className="space-y-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-accent-muted p-3">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-h2 text-text-primary">Your audience</h2>
                <p className="text-small text-text-secondary">
                  Tell us who you are trying to reach
                </p>
              </div>
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Primary target audience
              </label>
              <input
                type="text"
                value={data.targetAudience}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    targetAudience: e.target.value.slice(0, 150),
                  }))
                }
                className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                placeholder="e.g. Solo founders building SaaS products"
                maxLength={150}
                autoFocus
              />
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Their biggest pain point
              </label>
              <input
                type="text"
                value={data.audiencePainPoint}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    audiencePainPoint: e.target.value.slice(0, 150),
                  }))
                }
                className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                placeholder="e.g. Not enough time to create consistent marketing content"
                maxLength={150}
              />
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Where they spend time online
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ONLINE_CHANNELS.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    onClick={() => toggleChannel(channel)}
                    className={`rounded-lg border px-3 py-2.5 text-caption text-left transition-colors flex items-center gap-2 ${
                      data.onlineChannels.includes(channel)
                        ? "border-accent bg-accent-muted text-text-primary"
                        : "border-border-default bg-surface-0 text-text-secondary hover:bg-surface-2"
                    }`}
                  >
                    {data.onlineChannels.includes(channel) && (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    )}
                    {channel}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Your brand voice */}
      {step === 3 && (
        <Card className="animate-in">
          <CardContent className="space-y-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-accent-muted p-3">
                <MessageSquare className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-h2 text-text-primary">Your brand voice</h2>
                <p className="text-small text-text-secondary">
                  How should your content sound?
                </p>
              </div>
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Brand voice
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BRAND_VOICES.map((voice) => (
                  <button
                    key={voice}
                    type="button"
                    onClick={() =>
                      setData((prev) => ({ ...prev, brandVoice: voice }))
                    }
                    className={`rounded-lg border px-3 py-2.5 text-caption transition-colors ${
                      data.brandVoice === voice
                        ? "border-accent bg-accent-muted text-text-primary"
                        : "border-border-default bg-surface-0 text-text-secondary hover:bg-surface-2"
                    }`}
                  >
                    {voice}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Brand voice example{" "}
                <span className="text-text-tertiary/60">(optional)</span>
              </label>
              <textarea
                value={data.brandVoiceExample}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    brandVoiceExample: e.target.value.slice(0, 300),
                  }))
                }
                className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                placeholder="Paste a sentence or two that sounds like your brand"
                rows={3}
                maxLength={300}
              />
              <p className="mt-1 text-caption text-text-tertiary">
                {data.brandVoiceExample.length}/300
              </p>
            </div>

            <div>
              <label className="text-caption text-text-tertiary mb-2 block">
                Primary marketing goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MARKETING_GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    onClick={() =>
                      setData((prev) => ({ ...prev, primaryGoal: goal }))
                    }
                    className={`rounded-lg border px-4 py-3 text-small text-left transition-colors ${
                      data.primaryGoal === goal
                        ? "border-accent bg-accent-muted text-text-primary"
                        : "border-border-default bg-surface-0 text-text-secondary hover:bg-surface-2"
                    }`}
                  >
                    {goal}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4 — Competitors (optional) */}
      {step === 4 && (
        <Card className="animate-in">
          <CardContent className="space-y-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-accent-muted p-3">
                <Globe className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h2 className="text-h2 text-text-primary">Your competitors</h2>
                <p className="text-small text-text-secondary">
                  Optional — skip if you prefer
                </p>
              </div>
            </div>

            <p className="text-body text-text-secondary">
              Add up to 3 competitor website URLs. We&apos;ll track them and
              surface insights about their strategy.
            </p>

            {data.competitors.map((url, i) => (
              <div key={i}>
                <label className="text-caption text-text-tertiary mb-2 block">
                  Competitor {i + 1}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateCompetitor(i, e.target.value)}
                  className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
                  placeholder={`https://competitor${i + 1}.com`}
                  autoFocus={i === 0}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 5 — Confirmation */}
      {step === 5 && (
        <Card className="animate-in">
          <CardContent className="space-y-6 py-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="rounded-xl bg-success/20 p-3">
                <Check className="h-6 w-6 text-success" />
              </div>
              <div>
                <h2 className="text-h2 text-text-primary">
                  Review your profile
                </h2>
                <p className="text-small text-text-secondary">
                  Make sure everything looks right
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SummaryRow label="Business" value={data.businessName} />
              {data.websiteUrl && (
                <SummaryRow label="Website" value={data.websiteUrl} />
              )}
              <SummaryRow label="Industry" value={data.industry} />
              {data.businessDescription && (
                <SummaryRow
                  label="Description"
                  value={data.businessDescription}
                />
              )}
              <SummaryRow label="Target audience" value={data.targetAudience} />
              {data.audiencePainPoint && (
                <SummaryRow
                  label="Pain point"
                  value={data.audiencePainPoint}
                />
              )}
              {data.onlineChannels.length > 0 && (
                <SummaryRow
                  label="Channels"
                  value={data.onlineChannels.join(", ")}
                />
              )}
              <SummaryRow label="Brand voice" value={data.brandVoice} />
              {data.brandVoiceExample && (
                <SummaryRow
                  label="Voice example"
                  value={data.brandVoiceExample}
                />
              )}
              <SummaryRow label="Primary goal" value={data.primaryGoal} />
              {data.competitors.some((c) => c.trim()) && (
                <SummaryRow
                  label="Competitors"
                  value={data.competitors
                    .filter((c) => c.trim())
                    .join(", ")}
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <div>
          {step > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => s - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {step === 4 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(5)}
            >
              <SkipForward className="h-4 w-4" />
              Skip
            </Button>
          )}

          {step < 5 && (
            <Button
              size="sm"
              disabled={!canAdvance()}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}

          {step === 5 && (
            <Button size="sm" disabled={saving} onClick={handleComplete}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Looks good"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-border-default last:border-0">
      <p className="text-caption text-text-tertiary w-32 shrink-0">{label}</p>
      <p className="text-body text-text-primary">{value}</p>
    </div>
  );
}
