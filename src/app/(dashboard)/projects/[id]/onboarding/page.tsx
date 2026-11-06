"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Users,
  MessageSquare,
  Globe,
  SkipForward,
} from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useToast } from "@/src/components/ui/toast";

// "Your business profile": the same answers the new-project wizard collects,
// editable any time from Project settings. New projects fill this in the
// wizard; this page is for changing it later. It never nags.

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
  "WhatsApp",
  "Google Business Profile",
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

const inputClass =
  "w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent";

// ── Component ──────────────────────────────────────────────

export default function BusinessProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
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

  // Load the project so the form shows what is already saved.
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/projects/${id}`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const project: ProjectData = await res.json();

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
        ? (project.competitors as (string | { url?: string })[])
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
  }, [id]);

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
        return data.businessName.trim().length > 0;
      default:
        return true;
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const competitorUrls = data.competitors.filter(
        (c) => c.trim().length > 0
      );

      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.businessName,
          website_url: data.websiteUrl || null,
          industry: data.industry || null,
          business_description: data.businessDescription || null,
          target_audience: data.targetAudience || null,
          audience_pain_point: data.audiencePainPoint || null,
          online_channels: data.onlineChannels,
          brand_voice: data.brandVoice || null,
          brand_voice_example: data.brandVoiceExample || null,
          primary_goal: data.primaryGoal || null,
          competitors: competitorUrls.length > 0 ? competitorUrls : null,
          onboarding_completed: true,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Couldn't save your profile. Try again.", "error");
        setSaving(false);
        return;
      }

      toast("Profile saved", "success");
      router.push(`/projects/${id}/settings`);
    } catch {
      toast("Couldn't reach the server. Your profile wasn't saved. Try again.", "error");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8" role="status" aria-label="Loading">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-8 animate-in">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-heading text-text">Your business profile</h1>
          <p className="text-body-s text-text-2">
            Every agent reads these answers. Change them whenever your business changes.
          </p>
        </div>
        <Link href={`/projects/${id}/settings`} className="hover-link text-body-s text-accent hover:text-accent-hover">
          Back to settings
        </Link>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <p className="text-label text-text-3">
            Step {step} of {TOTAL_STEPS}
          </p>
          <p className="text-label text-text-3">
            {step === 1
              ? "About your business"
              : step === 2
                ? "Who you sell to"
                : step === 3
                  ? "How you sound"
                  : step === 4
                    ? "Competitors (optional)"
                    : "Check and save"}
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
                    ? "bg-accent-soft"
                    : "bg-line"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1 — About your business */}
      {step === 1 && (
        <Card className="animate-in">
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="h-5 w-5 shrink-0 text-text-3" />
              <div>
                <h2 className="text-heading text-text">
                  About your business
                </h2>
                <p className="text-body-s text-text-2">
                  What you do, in your words
                </p>
              </div>
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
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
                className={inputClass}
                placeholder="Try: Ade's Plumbing"
                autoFocus
              />
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                Website address
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
                className={inputClass}
                placeholder="Try: https://yoursite.com"
              />
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                Industry
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    aria-pressed={data.industry === ind}
                    onClick={() =>
                      setData((prev) => ({ ...prev, industry: prev.industry === ind ? "" : ind }))
                    }
                    className={`rounded-md border px-3 py-2 text-body-s text-left transition-colors ${
                      data.industry === ind
                        ? "border-accent bg-accent-soft text-text"
                        : "border-line bg-surface text-text-2 hover:bg-surface-2"
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                One line about the business
              </label>
              <textarea
                value={data.businessDescription}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    businessDescription: e.target.value.slice(0, 300),
                  }))
                }
                className={`${inputClass} resize-none`}
                placeholder="Try: We help [who] to [what] by [how]"
                rows={3}
                maxLength={300}
              />
              <p className="mt-1 text-caption text-text-3">
                <span className="font-mono">{data.businessDescription.length}/300</span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2 — Who you sell to */}
      {step === 2 && (
        <Card className="animate-in">
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-5 w-5 shrink-0 text-text-3" />
              <div>
                <h2 className="text-heading text-text">Who you sell to</h2>
                <p className="text-body-s text-text-2">
                  The people you want to reach
                </p>
              </div>
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                Your ideal customer
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
                className={inputClass}
                placeholder="Try: homeowners in Lekki who need a plumber the same day"
                maxLength={150}
                autoFocus
              />
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                The problem they want solved
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
                className={inputClass}
                placeholder="Try: no time to post, so customers forget they exist"
                maxLength={150}
              />
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                Where they spend time online
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ONLINE_CHANNELS.map((channel) => (
                  <button
                    key={channel}
                    type="button"
                    aria-pressed={data.onlineChannels.includes(channel)}
                    onClick={() => toggleChannel(channel)}
                    className={`rounded-md border px-3 py-2.5 text-body-s text-left transition-colors flex items-center gap-2 ${
                      data.onlineChannels.includes(channel)
                        ? "border-accent bg-accent-soft text-text"
                        : "border-line bg-surface text-text-2 hover:bg-surface-2"
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

      {/* Step 3 — How you sound */}
      {step === 3 && (
        <Card className="animate-in">
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="h-5 w-5 shrink-0 text-text-3" />
              <div>
                <h2 className="text-heading text-text">How you sound</h2>
                <p className="text-body-s text-text-2">
                  So what we write reads like you wrote it
                </p>
              </div>
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                Pick the closest
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {BRAND_VOICES.map((voice) => (
                  <button
                    key={voice}
                    type="button"
                    aria-pressed={data.brandVoice === voice}
                    onClick={() =>
                      setData((prev) => ({ ...prev, brandVoice: prev.brandVoice === voice ? "" : voice }))
                    }
                    className={`rounded-md border px-3 py-2.5 text-body-s transition-colors ${
                      data.brandVoice === voice
                        ? "border-accent bg-accent-soft text-text"
                        : "border-line bg-surface text-text-2 hover:bg-surface-2"
                    }`}
                  >
                    {voice}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                A sentence that sounds like you{" "}
                <span className="text-text-3">(optional)</span>
              </label>
              <textarea
                value={data.brandVoiceExample}
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    brandVoiceExample: e.target.value.slice(0, 300),
                  }))
                }
                className={`${inputClass} resize-none`}
                placeholder="Try: paste a sentence or two from your site or a post"
                rows={3}
                maxLength={300}
              />
              <p className="mt-1 text-caption text-text-3">
                <span className="font-mono">{data.brandVoiceExample.length}/300</span>
              </p>
            </div>

            <div>
              <label className="text-body-s text-text-2 mb-2 block">
                Main goal
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {MARKETING_GOALS.map((goal) => (
                  <button
                    key={goal}
                    type="button"
                    aria-pressed={data.primaryGoal === goal}
                    onClick={() =>
                      setData((prev) => ({ ...prev, primaryGoal: prev.primaryGoal === goal ? "" : goal }))
                    }
                    className={`rounded-md border px-4 py-3 text-body-s text-left transition-colors ${
                      data.primaryGoal === goal
                        ? "border-accent bg-accent-soft text-text"
                        : "border-line bg-surface text-text-2 hover:bg-surface-2"
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
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="h-5 w-5 shrink-0 text-text-3" />
              <div>
                <h2 className="text-heading text-text">Your competitors</h2>
                <p className="text-body-s text-text-2">
                  Optional. Skip if you like.
                </p>
              </div>
            </div>

            <p className="text-body text-text-2">
              Add up to 3 competitor websites. We&apos;ll keep an eye on them and
              tell you what they&apos;re doing.
            </p>

            {data.competitors.map((url, i) => (
              <div key={i}>
                <label className="text-body-s text-text-2 mb-2 block">
                  Competitor {i + 1}
                </label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => updateCompetitor(i, e.target.value)}
                  className={inputClass}
                  placeholder={`Try: https://competitor${i + 1}.com`}
                  autoFocus={i === 0}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Step 5 — Check and save */}
      {step === 5 && (
        <Card className="animate-in">
          <CardContent className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Check className="h-5 w-5 shrink-0 text-teal" />
              <div>
                <h2 className="text-heading text-text">
                  Check your profile
                </h2>
                <p className="text-body-s text-text-2">
                  Make sure everything looks right
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <SummaryRow label="Business" value={data.businessName} />
              {data.websiteUrl && (
                <SummaryRow label="Website" value={data.websiteUrl} />
              )}
              {data.industry && <SummaryRow label="Industry" value={data.industry} />}
              {data.businessDescription && (
                <SummaryRow
                  label="About"
                  value={data.businessDescription}
                />
              )}
              {data.targetAudience && (
                <SummaryRow label="Who you sell to" value={data.targetAudience} />
              )}
              {data.audiencePainPoint && (
                <SummaryRow
                  label="Their problem"
                  value={data.audiencePainPoint}
                />
              )}
              {data.onlineChannels.length > 0 && (
                <SummaryRow
                  label="Channels"
                  value={data.onlineChannels.join(", ")}
                />
              )}
              {data.brandVoice && <SummaryRow label="How you sound" value={data.brandVoice} />}
              {data.brandVoiceExample && (
                <SummaryRow
                  label="Example"
                  value={data.brandVoiceExample}
                />
              )}
              {data.primaryGoal && <SummaryRow label="Main goal" value={data.primaryGoal} />}
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
            <Button size="sm" disabled={saving} onClick={handleSave}>
              {!saving && <Check className="h-4 w-4" />}
              {saving ? "Saving…" : "Save profile"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-line last:border-0">
      <p className="text-label text-text-3 w-32 shrink-0 pt-1">{label}</p>
      <p className="text-body text-text">{value}</p>
    </div>
  );
}
