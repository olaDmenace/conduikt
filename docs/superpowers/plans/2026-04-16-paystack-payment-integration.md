# Paystack Payment Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Lemon Squeezy with Paystack subscriptions using inline popup checkout, with provider-agnostic database columns to support Flutterwave later.

**Architecture:** Paystack Popup SDK on the frontend triggers a server-initialized transaction. Paystack webhooks (HMAC-SHA512 verified) handle subscription lifecycle events and update the `profiles` table. Provider-agnostic `payment_*` columns replace Lemon Squeezy-specific ones.

**Tech Stack:** Paystack API v1, `@paystack/inline-js`, Next.js App Router, Supabase (service client for webhooks)

**Spec:** `docs/superpowers/specs/2026-04-16-paystack-payment-integration-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/migrations/20260416_payment_provider_columns.sql` | Create | Drop LS columns, add `payment_*` columns |
| `src/lib/plans.ts` | Modify | Add Paystack plan code mapping + resolver |
| `src/app/api/billing/initialize/route.ts` | Create | Server-side Paystack transaction init |
| `src/app/api/webhooks/paystack/route.ts` | Create | Webhook handler with HMAC verification |
| `src/app/(dashboard)/settings/billing/page.tsx` | Rewrite | Paystack Popup checkout, remove all LS refs |
| `src/app/(marketing)/pricing/page.tsx` | Modify | Wire CTA buttons for logged-in users |
| `src/app/api/webhooks/lemonsqueezy/route.ts` | Delete | No longer needed |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260416_payment_provider_columns.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Drop Lemon Squeezy columns (never used in production)
ALTER TABLE profiles
  DROP COLUMN IF EXISTS lemon_squeezy_customer_id,
  DROP COLUMN IF EXISTS lemon_squeezy_subscription_id,
  DROP COLUMN IF EXISTS lemon_squeezy_variant_id;

-- Add provider-agnostic payment columns
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS payment_provider text,
  ADD COLUMN IF NOT EXISTS payment_customer_id text,
  ADD COLUMN IF NOT EXISTS payment_subscription_id text,
  ADD COLUMN IF NOT EXISTS payment_authorization text,
  ADD COLUMN IF NOT EXISTS payment_plan_code text;

-- Index for webhook lookups by customer ID
CREATE INDEX IF NOT EXISTS idx_profiles_payment_customer
  ON profiles (payment_customer_id)
  WHERE payment_customer_id IS NOT NULL;
```

- [ ] **Step 2: Apply the migration**

Run via Supabase dashboard SQL editor or MCP tool. Verify columns exist:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name LIKE 'payment_%';
```

Expected: `payment_provider`, `payment_customer_id`, `payment_subscription_id`, `payment_authorization`, `payment_plan_code`

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260416_payment_provider_columns.sql
git commit -m "chore(db): drop Lemon Squeezy columns, add payment_* columns"
```

---

### Task 2: Install Paystack SDK

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the Paystack inline SDK**

```bash
npm install @paystack/inline-js
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('@paystack/inline-js'); console.log('OK')"
```

Expected: `OK` (no errors)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @paystack/inline-js"
```

---

### Task 3: Add Paystack Plan Code Mapping to plans.ts

**Files:**
- Modify: `src/lib/plans.ts`

- [ ] **Step 1: Add Paystack plan code resolver**

Add these exports at the bottom of `src/lib/plans.ts`:

```typescript
// ---------------------------------------------------------------------------
// Paystack plan code mapping
// ---------------------------------------------------------------------------

/**
 * Maps tier keys to Paystack plan codes from env vars.
 * Plan codes are created in the Paystack dashboard (Settings > Plans).
 */
export function getPaystackPlanCode(tier: PlanTier): string | null {
  const map: Record<string, string | undefined> = {
    pro: process.env.PAYSTACK_PLAN_PRO,
    growth: process.env.PAYSTACK_PLAN_GROWTH,
    agency: process.env.PAYSTACK_PLAN_AGENCY,
  };
  return map[tier] ?? null;
}

/**
 * Reverse lookup: given a Paystack plan code, return the tier.
 * Used in webhook handlers to determine which plan the user subscribed to.
 */
export function paystackPlanToTier(planCode: string): PlanTier {
  if (planCode === process.env.PAYSTACK_PLAN_PRO) return "pro";
  if (planCode === process.env.PAYSTACK_PLAN_GROWTH) return "growth";
  if (planCode === process.env.PAYSTACK_PLAN_AGENCY) return "agency";
  return "free";
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep plans.ts
```

