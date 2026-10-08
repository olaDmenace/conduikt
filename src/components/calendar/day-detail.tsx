"use client";

import {
  Twitter,
  Linkedin,
  CheckCircle2,
  XCircle,
  Clock,
  Trash2,
} from "@/src/components/ui/lucide-icons";
import { Badge } from "@/src/components/ui/badge";
import { IconButton } from "@/src/components/ui/button";
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
    return <Linkedin className="h-4 w-4 text-text" />;
  return <Twitter className="h-4 w-4 text-text" />;
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
    return <CheckCircle2 className="h-3.5 w-3.5 text-teal" />;
  if (status === "failed") return <XCircle className="h-3.5 w-3.5 text-danger" />;
  if (status === "cancelled")
    return <XCircle className="h-3.5 w-3.5 text-text-3" />;
  return <Clock className="h-3.5 w-3.5 text-accent" />;
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
          <p className="py-4 text-center text-body-s text-text-3">
            Nothing scheduled for this day.
          </p>
        ) : (
          <div className="space-y-3 mt-2">
            {posts.map((post) => (
              <div
                key={post.id}
                className="flex items-start gap-3 rounded-md border border-line bg-ground p-3"
              >
                <div className="mt-0.5 shrink-0">
                  {channelIcon(post.channel)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-title text-text">
                    {post.assets?.title || "Untitled post"}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={statusVariant(post.status)}>
                      {post.status === "pending" ? "scheduled" : post.status}
                    </Badge>
                    <span className="flex items-center gap-1 text-caption text-text-3">
                      {statusIcon(post.status)}
                      {new Date(post.scheduled_for).toLocaleTimeString(
                        undefined,
                        { hour: "2-digit", minute: "2-digit" }
                      )}
                    </span>
                  </div>
                  {post.error_message && (
                    <p className="mt-1 text-caption text-danger">
                      {post.error_message}
                    </p>
                  )}
                </div>
                {post.status === "pending" && (
                  <IconButton
                    label={cancelling === post.id ? "Cancelling post" : "Cancel post"}
                    size="sm"
                    onClick={() => onCancel(post.id)}
                    disabled={cancelling === post.id}
                    className="hover:text-danger disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </IconButton>
                )}
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
