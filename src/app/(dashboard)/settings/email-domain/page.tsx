"use client";

import { useEffect, useState } from "react";
import {
  Globe,
  Mail,
  Lock,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
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
        title="Sending Domain"
        description="Where your marketing emails come from. Custom domain (Pro+) lands in inboxes more reliably and matches your brand."
      />

      {/* Current sender — what every Conduikt user sends from today. */}
      <Card className="mb-6">
        <CardContent>
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-accent-muted p-2 shrink-0">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-body font-medium text-text-primary">
                  Current sender
                </p>
                <Badge variant="success" className="text-[0.65rem]">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-small text-text-secondary mb-2">
                Your broadcasts are sent from Conduikt's shared sender. Recipients
                see your project name as the friendly display.
              </p>
              <div className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-small text-text-primary">
                {CONDUIKT_SHARED_FROM_EMAIL}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Custom domain — gated to Pro+, shipping soon. */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-accent/20">
          <CardContent>
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent-muted p-2 shrink-0">
                <Globe className="h-5 w-5 text-accent" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-body font-medium text-text-primary">
                    Use your own sending domain
                  </p>
                  <Badge variant="info">Pro+</Badge>
                  <Badge variant="secondary">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Coming soon
                  </Badge>
                </div>
                <p className="text-small text-text-secondary mb-4">
                  Send from <code className="font-mono">mail@yourcompany.com</code>{" "}
                  instead of our shared domain. Better deliverability,
                  recipient-side trust, and your brand on every email. Setup is
                  3 DNS records (SPF, DKIM, DMARC) — about 10 minutes.
                </p>

                {!eligible ? (
                  <div className="rounded-lg border border-border-default bg-surface-2 p-4">
                    <div className="flex items-start gap-2">
                      <Lock className="h-4 w-4 text-text-tertiary shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-small font-medium text-text-primary">
                          Available on Pro and above
                        </p>
                        <p className="text-caption text-text-tertiary mt-1">
                          Upgrade to Pro ($49/mo) or Growth ($99/mo) to verify
                          your own domain when this ships.
                        </p>
                      </div>
                      <Button size="sm" variant="secondary" asChild>
                        <a href="/settings/billing">
                          Upgrade
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : waitlisted ? (
                  <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                      <div>
                        <p className="text-small font-medium text-text-primary">
                          You're on the waitlist
                        </p>
                        <p className="text-caption text-text-tertiary mt-1">
                          We'll email you the moment custom domains go live.
                          Until then, all your broadcasts use the shared sender.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-small font-medium text-text-primary">
                          You're eligible — let us know you're interested
                        </p>
                        <p className="text-caption text-text-tertiary mt-1">
                          Click below and we'll prioritize this feature plus
                          email you when it's live.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => {
                          // Stub: we don't have a real waitlist endpoint yet.
                          // The button keeps the UI honest — clicking it
                          // toggles to the "you're on the waitlist" state
                          // locally. When the feature ships, this becomes a
                          // real POST to /api/email-domain/verify.
                          setWaitlisted(true);
                        }}
                      >
                        Notify me
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Educational note about deliverability */}
      <Card className="mt-6 border-dashed border-border-strong">
        <CardContent>
          <p className="text-small font-medium text-text-primary mb-2">
            Why does this matter?
          </p>
          <ul className="space-y-2 text-small text-text-secondary">
            <li className="flex gap-2">
              <span className="text-accent shrink-0">·</span>
              <span>
                <strong className="text-text-primary">Deliverability:</strong>{" "}
                Mailbox providers trust senders with proper SPF/DKIM/DMARC on
                their own domain more than shared senders. Higher inbox rates,
                fewer "promotions tab" landings.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent shrink-0">·</span>
              <span>
                <strong className="text-text-primary">Brand consistency:</strong>{" "}
                Recipients see <code className="font-mono">mail@yourcompany.com</code>{" "}
                instead of <code className="font-mono">{CONDUIKT_SHARED_FROM_EMAIL}</code>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-accent shrink-0">·</span>
              <span>
                <strong className="text-text-primary">Reputation isolation:</strong>{" "}
                Your own domain reputation is yours alone — not affected by other
                Conduikt users' send patterns.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
