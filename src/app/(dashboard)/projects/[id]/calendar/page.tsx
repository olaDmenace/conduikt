"use client";

import { useEffect, useState, use, useCallback } from "react";
import {
  Twitter,
  Linkedin,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  CalendarDays,
  Trash2,
  CalendarRange,
  X,
  Download,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { PageHeader } from "@/src/components/layout/page-header";

import { useToast } from "@/src/components/ui/toast";
import { createClient } from "@/src/lib/supabase/client";
import { CalendarGrid, type ScheduledPost } from "@/src/components/calendar/calendar-grid";
import { MediaPicker } from "@/src/components/media/media-picker";
import type { PostMedia } from "@/src/lib/media/types";
import { EMPTY_MEDIA, hasMedia } from "@/src/lib/media/types";
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
    return <CheckCircle2 className="h-4 w-4 text-success" />;
  if (status === "failed") return <XCircle className="h-4 w-4 text-error" />;
  if (status === "cancelled")
    return <XCircle className="h-4 w-4 text-text-tertiary" />;
  return <Clock className="h-4 w-4 text-warning" />;
}

function channelIcon(channel: string) {
  if (channel === "linkedin")
    return <Linkedin className="h-4 w-4 text-[#0A66C2]" />;
  return <Twitter className="h-4 w-4 text-text-primary" />;
}

