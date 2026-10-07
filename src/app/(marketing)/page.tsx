import Image from "next/image";
import Link from "next/link";
import { Search, Edit, SendOne, Refresh } from "@/src/components/ui/icons";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import { Reveal } from "@/src/components/ui/reveal";
import { SiteCheckForm } from "@/src/components/marketing/site-check-form";
import { homepageFaqs as faqs } from "@/src/lib/seo/homepage-schema";
import { AGENT_REGISTRY, type AgentDefinition } from "@/src/lib/ai/agents/registry";
import { AGENT_DISPLAY, agentDisplay, agentsInGroup } from "@/src/lib/ai/agents/display";
import {
  PLAN_PRICING,
  getGenerationLimit,
  getProjectLimit,
  isPlanAtLeast,
  isUnlimited,
  type PlanTier,
} from "@/src/lib/plans";
import { cn } from "@/src/lib/utils/cn";

import heroPhoto from "@/public/images/home/hero-founders.webp";
import whyPhoto from "@/public/images/home/why-presenting.webp";
import modesPhoto from "@/public/images/home/modes-celebrating.webp";
import ctaPhoto from "@/public/images/home/cta-team.webp";

// docs/DESIGN.md §Marketing site structure — Direction C. Ten bands,
// alternating sand and ink, one statement per band. All agent names,
// counts, prices and limits are read from the registry and plans so the
// page can't drift from the product.

const TIER_ORDER: PlanTier[] = ["free", "pro", "growth", "agency"];
const TIER_LABEL: Record<PlanTier, string> = { free: "Free", pro: "Pro", growth: "Growth", agency: "Agency" };

// Real testimonials from conduikt.com. Roles appear only where the
// person's own words state one — never invented.
const TESTIMONIALS = [
  {
    name: "Oluwatobiloba Olajide",
    role: "Brand strategist",
    quote:
      "The Conduikt platform has simplified my work as a brand strategist, making it even more than 10 times easier. Its website audit and SEO strategy makes marketing a lot simpler. Now I can do my keyword research, create social media posts and emails, and generate an AI growth strategy all in the same place.",
    avatar: "bg-accent text-white",
  },
  {
    name: "Adeola Owoade",
    role: null,
    quote:
      "Conduikt is a well thought out solution for problems most business owners encounter. It is clearly structured, gives accurate analysis and spot-on suggestions for improved performance. Linking socials is my favorite part, that's the area I struggled with. Kudos really.",
    avatar: "bg-teal text-white",
  },
  {
    name: "Olatunbosun Olalekan",
    role: null,
    quote:
      "I used Conduikt and found it to be a clear, reliable, and insightful AI-powered website performance tool. It delivers a well-structured analysis of key metrics such as performance, SEO, and Core Web Vitals, with a useful distinction between mobile and desktop results. The actionable recommendations make it a practical resource for improving website performance and user experience.",
    avatar: "bg-ink-line text-ink-text",
  },
  {
    name: "Dara Sobayo",
    role: null,
    quote:
      "Thank you for granting me access to the tool. It provided valuable suggestions for improving the landing page copy.",
    avatar: "bg-accent-hover text-white",
  },
];

const initials = (name: string) =>
  name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

const agentCount = (tier: PlanTier) =>
  AGENT_REGISTRY.filter((a) => isPlanAtLeast(tier, a.tier as PlanTier)).length;

const names = (cat: AgentDefinition["category"]) =>
  agentsInGroup(cat)
    .map((a) => agentDisplay(a).name)
    .join(", ");

const PRICING: Array<{
  tier: PlanTier;
  lines: string[];
  cta: { label: string; href: string };
}> = TIER_ORDER.map((tier) => {
  const limit = getGenerationLimit(tier);
  const sites = getProjectLimit(tier);
  const pieces = isUnlimited(limit) ? "No monthly limit" : `${limit} pieces of content a month`;
  const websites = isUnlimited(sites) ? "Unlimited websites" : `${sites} website${sites === 1 ? "" : "s"}`;
  const n = agentCount(tier);
  const agents = n === AGENT_REGISTRY.length ? `All ${n} agents` : `${n} agents`;
  const extra: Record<PlanTier, string> = {
    free: "Site check and social posts",
    pro: "Posts to X and LinkedIn for you",
    growth: "Campaigns, video ads and split tests",
    agency: "Client reports and team seats",
  };
  const cta: Record<PlanTier, { label: string; href: string }> = {
    free: { label: "Start free", href: "/signup" },
    pro: { label: "Try Pro", href: "/signup" },
    growth: { label: "Try Growth", href: "/signup" },
    agency: { label: "Talk to us", href: "mailto:hello@conduikt.com" },
  };
  return { tier, lines: [agents, pieces, websites, extra[tier]], cta: cta[tier] };
});

