"use client";

import { use, useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Star, Send, Mail, MessageCircle, Clock } from "@/src/components/ui/lucide-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Input, Field } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

// Review requests (audit §5.4 item 6). Every customer gets the same ask
// the moment the job is done; nothing here looks at how happy they were.

interface ReviewRequest {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  channel: "email" | "whatsapp";
  status: "queued" | "sent" | "failed" | "skipped";
  sent_at: string | null;
  error: string | null;
  created_at: string;
}

interface ListResponse {
  reviewUrl: string | null;
  /** Why requests cannot go out yet (no link, or not a Google one); null when fine. */
  reviewLinkProblem: string | null;
  /** False once a Free account has used this month's review requests. */
  canSend: boolean;
  planMessage: string | null;
  /** This month's Free allowance; null on plans with no cap. */
  allowance: { limit: number; used: number; remaining: number } | null;
  requests: ReviewRequest[];
}

const STATUS_LABEL: Record<ReviewRequest["status"], string> = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
  skipped: "Skipped",
};

const STATUS_VARIANT: Record<ReviewRequest["status"], "secondary" | "success" | "error" | "warning"> = {
  queued: "secondary",
  sent: "success",
  failed: "error",
  skipped: "warning",
};

const textareaClass =
  "w-full rounded-md border border-line-strong bg-surface px-3.5 py-2.5 font-mono text-[13px] text-text placeholder:text-text-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent min-h-[120px] resize-y";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: projectId } = use(params);
  const { toast } = useToast();

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [channel, setChannel] = useState<"" | "email" | "whatsapp">("");
  const [sending, setSending] = useState(false);

  const [csv, setCsv] = useState("");
  const [sendingMany, setSendingMany] = useState(false);

  const base = `/api/projects/${encodeURIComponent(projectId)}/review-requests`;

  const load = useCallback(async () => {
    try {
      const res = await fetch(base);
      const body = (await res.json().catch(() => ({}))) as ListResponse & { error?: string };
      if (!res.ok) throw new Error(body.error || `Could not load review requests (${res.status})`);
      setData(body);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load review requests");
    } finally {
      setLoading(false);
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  const linkProblem = data?.reviewLinkProblem ?? (data?.reviewUrl ? null : "Add your Google review link first");
  const canSend = data?.canSend ?? true;
  const ready = canSend && !linkProblem;

  async function sendOne(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast("Add the customer's name", "warning");
      return;
    }
    if (!email.trim() && !phone.trim()) {
      toast("Add an email address or a phone number", "warning");
      return;
    }
    setSending(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          channel: channel || null,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string; request?: ReviewRequest };
      if (!res.ok) throw new Error(body.error || "Could not send the request");
      const r = body.request;
      if (r?.status === "sent") toast(`Asked ${r.name} for a review by ${r.channel === "whatsapp" ? "WhatsApp" : "email"}`, "success");
      else if (r?.status === "skipped") toast(`Skipped: ${r.error ?? "no way to reach them"}`, "warning");
      else if (r?.status === "failed") toast(`Could not send: ${r.error ?? "unknown error"}`, "error");
      setName("");
      setEmail("");
      setPhone("");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send the request", "error");
    } finally {
      setSending(false);
    }
  }

  async function sendMany(e: FormEvent) {
    e.preventDefault();
    if (!csv.trim()) return;
    setSendingMany(true);
    try {
      const res = await fetch(base, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        sent?: number;
        failed?: number;
        skipped?: number;
        skippedLines?: number[];
      };
      if (!res.ok) throw new Error(body.error || "Could not send the requests");
      const parts = [`${body.sent ?? 0} sent`];
      if (body.failed) parts.push(`${body.failed} failed`);
      if (body.skipped) parts.push(`${body.skipped} skipped`);
      if (body.skippedLines?.length) parts.push(`${body.skippedLines.length} line${body.skippedLines.length === 1 ? "" : "s"} ignored`);
      toast(parts.join(", "), body.sent ? "success" : "warning");
      setCsv("");
      await load();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Could not send the requests", "error");
    } finally {
      setSendingMany(false);
    }
  }

  const requests = data?.requests ?? [];
  const sentCount = requests.filter((r) => r.status === "sent").length;

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Ask every customer for a Google review the moment the job is done. Same message for everyone."
      >
        <Button variant="quiet" size="sm" asChild>
          <Link href={`/projects/${projectId}/settings`}>Review link in Settings</Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="space-y-4" role="status" aria-label="Loading review requests">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      ) : error ? (
        <EmptyState icon={<Star className="h-6 w-6" />} title={`We couldn't load review requests: ${error}.`} />
      ) : (
        <div className="space-y-6">
          {!canSend && (
            <Card className="animate-in border-accent">
              <CardHeader>
                <CardTitle>You&apos;ve used this month&apos;s free review requests</CardTitle>
                <CardDescription>
                  {data?.planMessage ?? "Upgrade in Billing to ask customers for reviews from here."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" asChild>
                  <Link href="/settings/billing">Open Billing</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {canSend && data?.allowance && (
            <p className="text-body-s text-text-2">
              {data.allowance.remaining} of {data.allowance.limit} free review requests left this month.{" "}
              <Link href="/settings/billing" className="hover-link text-accent hover:text-accent-hover">
                Upgrade to Local
              </Link>{" "}
              for no monthly cap.
            </p>
          )}

          {canSend && linkProblem && (
            <Card className="animate-in border-accent">
              <CardHeader>
                <CardTitle>{linkProblem}</CardTitle>
                <CardDescription>
                  Every request points customers to it. Paste the link Google gives you under &ldquo;Ask for reviews&rdquo;
                  (it starts with g.page/r/) in this project&rsquo;s Settings under business details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button size="sm" asChild>
                  <Link href={`/projects/${projectId}/settings`}>Open Settings</Link>
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            {/* One customer */}
            <Card className="animate-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-4 w-4 text-text-3" />
                  Job done? Ask for a review
                </CardTitle>
                <CardDescription>
                  Email goes out right away. WhatsApp is used when the customer has opted in and WhatsApp is connected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={sendOne} className="space-y-4">
                  <Input
                    label="Customer name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Try: Ngozi Okafor"
                    maxLength={120}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Try: ngozi@example.com"
                  />
                  <Input
                    label="Phone (WhatsApp)"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Try: 0803 123 4567"
                    hint="Either an email or a phone number is enough."
                  />
                  <Field label="Send by" htmlFor="review-channel">
                    <select
                      id="review-channel"
                      value={channel}
                      onChange={(e) => setChannel(e.target.value as "" | "email" | "whatsapp")}
                      className="h-10 w-full rounded-md border border-line-strong bg-surface px-3.5 font-sans text-[15px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <option value="">Whatever reaches them</option>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </Field>
                  <Button type="submit" disabled={sending || !ready}>
                    {!sending && <Star className="h-4 w-4" />}
                    {sending ? "Sending…" : "Ask for a review"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Many at once */}
            <Card className="animate-in" style={{ animationDelay: "60ms" }}>
              <CardHeader>
                <CardTitle>Ask many customers at once</CardTitle>
                <CardDescription>
                  One per line: name, email, phone. Either email or phone can be blank. Up to 50 lines per paste.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={sendMany} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="review-csv" className="text-body-s text-text-2">
                      Customers
                    </label>
                    <textarea
                      id="review-csv"
                      className={textareaClass}
                      value={csv}
                      onChange={(e) => setCsv(e.target.value)}
                      placeholder={"Ngozi Okafor, ngozi@example.com, 0803 123 4567\nTunde Bello, , 0802 555 0199"}
                    />
                  </div>
                  <Button type="submit" variant="outline" disabled={sendingMany || !ready || !csv.trim()}>
                    {sendingMany ? "Sending…" : "Ask them all"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* How to get the link */}
          <p className="animate-in max-w-[72ch] text-body-s text-text-3" style={{ animationDelay: "120ms" }}>
            How to get your review link: open your Google Business Profile, choose &ldquo;Ask for reviews&rdquo;, copy the short link
            (it starts with g.page/r/), and paste it into this project&rsquo;s Settings.
          </p>

          {/* The list */}
          {requests.length === 0 ? (
            <EmptyState
              icon={<Star className="h-6 w-6" />}
              title="No one asked yet. The first customer you add shows up here with what happened."
            />
          ) : (
            <Card className="animate-in overflow-hidden p-0 md:p-0" style={{ animationDelay: "180ms" }}>
              <div className="flex items-center justify-between p-4 md:px-6">
                <h3 className="text-title text-text">Customers asked</h3>
                <Badge variant="secondary">
                  {sentCount} of {requests.length} sent
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-y border-line">
                      <th className="px-6 py-3 text-label text-text-3">Customer</th>
                      <th className="px-6 py-3 text-label text-text-3">Sent by</th>
                      <th className="px-6 py-3 text-label text-text-3">Status</th>
                      <th className="px-6 py-3 text-right text-label text-text-3">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((r) => (
                      <tr key={r.id} className="border-b border-line transition-colors last:border-0 hover:bg-ground">
                        <td className="px-6 py-3">
                          <p className="text-body-s text-text">{r.name}</p>
                          <p className="font-mono text-caption text-text-3">{r.email ?? r.phone ?? ""}</p>
                        </td>
                        <td className="px-6 py-3 text-body-s text-text-2">
                          <span className="inline-flex items-center gap-1.5">
                            {r.channel === "whatsapp" ? <MessageCircle className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                            {r.channel === "whatsapp" ? "WhatsApp" : "Email"}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <Badge variant={STATUS_VARIANT[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                          {r.error && (r.status === "failed" || r.status === "skipped") && (
                            <p className="mt-1 max-w-[36ch] text-caption text-text-3">{r.error}</p>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-3 text-right font-mono text-body-s text-text-3">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {formatDate(r.sent_at ?? r.created_at)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