function channelLabel(channel: string) {
  if (channel === "linkedin") return "LinkedIn";
  return "X (Twitter)";
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
      toast("Failed to cancel post", "error");
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
          `Post rescheduled to ${newDate.toLocaleDateString(undefined, {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}`,
          "success"
        );
      } catch {
        // Revert
        setPosts(oldPosts);
        toast("Failed to reschedule post", "error");
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
        title="Content Calendar"
        description="Your scheduled posts across X and LinkedIn"
      >
        <div className="flex items-center gap-2">
          {posts.length > 0 && (
            <Button
              variant="secondary"
              onClick={() => exportPostsCsv(posts, projectId)}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download CSV
            </Button>
          )}
          <Button asChild>
            <Link href={`/projects/${projectId}/content?skill=social-content`}>
              Schedule More
            </Link>
          </Button>
        </div>
      </PageHeader>


      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: posts.length, icon: CalendarDays, color: "text-accent" },
          { label: "Pending", value: pendingCount, icon: Clock, color: "text-warning" },
          { label: "Published", value: postedCount, icon: CheckCircle2, color: "text-success" },
          { label: "Failed", value: failedCount, icon: XCircle, color: "text-error" },
        ].map((stat, i) => (
          <Card
            key={stat.label}
            className="animate-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <CardContent className="py-4 flex items-center gap-3">
              <div className="rounded-lg bg-surface-2 p-2 shrink-0">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold font-mono text-text-primary">
                  {stat.value}
                </p>
                <p className="text-caption text-text-tertiary">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <Card className="border-dashed border-border-strong">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <CalendarClock className="h-12 w-12 text-text-tertiary mb-4" />
            <h3 className="text-h3 text-text-primary">No scheduled posts yet</h3>
            <p className="mt-2 text-body text-text-secondary max-w-md">
              Generate social content in Content Studio then use the Schedule
              button on any post card to queue it here.
            </p>
            <Button className="mt-6" asChild>
              <Link href={`/projects/${projectId}/content?skill=social-content`}>
                Generate Social Content
              </Link>
            </Button>
          </CardContent>
        </Card>
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
            <div className="flex items-center gap-1 rounded-lg border border-border-default p-0.5">
              <button
                onClick={() => setCalendarView("week")}
                className={`px-2.5 py-1 rounded-md text-small font-medium transition-colors ${
                  calendarView === "week"
                    ? "bg-surface-2 text-accent"
                    : "text-text-tertiary hover:text-text-secondary"
                }`}
              >
                <CalendarRange className="h-3.5 w-3.5 inline mr-1" />
                Week
              </button>
              <button
                onClick={() => setCalendarView("month")}
                className={`px-2.5 py-1 rounded-md text-small font-medium transition-colors ${
                  calendarView === "month"
                    ? "bg-surface-2 text-accent"
                    : "text-text-tertiary hover:text-text-secondary"
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
                    <h2 className="text-h2 text-text-primary">
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
                        className="animate-in cursor-pointer hover:border-border-strong transition-colors"
                        style={{ animationDelay: `${i * 40}ms` }}
                        onClick={() => setSelectedPost(post)}
                      >
                        <CardContent className="flex items-start gap-4 py-4">
                          <div className="rounded-lg bg-surface-2 p-2.5 shrink-0 mt-0.5">
                            {channelIcon(post.channel)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <p className="text-body font-medium text-text-primary">
                                {post.assets?.title || "Untitled post"}
                              </p>
                              <Badge variant={statusVariant(post.status)}>
                                {post.status}
                              </Badge>
                              <Badge variant="secondary">
                                {channelLabel(post.channel)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-small text-text-tertiary">
                              {statusIcon(post.status)}
                              <span>
                                {post.status === "posted" && post.posted_at
                                  ? `Published ${formatDateTime(post.posted_at)}`
                                  : `Scheduled for ${formatDateTime(post.scheduled_for)}`}
                              </span>
                            </div>
                            {post.error_message && (
                              <p className="mt-1 text-small text-error">
                                Error: {post.error_message}
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
                              className="shrink-0 text-error hover:text-error"
                            >
                              {cancelling === post.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                              Cancel
                            </Button>
                          )}
                        </CardContent>
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
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedPost(null)}
          />
          <div className="relative w-full max-w-md bg-surface-0 border-l border-border-default shadow-2xl animate-in slide-in-from-right overflow-y-auto">
            <div className="sticky top-0 bg-surface-0 border-b border-border-default p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {channelIcon(selectedPost.channel)}
                <Badge variant={statusVariant(selectedPost.status)}>
                  {selectedPost.status}
                </Badge>
              </div>
              <button
                onClick={() => setSelectedPost(null)}
                className="rounded-lg p-1.5 text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-h3 text-text-primary mb-1">
                  {selectedPost.assets?.title || "Untitled post"}
                </h3>
                <p className="text-small text-text-tertiary">
                  {channelLabel(selectedPost.channel)}
                </p>
              </div>

              <div>
                <p className="text-caption text-text-tertiary mb-1">Scheduled For</p>
                <p className="text-body text-text-primary flex items-center gap-2">
                  {statusIcon(selectedPost.status)}
                  {formatDateTime(selectedPost.scheduled_for)}
                </p>
              </div>

              {selectedPost.posted_at && (
                <div>
                  <p className="text-caption text-text-tertiary mb-1">Published At</p>
                  <p className="text-body text-text-primary">
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
                return (
                  <>
                    {text && (
                      <div>
                        <p className="text-caption text-text-tertiary mb-1">Content</p>
                        <div className="rounded-lg bg-surface-1 p-3 text-body text-text-secondary whitespace-pre-wrap">
                          {text}
                        </div>
                      </div>
                    )}
                    {selectedPost.status === "pending" && (
                      <div>
                        <p className="text-caption text-text-tertiary mb-1">Media</p>
                        <MediaPicker
                          value={media}
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
                              toast("Media updated", "success");
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
                              toast("Failed to update media", "error");
                            }
                          }}
                          defaultOverlayText={text.slice(0, 120)}
                        />
                      </div>
                    )}
                    {selectedPost.status !== "pending" && hasMedia(media) && (
                      <div>
                        <p className="text-caption text-text-tertiary mb-1">Media</p>
                        <div className="rounded-lg overflow-hidden border border-border-default">
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
                  <p className="text-caption text-text-tertiary mb-1">Error</p>
                  <p className="text-body text-error">{selectedPost.error_message}</p>
                </div>
              )}

              <div className="flex gap-2">
                {selectedPost.status === "pending" && (
                  <Button
                    variant="secondary"
                    className="flex-1 text-error hover:text-error"
                    onClick={() => {
                      handleCancel(selectedPost.id);
                      setSelectedPost(null);
                    }}
                    disabled={cancelling === selectedPost.id}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Cancel Post
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
