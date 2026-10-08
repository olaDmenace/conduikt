"use client";

import { useState, useEffect } from "react";
import { Send, Check, Globe, ChevronDown } from "@/src/components/ui/lucide-icons";
import { Button } from "@/src/components/ui/button";
import { useToast } from "@/src/components/ui/toast";

interface Webhook {
  id: string;
  name: string;
  type: string;
  active: boolean;
}

interface SendToWebhookProps {
  title: string;
  content: string;
  contentType: string;
  projectId: string;
}

export function SendToWebhook({
  title,
  content,
  contentType,
  projectId,
}: SendToWebhookProps) {
  const { toast } = useToast();
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchWebhooks() {
      const res = await fetch(`/api/webhooks?project_id=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setWebhooks((data as Webhook[]).filter((w) => w.active));
      }
    }
    fetchWebhooks();
  }, [projectId]);

  async function handleSend(webhook: Webhook) {
    setSending(webhook.id);
    try {
      const res = await fetch(`/api/webhooks/${webhook.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, type: contentType }),
      });

      if (res.ok) {
        setSent((prev) => new Set(prev).add(webhook.id));
        toast(`Sent to ${webhook.name}`, "success");
      } else {
        const err = await res.json();
        toast(err.error || "Failed to send", "error");
      }
    } catch {
      toast("Failed to send to webhook", "error");
    }
    setSending(null);
  }

  if (webhooks.length === 0) return null;

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
      >
        <Send className="h-4 w-4" />
        Send to…
        <ChevronDown className="h-3 w-3 ml-1" />
      </Button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded-lg border border-line bg-surface py-1 shadow-[var(--shadow-float)] animate-in">
            <p className="px-3 py-1.5 text-label text-text-3">
              Send content to
            </p>
            {webhooks.map((wh) => {
              const isSent = sent.has(wh.id);
              const isSending = sending === wh.id;
              return (
                <button
                  key={wh.id}
                  onClick={() => handleSend(wh)}
                  disabled={isSending}
                  className="flex items-center gap-2 w-full px-3 py-2 text-body-s text-text-2 hover:bg-surface-2 hover:text-text transition-colors duration-[var(--duration-fast)] delay-[var(--hover-delay)] disabled:opacity-50"
                >
                  {isSending ? (
                    <span className="live-dot shrink-0" aria-hidden />
                  ) : isSent ? (
                    <Check className="h-3.5 w-3.5 text-teal shrink-0" />
                  ) : (
                    <Globe className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">{wh.name}</span>
                  <span className="ml-auto text-label text-text-3">
                    {wh.type}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
