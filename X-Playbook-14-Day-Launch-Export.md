# X + LinkedIn Playbook — 14-Day Launch Export

**X account:** @olaDmenace · **LinkedIn:** Olayinka Fagbenro
**Start:** Thu 2026-06-25 (Day 1 fires 08:30 WAT = 07:30 UTC on X, 09:00 WAT on LinkedIn)
**End:** Wed 2026-07-08 (Day 14 final post at 18:30 WAT)
**Generated:** 2026-06-24 · **Last updated:** 2026-06-24 (after feedback pass)

> This is the live queue. X evergreens are inserted in `scheduled_posts` and fire as-shown. X brackets are filled by the daily cron at 06:00 UTC; if anything's missing, an **evergreen fallback** fires instead of skipping the slot. LinkedIn posts (5 total) fire at 09:00 WAT on Days 1/5/7/12/14.

---

## Summary

- **X channel:** 38 posts (27 evergreen + 11 bracket) — links moved to 2nd tweet for algo health
- **LinkedIn channel:** 5 long-form posts on Days 1/5/7/12/14 at 09:00 WAT
- **5 X threads:** Day 1 (intro, pinned, ends with PitchOdds link), Day 3 (model deep-dive), Day 6 (lessons), Day 10 (Conduikt teardown), Day 13 (Africa tour)
- **Slots (Africa/Lagos):** A = 08:30 · B = 13:00 · C = 18:30 · LinkedIn = 09:00
- **Bracket fallbacks:** every bracket has a generic evergreen fallback that fires if its data resolves to nothing — slot never goes empty
- **Manual touch points:**
  - **Day 1 morning:** pin the first tweet of the intro thread on x.com (X API doesn't allow third-party pinning)
  - **Day 5 / 11 / 12 / 7 / 14** brackets: fill SHIPPED_FEATURE / MISTAKE / CALIB_STAT / etc at `/admin/x-playbook` before 06:00 UTC of that day. Missing values → fallback fires.
  - **After every LinkedIn post fires (Days 1, 5, 7, 12, 14 at 09:00 WAT):** drop a first comment with `https://pitch-odds.vercel.app` (or `https://conduikt.com` if the post is more Conduikt-focused). LinkedIn suppresses reach on posts with outbound links in the body, but first-comment links bypass that. Takes 10 sec per post.

---

## Day 1 — Thu 2026-06-25 (journey · launch day)

### 🧵 08:30 WAT — Pinned intro thread `[evergreen, journey]`
**Media hint:** clip-10-face-to-cam (text-only at launch)

> I'm a solo developer in Lagos. For years I built in private. Today I go public.
>
> I'm shipping AI products by myself — and I'm going to show you everything: the wins, the revenue, and the stuff that breaks. 🧵
>
> 1/ First up, and free for everyone: PitchOdds — a football match-prediction engine. It uses a real statistical model (Dixon-Coles), not vibes, and it shows its reasoning for every match. No signup, no paywall. Link below.
>
> 2/ Why free? Because I want your help making it sharper — drop fixtures, leagues, features you'd want. You improve the public model… while I quietly build a more serious system behind it.
>
> 3/ I also run Conduikt — an AI marketing platform (paste a URL, ~19 agents produce + publish a month of marketing). It has real users. This very thread was scheduled by Conduikt itself.
>
> 4/ The honest part: I've made every classic solo-founder mistake — built too much before talking to users, shipped things nobody asked for. I'll show those too.
>
> 5/ The goal? Build useful things, in public, and fund a tour of 5 African countries off the back of it. Follow along if you're building too. 🌍
>
> 🔗 https://pitch-odds.vercel.app

### 13:00 WAT — Calibration brag `[evergreen, pitchodds]`
**Media hint:** clip-2-calibration

> Quietly proud: PitchOdds predicts every match with a model that explains why — and publishes its own calibration so you can check if it's actually any good. Most "prediction" accounts never show you that.

### 18:30 WAT — League poll `[evergreen, pitchodds]`

> Question for the football people: which league should PitchOdds cover next? Reply and I'll add the most-requested one this week. 👇

---

## Day 2 — Fri 2026-06-26 (pitchodds + lessons)

### 08:30 WAT — Today's PitchOdds standout `[bracket, pitchodds]` 🤖 auto-filled
**Auto-fills:** PitchOdds scrape (HOME, AWAY, PROB_PCT, OUTCOME, MATCH_ID)
**Live form once filled (2-tweet thread — link on tweet 2 for algo health):**

> PitchOdds' standout call today: **{HOME}** vs **{AWAY}** — model gives **{PROB_PCT}%** **{OUTCOME}**.
>
> Receipts every match. No signup, no paywall.
>
> https://pitch-odds.vercel.app/match/{MATCH_ID}

**Fallback if no match today:** *"The hard part of a football model isn't the prediction. It's publishing every call — including the ones you'd rather hide. That's where most 'tipster' accounts quietly fold."*

### 13:00 WAT — Claude Code reality check `[evergreen, lessons]`
**Media hint:** clip-9-claude-code

> Shipping solo with Claude Code is a cheat code — but it's not magic. It writes the code fast; deciding what's worth building is still all on me. That's the actual job.

### 18:30 WAT — Calibration as receipts `[evergreen, pitchodds]`

> The bar for any prediction tool isn't "were you right?" — it's "did you tell me, before the match, how unsure you were?" Most accounts hide uncertainty. Calibration is the receipts.

---

## Day 3 — Sat 2026-06-27 (pitchodds deep-dive)

### 🧵 13:00 WAT — Model deep-dive thread `[evergreen, pitchodds]`
**Media hint:** clip-1-pitchodds-walkthrough

> "AI predicts football" is usually a black box spitting out a number. PitchOdds isn't. Here's exactly how it thinks 🧵
>
> 1/ It's built on Dixon-Coles — a proven statistical model that estimates each team's attack & defence strength, home advantage, and a correction for low-scoring games.
>
> 2/ Recent matches count more than old ones (form decays over time), and it's fit separately per league — the Premier League and Serie A don't play the same way.
>
> 3/ It outputs a full scoreline grid, then folds that into 1X2, over/under 2.5, and both-teams-to-score probabilities.
>
> 4/ The part I care about most: calibration. I run a walk-forward backtest and publish whether the probabilities actually hold up. When it says 60%, does it happen ~60% of the time?
>
> 5/ It does not claim to beat bookmakers. It's a transparent model you can learn from — and improve. Tell me what you'd add.

### 18:30 WAT — Probability literacy take `[evergreen, pitchodds]`

> Half the people following football-prediction accounts read "55% home win" as "home will win." It actually means "slightly better than a coin flip." Calibration matters more than calls — and most accounts hide both.

---

## Day 4 — Sun 2026-06-28 (result honesty)

### 08:30 WAT — Yesterday's result + today's pick `[bracket, pitchodds]` 🤖 auto-filled
**Auto-fills:** football-data.org (YDAY_TEAM/PROB/OUTCOME) + PitchOdds scrape (HOME, AWAY, PROB_PCT)
**Live form once filled:**

> Yesterday PitchOdds said **{YDAY_TEAM}** at **{YDAY_PROB}%** — result: **{YDAY_OUTCOME}**. Win or miss, I post it. A prediction tool that only shows its hits is just marketing.
>
> Today's pick: **{HOME}** vs **{AWAY}** (**{PROB_PCT}%**) 👇

### 13:00 WAT — Honest Conduikt status `[evergreen, conduikt]`

> Conduikt update: ~30 people have signed up — almost all small-business founders. Most are on the free tier and I haven't converted anyone to paying yet. That's this month's job. Building it in the open.

### 18:30 WAT — AI marketing reality `[evergreen, opinion]`

> Building AI marketing means resisting the urge to wrap ChatGPT in a nicer UI. The hard part — research → publish → measure → adjust — is what's worth building. Polish without the loop is theatre.

---

## Day 5 — Mon 2026-06-29 (you-ask-I-ship)

### 08:30 WAT — Shipped from feedback `[bracket, pitchodds]` ⚠ needs admin input
**Auto-fills:** PitchOdds scrape (HOME, AWAY, PROB_PCT)
**You must fill at `/admin/x-playbook` before 06:00 UTC Mon:** `SHIPPED_FEATURE`, `REQUESTER`
**Live form once filled:**

> PitchOdds today: **{HOME}** vs **{AWAY}** — **{PROB_PCT}%** + reasoning. Also added **{SHIPPED_FEATURE}** because **{REQUESTER}** asked for it on Day 1. This is the loop: you ask, I ship.

### 13:00 WAT — Hot take on AI marketing `[evergreen, opinion]`

> Hot take: most "AI marketing tools" are just ChatGPT with a nicer button. The actual hard part — and the only part worth building — is the boring loop: research → publish → measure → adjust, on autopilot. That's what I'm building into Conduikt.

### 18:30 WAT — Drop your website CTA `[evergreen, conduikt]`

> Drop your website 👇 — I'll run Conduikt on a couple of them and post what it generates (the good and the cringe).

---

## Day 6 — Tue 2026-06-30 (solo-founder lessons)

### 🧵 13:00 WAT — Lessons thread `[evergreen, lessons]`
**Media hint:** clip-9-claude-code

> I shipped a handful of AI products before I had a single follower. Everything I'd tell myself if I started over 🧵
>
> 1/ Distribution is the product. Build the audience while you build, not after. (I learned this the expensive way.)
>
> 2/ Free + no-signup beats "sign up for the beta." PitchOdds gets used because there's zero friction.
>
> 3/ Your mistakes out-perform your launches. The "$0 and zero paying users" post will get more love than any feature announcement.
>
> 4/ Sell one outcome, not a feature list. Nobody wants "19 agents." They want "a month of marketing, done."
>
> 5/ Reply more than you post. 90% of early growth is in the replies.
>
> 6/ Build with tools that move fast (Claude Code) so you can spend your scarce hours on judgement, not boilerplate.
>
> If you're building solo, #1 is the one I wish I'd believed two years ago.

### 18:30 WAT — What are you building `[evergreen, conduikt]`

> What are you building? Drop it below — I actually read these and I'll boost the ones I find interesting. 👇

---

## Day 7 — Wed 2026-07-01 (week recap)

### 08:30 WAT — Week recap `[bracket, journey]` ⚠ needs admin input
**Auto-fills:** profiles count (CD_SIGNUPS over past 7 days)
**You must fill at `/admin/x-playbook` before 06:00 UTC Wed:** `SHIPPED_FEATURE`
**Live form once filled:**

> A week of building in public. **{SHIPPED_FEATURE}** shipped. Conduikt: **{CD_SIGNUPS}** new signups. Biggest lesson: people reward honesty about what doesn't work yet. Onward. 🌍

### 13:00 WAT — Show-your-reasoning principle `[evergreen, opinion]`

> The "show your reasoning" principle isn't just nice — it's the moat. Anyone can output a number. Showing why, and keeping the receipts, is what earns trust. It's the spine of both PitchOdds and what I'm building next.

### 18:30 WAT — ICYMI calibration `[bracket, pitchodds]` ⚠ needs admin input
**You must fill at `/admin/x-playbook`:** `CALIB_STAT`
**Media hint:** clip-2-calibration
**Live form once filled:**

> ICYMI this week's PitchOdds calibration: **{CALIB_STAT}**. Free, no signup 👇

---

## Day 8 — Thu 2026-07-02 (top pick + stack)

### 08:30 WAT — Top pick `[bracket, pitchodds]` 🤖 auto-filled
**Auto-fills:** PitchOdds scrape
**Live form (2-tweet thread):**

> PitchOdds top pick today: **{HOME}** vs **{AWAY}** — **{PROB_PCT}%** **{OUTCOME}**. Heatmap + reasoning on the page.
>
> https://pitch-odds.vercel.app/match/{MATCH_ID}

**Fallback:** *"Most 'AI-powered' prediction tools confuse confidence for accuracy. PitchOdds publishes both — the model's call AND how often it's been right at that confidence level."*

### 13:00 WAT — Solo stack AMA `[evergreen, lessons]`
**Media hint:** clip-9-claude-code

> Behind the scenes: my stack for shipping AI solo — Next.js + Supabase, Claude for the brains, Python on Modal for the heavy compute, and Claude Code doing the grunt work. AMA.

### 18:30 WAT — Who to follow `[evergreen, journey]`

> Who should I follow in the build-in-public / indie space? Building my circle. 👇

---

## Day 9 — Fri 2026-07-03 (yesterday recap + Conduikt demo)

### 08:30 WAT — Yesterday recap + today `[bracket, pitchodds]` 🤖 auto-filled
**Auto-fills:** football-data.org + PitchOdds scrape

> PitchOdds today + yesterday's honesty: said **{YDAY_TEAM}** at **{YDAY_PROB}%**, got **{YDAY_OUTCOME}**.
>
> Today: **{HOME}** vs **{AWAY}** (**{PROB_PCT}%**) 👇

### 13:00 WAT — Conduikt URL demo `[evergreen, conduikt]`
**Media hint:** clip-4-conduikt-url-to-plan

> I gave Conduikt a random small-business URL and asked for a month of marketing. 10 minutes later: SEO audit, content calendar, social posts, emails. Here's what was genuinely good vs embarrassing 👇

### 18:30 WAT — Agencies CTA `[evergreen, conduikt]`

> Agencies: would an AI that does the first draft of audits + content calendars + client reports save your team time, or get in the way? Genuinely asking. 👇

---

## Day 10 — Sat 2026-07-04 (Conduikt teardown)

### 🧵 13:00 WAT — Conduikt teardown thread `[evergreen, conduikt]`
**Media hint:** clip-5-conduikt-content

> I built an AI that runs your marketing from just a URL. Here's the actual workflow, no hype 🧵
>
> 1/ Paste a URL → agents research the business, its competitors, its audience.
>
> 2/ → an SEO audit + keyword plan (caught real technical issues in my tests).
>
> 3/ → a content calendar specific to the business, not generic "10 tips" filler.
>
> 4/ → drafts social posts + emails, and can auto-publish + pull analytics back.
>
> 5/ What users love most isn't the writing — it's seeing the research and the why before it acts. (noticing a theme across my products? 🙂)
>
> 6/ Want to break it? I'm giving a few founders/agencies free access for honest feedback. Reply "in".

### 18:30 WAT — Marketing-first poll `[evergreen, conduikt]`

> Poll: what should an "AI marketing team" nail first — SEO, social, email, or analytics? 👇

---

## Day 11 — Sun 2026-07-05 (pick + mistake)

### 08:30 WAT — Pick `[bracket, pitchodds]` 🤖 auto-filled
**Live form (2-tweet thread):**

> PitchOdds: **{HOME}** vs **{AWAY}** — **{PROB_PCT}%** + reasoning.
>
> https://pitch-odds.vercel.app/match/{MATCH_ID}

**Fallback:** *"One thing I've learned building PitchOdds: the model's confidence matters more than its prediction. A 60% call is a different bet than a 95% call."*

### 13:00 WAT — Mistake of the week `[bracket, lessons]` ⚠ needs admin input
**You must fill at `/admin/x-playbook`:** `MISTAKE`, `COST`, `LESSON`
**Live form once filled:**

> Mistake this week: I **{MISTAKE}**. Cost me **{COST}**. Lesson: **{LESSON}**. Building in public means posting these too, not just the wins.

### 18:30 WAT — Mistake CTA `[evergreen, lessons]`

> What's a mistake that taught you more than any success? 👇

---

## Day 12 — Mon 2026-07-06 (shipped from feedback + R&D take)

### 08:30 WAT — Shipped from feedback `[bracket, pitchodds]` ⚠ needs admin input
**Auto-fills:** PitchOdds scrape
**You must fill at `/admin/x-playbook`:** `SHIPPED_FEATURE`
**Live form once filled:**

> PitchOdds today + a **{SHIPPED_FEATURE}** I just shipped from your feedback 👇
> **{HOME}** vs **{AWAY}** — **{PROB_PCT}%**

### 13:00 WAT — Generosity as R&D `[evergreen, opinion]`

> Why I made PitchOdds free with no signup while I build a serious quant system privately: the public model gets stress-tested by real users for free, and I learn what actually matters before I bet on it. Generosity as R&D.

### 18:30 WAT — Fixture request `[evergreen, pitchodds]`

> Drop a fixture you want PitchOdds to call this weekend 👇

---

## Day 13 — Tue 2026-07-07 (Africa tour)

### 🧵 13:00 WAT — Africa tour thread `[evergreen, journey]`
**Media hint:** clip-10-face-to-cam

> I'm building AI products solo to fund a tour of 5 African countries this year. Sounds mad. Here's the plan 🧵
>
> 1/ The bet: useful products + building in public → users, customers, maybe a sale or two → runway + freedom.
>
> 2/ PitchOdds (free) builds the audience. Conduikt (real users) builds the revenue. The rest I'll show as they're ready.
>
> 3/ I'm doing it in the open partly to keep myself honest — public goals are harder to abandon.
>
> 4/ If you're in Lagos, Accra, Nairobi, Kigali, or Cape Town, let's meet when I'm through. Building shouldn't be lonely.
>
> 5/ Follow if you want to watch someone try to turn code into a continent-sized adventure. 🌍

### 18:30 WAT — Which African city `[evergreen, journey]`

> Which African city should be on the route? Genuinely taking suggestions. 👇

---

## Day 14 — Wed 2026-07-08 (two-week recap + meta)

### 08:30 WAT — Two-week recap `[bracket, journey]` ⚠ needs admin input
**Auto-fills:** profiles count (CD_SIGNUPS over 14 days) + GitHub feat-commit count (PO_FEATURES_SHIPPED) + X follower snapshots (FOLLOWERS_START from Day 1, FOLLOWERS_NOW live)
**You must fill at `/admin/x-playbook`:** `CD_ONBOARDED`
**Live form once filled:**

> Two weeks in public. **{PO_FEATURES_SHIPPED}** PitchOdds features shipped from your requests. Conduikt: **{CD_SIGNUPS}** signups, **{CD_ONBOARDED}** free-access founders onboarded. Followers: **{FOLLOWERS_START}** → **{FOLLOWERS_NOW}**. Same loop, louder. 🌍

### 13:00 WAT — Meta dogfooding `[evergreen, conduikt]`

> Everything I post is now scheduled by Conduikt — my own product runs my own build-in-public. If it can run mine, it can run yours. Free access for a few more founders/agencies — reply "in".

### 18:30 WAT — Steering question `[evergreen, journey]`

> What do you want more of from this account — PitchOdds model stuff, Conduikt/AI building, or the solo-founder/journey side? Steering by your answers. 👇

---

## Pillar mix (across the 38 posts)

| Pillar | Count | Examples |
|---|---|---|
| pitchodds | 13 | Daily picks, model deep-dive, calibration |
| conduikt | 10 | URL demo, teardown thread, agency CTAs |
| journey | 7 | Intro, Africa tour, recaps |
| lessons | 5 | Claude Code, stack, mistake, distribution |
| opinion | 3 | Hot takes |

## What needs admin input (in order)

| Day | Slot | Fields | Deadline (06:00 UTC) |
|---|---|---|---|
| 5 (Mon 06-29) | A | SHIPPED_FEATURE, REQUESTER | Mon 06:00 UTC |
| 7 (Wed 07-01) | A | SHIPPED_FEATURE | Wed 06:00 UTC |
| 7 (Wed 07-01) | C | CALIB_STAT | Wed 06:00 UTC |
| 11 (Sun 07-05) | B | MISTAKE, COST, LESSON | Sun 06:00 UTC |
| 12 (Mon 07-06) | A | SHIPPED_FEATURE | Mon 06:00 UTC |
| 14 (Wed 07-08) | A | CD_ONBOARDED | Wed 06:00 UTC |

Fill these at https://conduikt.vercel.app/admin/x-playbook anytime before the deadline. Skipping = post doesn't fire that slot.

## LinkedIn cross-posts (5 total, all evergreen)

Long-form founder voice. 09:00 WAT (08:00 UTC). All loaded into `scheduled_posts` with `channel=linkedin`. Same publish cron handles delivery.

| Day | Date | Title |
|---|---|---|
| 1 | Thu 06-25 | Founder intro — long-form (1,511 chars) |
| 5 | Mon 06-29 | Why I built Conduikt for myself first (1,491 chars) |
| 7 | Wed 07-01 | Week one in public — reflection + numbers (1,463 chars) |
| 12 | Mon 07-06 | Conduikt teardown — agency angle (1,609 chars) |
| 14 | Wed 07-08 | Two weeks reflection — milestone (1,634 chars) |

Drafts live in `scripts/x-playbook/linkedin-playbook.json` (gitignored). To inspect or edit, open that file locally.

---

## Days 15–90

This export covers the loaded batch only (Days 1–14). The rest of the 90-day plan was designed to be generated weekly via Conduikt's content-engine prompt using the previous week's actuals — not pre-loaded. After Day 14 we use the live results (real signup counts, real PitchOdds calls, real follower delta) as inputs.
