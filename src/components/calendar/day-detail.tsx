"use client";

import {
  Twitter,
  Linkedin,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/src/components/ui/dialog";

interface ScheduledPost {
  id: string;
  channel: "x" | "linkedin";
  scheduled_for: string;
  posted_at: string | null;
  status: "pending" | "posted" | "failed" | "cancelled";
  error_message: string | null;
  assets: { id: string; title: string | null; type: string } | null;
}

interface DayDetailProps {
  date: Date | null;
  posts: ScheduledPost[];
  cancelling: string | null;
  onCancel: (postId: string) => void;
  onClose: () => void;
}

function channelIcon(channel: string) {
  if (channel === "linkedin")
    return <Linkedin className="h-4 w-4 text-[#0A66C2]" />;
  return <Twitter className="h-4 w-4 text-text-primary" />;
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
    return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-error" />;
  if (status === "cancelled")
    return <XCircle className="h-3.5 w-3.5 text-text-tertiary" />;
  return <Clock className="h-3.5 w-3.5 text-warning" />;
}

export function DayDetail({
  date,
  posts,
  cancelling,
  onCancel,
  onClose,
}: DayDetailProps) {
  if (!date) return null;

  const dayLabel = date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Dialog open={!!date} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{dayLabel}</DialogTitle>
          <DialogDescription>
            {posts.length} post{posts.length !== 1 ? "s" : ""} scheduled
          </DialogDescription>
        </DialogHeader>

        {posts.length === 0 ? (
          <p className="text-small text-text-tertiary py-4 text-center">
            No posts scheduled for this day.
          </p>
        ) : (
          <div className="space-y-3 mt-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-3 rounded-lg border border-border-default bg-surface-0 p-3"
              >
                <div className="rounded-lg bg-surface-2 p-2 shrink-0">
                  {channelIcon(post.channel)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body font-medium text-text-primary truncate">
                    {post.assets?.title || "Untitled post"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={statusVariant(post.status)}>
                      {post.status}
                    </Badge>
                    <span className="flex items-center gap-1 text-caption text-text-tertiary">
                      {statusIcon(post.status)}
                      {new Date(post.scheduled_for).toLocaleTimeString(
                        undefined,
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                  {post.error_message && (
                    <p className="mt-1 text-caption text-error">
                      {post.error_message}
                    </p>
                  )}
                </div>
                {post.status === "pending" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCancel(post.id)}
                    disabled={cancelling === post.id}
                    className="shrink-0 text-error hover:text-error"
                  >
                    {cancelling === post.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
