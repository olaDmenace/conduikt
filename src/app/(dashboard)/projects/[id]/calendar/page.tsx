"use client";

import { useEffect, useState, use, useCallback } from "react";
import {
  Twitter,
  Linkedin,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  Trash2,
  CalendarRange,
  X,
  Download,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { EmptyState } from "@/src/components/ui/empty-state";
import { KpiStrip } from "@/src/components/ui/kpi-strip";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";
import { createClient } from "@/src/lib/supabase/client";
import { CalendarGrid, type ScheduledPost } from "@/src/components/calendar/calendar-grid";
import { MediaPicker } from "@/src/components/media/media-picker";
import type { PostMedia } from "@/src/lib/media/types";
import { EMPTY_MEDIA, hasMedia } from "@/src/lib/media/types";
import { TweetCard } from "@/src/components/social/tweet-card";
import { LinkedInCard } from "@/src/components/social/linkedin-card";
import Link from "next/link";

function statusVariant(
  status: string
): "success" | "error" | "warning" | "secondary" {
  if (status === "posted") return "success";
  if (status === "failed") return "error";
  if (status === "cancelled") return "secondary";
  return "warning";
}

function statusIcon(status: string) {
  if (status === "posted")
    return <CheckCircle2 className="h-4 w-4 text-teal" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-danger" />;
  if (status === "cancelled")
    return <XCircle className="h-4 w-4 text-text-3" />;
  return <Clock className="h-4 w-4 text-accent" />;
}

function channelIcon(channel: string) {
  if (channel === "linkedin")
    return <Linkedin className="h-4 w-4 text-text" />;
  return <Twitter className="h-4 w-4 text-text" />;
}

function channelLabel(channel: string) {
  if (channel === "linkedin") return "LinkedIn";
  return "X";
}

function statusLabel(status: string) {
  if (status === "posted") return "Posted";
  if (status === "failed") return "Failed";
  if (status === "cancelled") return "Cancelled";
  return "Scheduled";
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateGroup(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function exportPostsCsv(posts: ScheduledPost[], projectId: string) {
  const header = "Date,Channel,Status,Content";
  const rows = posts.map((p) => {
    const date = new Date(p.scheduled_for).toISOString();
    const channel = p.channel === "linkedin" ? "LinkedIn" : "X (Twitter)";
    const rawContent = p.assets?.content;
    const contentText =
      typeof rawContent === "string"
        ? rawContent
        : (rawContent && typeof rawContent === "object"
            ? ((rawContent as Record<string, unknown>).scheduled_text as string | undefined) ??
              ((rawContent as Record<string, unknown>).raw as string | undefined) ??
              ""
            : "");
    const content = contentText.slice(0, 200).replace(/"/g, '""').replace(/[\r\n]+/g, " ");
    return `"${date}","${channel}","${p.status}","${content}"`;
  });
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `content-calendar-${projectId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const { toast } = useToast();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

  useEffect(() => {
    fetchPosts();
  }, [projectId]);

  async function fetchPosts() {
    const res = await fetch(`/api/projects/${projectId}/schedule`);
    if (res.ok) setPosts(await res.json());
    setLoading(false);
  }

  async function handleCancel(postId: string) {
    setCancelling(postId);
    const supabase = createClient();
    const { error } = await supabase
      .from("scheduled_posts")
      .update({ status: "cancelled" })
      .eq("id", postId);
    if (error) {
      toast("Couldn't cancel the post. Try again.", "error");
    } else {
      toast("Post cancelled", "info");
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, status: "cancelled" as const } : p
        )
      );
      if (selectedPost?.id === postId) {
        setSelectedPost((sp) => (sp ? { ...sp, status: "cancelled" } : null));
      }
    }
    setCancelling(null);
  }

  const handleReschedule = useCallback(
    async (postId: string, newDate: Date) => {
      // Optimistic update
      const oldPosts = [...posts];
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId
            ? { ...p, scheduled_for: newDate.toISOString() }
            : p
        )
      );

      try {
        const res = await fetch(`/api/scheduled-posts/${postId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scheduled_for: newDate.toISOString() }),
        });

        if (!res.ok) throw new Error("Failed");

        toast(
          `Post moved to ${newDate.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}`,
          "success"
        );
      } catch {
        // Revert
        setPosts(oldPosts);
        toast("Couldn't move the post. Try again.", "error");
      }
    },
    [posts, toast]
  );

  // Group by date for timeline view
  const grouped: Record<string, ScheduledPost[]> = {};
  for (const post of posts) {
    const key = new Date(post.scheduled_for).toDateString();
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(post);
  }
  const sortedGroups = Object.entries(grouped).sort(
    ([a], [b]) => new Date(a).getTime() - new Date(b).getTime()
  );

  const pendingCount = posts.filter((p) => p.status === "pending").length;
  const postedCount = posts.filter((p) => p.status === "posted").length;
  const failedCount = posts.filter((p) => p.status === "failed").length;

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Everything scheduled to post on X and LinkedIn"
      >
        <div className="flex items-center gap-2">
          {posts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => exportPostsCsv(posts, projectId)}
            >
              <Download className="h-4 w-4" />
              Download CSV
            </Button>
          )}
          <Button asChild>
            <Link href={`/projects/${projectId}/content?skill=social-content`}>
              Schedule more
            </Link>
          </Button>
        </div>
      </PageHeader>

      {/* Stats */}
      <KpiStrip
        className="mb-8 animate-in rail:grid-cols-4"
        cells={[
          { label: "All posts", value: posts.length.toLocaleString() },
          { label: "Scheduled", value: pendingCount.toLocaleString() },
          { label: "Posted", value: postedCount.toLocaleString() },
          {
            label: "Failed",
            value: failedCount.toLocaleString(),
            context: failedCount > 0 ? "Open one to see why" : undefined,
          },
        ]}
      />

      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-96" />
        </div>
      ) : posts.length === 0 ? (
        <EmptyState
          icon={<CalendarClock className="h-6 w-6" />}
          title="Nothing scheduled yet. Write some social posts, then press Schedule on any post to add it here."
          action={
            <Button asChild>
              <Link href={`/projects/${projectId}/content?skill=social-content`}>
                Write social posts
              </Link>
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="calendar">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="calendar">
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                Calendar
              </TabsTrigger>
              <TabsTrigger value="timeline">
                <Clock className="h-3.5 w-3.5 mr-1.5" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Week / Month toggle (only visible in calendar tab) */}
            <div className="flex items-center gap-1 rounded-md border border-line p-0.5" role="group" aria-label="Calendar range">
              <button
                onClick={() => setCalendarView("week")}
                aria-pressed={calendarView === "week"}
                className={`rounded-sm px-2.5 py-1 text-body-s font-medium transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                  calendarView === "week"
                    ? "bg-surface-2 text-text"
                    : "text-text-3 hover:text-text"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5 inline mr-1" />
                Week
              </button>
              <button
                onClick={() => setCalendarView("month")}
                aria-pressed={calendarView === "month"}
                className={`rounded-sm px-2.5 py-1 text-body-s font-medium transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] ${
                  calendarView === "month"
                    ? "bg-surface-2 text-text"
                    : "text-text-3 hover:text-text"
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 inline mr-1" />
                Month
              </button>
            </div>
          </div>

          {/* Calendar View with DnD */}
          <TabsContent value="calendar">
            <CalendarGrid
              posts={posts}
              view={calendarView}
              onDayClick={() => {}}
              onPostClick={(post) => setSelectedPost(post)}
              onReschedule={handleReschedule}
            />
          </TabsContent>

          {/* Timeline View */}
          <TabsContent value="timeline">
            <div className="space-y-8">
              {sortedGroups.map(([dateKey, groupPosts]) => (
                <div key={dateKey}>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-heading text-text">
                      {formatDateGroup(groupPosts[0].scheduled_for)}
                    </h2>
                    <Badge variant="secondary">
                      {groupPosts.length} post{groupPosts.length !== 1 ? "s" : ""}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    {groupPosts.map((post, i) => (
                      <Card
                        key={post.id}
                        hover
                        className="animate-in flex items-start gap-4"
                        style={{ animationDelay: `${Math.min(i, 5) * 80}ms` }}
                        onClick={() => setSelectedPost(post)}
                      >
                          <div className="mt-0.5 shrink-0">
                            {channelIcon(post.channel)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-title text-text">
                                {post.assets?.title || "Untitled post"}
                              </p>
                              <Badge variant={statusVariant(post.status)}>
                                {statusLabel(post.status)}
                              </Badge>
                              <Badge variant="secondary">
                                {channelLabel(post.channel)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-body-s text-text-3">
                              {statusIcon(post.status)}
                              <span>
                                {post.status === "posted" && post.posted_at
                                  ? `Posted ${formatDateTime(post.posted_at)}`
                                  : `Scheduled for ${formatDateTime(post.scheduled_for)}`}
                              </span>
                            </div>
                            {post.error_message && (
                              <p className="mt-1 text-body-s text-danger">
                                Why it failed: {post.error_message}
                              </p>
                            )}
                          </div>

                          {post.status === "pending" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCancel(post.id);
                              }}
                              disabled={cancelling === post.id}
                              className="shrink-0 hover:text-danger"
                            >
                              {cancelling !== post.id && (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              {cancelling === post.id ? "Cancelling…" : "Cancel"}
                            </Button>
                          )}
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Post Slide-Over Panel */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-overlay/60"
            onClick={() => setSelectedPost(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Scheduled post"
            className="relative w-full max-w-md animate-in slide-in-from-right overflow-y-auto border-l border-line bg-ground shadow-[var(--shadow-float)]"
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-line bg-ground p-4">
              <div className="flex items-center gap-2">
                {channelIcon(selectedPost.channel)}
                <Badge variant={statusVariant(selectedPost.status)}>
                  {statusLabel(selectedPost.status)}
                </Badge>
              </div>
              <IconButton label="Close" size="sm" onClick={() => setSelectedPost(null)}>
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-title text-text mb-1">
                  {selectedPost.assets?.title || "Untitled post"}
                </h3>
                <p className="text-body-s text-text-3">
                  {channelLabel(selectedPost.channel)}
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-label text-text-3">Scheduled for</p>
                <p className="text-body text-text flex items-center gap-2">
                  {statusIcon(selectedPost.status)}
                  {formatDateTime(selectedPost.scheduled_for)}
                </p>
              </div>

              {selectedPost.posted_at && (
                <div>
                  <p className="mb-1.5 text-label text-text-3">Posted at</p>
                  <p className="text-body text-text">
                    {formatDateTime(selectedPost.posted_at)}
                  </p>
                </div>
              )}

              {selectedPost.assets?.content && (() => {
                const raw = selectedPost.assets.content;
                const contentObj =
                  typeof raw === "object" && raw !== null
                    ? (raw as Record<string, unknown>)
                    : {};
                const text =
                  typeof raw === "string"
                    ? raw
                    : ((contentObj.scheduled_text as string | undefined) ??
                      (contentObj.raw as string | undefined) ??
                      "");
                const media = (contentObj.media as PostMedia | undefined) ?? EMPTY_MEDIA;
                const mediaCount = hasMedia(media) ? 1 : 0;
                return (
                  <>
                    {text && (
                      <div>
                        <p className="mb-1.5 text-label text-text-3">
                          Preview
                        </p>
                        {/* Native platform preview replaces the plain text
                            box. Users clicking a scheduled tile now see the
                            post as it will actually render on the platform,
                            not just its raw text. */}
                        {selectedPost.channel === "linkedin" ? (
                          <LinkedInCard text={text} mediaCount={mediaCount} />
                        ) : (
                          <TweetCard text={text} mediaCount={mediaCount} />
                        )}
                      </div>
                    )}
                    {selectedPost.status === "pending" && (
                      <div>
                        <p className="mb-1.5 text-label text-text-3">Image</p>
                        <MediaPicker
                          value={media}
                          projectId={projectId}
                          onChange={async (m) => {
                            const res = await fetch(
                              `/api/scheduled-posts/${selectedPost.id}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ media: m }),
                              }
                            );
                            if (res.ok) {
                              toast("Image updated", "success");
                              fetchPosts();
                              setSelectedPost({
                                ...selectedPost,
                                assets: selectedPost.assets
                                  ? {
                                      ...selectedPost.assets,
                                      content: { ...contentObj, media: m },
                                    }
                                  : null,
                              });
                            } else {
                              toast("Couldn't update the image. Try again.", "error");
                            }
                          }}
                          defaultOverlayText={text.slice(0, 120)}
                        />
                      </div>
                    )}
                    {selectedPost.status !== "pending" && hasMedia(media) && (
                      <div>
                        <p className="mb-1.5 text-label text-text-3">Image</p>
                        <div className="overflow-hidden rounded-md border border-line">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={media.url ?? ""}
                            alt=""
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}

              {selectedPost.error_message && (
                <div>
                  <p className="mb-1.5 text-label text-text-3">Why it failed</p>
                  <p className="text-body text-danger">{selectedPost.error_message}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedPost.status === "pending" && (
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={() => {
                      handleCancel(selectedPost.id);
                      setSelectedPost(null);
                    }}
                    disabled={cancelling === selectedPost.id}
                  >
                    <Trash2 className="h-4 w-4" />
                    Cancel post
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
