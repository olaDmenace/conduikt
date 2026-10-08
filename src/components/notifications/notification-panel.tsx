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
  Unlink,
} from "@/src/components/ui/lucide-icons";

interface Notification {
  id: string;
  project_id: string | null;
  type: string;
  title: string;
  body: string | null;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

const typeIcons: Record<string, typeof Bell> = {
  audit_complete: Check,
  post_published: Send,
  post_failed: AlertTriangle,
  score_improved: TrendingUp,
  keyword_moved: Search,
  integration_expired: Unlink,
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

    if (n.action_url) {
      router.push(n.action_url);
    } else if (n.type === "integration_expired") {
      router.push("/settings/integrations");
    } else if (n.project_id) {
      if (n.type === "audit_complete" || n.type === "score_improved") {
        router.push(`/projects/${n.project_id}/audit`);
      } else if (n.type.startsWith("post_") || n.type.startsWith("video_")) {
        router.push(`/projects/${n.project_id}/video`);
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
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-text-2 transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] hover:bg-surface-2 hover:text-text"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 font-mono text-[11px] font-medium leading-none text-white">
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
          <div className="absolute right-0 top-full z-50 mt-2 w-[calc(100vw-2rem)] max-w-96 overflow-hidden rounded-lg border border-line bg-surface shadow-[var(--shadow-float)] sm:w-96">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="text-title text-text">
                Notifications
              </h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllRead}
                    className="hover-link flex items-center gap-1 text-caption text-text-3 hover:text-text"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close notifications"
                  className="hover-link text-text-3 hover:text-text"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-8 text-center">
                  <Bell className="mb-2 h-5 w-5 text-text-3" />
                  <p className="text-body-s text-text-3">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((n) => {
                  const Icon = typeIcons[n.type] || Bell;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleClick(n)}
                      className={`flex w-full gap-3 border-b border-line px-4 py-3 text-left transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] last:border-0 hover:bg-surface-2 ${
                        !n.read ? "bg-accent-soft" : ""
                      }`}
                    >
                      <Icon
                        className={`mt-0.5 h-4 w-4 shrink-0 ${
                          !n.read ? "text-accent" : "text-text-3"
                        }`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-body-s ${
                            !n.read
                              ? "font-medium text-text"
                              : "text-text-2"
                          }`}
                        >
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="mt-0.5 truncate text-caption text-text-3">
                            {n.body}
                          </p>
                        )}
                        <p className="mt-1 font-mono text-caption text-text-3">
                          {timeAgo(n.created_at)}
                        </p>
                      </div>
                      {!n.read && (
                        <div className="mt-1.5 shrink-0">
                          <div className="h-2 w-2 rounded-full bg-accent" aria-label="Unread" />
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
