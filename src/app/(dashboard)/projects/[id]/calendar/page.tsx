"use client";

import { useEffect, useState, use } from "react";
import {
  Twitter,
  Linkedin,
  Mail,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  CalendarDays,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { PageHeader } from "@/src/components/layout/page-header";
import { ProjectNav } from "@/src/components/layout/project-nav";
import { useToast } from "@/src/components/ui/toast";
import { createClient } from "@/src/lib/supabase/client";
import { CalendarGrid } from "@/src/components/calendar/calendar-grid";
import { DayDetail } from "@/src/components/calendar/day-detail";
import Link from "next/link";

interface ScheduledPost {
  id: string;
  channel: "x" | "linkedin" | "email";
  scheduled_for: string;
  posted_at: string | null;
  status: "pending" | "posted" | "failed" | "cancelled";
  error_message: string | null;
  created_at: string;
  assets: { id: string; title: string | null; type: string } | null;
}

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
  if (channel === "x") return <Twitter className="h-4 w-4 text-text-primary" />;
  if (channel === "linkedin")
    return <Linkedin className="h-4 w-4 text-[#0A66C2]" />;
  return <Mail className="h-4 w-4 text-success" />;
}

function channelLabel(channel: string) {
  if (channel === "x") return "X (Twitter)";
  if (channel === "linkedin") return "LinkedIn";
  return "Email";
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
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

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
    }
    setCancelling(null);
  }

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

  // Posts for selected day (for DayDetail dialog)
  const selectedDayPosts = selectedDay
    ? posts.filter((p) =>
        isSameDay(new Date(p.scheduled_for), selectedDay)
      )
    : [];

  return (
    <div>
      <PageHeader
        title="Content Calendar"
        description="Your scheduled posts across X, LinkedIn, and Email"
      >
        <Button asChild>
          <Link href={`/projects/${projectId}/agents/content`}>
            Schedule More
          </Link>
        </Button>
      </PageHeader>

      <ProjectNav projectId={projectId} />

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
              <Link href={`/projects/${projectId}/agents/content`}>
                Generate Social Content
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="calendar">
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

          {/* Calendar View */}
          <TabsContent value="calendar">
            <CalendarGrid
              posts={posts}
              onDayClick={(date) => setSelectedDay(date)}
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
                        className="animate-in"
                        style={{ animationDelay: `${i * 40}ms` }}
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
                              onClick={() => handleCancel(post.id)}
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

      {/* Day Detail Dialog */}
      <DayDetail
        date={selectedDay}
        posts={selectedDayPosts}
        cancelling={cancelling}
        onCancel={handleCancel}
        onClose={() => setSelectedDay(null)}
      />
    </div>
  );
}
