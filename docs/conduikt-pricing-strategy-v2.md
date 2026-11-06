# Conduikt — Final Pricing & Gating Strategy
**Version:** 2.0 (April 11, 2026)
**Launch date:** April 20, 2026

---

## Tier Structure

### Free ($0/month)
**Position:** "See what Conduikt can do"

- 1 project
- 5 generations/month
- 3 agents: SEO Audit, Social Content, Keywords
- Response gating: Info and warning-level results only. Critical findings are blurred with upgrade CTA.
- Manual copy/paste publishing only
- No saved assets

### Pro ($49/month)
**Position:** "Everything you need to market your business"

- 5 projects
- 250 generations/month
- 10 agents:
  1. SEO Audit (full results — all severity levels)
  2. Social Content
  3. Keywords
  4. Growth Playbook
  5. Blog
  6. Email Sequences
  7. Strategy
  8. Copywriting
  9. CRO
  10. Competitor Intel
- Full unblurred responses on all agents
- Multi-channel publishing
- Saved assets library
- Email support

### Growth ($99/month)
**Position:** "Execute and optimize at scale"

- 15 projects
- 500 generations/month
- 14 agents (Pro agents + 4):
  11. Campaigns — multi-step campaign orchestration
  12. Calendar — scheduling and publishing
  13. A/B Tests — variant generation and comparison
  14. Video Ads — AI presenter short-form video
- Analytics dashboard with feedback loop
- Priority support (24-hour response)

### Agency ($249/month)
**Position:** "Manage multiple clients from one account"

- Unlimited projects
- Unlimited generations
- 15 agents (Growth agents + 1 exclusive):
  15. Client Reports — white-label PDF reports per client with custom branding, metrics, and content performance (AGENCY EXCLUSIVE)
- Multi-client workspace
- Team seats (up to 5 included)
- White-label exports (remove Conduikt branding)
- API access
- Dedicated support
- Bulk operations across projects

---

## Response Gating — How It Works

This is the core conversion mechanic. Users on lower tiers see partial output — enough to know the value exists, not enough to act on it without upgrading.

### SEO Audit (Free tier gating)
The SEO Audit returns findings at three severity levels: info, warning, and critical.

**Free users see:**
- All info-level findings (e.g., "Your site uses WordPress 6.4")
- All warning-level findings (e.g., "Images could be further compressed")
- Critical findings count: "4 critical issues found"
- Each critical finding: blurred text block with a lock icon
- CTA below each blurred block: "Upgrade to Pro to see critical issues and how to fix them"

**Pro and above see:**
- All findings at all severity levels, fully visible
- Actionable fix recommendations for each critical issue

### Social Content (Free tier gating)
**Free users see:**
- All generated posts fully visible (no blurring on output)
- This is intentional — the social content is the hook that gets people to try the product
- The squeeze is the 5 generation/month cap, not output quality

**Why no blurring here:** Social Content is the "wow" moment. If someone pastes their URL and gets 5 great posts, they'll want more. The generation limit does the gating work — they used 1 of 5, and they can feel the clock ticking.

### Keywords (Free tier gating)
**Free users see:**
- Top 5 keywords with search volume and difficulty
- Remaining keywords (if the agent returns 15-20): blurred rows
- CTA: "Upgrade to Pro for the full keyword analysis"

**Pro and above see:**
- All keywords with full metrics

### Growth Playbook (Pro only)
**Free users who click this agent see:**
- Lock icon in sidebar with "Pro" badge
- Preview panel: "Growth Playbook generates a prioritized 90-day marketing plan tailored to your business. Includes weekly action items, channel recommendations, and budget allocation."
- One static example screenshot of a playbook output
- CTA: "Upgrade to Pro — $49/month"

### Blog, Email Sequences, Strategy, Copywriting, CRO, Competitor Intel (Pro only)
**Free users who click these see:**
- Same lock + preview + upgrade pattern as Growth Playbook
- Each agent gets its own one-line description and static example

### Campaigns, Calendar, A/B Tests, Video Ads (Growth only)
**Free and Pro users who click these see:**
- Lock icon with "Growth" badge
- Preview panel with description and static example
- CTA: "Upgrade to Growth — $99/month"

### Client Reports (Agency only)
**All non-Agency users who click this see:**
- Lock icon with "Agency" badge
- Preview: "Generate white-label PDF reports for your clients with custom branding, performance metrics, and content analysis."
- CTA: "Upgrade to Agency — $249/month"

---

## Sidebar UI Specification

All 15 agents are visible to all users at all times. This is critical — every login is a reminder of what they're missing.

### For agents the user HAS access to:
- Normal icon + label
- Fully clickable
- No badge

### For agents one tier above the user:
- Slightly dimmed icon + label
- Tier badge (small pill: "Pro" / "Growth" / "Agency")
- On click: preview panel with description + example + upgrade button

### For agents two+ tiers above:
- Same dimmed styling + badge
- On click: same preview panel but CTA goes to the relevant tier

### Generation counter in sidebar:
- Always visible: "X / Y generations used this month"
- Color coding:
  - Green: 0-60% used
  - Yellow: 60-80% used
  - Red: 80-100% used
- At 80%: subtle banner: "You're running low on generations this month"
- At 100%: modal on next generation attempt: "You've used all your generations this month. Upgrade to [next tier] for [limit] generations/month." with upgrade button and "Resets on [date]" note