const LOOP = [
  {
    n: "01",
    job: "Check your website",
    body: "Conduikt reads your site the way Google does and tells you exactly what to fix, with the code ready to paste.",
    who: `Agents that do this: ${names("analysis")}`,
  },
  {
    n: "02",
    job: "Plan what to say",
    body: "Finds the topics people already search for and builds a plan around them, so you never start from a blank page.",
    who: `Agents that do this: ${names("strategy")}`,
  },
  {
    n: "03",
    job: "Write it and post it",
    body: "Blog posts, social posts, emails and short video ads, written the way you talk. Posted to X and LinkedIn on a schedule.",
    who: `Agents that do this: ${names("creation")}, ${names("distribution")}`,
  },
  {
    n: "04",
    job: "Learn what worked",
    body: "Views, likes and replies come back in. Next week's plan starts from what worked, not from a guess.",
    who: "Where the numbers come from: X, LinkedIn and your email list",
  },
];

const MODES = [
  {
    key: "Check all",
    title: "You approve every piece",
    body: "Conduikt writes and schedules. Nothing goes out until you tap Approve.",
    highlight: false,
  },
  {
    key: "Let social run",
    title: "Posts go out, the rest waits for you",
    body: "Posts to X and LinkedIn publish on schedule. Blog posts and emails wait for your OK.",
    highlight: true,
  },
  {
    key: "Post it yourself",
    title: "You press publish",
    body: "Conduikt prepares everything and you post it when you're ready. Change your mind any time.",
    highlight: false,
  },
];

const STRIP = [
  {
    icon: <Search size={22} fill="currentColor" />,
    step: "1 · Check your site",
    body: (
      <>
        <p className="text-numeric text-[2.75rem] text-text">
          87<span className="ml-1 font-sans text-base text-text-3">out of 100</span>
        </p>
        <p className="text-body-s text-text-2">How ready the site is for Google. Up 12 this week. 3 things left to fix.</p>
      </>
    ),
  },
  {
    icon: <Edit size={22} fill="currentColor" />,
    step: "2 · Write",
    body: (
      <>
        <p className="text-sm text-text">A blog post written the way you talk, plus 5 posts for X and 2 for LinkedIn cut from it.</p>
        <Badge variant="success" className="self-start normal-case">Waiting for your OK</Badge>
      </>
    ),
  },
  {
    icon: <SendOne size={22} fill="currentColor" />,
    step: "3 · Post",
    body: (
      <>
        <p className="text-sm text-text">Posted when your audience is online. Emails go to your list.</p>
        <Badge className="self-start normal-case">Next post in 2h 14m</Badge>
      </>
    ),
  },
  {
    icon: <Refresh size={22} fill="currentColor" />,
    step: "4 · Learn",
    emphasis: true,
    body: (
      <>
        <p className="text-sm text-text">Tuesday morning posts get seen twice as much. Next week is planned around that.</p>
        <Badge variant="success" className="self-start normal-case">Used next week</Badge>
      </>
    ),
  },
];

const wrap = "mx-auto w-full max-w-[1280px] px-4 md:px-10";
const bandY = "py-14 md:py-[72px] lg:py-[104px]";

