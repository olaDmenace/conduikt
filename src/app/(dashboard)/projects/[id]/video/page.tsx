"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import {
  Video,
  Film,
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
} from "@/src/components/ui/lucide-icons";
import Link from "next/link";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
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
  { key: "generating_video", label: "Recording your presenter" },
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
  const getHistory = useCallback(async (): Promise<VideoJob[] | null> => {
    const res = await fetch(`/api/video/history?projectId=${id}`);
    return res.ok ? await res.json() : null;
  }, [id]);

  const applyHistory = useCallback((data: VideoJob[] | null) => {
    if (data) setHistory(data);
    setHistoryLoading(false);
  }, []);

  const fetchHistory = useCallback(async () => {
    applyHistory(await getHistory());
  }, [getHistory, applyHistory]);

  useEffect(() => {
    getHistory().then(applyHistory);
  }, [getHistory, applyHistory]);

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

  async function handleRetry(jobId: string) {
    const res = await fetch(`/api/video/${jobId}/retry`, { method: "POST" });
    if (res.status === 402) {
      setPlanGated(true);
      return;
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast(err.error || "Failed to retry video generation", "error");
      return;
    }
    toast("Trying that video again…", "success");
    setActiveJobId(jobId);
    setJobStatus({
      status: "scripting",
      progressMessage: "Retrying video generation...",
      videoUrl: null,
      thumbnailUrl: null,
      durationSeconds: null,
      scriptData: null,
      error: null,
    });
    setPhase("status");
    fetchHistory();
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
        title="Video Ad"
        description="Make short video ads with a presenter or a creator talking to camera"
      />

      <ExpectationBanner
        storageKey="conduikt-expect-video"
        message="Videos take a few minutes to make. They get better as you try again; treat the first one as a starting point, not the final cut."
        details={[
          "A video usually takes 2 to 5 minutes, depending on length.",
          "Try different scripts and styles. Small changes to tone or pace can make a big difference.",
          "Video ads work best with a clear call to action and regular posting.",
        ]}
      />

      {/* Plan gate overlay */}
      {planGated && (
        <Card emphasis className="mb-8 animate-in">
          <CardContent className="flex flex-col items-center text-center">
            <Lock className="mb-4 h-6 w-6 text-accent" />
            <h3 className="text-heading text-text">
              Video Ad needs the Growth or Agency plan
            </h3>
            <p className="mt-2 max-w-md text-body text-text-2">
              Upgrade to make presenter videos with voiceover and post them
              automatically.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/settings/billing">
                Upgrade plan
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
            className="hover-card hover-card-quiet text-left rounded-lg border border-line bg-surface p-6 group"
          >
            <Video className="mb-4 h-5 w-5 text-text-3" />
            <h3 className="text-title text-text mb-1">Presenter ad</h3>
            <p className="text-body-s text-text-2">
              A presenter on screen, studio quality. Best for product
              explainers and LinkedIn ads.
            </p>
            <Badge className="mt-3" variant="success">
              Ready
            </Badge>
          </button>

          <div className="relative text-left rounded-lg border border-line bg-surface p-6 opacity-60 cursor-not-allowed">
            <Film className="mb-4 h-5 w-5 text-text-3" />
            <h3 className="text-title text-text mb-1">Cinematic ad</h3>
            <p className="text-body-s text-text-2">
              Scene by scene, high production. Made with Runway.
            </p>
            <Badge className="mt-3" variant="secondary">
              Coming soon
            </Badge>
          </div>

          <button
            onClick={() => {
              setStyle("ugc");
              setPhase("form");
            }}
            className="hover-card hover-card-quiet text-left rounded-lg border border-line bg-surface p-6 group"
          >
            <Smartphone className="mb-4 h-5 w-5 text-text-3" />
            <h3 className="text-title text-text mb-1">Creator ad</h3>
            <p className="text-body-s text-text-2">
              A creator talking to camera, made for TikTok, Reels
              and Shorts.
            </p>
            <Badge className="mt-3" variant="success">
              Ready
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
                <div className="flex items-start gap-3 rounded-md border border-line bg-surface-2 p-4">
                  <Info className="h-4 w-4 text-text-3 shrink-0 mt-0.5" />
                  <p className="text-body-s text-text-2">
                    Creator videos are vertical (9:16) and made for TikTok,
                    Instagram Reels, and YouTube Shorts.
                  </p>
                </div>
              )}

              {/* Avatar Selection — UGC only */}
              {style === "ugc" && (
                <div>
                  <label className="text-body-s text-text-2 mb-2 block">
                    Presenter
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {([
                      {
                        value: "random" as const,
                        label: "Random",
                        desc: "We pick a suitable presenter",
                        icon: Shuffle,
                      },
                      {
                        value: "brand-matched" as const,
                        label: "Matched to your brand",
                        desc: "We choose one that fits your brand",
                        icon: Wand2,
                      },
                    ]).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAvatarMode(opt.value)}
                        aria-pressed={avatarMode === opt.value}
                        className={`text-left rounded-md border p-4 transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] ${
                          avatarMode === opt.value
                            ? "border-accent bg-accent-soft"
                            : "border-line bg-surface hover:border-line-strong"
                        }`}
                      >
                        <opt.icon className={`h-5 w-5 mb-2 ${
                          avatarMode === opt.value ? "text-accent" : "text-text-3"
                        }`} />
                        <p className="text-title text-text">{opt.label}</p>
                        <p className="text-caption text-text-3">{opt.desc}</p>
                      </button>
                    ))}
                  </div>

                  {/* Gender filter — for random mode only */}
                  {avatarMode === "random" && (
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-body-s text-text-2">Gender:</span>
                      {([
                        { value: undefined, label: "Any" },
                        { value: "male" as const, label: "Male" },
                        { value: "female" as const, label: "Female" },
                      ]).map((g) => (
                        <button
                          key={g.label}
                          type="button"
                          onClick={() => setAvatarGender(g.value)}
                          aria-pressed={avatarGender === g.value}
                          className={`rounded-md border px-3 py-1.5 text-body-s transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] ${
                            avatarGender === g.value
                              ? "border-accent bg-accent-soft text-text"
                              : "border-line bg-surface text-text-2 hover:bg-surface-2"
                          }`}
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Brand-matched info */}
                  {avatarMode === "brand-matched" && (
                    <div className="flex items-start gap-2 rounded-md border border-line bg-surface-2 p-3">
                      <Wand2 className="h-4 w-4 text-text-3 shrink-0 mt-0.5" />
                      <p className="text-body-s text-text-2">
                        We&apos;ll look at your industry and audience to pick the presenter that fits best.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Brief */}
              <div>
                <label className="text-body-s text-text-2 mb-2 block">
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
                  className="w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 text-[15px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent resize-none"
                />
                <p className="mt-1 text-caption text-text-3">
                  <span className="font-mono">{brief.length}/50</span> characters minimum
                </p>
              </div>

              {/* Ad Length — hidden for UGC (fixed 20-30s) */}
              {style !== "ugc" && (
              <div>
                <label className="text-body-s text-text-2 mb-2 block">
                  Ad length
                </label>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      { value: "short", label: "Short (~30s)" },
                      { value: "standard", label: "Standard (~60s)" },
                      { value: "long", label: "Long (~90s)" },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-2 rounded-md border px-4 py-2.5 cursor-pointer transition-colors delay-[var(--hover-delay)] duration-[var(--duration-fast)] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                        adLength === opt.value
                          ? "border-accent bg-accent-soft text-text"
                          : "border-line bg-surface text-text-2 hover:bg-surface-2"
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
                      <span className="text-body-s">{opt.label}</span>
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
                  {!submitting && <Sparkles className="h-4 w-4" />}
                  {submitting ? "Starting…" : "Make video ad"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Section C: Status Tracker */}
      {phase === "status" && jobStatus && (
        <Card className="mb-8 animate-in">
          <CardContent>
            <div className="flex items-center gap-3 mb-6">
              <span className="live-dot" aria-hidden />
              <div>
                <h3 className="text-heading text-text">
                  Making your video ad
                </h3>
                <p className="text-body-s text-text-2">
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
                      <CheckCircle2 className="h-5 w-5 text-teal shrink-0" />
                    ) : state === "active" ? (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                        <span className="live-dot" />
                      </span>
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-line shrink-0" />
                    )}
                    <span
                      className={`text-body ${
                        state === "pending"
                          ? "text-text-3"
                          : "text-text"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className="text-body-s text-text-3 mb-4">
              This usually takes 2 to 4 minutes. You can leave this page;
              we&apos;ll let you know when it&apos;s done.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard">
                Go to dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Section D: Completed Video */}
      {phase === "done" && jobStatus?.videoUrl && (
        <Card className="mb-8 animate-in">
          <CardContent>
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="h-5 w-5 text-teal" />
              <h3 className="text-heading text-text">
                Your video ad is ready
              </h3>
            </div>

            {/* Video Player */}
            <div className={`rounded-lg overflow-hidden bg-ground border border-line mb-6 ${style === "ugc" ? "max-w-sm mx-auto" : ""}`}>
              <video
                src={jobStatus.videoUrl}
                poster={jobStatus.thumbnailUrl ?? undefined}
                controls
                className={`w-full ${style === "ugc" ? "aspect-[9/16]" : "aspect-video"}`}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 mb-6">
              <Button variant="outline" size="sm" asChild>
                <a href={jobStatus.videoUrl} download>
                  <Download className="h-4 w-4" />
                  Download MP4
                </a>
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNewVideo}>
                <RefreshCw className="h-4 w-4" />
                Make another
              </Button>
            </div>

            {/* Script toggle */}
            {jobStatus.scriptData && (
              <div>
                <button
                  onClick={() => setScriptExpanded(!scriptExpanded)}
                  aria-expanded={scriptExpanded}
                  className="hover-link flex items-center gap-2 text-body-s text-text-2 hover:text-text"
                >
                  {scriptExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  {scriptExpanded ? "Hide script" : "Show script"}
                </button>
                {scriptExpanded && (
                  <div className="mt-3 rounded-md bg-ground border border-line p-4 max-h-80 overflow-y-auto">
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
        <h2 className="text-heading text-text mb-4">Previous videos</h2>
        {historyLoading ? (
          <div className="space-y-3" role="status" aria-label="Loading videos">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : history.length === 0 ? (
          <EmptyState title="No videos yet. Make your first video ad above." />
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
                    <div className="shrink-0 w-20 h-14 rounded-md overflow-hidden bg-surface-2 flex items-center justify-center">
                      {job.thumbnail_url ? (
                        <img
                          src={job.thumbnail_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Video className="h-5 w-5 text-text-3" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-title text-text truncate">
                        {job.brief.slice(0, 60)}
                        {job.brief.length > 60 ? "…" : ""}
                      </p>
                      <p className="text-body-s text-text-3">
                        {job.style === "ugc" ? "Creator" : job.style === "presenter" ? "Presenter" : "Cinematic"}
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
                          <IconButton
                            size="sm"
                            label="Watch video"
                            onClick={() => viewJobStatus(job)}
                          >
                            <Play className="h-4 w-4" />
                          </IconButton>
                        </>
                      ) : job.status === "failed" ? (
                        <>
                          <Badge variant="error">Failed</Badge>
                          <IconButton
                            size="sm"
                            label="Try again"
                            title="Try again"
                            onClick={() => handleRetry(job.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </IconButton>
                        </>
                      ) : (
                        <>
                          <Badge variant="default">
                            <span className="live-dot" aria-hidden />
                            Making
                          </Badge>
                          {!isActive && (
                            <IconButton
                              size="sm"
                              label="See progress"
                              onClick={() => viewJobStatus(job)}
                            >
                              <ArrowRight className="h-4 w-4" />
                            </IconButton>
                          )}
                        </>
                      )}
                      <IconButton
                        size="sm"
                        label="Delete video"
                        title="Delete video"
                        onClick={() => handleDelete(job.id)}
                        className="text-text-3 hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
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
      <p className="text-body-s text-text-3">No script saved for this video.</p>
    );
  }
  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <p className="text-label text-text-3 mb-1.5">
            {key.replace(/_/g, " ")}
          </p>
          {Array.isArray(value) ? (
            <ul className="space-y-1.5">
              {value.map((item, i) => (
                <li
                  key={i}
                  className="text-body-s text-text-2 pl-3 border-l-2 border-line"
                >
                  {typeof item === "string" ? item : JSON.stringify(item)}
                </li>
              ))}
            </ul>
          ) : typeof value === "object" && value !== null ? (
            <p className="text-body-s text-text-2 whitespace-pre-wrap">
              {Object.entries(value as Record<string, unknown>)
                .map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
                .join("\n")}
            </p>
          ) : (
            <p className="text-body-s text-text-2 whitespace-pre-wrap">
              {String(value ?? "")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