---

## Code Changes Required

### registry.ts — Agent tier assignments:
```typescript
export const AGENT_TIERS = {
  free: ['seo-audit', 'social', 'keywords'],
  pro: [
    'seo-audit', 'social', 'keywords',
    'growth-playbook', 'blog', 'email',
    'strategy', 'copywriting', 'cro', 'competitor-intel'
  ],
  growth: [
    // all pro agents plus:
    'campaigns', 'calendar', 'ab-tests', 'video-ads'
  ],
  agency: [
    // all growth agents plus:
    'client-reports'
  ]
} as const;
```

### Generation limits:
```typescript
export const GENERATION_LIMITS = {
  free: 5,
  pro: 250,
  growth: 500,
  agency: Infinity // or 999999
} as const;
```

### Response gating logic (for SEO Audit on free tier):
```typescript
// In the SEO Audit agent response handler:
function gateResponse(findings: Finding[], userTier: string) {
  if (userTier === 'free') {
    return findings.map(finding => {
      if (finding.severity === 'critical') {
        return {
          ...finding,
          title: finding.title, // show the title
          description: '[GATED]', // blur the description
          fix: '[GATED]', // blur the fix
          gated: true,
          gateCTA: 'Upgrade to Pro to see this critical issue and how to fix it'
        };
      }
      return finding; // info and warning pass through
    });
  }
  return findings; // Pro+ see everything
}
```

### Response gating logic (for Keywords on free tier):
```typescript
function gateKeywords(keywords: Keyword[], userTier: string) {
  if (userTier === 'free') {
    return {
      visible: keywords.slice(0, 5), // first 5 fully visible
      gatedCount: keywords.length - 5,
      gateCTA: `${keywords.length - 5} more keywords available. Upgrade to Pro for the full analysis.`
    };
  }
  return { visible: keywords, gatedCount: 0 };
}
```

---

## Landing Page Copy Updates

### Free
```
Get started for free
$0/month

✓ 3 AI agents (SEO Audit, Social Content, Keywords)
✓ 5 generations/month
✓ 1 project
✓ Basic results (critical findings require Pro)

[Start Free →]
```

### Pro (Most Popular)
```
For serious marketers
$49/month

✓ 10 AI agents — full suite
✓ 250 generations/month
✓ 5 projects
✓ Full unblurred results on all agents
✓ Growth Playbook included
✓ Multi-channel publishing
✓ Saved assets library

[Start Pro Trial →]
```

### Growth
```
For scaling teams
$99/month

✓ 14 AI agents — everything in Pro plus:
  → Campaign orchestrator
  → Content calendar & scheduling
  → A/B test generation
  → AI video ads
✓ 500 generations/month
✓ 15 projects
✓ Analytics feedback loop
✓ Priority support

[Start Growth Trial →]
```

### Agency
```
For agencies managing clients
$249/month

✓ 15 AI agents — everything in Growth plus:
  → Client Reports (exclusive) — white-label PDFs
✓ Unlimited generations
✓ Unlimited projects
✓ Multi-client workspace
✓ Team seats (up to 5)
✓ White-label exports
✓ API access
✓ Dedicated support

[Contact Sales →]
```

---

## Pricing Psychology

### Why this works:

**Free → Pro conversion trigger:** The user sees "4 critical SEO issues found" but can't read them. They know their site has problems. The only way to find out what they are is $49/month. That's not a feature upgrade — that's removing anxiety. People pay to resolve uncertainty.

**Pro → Growth conversion trigger:** A Pro user builds a Growth Playbook, starts executing it, and realizes they need Campaign orchestration to automate the multi-step sequences. Or they want to A/B test their social posts. The playbook itself creates demand for Growth-tier tools.

**Growth → Agency trigger:** A Growth user starts managing a second client's marketing through Conduikt. They need separate workspaces, white-label reports, and team access. The pain of managing multiple clients on a single-user account pushes them to Agency.

### Value justification:
- A freelance social media manager costs $500-2000/month
- A single SEO audit from an agency costs $500-5000
- One Growth Playbook from a consultant costs $1000-3000
- Conduikt Pro at $49/month delivers all of this on demand

### Generation limits as the squeeze:
- Free (5): One session, one "wow" moment, then they're out
- Pro (250): ~8 generations/day — enough for daily use, but a power user doing content for multiple projects will feel the ceiling toward month-end
- Growth (500): ~16/day — comfortable for a small team
- Agency (unlimited): No friction, no thinking, just use it

---

## Launch Pricing Tactics

### Founding Member Discount (recommended)
- First 50 Pro subscribers: $39/month locked in forever (normally $49)
- Creates urgency and rewards early adopters
- Landing page banner: "Founding member pricing — 22% off for our first 50 users"

### Annual Pricing (add after launch, not on day 1)
- Pro: $470/year ($39.17/month — save $118)
- Growth: $950/year ($79.17/month — save $238)
- Agency: $2,390/year ($199.17/month — save $598)
- Only add this once you have monthly subscribers — annual plans optimize retention, not acquisition

### Do NOT offer:
- Lifetime deals (too early, you don't know your unit economics)
- 30-day free trials on paid tiers (the Free tier IS the trial)
- Discount codes publicly (devalues the product from day 1)
