"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import {
  Video,
  Film,
  Loader2,
  ArrowRight,
  Download,
  RefreshCw,
  Trash2,
  Play,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Sparkles,
  Smartphone,
  Info,
  Shuffle,
  Wand2,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";
import { ExpectationBanner } from "@/src/components/ui/expectation-banner";

interface VideoJob {
  id: string;
  brief: string;
  style: string;
  status: string;
  progress_message: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

interface StatusResponse {
  status: string;
  progressMessage: string | null;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  scriptData: Record<string, unknown> | null;
  error: string | null;
}

const STATUS_STEPS = [
  { key: "scripting", label: "Writing your script" },
  { key: "generating_video", label: "AI is recording your presenter" },
  { key: "ready", label: "Finalising your video" },
];

function getStepState(
  stepKey: string,
  currentStatus: string
): "done" | "active" | "pending" {
  const order = ["scripting", "generating_video", "ready"];
  const currentIdx = order.indexOf(currentStatus);
  const stepIdx = order.indexOf(stepKey);
  if (stepIdx < currentIdx) return "done";
  if (stepIdx === currentIdx) return currentStatus === "ready" ? "done" : "active";
  return "pending";
}

export default function VideoAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [phase, setPhase] = useState<"style" | "form" | "status" | "done">(
    "style"
  );
  const [style, setStyle] = useState<"presenter" | "cinematic" | "ugc">("presenter");
  const [brief, setBrief] = useState("");
  const [adLength, setAdLength] = useState<"short" | "standard" | "long">(
    "standard"
  );
  const [submitting, setSubmitting] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<StatusResponse | null>(null);
  const [history, setHistory] = useState<VideoJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [planGated, setPlanGated] = useState(false);
  const [scriptExpanded, setScriptExpanded] = useState(false);
  const [avatarMode, setAvatarMode] = useState<"random" | "brand-matched">("random");
  const [avatarGender, setAvatarGender] = useState<"male" | "female" | undefined>(undefined);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Fetch video history
  const fetchHistory = useCallback(async () => {
    const res = await fetch(`/api/video/history?projectId=${id}`);
    if (res.ok) {
      const data = await res.json();
      setHistory(data);
    }
    setHistoryLoading(false);
  }, [id]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Poll active job
  useEffect(() => {
    if (!activeJobId || phase !== "status") return;

    async function poll() {
      const res = await fetch(`/api/video/${activeJobId}/status`);
      if (!res.ok) return;
      const data: StatusResponse = await res.json();
      setJobStatus(data);

      if (data.status === "ready") {
        setPhase("done");
        if (pollRef.current) clearInterval(pollRef.current);
        fetchHistory();
      } else if (data.status === "failed") {
        if (pollRef.current) clearInterval(pollRef.current);
        toast(data.error || "Video generation failed", "error");
        fetchHistory();
      }
    }

    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [activeJobId, phase, fetchHistory, toast]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (brief.length < 50) return;

    setSubmitting(true);
    const res = await fetch("/api/video/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: id,
        brief,
        style,
        adLength,
        videoType: style,
        ...(style === "ugc" && {
          avatarMode,
          avatarGender,
        }),
      }),
    });

    if (res.status === 402) {
      setPlanGated(true);
      setSubmitting(false);
      return;
    }

    if (!res.ok) {
      const err = await res.json();
      toast(err.error || "Failed to start video generation", "error");
      setSubmitting(false);
      return;
    }

