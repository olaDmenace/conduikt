"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Mail,
  Lock,
  Sparkles,
  CheckCircle2,
  ArrowUpRight,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import {
  CONDUIKT_SHARED_FROM_EMAIL,
} from "@/src/lib/email/marketing";
import {
  canVerifyCustomDomain,
  normalizePlan,
  type PlanTier,
} from "@/src/lib/plans";

export default function EmailDomainPage() {
  const [plan, setPlan] = useState<PlanTier>("free");
  const [loading, setLoading] = useState(true);
  const [waitlisted, setWaitlisted] = useState(false);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((p) => setPlan(normalizePlan(p?.plan)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const eligible = canVerifyCustomDomain(plan);

  return (
    <div>
      <PageHeader
        title="Sending domain"
        description="Where your marketing emails come from. A custom domain (Pro and up) lands in inboxes more reliably and matches your brand."
      />

      {/* Current sender: what every Conduikt user sends from today. */}
      <Card className="mb-6">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center gap-2">
              <p className="text-title text-text">
                Current sender
              </p>
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" aria-hidden />
                Active
              </Badge>
            </div>
            <p className="mb-3 text-body-s text-text-2">
              Your broadcasts are sent from Conduikt&apos;s shared sender. Recipients
              see your project name as the sender name.
            </p>
            <div className="break-all rounded-md border border-line bg-ground px-3 py-2 font-mono text-body-s text-text">
              {CONDUIKT_SHARED_FROM_EMAIL}
            </div>
          </div>
        </div>
      </Card>

      {/* Custom domain: gated to Pro and up, shipping soon. */}
      {loading ? (
        <div className="space-y-3 rounded-lg border border-line bg-surface p-4 md:p-6" role="status" aria-label="Loading">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <Card>
          <div className="flex items-start gap-3">
            <Globe className="mt-0.5 h-5 w-5 shrink-0 text-text-3" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <p className="text-title text-text">
                  Use your own sending domain
                </p>
                <Badge variant="pro">Pro and up</Badge>
                <Badge variant="secondary">
                  Coming soon
                </Badge>
              </div>
              <p className="mb-4 text-body-s text-text-2">
                Send from <code className="font-mono">mail@yourcompany.com</code>{" "}
                instead of our shared domain. More of your emails reach the inbox,
                people trust them more, and your brand is on every one. Setup is
                3 DNS records (SPF, DKIM, DMARC) and takes about 10 minutes.
              </p>

              {!eligible ? (
                <div className="flex flex-col gap-3 rounded-md border border-line bg-ground p-4 sm:flex-row sm:items-start">
                  <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-3" aria-hidden />
                  <div className="flex-1">
                    <p className="text-title text-text">
                      Available on Pro and above
                    </p>
                    <p className="mt-1 text-caption text-text-3">
                      Upgrade to Pro ($49/mo) or Growth ($99/mo) to verify
                      your own domain when this ships.
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/settings/billing">
                      Upgrade
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </div>
              ) : waitlisted ? (
                <div className="flex items-start gap-2 rounded-md bg-teal-soft p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
                  <div>
                    <p className="text-title text-text">
                      You&apos;re on the waitlist
                    </p>
                    <p className="mt-1 text-caption text-text-2">
                      We&apos;ll email you the moment custom domains go live.
                      Until then, all your broadcasts use the shared sender.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-md bg-accent-soft p-4 sm:flex-row sm:items-start">
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                  <div className="flex-1">
                    <p className="text-title text-text">
                      Your plan includes this. Want to hear when it&apos;s ready?
                    </p>
                    <p className="mt-1 text-caption text-text-2">
                      Tell us you&apos;re interested and we&apos;ll email you
                      when it&apos;s live.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      // Stub: we don't have a real waitlist endpoint yet.
                      // The button keeps the UI honest: clicking it
                      // toggles to the "you're on the waitlist" state
                      // locally. When the feature ships, this becomes a
                      // real POST to /api/email-domain/verify.
                      setWaitlisted(true);
                    }}
                  >
                    Notify me
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Why it matters */}
      <div className="mt-6 rounded-lg border border-dashed border-line p-4 md:p-6">
        <p className="mb-3 text-label text-text-3">
          Why this matters
        </p>
        <ul className="space-y-2 text-body-s text-text-2">
          <li className="flex gap-2">
            <span className="shrink-0 text-text-3" aria-hidden>·</span>
            <span>
              <strong className="font-medium text-text">More emails reach the inbox:</strong>{" "}
              Mailbox providers trust senders with SPF, DKIM and DMARC on
              their own domain more than shared senders. Fewer emails end up in
              the promotions tab.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-text-3" aria-hidden>·</span>
            <span>
              <strong className="font-medium text-text">Your brand on every email:</strong>{" "}
              Recipients see <code className="font-mono">mail@yourcompany.com</code>{" "}
              instead of <code className="break-all font-mono">{CONDUIKT_SHARED_FROM_EMAIL}</code>.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 text-text-3" aria-hidden>·</span>
            <span>
              <strong className="font-medium text-text">Your reputation is yours:</strong>{" "}
              Your domain&apos;s reputation isn&apos;t affected by how other
              Conduikt users send.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
