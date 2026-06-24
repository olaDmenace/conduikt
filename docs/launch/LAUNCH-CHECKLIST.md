# Launch day checklist

## Pre-flight (before announcing)

- [ ] Flutterwave live keys deployed and verified with one real $29 charge
- [ ] Profile row updates to `plan: pro` after upgrade (check Supabase directly)
- [ ] Plan-upgrade email fires (check inbox)
- [ ] Sign out + sign in cycle works (just fixed)
- [ ] /dashboard loads without errors for a brand-new signup
- [ ] /pricing page shows correct Flutterwave plan codes
- [ ] Facebook is clearly "coming soon" in both /settings/integrations and /pricing
- [ ] Sitemap submitted in GSC
- [ ] robots.txt allows production, blocks preview URLs
- [ ] Testimonials have real first names + companies (confirmed real, keep)

## Announcement sequence (in order)

1. 09:00 GMT — X thread goes live (docs/launch/x-thread.md)
2. 09:05 GMT — LinkedIn post (docs/launch/linkedin-post.md)
3. 09:15 GMT — Email blast to existing list (docs/launch/launch-email-blast.md)
4. 10:00 GMT — Product Hunt submission goes live (docs/launch/product-hunt.md)
5. 10:05 GMT — Share PH link in X thread as reply, pin the thread
6. Rolling — cold outreach batch 1 (docs/launch/cold-email.md, 20 sends)

## Watch during launch

- [ ] Vercel function logs for 500s on /api/webhooks/flutterwave
- [ ] Supabase `profiles` writes for upgrade events
- [ ] Signup → dashboard flow for first 10 real signups
- [ ] Publish to X for any user (not just your account)
- [ ] Referral click → signup attribution (referral_links table)

## If something breaks

- Rollback billing: revert Flutterwave keys to test mode, post update "pausing upgrades for 1h, existing users unaffected"
- Rollback everything: `git revert HEAD` on main, redeploy
- PII in logs: immediate — unset env var or redeploy without debug logging

## After launch (same day)

- [ ] Respond to every PH comment in < 1h
- [ ] Reply to every X thread quote/reply
- [ ] Pin the best user quote on the homepage (replace one testimonial)
- [ ] Post day-1 numbers on X at 23:00 GMT (signups, upgrades, top agent used)

## Week 1

- [ ] Retro on what converted, what didn't
- [ ] Ship one fix the community asked for
- [ ] Write a "day 1 recap" blog post for /guides
- [ ] Reach out to first 5 paying customers for a 15-min call