    const data = await res.json();
    setActiveJobId(data.jobId);
    setPhase("status");
    setJobStatus({
      status: "scripting",
      progressMessage: "Script generated, starting video pipeline...",
      videoUrl: null,
      thumbnailUrl: null,
      durationSeconds: null,
      scriptData: data.scriptData ?? null,
      error: null,
    });
    setSubmitting(false);
    fetchHistory();
  }

  async function handleDelete(jobId: string) {
    const res = await fetch(`/api/video/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      toast("Video deleted", "success");
      fetchHistory();
      if (activeJobId === jobId) {
        setPhase("style");
        setActiveJobId(null);
        setJobStatus(null);
      }
    }
  }

  function handleNewVideo() {
    setPhase("style");
    setActiveJobId(null);
    setJobStatus(null);
    setBrief("");
    setScriptExpanded(false);
  }

  function viewJobStatus(job: VideoJob) {
    setActiveJobId(job.id);
    if (job.status === "ready") {
      setJobStatus({
        status: "ready",
        progressMessage: "Your video is ready!",
        videoUrl: job.video_url,
        thumbnailUrl: job.thumbnail_url,
        durationSeconds: job.duration_seconds,
        scriptData: null,
        error: null,
      });
      setPhase("done");
    } else if (job.status === "failed") {
      setJobStatus({
        status: "failed",
        progressMessage: job.progress_message,
        videoUrl: null,
        thumbnailUrl: job.thumbnail_url,
        durationSeconds: null,
        scriptData: null,
        error: job.error_message,
      });
      toast(job.error_message || "Video generation failed", "error");
      setPhase("style");
    } else {
      // Re-fetch current status before resuming the tracker so we don't show
      // stale "generating" state for a job that has since completed.
      fetch(`/api/video/${job.id}/status`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: StatusResponse | null) => {
          if (!data) {
            setPhase("status");
            return;
          }
          if (data.status === "ready" && data.videoUrl) {
            setJobStatus(data);
            setPhase("done");
          } else if (data.status === "failed") {
            setJobStatus(data);
            toast(data.error || "Video generation failed", "error");
            setPhase("style");
          } else {
            setJobStatus(data);
            setPhase("status");
          }
        })
        .catch(() => setPhase("status"));
    }
  }

  return (
    <div>
      <PageHeader
        title="Video Ad Agent"
        description="Generate presenter-style video ads with AI"
      />

      <ExpectationBanner
        storageKey="conduikt-expect-video"
        message="AI-generated videos take a few minutes to render. The quality improves when you iterate — first drafts are starting points, not final cuts."
        details={[
          "Video generation typically takes 2-5 minutes depending on length and complexity.",
          "Test different scripts and styles — small tweaks to tone or pacing can significantly improve engagement.",
          "Video ads perform best when paired with a clear CTA and consistent posting schedule.",
        ]}
      />

      {/* Plan gate overlay */}
      {planGated && (
        <Card className="mb-8 border-warning animate-in">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 rounded-xl bg-warning/10 p-4">
              <Lock className="h-8 w-8 text-warning" />
            </div>
            <h3 className="text-h2 text-text-primary">
              Video Ads require Growth or Agency plan
            </h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Upgrade to unlock AI presenter video generation, voiceovers, and
              automatic publishing.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/settings/billing">
                Upgrade Plan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Section A: Style Selector */}
      {phase === "style" && !planGated && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 animate-in">
          <button
            onClick={() => {
              setStyle("presenter");
              setPhase("form");
            }}
            className="text-left rounded-2xl border-2 border-border-default bg-surface-1 p-6 hover:border-accent hover:bg-surface-2 transition-all group"
          >
            <div className="mb-4 rounded-xl bg-accent-muted p-3 w-fit">
              <Video className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-h3 text-text-primary mb-1">Presenter Ad</h3>
            <p className="text-small text-text-secondary">
              Studio-quality, avatar on screen. Best for SaaS
              explainers and LinkedIn ads.
            </p>
            <Badge className="mt-3" variant="success">
              Active
            </Badge>
          </button>

          <div className="relative text-left rounded-2xl border-2 border-border-subtle bg-surface-1 p-6 opacity-60 cursor-not-allowed">
            <div className="mb-4 rounded-xl bg-surface-2 p-3 w-fit">
              <Film className="h-6 w-6 text-text-tertiary" />
            </div>
            <h3 className="text-h3 text-text-primary mb-1">Cinematic Ad</h3>
            <p className="text-small text-text-secondary">
              Scene-based, high-production. Powered by Runway ML.
            </p>
            <Badge className="mt-3" variant="warning">
              Coming Soon
            </Badge>
          </div>

          <button
            onClick={() => {
              setStyle("ugc");
              setPhase("form");
            }}
            className="text-left rounded-2xl border-2 border-border-default bg-surface-1 p-6 hover:border-accent hover:bg-surface-2 transition-all group"
          >
            <div className="mb-4 rounded-xl bg-accent-muted p-3 w-fit">
              <Smartphone className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-h3 text-text-primary mb-1">UGC Ad</h3>
            <p className="text-small text-text-secondary">
              Authentic, first-person, social-native. Made for TikTok, Reels,
              and Shorts.
            </p>
            <Badge className="mt-3" variant="success">
              Active
            </Badge>
          </button>
        </div>
      )}

      {/* Section B: Brief Form */}
      {phase === "form" && !planGated && (
        <Card className="mb-8 animate-in">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* UGC info message */}
              {style === "ugc" && (
                <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-muted/30 p-4">
                  <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                  <p className="text-small text-text-secondary">
                    UGC videos are vertical (9:16) and optimised for TikTok,
                    Instagram Reels, and YouTube Shorts.
                  </p>
                </div>
              )}

              {/* Avatar Selection — UGC only */}
              {style === "ugc" && (
                <div>
                  <label className="text-caption text-text-tertiary mb-2 block">
                    Avatar selection
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {([
                      {
                        value: "random" as const,
                        label: "Random",
                        desc: "System picks a matching avatar",
                        icon: Shuffle,
                      },
                      {
                        value: "brand-matched" as const,
                        label: "Brand-matched",
                        desc: "AI selects based on your brand",
                        icon: Wand2,
                      },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAvatarMode(opt.value)}
                        className={`text-left rounded-xl border-2 p-4 transition-all ${
                          avatarMode === opt.value
                            ? "border-accent bg-accent-muted/30"
                            : "border-border-default bg-surface-0 hover:border-border-strong"
                        }`}
                      >
                        <opt.icon className={`h-5 w-5 mb-2 ${
                          avatarMode === opt.value ? "text-accent" : "text-text-tertiary"
                        }`} />
                        <p className="text-small font-medium text-text-primary">{opt.label}</p>
                        <p className="text-caption text-text-tertiary">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Gender filter — for random mode only */}
                  {avatarMode === "random" && (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-caption text-text-tertiary">Gender:</span>
                      {([
                        { value: undefined, label: "Any" },
                        { value: "male" as const, label: "Male" },
                        { value: "female" as const, label: "Female" },
                      ]).map((g) => (
                        <button
                          key={g.label}
                          type="button"
                          onClick={() => setAvatarGender(g.value)}
                          className={`rounded-lg border px-3 py-1.5 text-caption transition-colors ${
                            avatarGender === g.value
                              ? "border-accent bg-accent-muted text-text-primary"
                              : "border-border-default bg-surface-0 text-text-secondary hover:bg-surface-2"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Brand-matched info */}
                  {avatarMode === "brand-matched" && (
                    <div className="flex items-start gap-2 rounded-lg border border-accent/20 bg-accent-muted/20 p-3">
                      <Wand2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <p className="text-caption text-text-secondary">
                        We&apos;ll analyse your project&apos;s industry and target audience to pick the best-fit avatar.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Brief */}
              <div>
                <label className="text-caption text-text-tertiary mb-2 block">
                  What is this ad about?
                </label>
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={
                    style === "ugc"
                      ? "Describe what the creator is talking about. What is the product? What problem does it solve? Write it like you are briefing a friend, not writing an ad. (min 50 characters)"
                      : "Describe your product, the pain point it solves, and who it's for. Be specific. (min 50 characters)"
                  }
                  rows={4}
                  required
                  minLength={50}
                  className="w-full rounded-lg border border-border-default bg-surface-0 py-3 px-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)] resize-none"
                />
                <p className="mt-1 text-caption text-text-tertiary">
                  {brief.length}/50 characters minimum
                </p>
              </div>

              {/* Ad Length — hidden for UGC (fixed 20-30s) */}
              {style !== "ugc" && (
              <div>
                <label className="text-caption text-text-tertiary mb-2 block">
                  Ad length
                </label>
                <div className="flex gap-3">
                  {(
                    [
                      { value: "short", label: "Short (~30s)" },
                      { value: "standard", label: "Standard (~60s)" },
                      { value: "long", label: "Long (~90s)" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 rounded-lg border px-4 py-2.5 cursor-pointer transition-colors ${
                        adLength === opt.value
                          ? "border-accent bg-accent-muted text-text-primary"
                          : "border-border-default bg-surface-0 text-text-secondary hover:bg-surface-2"
                      }`}
                    >
                      <input
                        type="radio"
                        name="adLength"
                        value={opt.value}
                        checked={adLength === opt.value}
                        onChange={() => setAdLength(opt.value)}
                        className="sr-only"
                      />
                      <span className="text-small">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setPhase("style")}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || brief.length < 50}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {submitting ? "Generating..." : "Generate Video Ad"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Section C: Status Tracker */}
      {phase === "status" && jobStatus && (
        <Card className="mb-8 animate-in">
          <CardContent className="py-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="rounded-xl bg-accent-muted p-3">
                <Video className="h-6 w-6 text-accent" />
              </div>
              <div>
                <h3 className="text-h3 text-text-primary">
                  Generating your video ad
                </h3>
                <p className="text-small text-text-secondary">
                  {jobStatus.progressMessage}
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {STATUS_STEPS.map((step) => {
                const state = getStepState(step.key, jobStatus.status);
                return (
                  <div
                    key={step.key}
                    className="flex items-center gap-3"
                  >
                    {state === "done" ? (
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                    ) : state === "active" ? (
                      <Loader2 className="h-5 w-5 text-accent animate-spin shrink-0" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-border-default shrink-0" />
                    )}
                    <span
                      className={`text-body ${
                        state === "pending"
                          ? "text-text-tertiary"
                          : "text-text-primary"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-small text-text-tertiary mb-4">
              This usually takes 2-4 minutes. You can safely leave this page
              — we&apos;ll notify you when it&apos;s done.
            </p>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Section D: Completed Video */}
      {phase === "done" && jobStatus?.videoUrl && (
        <Card className="mb-8 animate-in">
          <CardContent className="py-8">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="h-6 w-6 text-success" />
              <h3 className="text-h3 text-text-primary">
                Your video ad is ready
              </h3>
            </div>

            {/* Video Player */}
            <div className={`rounded-xl overflow-hidden bg-surface-0 border border-border-default mb-6 ${style === "ugc" ? "max-w-sm mx-auto" : ""}`}>
              <video
                src={jobStatus.videoUrl}
                poster={jobStatus.thumbnailUrl ?? undefined}
                controls
                className={`w-full ${style === "ugc" ? "aspect-[9/16]" : "aspect-video"}`}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Button variant="secondary" size="sm" asChild>
                <a href={jobStatus.videoUrl} download>
                  <Download className="h-4 w-4" />
                  Download MP4
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNewVideo}>
                <RefreshCw className="h-4 w-4" />
                Generate New
              </Button>
            </div>

            {/* Script toggle */}
            {jobStatus.scriptData && (
              <div>
                <button
                  onClick={() => setScriptExpanded(!scriptExpanded)}
                  className="flex items-center gap-2 text-small text-text-secondary hover:text-text-primary transition-colors"
                >
                  {scriptExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {scriptExpanded ? "Hide script" : "Show script"}
                </button>
                {scriptExpanded && (
                  <div className="mt-3 rounded-lg bg-surface-0 border border-border-default p-4 max-h-80 overflow-y-auto">
                    <ScriptPreview data={jobStatus.scriptData} />
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section E: Video History */}
      <div className="mb-8">
        <h2 className="text-h2 text-text-primary mb-4">Previous Videos</h2>
        {historyLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
        ) : history.length === 0 ? (
          <Card className="border-dashed border-border-strong">
            <CardContent className="text-center py-8">
              <p className="text-body text-text-secondary">
                No videos generated yet. Create your first video ad above.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((job, i) => {
              const isActive = activeJobId === job.id;
              return (
                <Card
                  key={job.id}
                  className="animate-in"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <CardContent className="flex items-center gap-4">
                    {/* Thumbnail */}
                    <div className="shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-surface-2 flex items-center justify-center">
                      {job.thumbnail_url ? (
                        <img
                          src={job.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="h-5 w-5 text-text-tertiary" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-medium text-text-primary truncate">
                        {job.brief.slice(0, 60)}
                        {job.brief.length > 60 ? "..." : ""}
                      </p>
                      <p className="text-small text-text-tertiary">
                        {job.style === "ugc" ? "UGC" : job.style === "presenter" ? "Presenter" : "Cinematic"}
                        {job.duration_seconds
                          ? ` · ${job.duration_seconds}s`
                          : ""}
                        {" · "}
                        {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Status + actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {job.status === "ready" ? (
                        <>
                          <Badge variant="success">Ready</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => viewJobStatus(job)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        </>
                      ) : job.status === "failed" ? (
                        <>
                          <Badge variant="error">Failed</Badge>
                        </>
                      ) : (
                        <>
                          <Badge variant="warning">
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            Generating
                          </Badge>
                          {!isActive && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewJobStatus(job)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="rounded-lg p-2 text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                        title="Delete video"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ScriptPreview({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data);
  if (entries.length === 0) {
    return (
      <p className="text-small text-text-tertiary">No script data available.</p>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="text-caption text-accent font-medium uppercase tracking-wider mb-1">
            {key.replace(/_/g, " ")}
          </p>
          {Array.isArray(value) ? (
            <ul className="space-y-1.5">
              {value.map((item, i) => (
                <li
                  key={i}
                  className="text-small text-text-secondary pl-3 border-l-2 border-border-subtle"
                >
                  {typeof item === "string" ? item : JSON.stringify(item)}
                </li>
              ))}
            </ul>
          ) : typeof value === "object" && value !== null ? (
            <p className="text-small text-text-secondary whitespace-pre-wrap">
              {Object.entries(value as Record<string, unknown>)
                .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                .join("\n")}
            </p>
          ) : (
            <p className="text-small text-text-secondary whitespace-pre-wrap">
              {String(value ?? "")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