Expected: no output (no errors in plans.ts)

- [ ] **Step 3: Commit**

```bash
git add src/lib/plans.ts
git commit -m "feat(plans): add Paystack plan code mapping"
```

---

### Task 4: Create Billing Initialize API Route

**Files:**
- Create: `src/app/api/billing/initialize/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { getPaystackPlanCode, type PlanTier } from "@/src/lib/plans";

const PAYSTACK_API = "https://api.paystack.co";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { planKey } = (await request.json()) as { planKey?: string };
  if (!planKey || !["pro", "growth", "agency"].includes(planKey)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const planCode = getPaystackPlanCode(planKey as PlanTier);
  if (!planCode) {
    return NextResponse.json(
      { error: "Plan not configured. Contact support." },
      { status: 500 }
    );
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { error: "Payment provider not configured" },
      { status: 500 }
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const res = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: user.email,
      plan: planCode,
      metadata: {
        user_id: user.id,
        plan_key: planKey,
      },
      callback_url: `${appUrl}/settings/billing?payment=success`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("[billing/initialize] Paystack error:", err);
    return NextResponse.json(
      { error: "Failed to initialize payment" },
      { status: 502 }
    );
  }

  const data = await res.json();

  if (!data.status || !data.data) {
    return NextResponse.json(
      { error: "Unexpected response from payment provider" },
      { status: 502 }
    );
  }

  return NextResponse.json({
    access_code: data.data.access_code,
    authorization_url: data.data.authorization_url,
    reference: data.data.reference,
  });
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep billing
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/billing/initialize/route.ts
git commit -m "feat(billing): add Paystack transaction initialize endpoint"
```

---

### Task 5: Create Paystack Webhook Handler

**Files:**
- Create: `src/app/api/webhooks/paystack/route.ts`

- [ ] **Step 1: Create the webhook route**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/src/lib/supabase/service";
import { paystackPlanToTier } from "@/src/lib/plans";
import { sendPlanUpgradeEmail } from "@/src/lib/email";
import { createNotification } from "@/src/lib/notifications";
import crypto from "crypto";