export default function LandingPage() {
  return (
    <>
      {/* 1 · Hero — photograph, dark overlay */}
      <section aria-label="Introduction" data-hide-chat className="relative flex min-h-[620px] items-end overflow-hidden text-on-photo lg:min-h-[720px]">
        <Image
          src={heroPhoto}
          alt="Two founders reviewing work together at a shared screen"
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="animate-slowfade object-cover object-[center_40%]"
        />
        <div className="photo-shade-hero absolute inset-0" aria-hidden />
        <div className="photo-shade-hero-side absolute inset-0" aria-hidden />
        <div className={cn(wrap, "relative flex flex-col gap-10 pb-16 pt-28 md:pb-[72px]")}>
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex max-w-[800px] flex-col gap-6">
              <Reveal step={1}>
                <p className="text-label text-ink-accent">For founders without a marketing team</p>
              </Reveal>
              <Reveal step={2} as="h1" className="text-display-xl text-on-photo">
                Your marketing,
                <br />
                done every week.
                <br />
                <span className="font-normal text-ink-accent">Better every time.</span>
              </Reveal>
              <Reveal step={3} as="p" className="max-w-[560px] text-[1.1875rem] leading-normal text-ink-text-2">
                Conduikt checks your website, writes your posts and emails, publishes them for you, then watches what
                worked and uses it next week.
              </Reveal>
            </div>
            <Reveal step={4} className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[260px]">
              <Button size="lg" asChild className="h-[54px] text-base">
                <Link href="/signup">Start free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline-ink"
                asChild
                className="h-[54px] border-on-photo text-base text-on-photo hover:bg-overlay/40"
              >
                <Link href="#loop">See it work</Link>
              </Button>
              <p className="text-center text-[13px] text-ink-text-2">
                No card needed · Set up in 2 minutes · Paid plans from {PLAN_PRICING.pro.label} a month
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Product strip — one week, four steps (sand) */}
      <section aria-label="One week with Conduikt" className={cn(wrap, "pb-6 pt-14")}>
        <p className="mb-3 text-caption text-text-3">An example week, from a sample account.</p>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STRIP.map((s, i) => (
            <Reveal
              key={s.step}
              as="li"
              step={i}
              className={cn(
                "flex flex-col gap-2.5 rounded-lg border bg-surface p-[18px]",
                s.emphasis ? "border-accent" : "border-line"
              )}
            >
              <div className="flex items-center gap-2 text-accent">
                <span aria-hidden>{s.icon}</span>
                <span className={cn("text-label", s.emphasis ? "text-accent" : "text-text-3")}>{s.step}</span>
              </div>
              {s.body}
            </Reveal>
          ))}
        </ol>
      </section>

      {/* 2 · Why — statement, photo, comparison (sand) */}
      <section aria-labelledby="why-title" className={cn(wrap, "flex flex-col gap-12 pb-24 pt-[88px]")}>
        <div className="grid items-center gap-12 min-[1000px]:grid-cols-[5fr_7fr]">
          <Reveal className="flex flex-col gap-5">
            <p className="text-label text-accent">Why Conduikt</p>
            <h2 id="why-title" className="text-display-m text-text">
              Other AI tools write a draft and stop.{" "}
              <span className="font-medium">Conduikt posts it, watches what happens, and does better next week.</span>
            </h2>
            <p className="max-w-[520px] text-lg leading-relaxed text-text-2">
              Writing tools give you text to copy and paste. Agencies send invoices. Conduikt does the whole job in one
              place and shows you every step.
            </p>
          </Reveal>
          <Reveal step={1} className="relative aspect-[7/5] overflow-hidden rounded-lg bg-surface-2">
            <Image
              src={whyPhoto}
              alt="A founder presenting marketing results to a small team"
              fill
              sizes="(min-width: 1000px) 700px, 100vw"
              placeholder="blur"
              className="object-cover"
            />
          </Reveal>
        </div>
        <Reveal className="grid gap-px overflow-hidden rounded-lg border border-line bg-line min-[1000px]:grid-cols-3" step={2}>
          {[
            { head: "AI writing tools", items: ["You type every request", "You copy, paste and post it yourself", "No idea what worked"] },
            { head: "Freelancers and agencies", items: ["A monthly retainer", "Weekly calls to stay on the same page", "Reports when they get to it"] },
          ].map((c) => (
            <div key={c.head} className="flex flex-col gap-3.5 bg-ground p-7">
              <p className="text-label text-text-3">{c.head}</p>
              <ul className="flex flex-col gap-2.5 text-[15px] text-text-2">
                {c.items.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
          <div className="band-ink flex flex-col gap-3.5 p-7">
            <p className="text-label text-ink-accent">Conduikt</p>
            <ul className="flex flex-col gap-2.5 text-[15px] text-ink-text">
              <li>One request, {AGENT_REGISTRY.length} agents on the job</li>
              <li>Posts to X and LinkedIn, writes your blog and emails</li>
              <li>Tells you what worked and uses it next time</li>
              <li className="text-ink-text-3">Free to start · {PLAN_PRICING.pro.label} a month for Pro</li>
            </ul>
          </div>
        </Reveal>
      </section>

      {/* 3 · How it works (ink) */}
      <section id="loop" aria-labelledby="loop-title" className="band-ink scroll-mt-[72px]">
        <div className={cn(wrap, bandY, "flex flex-col gap-10")}>
          <Reveal className="flex max-w-[900px] flex-col gap-4">
            <p className="text-label text-ink-accent">How it works</p>
            <h2 id="loop-title" className="text-display-m text-ink-text">
              Check. Write. Post. Learn. <span className="font-medium">Then do it again next week.</span>
            </h2>
          </Reveal>
          <ol>
            {LOOP.map((row, i) => (
              <Reveal
                key={row.n}
                as="li"
                step={i}
                className={cn(
                  "grid grid-cols-[64px_1fr] gap-x-6 gap-y-3 border-t border-ink-line py-9 md:grid-cols-[120px_1fr_1fr] md:gap-8",
                  i === LOOP.length - 1 && "border-b"
                )}
              >
                <span
                  className={cn("text-numeric text-5xl md:text-[4.5rem]", i === 3 ? "text-ink-accent-display" : "text-ink-teal")}
                  aria-hidden
                >
                  {row.n}
                </span>
                <div>
                  <h3 className="mb-2 text-heading text-ink-text">{row.job}</h3>
                  <p className="text-body text-ink-text-2">{row.body}</p>
                </div>
                <p className="col-start-2 text-sm leading-relaxed text-ink-text-3 md:col-start-3">{row.who}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* 4 + 5 · Agents and how hands-on (sand) */}
      <section id="agents" aria-labelledby="agents-title" className={cn(wrap, "flex scroll-mt-[72px] flex-col gap-16 pb-24 pt-28")}>
        <div className="flex flex-col gap-7">
          <Reveal className="flex flex-wrap items-end justify-between gap-4">
            <div className="flex max-w-[760px] flex-col gap-3">
              <h2 id="agents-title" className="text-display-m text-text">
                {AGENT_REGISTRY.length === 18 ? "Eighteen" : AGENT_REGISTRY.length} agents. Each one does one marketing job.
              </h2>
              <p className="text-[17px] leading-normal text-text-2">
                Think of them as a marketing team you hire in one click. They work together, and you only see the
                results.
              </p>
            </div>
            <Link href="/features" className="text-[15px] font-medium text-accent-hover hover:underline">
              See all {AGENT_REGISTRY.length} →
            </Link>
          </Reveal>
          <ul className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 min-[1280px]:grid-cols-6">
            {[...AGENT_REGISTRY]
              .sort((a, b) => TIER_ORDER.indexOf(a.tier as PlanTier) - TIER_ORDER.indexOf(b.tier as PlanTier))
              .map((a) => {
                const d = AGENT_DISPLAY[a.id] ?? agentDisplay(a);
                return (
                  <li key={a.id} className="flex flex-col gap-1.5 rounded-md border border-line bg-surface p-3.5">
                    <Badge variant={a.tier as PlanTier} className="self-start">
                      {TIER_LABEL[a.tier as PlanTier]}
                    </Badge>
                    <span className="text-sm font-medium text-text">{d.name}</span>
                    <span className="text-caption text-text-3">{d.job}</span>
                  </li>
                );
              })}
          </ul>
        </div>

        <div className="grid items-center gap-12 min-[1000px]:grid-cols-[7fr_5fr]">
          <Reveal className="flex flex-col gap-6">
            <h2 className="text-display-m text-text">
              You decide how <span className="font-medium">hands-on to be.</span>
            </h2>
            <ul className="flex flex-col gap-2.5">
              {MODES.map((m) => (
                <li
                  key={m.key}
                  className={cn(
                    "grid items-baseline gap-2 rounded-lg border bg-surface px-6 py-5 sm:grid-cols-[150px_1fr] sm:gap-4",
                    m.highlight ? "border-accent" : "border-line"
                  )}
                >
                  <span className={cn("text-label", m.highlight ? "text-accent" : "text-text-3")}>{m.key}</span>
                  <div>
                    <p className="text-[17px] font-medium text-text">{m.title}</p>
                    <p className="mt-1 text-sm text-text-2">{m.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal step={1} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-surface-2">
            <Image
              src={modesPhoto}
              alt="Two colleagues celebrating a result at a desk with a laptop"
              fill
              sizes="(min-width: 1000px) 500px, 100vw"
              placeholder="blur"
              className="object-cover"
            />
          </Reveal>
        </div>
      </section>

      {/* 6 · Customer stories (ink) */}
      <section id="stories" aria-labelledby="stories-title" className="band-ink scroll-mt-[72px]">
        <div className={cn(wrap, bandY, "flex flex-col gap-10")}>
          <Reveal className="flex max-w-[820px] flex-col gap-3">
            <p className="text-label text-ink-accent">Founders using Conduikt</p>
            <h2 id="stories-title" className="text-display-m text-ink-text">
              Real people. Real results.
            </h2>
          </Reveal>
          <ul className="grid gap-3.5 min-[1000px]:grid-cols-2">
            {TESTIMONIALS.map((t, i) => (
              <Reveal
                key={t.name}
                as="li"
                step={i}
                className="flex flex-col justify-between gap-5 rounded-lg border border-ink-line bg-ink-surface p-7"
              >
                <blockquote className="text-[17px] leading-relaxed text-ink-text">“{t.quote}”</blockquote>
                <footer className="flex items-center gap-3">
                  <span
                    className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-[13px]", t.avatar)}
                    aria-hidden
                  >
                    {initials(t.name)}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink-text">{t.name}</p>
                    {t.role && <p className="text-caption text-ink-text-3">{t.role}</p>}
                  </div>
                </footer>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* 7 · Pricing (sand) */}
      <section id="pricing" aria-labelledby="pricing-title" className={cn(wrap, bandY, "flex scroll-mt-[72px] flex-col gap-10")}>
        <Reveal className="flex flex-col gap-3">
          <p className="text-label text-accent">Pricing</p>
          <h2 id="pricing-title" className="text-display-m text-text">
            Start free. Pay when it&apos;s working for you.
          </h2>
          <p className="text-base text-text-3">Early Pro members get a founding discount.</p>
        </Reveal>
        <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING.map((p, i) => {
            const ink = p.tier === "pro";
            return (
              <Reveal
                key={p.tier}
                as="li"
                step={i}
                className={cn(
                  "flex flex-col gap-4 rounded-lg border p-7",
                  ink ? "band-ink border-ink" : "border-line bg-surface"
                )}
              >
                <p className={cn("text-label", ink ? "text-ink-accent" : "text-text-3")}>
                  {TIER_LABEL[p.tier]}
                  {ink && " · most popular"}
                </p>
                <p className={cn("text-numeric text-[3.5rem]", ink ? "text-ink-text" : "text-text")}>
                  {PLAN_PRICING[p.tier].label}
                  <span className={cn("ml-1 font-sans text-[15px] tracking-normal", ink ? "text-ink-text-3" : "text-text-3")}>
                    a month
                  </span>
                </p>
                <ul className={cn("flex flex-col gap-2 text-sm", ink ? "text-ink-text-2" : "text-text-2")}>
                  {p.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
                <Button
                  asChild
                  size="lg"
                  variant={ink ? "primary" : "outline"}
                  className="mt-auto"
                >
                  <Link href={p.cta.href}>{p.cta.label}</Link>
                </Button>
              </Reveal>
            );
          })}
        </ul>
      </section>

      {/* 8 · Questions (sand) */}
      <section id="faq" aria-labelledby="faq-title" className={cn(wrap, "flex scroll-mt-[72px] flex-col gap-8 pb-28 pt-2")}>
        <Reveal className="flex max-w-[760px] flex-col gap-3">
          <p className="text-label text-accent">Questions</p>
          <h2 id="faq-title" className="text-display-m text-text">
            Things people ask before they start.
          </h2>
        </Reveal>
        <div className="border-t border-line">
          {faqs.map((f, i) => (
            <details key={f.question} className="faq-item border-b border-line" open={i === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-4 py-[22px] text-[1.0625rem] font-medium text-text transition-colors duration-[var(--duration-fast)] hover:text-accent-hover md:text-[1.1875rem]">
                {f.question}
              </summary>
              <div className="max-w-[760px] pb-6 text-base leading-relaxed text-text-2">{f.answer}</div>
            </details>
          ))}
        </div>
      </section>

      {/* 9 · Final CTA — photograph, dark overlay */}
      <section aria-labelledby="cta-title" data-hide-chat className="relative overflow-hidden text-on-photo">
        <Image src={ctaPhoto} alt="A small team working on laptops around a wooden table" fill sizes="100vw" placeholder="blur" className="object-cover" />
        <div className="photo-shade-cta absolute inset-0" aria-hidden />
        <div className={cn(wrap, "relative flex flex-col items-start gap-7 py-24 md:py-32")}>
          <Reveal as="h2" className="text-display-l max-w-[900px] text-on-photo">
            <span id="cta-title">
              Every founder deserves
              <br />
              a marketing team.
            </span>
          </Reveal>
          <SiteCheckForm />
        </div>
      </section>
    </>
  );
}
