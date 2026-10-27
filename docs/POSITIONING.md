# Conduikt — Positioning

**Last updated:** 2026-10-26 (decisions D1 to D6 of the 24 Oct audit; supersedes the 2026-06-28 version)
**Status:** Living doc. Revise when reality contradicts it.

**Goal:** A business owner needs no other marketing tool and no marketer to get found, publish, and improve every week.

This is the spine. Every marketing decision (homepage copy, tweets, ads, onboarding, sales calls) should trace back to one of the answers below. If a decision can't be justified against this doc, either the decision is off-strategy or the doc needs updating. Pick one explicitly.

The test for every feature: does it remove a tool the customer would otherwise need, or an objection that stops them from using Conduikt? If neither, it waits.

---

## 1. Who this is for

**People without a marketing team.** One product, one engine (check → plan → write → publish → learn), with four playbooks chosen in onboarding. A playbook is configuration, not a separate product: default channels, which agents run in the first week, page templates and search intents, prompt framing, and the price list shown.

| Playbook | Who | Default channels | First-week emphasis |
| --- | --- | --- | --- |
| SaaS or online product | Solo and early-stage founders, 0 to 10 paying customers, shipping the product themselves | X, LinkedIn, blog, email | Site check, keywords, social, copy, email series |
| Local service business | Cleaners, repair, clinics, salons, trades, restaurants; one or a few locations | Google Business Profile, WhatsApp, Instagram, hosted pages | Site check, missing service pages, posting plan, review requests |
| Agency or freelancer | Small agencies and freelancers marketing several clients | Everything above, one project per client | Client reports, the client's playbook |
| Creator or coach | Course creators, coaches, consultants selling themselves | Instagram, X, email, blog | Posting plan, email series, blog |

**Explicitly not for:**
- Enterprise marketing teams (they have specialists and budget for HubSpot)
- E-commerce catalogues with thousands of SKUs (different playbook, not ours yet)
- Founders who already love marketing (we solve for the ones who don't)

**Geography.** Nigeria and Africa first for the Local playbook (naira pricing, WhatsApp, Google Business Profile); global for SaaS. The product is the same; the price list and the default channels differ.

---

## 2. What we solve

You're running the business *and* running marketing in your spare hours. You've stitched together five tools, a writer, a scheduler, an analytics dashboard, a site checker, an email tool, and none of them talk to each other. Output is inconsistent. Measurement is manual. You never actually know if marketing is working because nothing closes the loop between what you publish and what moves the numbers.

The pain isn't "I can't write copy." It's "I don't have a marketing team, and stitching together AI tools to fake one is making me worse at my actual job."

---

## 3. The wedge

**End-to-end and opinionated.**

Check → Plan → Write → Publish → Learn, in one product, with views about what good looks like, and a playbook that fits the business.

Competitors stop at "generate." We close the loop, and the loop has *opinions*: ship measurable content, the user approves before anything goes out (unless they choose Hands off), be found by Google and by AI answers, build in public over performative growth.

The opinions are the moat. Generic tools become commodities. Opinionated ones become brands.

The signature workflow is **Missing Pages**: find the searches you have no page for, write the page, put it live, watch whether you show up in the answer.

---

## 4. What we are not

- **Not a generic AI writer.** Jasper, Copy.ai, Writesonic do that better at scale
- **Not "for any business."** We serve four named playbooks. Nothing we publish says "all-in-one" or "for every business"; those are scope words nobody buys
- **Not a general website builder.** We host the pages our agents write; we do not compete with Wix on drag-and-drop
- **Not an outbound cold-email machine.** No warmed-domain pools, no scraped lists; inbound first (forms, WhatsApp, reviews)
- **Not building for enterprise teams.** Wrong shape of product
- **Not promising self-improvement without showing the receipts.** Until the loop demonstrably closes on real data, we don't pitch it as the headline

---

## 5. Voice: say / don't say

| We say | We don't say |
| --- | --- |
| "Your marketing, done every week. Better every time." | "All-in-one marketing platform" |
| "For people who don't have a marketing team" | "For any business" / "For everyone" |
| "Ships measurable content" | "AI-powered marketing" |
| "Watches what worked and uses it next week" | "End-to-end automation" / "Closed loop" |
| "Ready for Google and AI answers" | "SEO", "AEO", "GEO", "LLM optimisation" |
| "Missing pages", "service pages" | "Programmatic SEO" |
| "Google Business Profile", "WhatsApp" | "Omnichannel" |
| Concrete numbers (views, replies, bookings, deltas) | "10x your marketing" |
| Honest about what doesn't work yet | "Revolutionise", "transform" |

Full word table: `docs/DESIGN.md`, "Words we use, words we don't".

---

## 6. Proof points to build (in order)

1. **Missing Pages demo**: a real local business, a page written and published by Conduikt, appearing in a Google or AI answer within 30 days. Before/after screenshots.
2. **First paying customer testimonial** with their specific metric, not a vibe. (The four current testimonials are real; none has a number yet.)
3. **Loop-closure chart**: before/after engagement from the feedback loop on one account over 14 days.
4. **Public dogfooding**: Conduikt's own marketing visibly run by Conduikt. The product is the proof.

---

## 7. Revisit triggers

Update this doc when any of the following happens:

- A playbook gets no sign-ups in 60 days → cut it from onboarding, keep the config
- The Local playbook's first 10 paying customers are agencies, not owners → make Agency the front door for Local
- Missing Pages does not produce a page that appears in any answer within 60 days of launch → drop "found by AI" from the pitch, keep it as a check
- A competitor (Buffer, Durable, Birdeye, Lindy, Gumloop) launches a closed-loop product for the same playbook → sharpen the wedge against theirs specifically
- First 10 paying customers tell us we're solving something other than what we think → trust them, not the doc

Triggered on 2026-10-26: "Buyer turns out to be wider than solo SaaS founders" and "Geography clarifies" from the June version. Result: this revision.

---

## 8. Out of scope for now (do not chase)

- Enterprise feature requests
- White-label client portals and custom domains on hosted pages, until three paying Pro customers ask (product plan §9 rule stands)
- A general website builder
- An outbound cold-email sales agent
- An eighth planning agent (consolidate the five, decision D5, when the pricing page is next edited)
- A customer API or MCP server before a customer asks for one; the pricing page no longer promises "API access"
- "Self-improvement" claims beyond what the loop actually demonstrates
- Sales-to-acquisition story (too early, and acquirers see through it)