function verifySignature(rawBody: string, signature: string): boolean {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  const hash = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");
  return hash === signature;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);
  const event: string = payload.event;
  const data = payload.data;

  const supabase = createServiceClient();

  switch (event) {
    case "subscription.create": {
      const customerCode: string = data.customer?.customer_code ?? "";
      const subscriptionCode: string = data.subscription_code ?? "";
      const planCode: string = data.plan?.plan_code ?? "";
      const authCode: string = data.authorization?.authorization_code ?? "";
      const userId: string | undefined = data.metadata?.user_id;
      const email: string = data.customer?.email ?? "";

      if (!userId) {
        console.warn("[paystack] subscription.create missing user_id in metadata");
        break;
      }

      const plan = paystackPlanToTier(planCode);

      await supabase
        .from("profiles")
        .update({
          plan,
          payment_provider: "paystack",
          payment_customer_id: customerCode,
          payment_subscription_id: subscriptionCode,
          payment_authorization: authCode,
          payment_plan_code: planCode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      // Send upgrade email
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      const name =
        userData?.user?.user_metadata?.full_name ??
        userData?.user?.user_metadata?.name ??
        "";
      if (email) {
        sendPlanUpgradeEmail(email, plan, name).catch(() => {});
      }

      break;
    }

    case "charge.success": {
      // Only handle recurring subscription charges (not the initial one)
      const userId: string | undefined = data.metadata?.user_id;
      const planObj = data.plan;

      if (!userId || !planObj) break;

      // Reset generation count on successful recurring payment
      await supabase
        .from("profiles")
        .update({
          generation_count: 0,
          generation_reset_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      break;
    }

    case "subscription.disable":
    case "subscription.not_renew": {
      // Downgrade to free
      const customerCode: string = data.customer?.customer_code ?? "";

      if (!customerCode) break;

      await supabase
        .from("profiles")
        .update({
          plan: "free",
          payment_subscription_id: null,
          payment_authorization: null,
          payment_plan_code: null,
          updated_at: new Date().toISOString(),
        })
        .eq("payment_customer_id", customerCode);

      break;
    }

    case "invoice.payment_failed": {
      // Notify user but keep plan active (grace period)
      const customerCode: string = data.customer?.customer_code ?? "";

      if (!customerCode) break;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("payment_customer_id", customerCode)
        .maybeSingle();

      if (profile) {
        await createNotification(profile.id, {
          type: "payment_failed",
          title: "Payment failed",
          body: "Your subscription payment failed. Please update your payment method to avoid losing access.",
          actionUrl: "/settings/billing",
        });
      }

      break;
    }

    default:
      // Ignore unhandled events
      break;
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep "webhooks/paystack"
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/webhooks/paystack/route.ts
git commit -m "feat(billing): add Paystack webhook handler"
```

---

### Task 6: Rewrite Billing Page with Paystack Popup

**Files:**
- Rewrite: `src/app/(dashboard)/settings/billing/page.tsx`

This is a full rewrite — replace the entire file. The layout structure stays the same (plan grid, usage bar, success banner) but all Lemon Squeezy references are replaced with Paystack Popup.

- [ ] **Step 1: Rewrite the billing page**

Replace the entire contents of `src/app/(dashboard)/settings/billing/page.tsx` with:

```tsx
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Zap,
  Loader2,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import {
  PLAN_PRICING,
  GENERATION_LIMITS,
  isUnlimited,
  type PlanTier,
} from "@/src/lib/plans";

interface Profile {
  id: string;
  email: string;
  plan: string;
  generation_count: number;
  payment_provider: string | null;
  payment_customer_id: string | null;
  payment_subscription_id: string | null;
}

const plans: {
  key: PlanTier;
  name: string;
  features: string[];
}[] = [
  {
    key: "free",
    name: "Free",
    features: ["1 project", "5 AI generations/month", "Basic audit"],
  },
  {
    key: "pro",
    name: "Pro",
    features: [
      "5 projects",
      "250 generations/month",
      "10 AI agents",
      "Multi-channel publishing",
    ],
  },
  {
    key: "growth",
    name: "Growth",
    features: [
      "15 projects",
      "500 generations/month",
      "14 AI agents",
      "Analytics feedback loop",
    ],
  },
  {
    key: "agency",
    name: "Agency",
    features: [
      "Unlimited projects",
      "Unlimited generations",
      "15 AI agents",
      "White-label reports",
      "API access",
    ],
  },
];

const POLL_TIMEOUT = 30_000;
const POLL_INTERVAL = 2_000;

function BillingContent() {
  const searchParams = useSearchParams();
  const justPaid = searchParams.get("payment") === "success";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(justPaid);
  const [upgraded, setUpgraded] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPlanRef = useRef<string | null>(null);

  async function fetchProfile(): Promise<Profile | null> {
    const res = await fetch("/api/profile");
    if (!res.ok) return null;
    return res.json();
  }

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    pollRef.current = null;
    timeoutRef.current = null;
  }

  function startPolling() {
    setVerifying(true);

    pollRef.current = setInterval(async () => {
      const data = await fetchProfile();
      if (!data) return;
      if (
        prevPlanRef.current !== null &&
        data.plan !== prevPlanRef.current
      ) {
        setProfile(data);
        setVerifying(false);
        setUpgraded(true);
        stopPolling();
        window.history.replaceState({}, "", "/settings/billing");
      }
    }, POLL_INTERVAL);

    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setVerifying(false);
      fetchProfile().then((data) => {
        if (data) setProfile(data);
      });
      window.history.replaceState({}, "", "/settings/billing");
    }, POLL_TIMEOUT);
  }

  useEffect(() => {
    fetchProfile().then((data) => {
      if (data) {
        setProfile(data);
        prevPlanRef.current = data.plan;
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!justPaid || loading) return;
    startPolling();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justPaid, loading]);

  async function handleUpgrade(planKey: PlanTier) {
    if (!profile) return;
    setCheckoutLoading(planKey);
    setError(null);

    try {
      const res = await fetch("/api/billing/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planKey }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to initialize payment");
      }

      const { access_code } = await res.json();

      // Dynamically import Paystack SDK (only when needed)
      const PaystackPop = (await import("@paystack/inline-js")).default;
      const paystack = new PaystackPop();

      prevPlanRef.current = profile.plan;

      paystack.checkout({
        key: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!,
        email: profile.email,
        accessCode: access_code,
        onSuccess: () => {
          startPolling();
        },
        onCancel: () => {
          setCheckoutLoading(null);
        },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setCheckoutLoading(null);
    }
  }

  const currentPlan = (profile?.plan ?? "free") as PlanTier;
  const genCount = profile?.generation_count ?? 0;
  const genLimit = GENERATION_LIMITS[currentPlan];
  const unlimited = isUnlimited(genLimit);
  const remaining = unlimited ? Infinity : Math.max(0, genLimit - genCount);

  return (
    <div>
      <PageHeader title="Billing" description="Manage your subscription" />

      {upgraded && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-success/20 bg-success/10 px-5 py-4 animate-in">
          <Sparkles className="h-5 w-5 text-success shrink-0" />
          <div>
            <p className="text-small font-medium text-success">
              Welcome to {currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)}!
            </p>
            <p className="text-small text-text-secondary">
              Your plan has been upgraded. Enjoy your new limits.
            </p>
          </div>
        </div>
      )}

      {verifying && !upgraded && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/10 px-5 py-4 animate-in">
          <Loader2 className="h-5 w-5 text-accent shrink-0 animate-spin" />
          <div>
            <p className="text-small font-medium text-text-primary">
              Verifying your payment...
            </p>
            <p className="text-small text-text-secondary">
              This usually takes a few seconds. Your plan will update
              automatically.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-5 py-4">
          <p className="text-small text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : (
        <>
          {/* Current Plan Summary */}
          <div className="mb-6">
            <Card className="animate-in">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-6">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-h3 text-text-primary">
                      {currentPlan.charAt(0).toUpperCase() +
                        currentPlan.slice(1)}{" "}
                      Plan
                    </h3>
                    <Badge
                      variant={
                        currentPlan === "free" ? "secondary" : "success"
                      }
                    >
                      Current
                    </Badge>
                  </div>
                  <p className="mt-1 text-small text-text-secondary">
                    {genCount} of{" "}
                    {unlimited ? "unlimited" : genLimit} AI
                    generations used this period
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-accent" />
                      <span className="text-data text-accent">
                        {unlimited
                          ? "Unlimited"
                          : `${remaining} remaining`}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Bar */}
          {!unlimited && (
            <div className="mb-8">
              <Card
                className="animate-in"
                style={{ animationDelay: "60ms" }}
              >
                <CardContent className="py-5">
                  <div className="flex items-center justify-between text-small mb-2">
                    <span className="text-text-secondary">
                      Generation Usage
                    </span>
                    <span className="text-text-tertiary">
                      {genCount}/{genLimit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (genCount / genLimit) * 100)}%`,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Plans Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan, i) => {
              const isCurrent = plan.key === currentPlan;
              const currentIdx = plans.findIndex(
                (p) => p.key === currentPlan
              );
              const planIdx = plans.findIndex(
                (p) => p.key === plan.key
              );
              const isDowngrade = currentIdx > planIdx;
              const isUpgrade = planIdx > currentIdx;
              const price = PLAN_PRICING[plan.key];
              const isLoading = checkoutLoading === plan.key;

              return (
                <Card
                  key={plan.key}
                  className={`animate-in ${isCurrent ? "border-accent" : ""}`}
                  style={{ animationDelay: `${(i + 2) * 60}ms` }}
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-h3 text-text-primary">
                        {plan.name}
                      </h3>
                      {isCurrent && (
                        <Badge variant="success">Current</Badge>
                      )}
                    </div>
                    <div className="mb-4">
                      <span className="text-2xl font-bold font-mono text-text-primary">
                        {price.label}
                      </span>
                      <span className="text-text-tertiary text-small">
                        /mo
                      </span>
                    </div>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-center gap-2 text-small text-text-secondary"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {isCurrent ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                      >
                        Current Plan
                      </Button>
                    ) : plan.key === "free" ? (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                      >
                        {isDowngrade
                          ? "Contact Support"
                          : "Free Tier"}
                      </Button>
                    ) : isUpgrade ? (
                      <Button
                        className="w-full"
                        disabled={isLoading || verifying}
                        onClick={() => handleUpgrade(plan.key)}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            Upgrade
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        className="w-full"
                        disabled
                      >
                        Contact Support
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info */}
          <div className="mt-8">
            <Card
              className="animate-in"
              style={{ animationDelay: "360ms" }}
            >
              <CardContent className="py-5">
                <p className="text-small text-text-secondary">
                  Payments are processed securely by Paystack. You can
                  upgrade your plan at any time. To downgrade or cancel,
                  contact us at{" "}
                  <a
                    href="mailto:hello@conduikt.com"
                    className="text-accent hover:underline"
                  >
                    hello@conduikt.com
                  </a>
                  . Generation limits reset on each billing cycle.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      }
    >
      <BillingContent />
    </Suspense>
  );
}
```

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep billing
```

Expected: no errors (or only pre-existing test errors)

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/settings/billing/page.tsx
git commit -m "feat(billing): rewrite billing page with Paystack Popup checkout"
```

---

### Task 7: Wire Pricing Page CTAs

**Files:**
- Modify: `src/app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Update CTA links**

In `src/app/(marketing)/pricing/page.tsx`, change the Button at the bottom of each card (line 114) from always linking to `/signup` to linking to `/settings/billing` for paid tiers:

Replace:
```tsx
                <Button variant={tier.popular ? "primary" : "secondary"} className="w-full" asChild>
                  <Link href="/signup">{tier.cta}<ArrowRight className="h-4 w-4" /></Link>
                </Button>
```

With:
```tsx
                <Button variant={tier.popular ? "primary" : "secondary"} className="w-full" asChild>
                  <Link href={tier.name === "Free" ? "/signup" : "/signup?plan=" + tier.name.toLowerCase()}>
                    {tier.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
```

This sends new users to signup with a `?plan=` hint. The billing page handles the actual checkout after they're authenticated.

- [ ] **Step 2: Commit**

```bash
git add src/app/(marketing)/pricing/page.tsx
git commit -m "feat(pricing): wire CTA buttons with plan param"
```

---

### Task 8: Delete Lemon Squeezy Webhook Route

**Files:**
- Delete: `src/app/api/webhooks/lemonsqueezy/route.ts`

- [ ] **Step 1: Delete the file**

```bash
rm src/app/api/webhooks/lemonsqueezy/route.ts
```

- [ ] **Step 2: Verify no imports reference it**

```bash
grep -r "lemonsqueezy" src/ --include="*.ts" --include="*.tsx"
```

Expected: no output (no remaining references)

- [ ] **Step 3: Remove the empty directory if present**

```bash
rmdir src/app/api/webhooks/lemonsqueezy 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add -A src/app/api/webhooks/lemonsqueezy
git commit -m "chore: remove Lemon Squeezy webhook route"
```

---

### Task 9: Update Environment Variables

**Files:**
- Modify: `.env.local.example`

- [ ] **Step 1: Add Paystack env vars to example file**

Remove any `LEMONSQUEEZY_*` lines and add:

```
# Paystack
PAYSTACK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_xxx
PAYSTACK_PLAN_PRO=PLN_xxx
PAYSTACK_PLAN_GROWTH=PLN_xxx
PAYSTACK_PLAN_AGENCY=PLN_xxx
```

- [ ] **Step 2: Add real keys to `.env.local`**

Add the Paystack test keys (user provides these from their Paystack dashboard). This file is gitignored.

- [ ] **Step 3: Commit**

```bash
git add .env.local.example
git commit -m "chore: update env example with Paystack keys"
```

---

### Task 10: Smoke Test & Final Verification

- [ ] **Step 1: Run type check**

```bash
npx tsc --noEmit
```

Expected: only pre-existing test file errors, no errors in any billing/payment/webhook files

- [ ] **Step 2: Run dev server**

```bash
npm run dev
```

Navigate to `/settings/billing` — verify:
- Plan grid renders with correct prices from `PLAN_PRICING`
- Usage bar shows for free tier
- "Upgrade" buttons are clickable (will fail without real Paystack keys, but shouldn't crash)
- No console errors

- [ ] **Step 3: Verify webhook route exists**

```bash
curl -X POST http://localhost:3000/api/webhooks/paystack -H "Content-Type: text/plain" -d "test"
```

Expected: `{"error":"Invalid signature"}` with status 401 (proves route exists and rejects unsigned requests)

- [ ] **Step 4: Final commit with any fixes**

```bash
git add -A
git commit -m "feat(billing): Paystack payment integration complete"
```
