"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  AlertTriangle,
  TrendingUp,
  Send,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/src/components/ui/button";

interface Notification {
  id: string;
  project_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof Bell> = {
  audit_complete: Check,
  post_published: Send,
  post_failed: AlertTriangle,
  score_improved: TrendingUp,
  keyword_moved: Search,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  async function handleClick(n: Notification) {
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: n.id }),
      });
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    if (n.project_id) {
      if (n.type === "audit_complete" || n.type === "score_improved") {
        router.push(`/projects/${n.project_id}/audit`);
      } else if (n.type.startsWith("post_")) {
        router.push(`/projects/${n.project_id}/calendar`);
      } else if (n.type === "keyword_moved") {
        router.push(`/projects/${n.project_id}/analytics`);
      } else {
        router.push(`/projects/${n.project_id}`);
      }
    }
    setOpen(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[0.625rem] font-bold text-surface-0">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-xl border border-border-default bg-surface-1 shadow-elevated overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <h3 className="text-body font-medium text-text-primary">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-caption text-text-tertiary hover:text-accent transition-colors flex items-center gap-1"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Bell className="h-6 w-6 text-text-tertiary mb-2" />
                  <p className="text-small text-text-tertiary">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcons[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleClick(n)}
                      className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-2 transition-colors border-b border-border-subtle last:border-0 ${
                        !n.read ? "bg-accent/5" : ""
                      }`}
                    >
                      <div
                        className={`shrink-0 rounded-lg p-2 ${
                          !n.read ? "bg-accent/10" : "bg-surface-2"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 ${
                            !n.read ? "text-accent" : "text-text-tertiary"
                          }`}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-small ${
                            !n.read
                              ? "font-medium text-text-primary"
                              : "text-text-secondary"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-caption text-text-tertiary mt-0.5 truncate">
                            {n.body}
                          </p>
                        )}
                        <p className="text-caption text-text-tertiary mt-1">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="shrink-0 mt-1.5">
                          <div className="h-2 w-2 rounded-full bg-accent" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
