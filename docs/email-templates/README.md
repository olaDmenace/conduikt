# Conduikt — Supabase Auth Email Templates

Brand-aligned HTML for Supabase's auth-flow emails. Each file in this
directory maps 1:1 to a template slot in **Supabase Dashboard →
Authentication → Email Templates**.

## Where each file goes

| File | Supabase template slot | Subject |
|---|---|---|
| `confirm-signup.html` | Confirm signup | Confirm your Conduikt email |
| `magic-link.html` | Magic Link | Sign in to Conduikt |
| `reset-password.html` | Reset Password | Reset your Conduikt password |
| `change-email.html` | Change Email Address | Confirm your new Conduikt email |
| `invite-user.html` | Invite user | You've been invited to Conduikt |

## How to install

For each file:
1. Open Supabase Dashboard → your project → Authentication → Email Templates
2. Pick the matching template slot from the dropdown
3. Set the **Subject** to the value in the table above
4. Copy the entire contents of the HTML file into the **Message body** field
5. Save

Repeat for all 5 templates. Total time: ~5 minutes.

## Template variables

These templates use Supabase's standard Go template syntax. Variables
are substituted server-side at send time — leave them as-is:

- `{{ .ConfirmationURL }}` — the action URL the user clicks
- `{{ .Email }}` — recipient's current email
- `{{ .NewEmail }}` — recipient's new email (change-email only)
- `{{ .SiteURL }}` — base URL (https://conduikt.com)

## Brand tokens used

These templates use the published Mineral design system:

| Token | Hex | Used for |
|---|---|---|
| `surface-0` (page bg) | `#f5f0eb` | Email body background |
| `surface-1` (card) | `#ffffff` | Card / content area |
| `surface-header` (dark) | `#0C0C0E` | Header bar |
| `text-primary` | `#1a1714` | Headings + body |
| `text-secondary` | `#4a4540` | Body paragraphs |
| `text-tertiary` | `#8a8176` | Footer / metadata |
| `border-default` | `#e5e0db` | Card border + divider |
| `accent-primary` (teal) | `#1F6B66` | CTA buttons + links (light-mode variant) |
| `accent-primary` (teal-400) | `#2F8C85` | Logo on dark header |

The grain texture is intentionally OMITTED — email clients render
backgrounds inconsistently. The cream + teal palette holds the brand
without it.

## Compatibility

Tested template structure (table-based, inline CSS only) supports:

- ✅ Gmail (web, iOS, Android)
- ✅ Apple Mail (macOS, iOS)
- ✅ Outlook desktop (Windows + macOS)
- ✅ Outlook web
- ✅ Yahoo Mail
- ✅ ProtonMail

No web fonts are loaded — falls back to system Helvetica/Arial.

## After installing

Test by triggering each flow in production:

1. Sign up with a fresh email → check Confirm signup email
2. Hit "Forgot password" → check Reset Password email
3. Sign in via "magic link" option → check Magic Link email
4. From `/settings`, change your email → check Change Email email
5. From `/settings/team`, invite someone → check Invite email

Screenshot any rendering issues across at least Gmail and Apple Mail.
