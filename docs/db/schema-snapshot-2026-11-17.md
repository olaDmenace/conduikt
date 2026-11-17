# Database schema snapshot — 2026-11-17

Committed baseline of the `public` schema of Supabase project `yybpacultmaxqxjfsrvx`,
captured read-only on 2026-11-17 through the Supabase MCP connector
(`information_schema.columns`, `pg_class`, `pg_policies`). The matching TypeScript
types are in `src/types/database.ts`.

Why this exists: the 17 oldest core tables have no committed migration, so until now
the repo had no single file that described the live schema. Treat this file as the
reference for what production looked like on 2026-11-17; regenerate it (and the types)
after applying migrations.

Reading the policy columns: **USING** is the row filter applied to reads/updates/deletes,
**WITH CHECK** is the filter applied to inserted/updated rows. `{public}` means the
policy applies to every role (anon, authenticated and service_role alike).

## Summary

- Tables: **52**
- Tables with RLS enabled: **52**
- Tables with RLS enabled but **no policy** (only service_role can touch them): `pitchodds_daily_picks`, `x_account_metrics_snapshots`
- Total policies: **66**

### Observations worth a second look

These are facts from the live catalog, not changes. The lead decides what to do with them.

- `profiles` policy **Users can update own profile** is `UPDATE USING (id = auth.uid())` with **no WITH CHECK**, and the table keeps Supabase's default grants, so `authenticated` (and `anon`) hold UPDATE on every column — including `role`, `plan`, `generation_count`, `generation_reset_at`, `email_usage_count`, `email_usage_reset_at`, `referred_via`, `referred_at` and the `payment_*` columns. The only trigger on the table is `update_updated_at`, and nothing in `supabase/migrations` revokes those columns or guards them. Any signed-in user can therefore set their own `role = 'admin'` or `plan = 'agency'` from the browser; `requireAdmin` (which reads `profiles.role` through the user-context client) and every `is_paid_user`/quota check trust that value. A draft fix is in `docs/db/proposed-20261117_profiles_protect_columns.sql` for the lead to move into `supabase/migrations/` and apply.
- `n8n_content_state` policy **Service role full access** is `FOR ALL TO public USING (true)` — despite its name it is not scoped to service_role, so any authenticated or anon key can read and write the table.
- `notifications` policy **Service can insert notifications** allows INSERT for `{public}` with `WITH CHECK (true)` — any client can insert rows for any user.
- `pitchodds_daily_picks` has RLS enabled and zero policies: only the service-role key can read or write it.
- `x_account_metrics_snapshots` has RLS enabled and zero policies: only the service-role key can read or write it.
- `x_playbook_bracket_inputs` policy **x_playbook_bracket_inputs_owner_all** hard-codes a single user id in its predicate.

## RLS status by table

| Table | RLS | Forced | Policies |
|---|---|---|---|
| `ad_insights` | on | no | 1 |
| `ai_generations` | on | no | 1 |
| `ai_visibility_checks` | on | no | 1 |
| `app_config` | on | no | 2 |
| `assets` | on | no | 2 |
| `audience_contacts` | on | no | 1 |
| `audiences` | on | no | 1 |
| `audits` | on | no | 1 |
| `automation_settings` | on | no | 1 |
| `blog_posts` | on | no | 3 |
| `broadcasts` | on | no | 1 |
| `bulk_jobs` | on | no | 1 |
| `campaign_steps` | on | no | 1 |
| `campaigns` | on | no | 1 |
| `competitor_snapshots` | on | no | 1 |
| `competitor_trackers` | on | no | 1 |
| `connected_accounts` | on | no | 1 |
| `content_revisions` | on | no | 2 |
| `content_scores` | on | no | 1 |
| `email_events` | on | no | 1 |
| `email_sequence_enrollments` | on | no | 1 |
| `email_sequence_steps` | on | no | 1 |
| `email_sequences` | on | no | 1 |
| `hosted_pages` | on | no | 2 |
| `keyword_data` | on | no | 1 |
| `lead_forms` | on | no | 1 |
| `missing_page_candidates` | on | no | 1 |
| `missing_page_runs` | on | no | 1 |
| `n8n_content_state` | on | no | 1 |
| `notifications` | on | no | 4 |
| `pitchodds_daily_picks` | on | no | 0 |
| `post_learnings` | on | no | 2 |
| `post_metrics` | on | no | 1 |
| `profiles` | on | no | 3 |
| `projects` | on | no | 1 |
| `referral_clicks` | on | no | 1 |
| `referral_conversions` | on | no | 1 |
| `referral_earnings` | on | no | 1 |
| `referral_links` | on | no | 1 |
| `referral_payouts` | on | no | 1 |
| `scheduled_executions` | on | no | 1 |
| `scheduled_posts` | on | no | 1 |
| `site_connections` | on | no | 1 |
| `team_members` | on | no | 4 |
| `teams` | on | no | 2 |
| `verified_domains` | on | no | 1 |
| `video_clips` | on | no | 1 |
| `video_jobs` | on | no | 1 |
| `webhook_configs` | on | no | 1 |
| `whatsapp_events` | on | no | 1 |
| `x_account_metrics_snapshots` | on | no | 0 |
| `x_playbook_bracket_inputs` | on | no | 1 |

## Tables

### `ad_insights`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `platform` | text | no | `'meta'::text` |
| `account_id` | text | no |  |
| `campaign_id` | text | yes |  |
| `campaign_name` | text | yes |  |
| `adset_id` | text | yes |  |
| `ad_id` | text | no |  |
| `ad_name` | text | yes |  |
| `date` | date | no |  |
| `spend` | numeric | no | `0` |
| `impressions` | integer | no | `0` |
| `clicks` | integer | no | `0` |
| `ctr` | numeric | no | `0` |
| `cpc` | numeric | no | `0` |
| `conversions` | integer | yes |  |
| `roas` | numeric | yes |  |
| `raw` | jsonb | no | `'{}'::jsonb` |
| `synced_at` | timestamp with time zone | no | `now()` |
| `created_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_ad_insights | SELECT | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `ai_generations`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | yes |  |
| `asset_id` | uuid | yes |  |
| `agent_used` | text | no |  |
| `prompt_hash` | text | yes |  |
| `input_tokens` | integer | yes |  |
| `output_tokens` | integer | yes |  |
| `model` | text | no |  |
| `duration_ms` | integer | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own generations | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `ai_visibility_checks`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `engine` | text | no |  |
| `question` | text | no |  |
| `asked_at` | timestamp with time zone | no | `now()` |
| `mentioned` | boolean | no | `false` |
| `cited` | boolean | no | `false` |
| `position` | integer | yes |  |
| `competitors_mentioned` | text[] | no | `'{}'::text[]` |
| `answer_excerpt` | text | yes |  |
| `raw` | jsonb | no | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_ai_visibility_checks | SELECT | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `app_config`

RLS: enabled · policies: 2

| Column | Type | Nullable | Default |
|---|---|---|---|
| `key` | text | no |  |
| `value` | jsonb | no |  |
| `updated_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Admins can modify app_config | ALL | `{authenticated}` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |
| Admins can read app_config | SELECT | `{authenticated}` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |  |

### `assets`

RLS: enabled · policies: 2

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `campaign_id` | uuid | yes |  |
| `project_id` | uuid | no |  |
| `type` | text | no |  |
| `channel` | text | yes |  |
| `title` | text | yes |  |
| `content` | jsonb | no |  |
| `status` | text | yes | `'draft'::text` |
| `published_at` | timestamp with time zone | yes |  |
| `external_id` | text | yes |  |
| `performance` | jsonb | yes |  |
| `version` | integer | yes | `1` |
| `parent_asset_id` | uuid | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `updated_at` | timestamp with time zone | yes | `now()` |
| `variant_group_id` | uuid | yes |  |
| `variant_label` | text | yes |  |
| `selected` | boolean | yes | `false` |
| `archived` | boolean | yes | `false` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own assets | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |
| Users can insert assets for own projects | INSERT | `{public}` |  | `((EXISTS ( SELECT 1 FROM projects WHERE ((projects.id = assets.project_id) AND (projects.user_id = auth.uid())))) AND is_paid_user(auth.uid()))` |

### `audience_contacts`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `audience_id` | uuid | no |  |
| `email` | text | no |  |
| `first_name` | text | yes |  |
| `last_name` | text | yes |  |
| `custom_fields` | jsonb | no | `'{}'::jsonb` |
| `status` | text | no | `'subscribed'::text` |
| `resend_contact_id` | text | yes |  |
| `unsubscribe_token` | text | no | `replace((gen_random_uuid())::text, '-'::text, ''::text)` |
| `suppression_reason` | text | yes |  |
| `subscribed_at` | timestamp with time zone | no | `now()` |
| `unsubscribed_at` | timestamp with time zone | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |
| `phone` | text | yes |  |
| `whatsapp_opt_in` | boolean | no | `false` |
| `whatsapp_opt_in_at` | timestamp with time zone | yes |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_contacts | ALL | `{public}` | `(audience_id IN ( SELECT a.id FROM (audiences a JOIN projects p ON ((a.project_id = p.id))) WHERE (p.user_id = auth.uid())))` | `(audience_id IN ( SELECT a.id FROM (audiences a JOIN projects p ON ((a.project_id = p.id))) WHERE (p.user_id = auth.uid())))` |

### `audiences`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `user_id` | uuid | no |  |
| `name` | text | no |  |
| `description` | text | yes |  |
| `resend_audience_id` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_audiences | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |

### `audits`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `type` | text | no |  |
| `url` | text | no |  |
| `score` | integer | yes |  |
| `findings` | jsonb | no |  |
| `auto_fixes_applied` | jsonb | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `metadata` | jsonb | yes |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own audits | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `automation_settings`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `user_id` | uuid | no |  |
| `x_mode` | text | no | `'auto'::text` |
| `linkedin_mode` | text | no | `'review'::text` |
| `review_hold_hours` | integer | no | `24` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| user_owns_automation_settings | ALL | `{public}` | `(user_id = auth.uid())` | `(user_id = auth.uid())` |

### `blog_posts`

RLS: enabled · policies: 3

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `slug` | text | no |  |
| `title` | text | no |  |
| `description` | text | no |  |
| `excerpt` | text | no |  |
| `author` | text | no | `'Olayinka Fagbenro'::text` |
| `tags` | text[] | no | `'{}'::text[]` |
| `reading_time_minutes` | integer | yes |  |
| `sections` | jsonb | yes |  |
| `content_markdown` | text | yes |  |
| `meta_title` | text | yes |  |
| `meta_description` | text | yes |  |
| `featured_image_query` | text | yes |  |
| `cta` | jsonb | no | `'{"href": "/signup", "label": "Try Conduikt free"}'::jsonb` |
| `date_published` | timestamp with time zone | no | `now()` |
| `date_modified` | timestamp with time zone | no | `now()` |
| `status` | text | no | `'published'::text` |
| `user_id` | uuid | yes |  |
| `project_id` | uuid | yes |  |
| `source_asset_id` | uuid | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| blog_posts_owner_select | SELECT | `{public}` | `(user_id = auth.uid())` |  |
| blog_posts_owner_write | ALL | `{public}` | `(user_id = auth.uid())` | `(user_id = auth.uid())` |
| blog_posts_public_select | SELECT | `{public}` | `(status = 'published'::text)` |  |

### `broadcasts`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `audience_id` | uuid | no |  |
| `project_id` | uuid | no |  |
| `user_id` | uuid | no |  |
| `subject` | text | no |  |
| `html_body` | text | no |  |
| `text_body` | text | yes |  |
| `from_name` | text | no |  |
| `from_email` | text | no |  |
| `reply_to` | text | yes |  |
| `scheduled_for` | timestamp with time zone | yes |  |
| `sent_at` | timestamp with time zone | yes |  |
| `status` | text | no | `'draft'::text` |
| `resend_broadcast_id` | text | yes |  |
| `error_message` | text | yes |  |
| `totals` | jsonb | no | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_broadcasts | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |

### `bulk_jobs`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | yes |  |
| `project_id` | uuid | yes |  |
| `agent_id` | text | no |  |
| `total` | integer | no |  |
| `completed` | integer | yes | `0` |
| `failed` | integer | yes | `0` |
| `status` | text | yes | `'running'::text` |
| `created_at` | timestamp with time zone | yes | `now()` |
| `completed_at` | timestamp with time zone | yes |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| user_bulk_jobs | ALL | `{public}` | `(user_id = auth.uid())` |  |

### `campaign_steps`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `campaign_id` | uuid | no |  |
| `step_order` | integer | no |  |
| `agent_id` | text | no |  |
| `config` | jsonb | yes | `'{}'::jsonb` |
| `status` | text | yes | `'pending'::text` |
| `result` | jsonb | yes |  |
| `started_at` | timestamp with time zone | yes |  |
| `completed_at` | timestamp with time zone | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users manage campaign steps via project | ALL | `{public}` | `(campaign_id IN ( SELECT c.id FROM (campaigns c JOIN projects p ON ((c.project_id = p.id))) WHERE (p.user_id = auth.uid())))` |  |

### `campaigns`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `name` | text | no |  |
| `type` | text | no |  |
| `status` | text | yes | `'draft'::text` |
| `config` | jsonb | yes |  |
| `results` | jsonb | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `updated_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own campaigns | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `competitor_snapshots`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `tracker_id` | uuid | yes |  |
| `keyword_overlap` | integer | yes |  |
| `content_gaps` | text[] | yes |  |
| `estimated_da` | integer | yes |  |
| `top_keywords` | text[] | yes |  |
| `snapshot_data` | jsonb | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_snapshots | ALL | `{public}` | `(tracker_id IN ( SELECT competitor_trackers.id FROM competitor_trackers WHERE (competitor_trackers.project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))))` |  |

### `competitor_trackers`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | yes |  |
| `competitor_url` | text | no |  |
| `competitor_name` | text | yes |  |
| `last_checked_at` | timestamp with time zone | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_trackers | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `connected_accounts`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no |  |
| `platform` | text | no |  |
| `access_token` | text | no |  |
| `refresh_token` | text | yes |  |
| `token_expires_at` | timestamp with time zone | yes |  |
| `platform_user_id` | text | yes |  |
| `platform_username` | text | yes |  |
| `scope` | text | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `updated_at` | timestamp with time zone | yes | `now()` |
| `project_id` | uuid | yes |  |
| `metadata` | jsonb | no | `'{}'::jsonb` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can manage own connected accounts | ALL | `{public}` | `(user_id = auth.uid())` |  |

### `content_revisions`

RLS: enabled · policies: 2

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `asset_id` | uuid | no |  |
| `content` | jsonb | no |  |
| `source` | text | no |  |
| `created_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_revisions | ALL | `{public}` | `(EXISTS ( SELECT 1 FROM (assets a JOIN projects p ON ((p.id = a.project_id))) WHERE ((a.id = content_revisions.asset_id) AND (p.user_id = auth.uid()))))` | `(EXISTS ( SELECT 1 FROM (assets a JOIN projects p ON ((p.id = a.project_id))) WHERE ((a.id = content_revisions.asset_id) AND (p.user_id = auth.uid()))))` |
| service_role_revisions | ALL | `{service_role}` | `true` | `true` |

### `content_scores`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | yes |  |
| `post_id` | uuid | yes |  |
| `content_type` | text | no |  |
| `content_preview` | text | yes |  |
| `total_score` | integer | no |  |
| `clarity` | integer | no |  |
| `relevance` | integer | no |  |
| `engagement_potential` | integer | no |  |
| `brand_alignment` | integer | no |  |
| `summary` | text | yes |  |
| `top_strength` | text | yes |  |
| `top_improvement` | text | yes |  |
| `scored_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_scores | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `email_events`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `broadcast_id` | uuid | no |  |
| `contact_id` | uuid | yes |  |
| `event_type` | text | no |  |
| `occurred_at` | timestamp with time zone | no | `now()` |
| `metadata` | jsonb | no | `'{}'::jsonb` |
| `resend_event_id` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_email_events | SELECT | `{public}` | `(broadcast_id IN ( SELECT b.id FROM (broadcasts b JOIN projects p ON ((b.project_id = p.id))) WHERE (p.user_id = auth.uid())))` |  |

### `email_sequence_enrollments`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no |  |
| `sequence_id` | uuid | no |  |
| `contact_id` | uuid | no |  |
| `audience_id` | uuid | no |  |
| `current_step_order` | integer | no | `0` |
| `status` | text | no | `'active'::text` |
| `enrolled_at` | timestamp with time zone | no | `now()` |
| `last_step_at` | timestamp with time zone | yes |  |
| `completed_at` | timestamp with time zone | yes |  |
| `cancellation_reason` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| user_owns_seq_enrollments | ALL | `{public}` | `(user_id = auth.uid())` | `(user_id = auth.uid())` |

### `email_sequence_steps`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `sequence_id` | uuid | no |  |
| `asset_id` | uuid | no |  |
| `step_order` | integer | no |  |
| `delay_hours` | integer | yes | `24` |
| `subject_line` | text | no |  |
| `preview_text` | text | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `channel` | text | no | `'email'::text` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own sequence steps | ALL | `{public}` | `(sequence_id IN ( SELECT email_sequences.id FROM email_sequences WHERE (email_sequences.project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))))` |  |

### `email_sequences`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `campaign_id` | uuid | yes |  |
| `project_id` | uuid | no |  |
| `name` | text | no |  |
| `type` | text | no |  |
| `trigger_event` | text | yes |  |
| `exit_conditions` | jsonb | yes |  |
| `status` | text | yes | `'draft'::text` |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own email sequences | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `hosted_pages`

RLS: enabled · policies: 2

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `site_slug` | text | no |  |
| `slug` | text | no |  |
| `title` | text | no |  |
| `meta_description` | text | yes |  |
| `page` | jsonb | no |  |
| `template` | text | no | `'service'::text` |
| `status` | text | no | `'draft'::text` |
| `published_at` | timestamp with time zone | yes |  |
| `asset_id` | uuid | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_hosted_pages | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |
| public_reads_published_hosted_pages | SELECT | `{anon,authenticated}` | `(status = 'published'::text)` |  |

### `keyword_data`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `seed` | text | no |  |
| `term` | text | no |  |
| `intent` | text | yes |  |
| `estimated_volume` | text | yes |  |
| `difficulty` | text | yes |  |
| `quick_win` | boolean | yes | `false` |
| `cluster` | text | yes |  |
| `notes` | text | yes |  |
| `saved_at` | timestamp with time zone | yes | `now()` |
| `created_at` | timestamp with time zone | yes | `now()` |
| `clicks` | integer | yes | `0` |
| `impressions` | integer | yes | `0` |
| `ctr` | numeric | yes | `0` |
| `position` | numeric | yes | `0` |
| `source` | text | yes | `'ai'::text` |
| `date_range_start` | date | yes |  |
| `date_range_end` | date | yes |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can manage their project keywords | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `lead_forms`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `user_id` | uuid | no |  |
| `audience_id` | uuid | no |  |
| `sequence_id` | uuid | yes |  |
| `name` | text | no |  |
| `fields` | jsonb | no | `'[{"name": "email", "type": "email", "label": "Email address", "required": true}, {"name": "first_name", "type": "text", "label": "First name", "required": false}]'::jsonb` |
| `redirect_url` | text | yes |  |
| `headline` | text | yes |  |
| `submit_label` | text | no | `'Subscribe'::text` |
| `thank_you_message` | text | no | `'Thanks for subscribing! Check your inbox.'::text` |
| `is_active` | boolean | no | `true` |
| `submission_count` | integer | no | `0` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| user_owns_lead_forms | ALL | `{public}` | `(user_id = auth.uid())` | `(user_id = auth.uid())` |

### `missing_page_candidates`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `query` | text | no |  |
| `kind` | text | no | `'new'::text` |
| `matched_url` | text | yes |  |
| `match_score` | numeric | no | `0` |
| `monthly_searches` | integer | yes |  |
| `competition` | text | yes |  |
| `estimated` | boolean | no | `false` |
| `score` | numeric | no | `0` |
| `status` | text | no | `'open'::text` |
| `asset_id` | uuid | yes |  |
| `hosted_page_id` | uuid | yes |  |
| `readiness` | jsonb | yes |  |
| `last_error` | text | yes |  |
| `last_seen_at` | timestamp with time zone | no | `now()` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_missing_page_candidates | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |

### `missing_page_runs`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `mode` | text | no |  |
| `started_at` | timestamp with time zone | no | `now()` |
| `finished_at` | timestamp with time zone | yes |  |
| `pages_crawled` | integer | no | `0` |
| `queries_checked` | integer | no | `0` |
| `gaps_found` | integer | no | `0` |
| `pages_written` | integer | no | `0` |
| `pages_published` | integer | no | `0` |
| `error` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_missing_page_runs | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |

### `n8n_content_state`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `posted_history` | jsonb | yes | `'[]'::jsonb` |
| `rotation_index` | integer | yes | `0` |
| `banned_hashes` | text[] | yes | `'{}'::text[]` |
| `updated_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Service role full access | ALL | `{public}` | `true` | `true` |

### `notifications`

RLS: enabled · policies: 4

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | yes |  |
| `project_id` | uuid | yes |  |
| `type` | text | no |  |
| `title` | text | no |  |
| `body` | text | yes |  |
| `read` | boolean | yes | `false` |
| `created_at` | timestamp with time zone | yes | `now()` |
| `action_url` | text | yes |  |
| `data` | jsonb | yes | `'{}'::jsonb` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Service can insert notifications | INSERT | `{public}` |  | `true` |
| Users can update own notifications | UPDATE | `{public}` | `(user_id = auth.uid())` |  |
| Users can view own notifications | SELECT | `{public}` | `(user_id = auth.uid())` |  |
| user_owns_notifications | ALL | `{public}` | `(user_id = auth.uid())` |  |

### `pitchodds_daily_picks`

RLS: enabled · policies: 0

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `pick_date` | date | no |  |
| `match_id` | text | yes |  |
| `home_team` | text | no |  |
| `away_team` | text | no |  |
| `kickoff_at` | timestamp with time zone | yes |  |
| `predicted_prob` | integer | no |  |
| `predicted_outcome` | text | no |  |
| `actual_outcome` | text | yes |  |
| `settled_at` | timestamp with time zone | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

_No policies._

### `post_learnings`

RLS: enabled · policies: 2

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | yes |  |
| `channel` | text | no |  |
| `pattern_key` | text | no |  |
| `hypothesis` | text | no |  |
| `evidence` | jsonb | no | `'{}'::jsonb` |
| `confidence` | numeric | no | `0.5` |
| `active` | boolean | no | `true` |
| `generated_at` | timestamp with time zone | no | `now()` |
| `created_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_learnings | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |
| service_role_learnings | ALL | `{service_role}` | `true` | `true` |

### `post_metrics`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | yes |  |
| `scheduled_post_id` | uuid | yes |  |
| `channel` | text | no |  |
| `external_post_id` | text | no |  |
| `impressions` | integer | yes | `0` |
| `likes` | integer | yes | `0` |
| `shares` | integer | yes | `0` |
| `comments` | integer | yes | `0` |
| `clicks` | integer | yes | `0` |
| `synced_at` | timestamp with time zone | yes | `now()` |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_metrics | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `profiles`

RLS: enabled · policies: 3

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no |  |
| `full_name` | text | yes |  |
| `avatar_url` | text | yes |  |
| `plan` | text | yes | `'free'::text` |
| `generation_count` | integer | yes | `0` |
| `generation_reset_at` | timestamp with time zone | yes |  |
| `onboarding_completed` | boolean | yes | `false` |
| `created_at` | timestamp with time zone | yes | `now()` |
| `updated_at` | timestamp with time zone | yes | `now()` |
| `role` | text | yes | `'user'::text` |
| `brand_logo_url` | text | yes |  |
| `brand_primary_color` | text | yes | `'#D4945A'::text` |
| `brand_secondary_color` | text | yes | `'#1A1A1A'::text` |
| `brand_font` | text | yes | `'Outfit'::text` |
| `referred_via` | uuid | yes |  |
| `referred_at` | timestamp with time zone | yes |  |
| `payment_provider` | text | yes |  |
| `payment_customer_id` | text | yes |  |
| `payment_subscription_id` | text | yes |  |
| `payment_authorization` | text | yes |  |
| `payment_plan_code` | text | yes |  |
| `email_usage_count` | integer | no | `0` |
| `email_usage_reset_at` | timestamp with time zone | yes |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can insert own profile | INSERT | `{public}` |  | `(id = auth.uid())` |
| Users can update own profile | UPDATE | `{public}` | `(id = auth.uid())` |  |
| Users can view own profile | SELECT | `{public}` | `(id = auth.uid())` |  |

### `projects`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no |  |
| `name` | text | no |  |
| `website_url` | text | yes |  |
| `description` | text | yes |  |
| `target_audience` | jsonb | yes |  |
| `value_proposition` | text | yes |  |
| `brand_voice` | jsonb | yes |  |
| `competitors` | jsonb | yes |  |
| `positioning_statement` | text | yes |  |
| `keywords` | jsonb | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `updated_at` | timestamp with time zone | yes | `now()` |
| `gsc_site_url` | text | yes |  |
| `onboarding_answers` | jsonb | yes |  |
| `industry` | text | yes |  |
| `business_description` | text | yes |  |
| `audience_pain_point` | text | yes |  |
| `online_channels` | text[] | yes | `'{}'::text[]` |
| `brand_voice_example` | text | yes |  |
| `primary_goal` | text | yes |  |
| `onboarding_completed` | boolean | yes | `false` |
| `client_name` | text | yes |  |
| `client_logo_url` | text | yes |  |
| `report_accent_color` | text | yes | `'#2F8C85'::text` |
| `business_type` | text | yes |  |
| `automation_mode` | text | no | `'check_all'::text` |
| `wants_hosted_page` | boolean | no | `false` |
| `business_location` | text | yes |  |
| `services` | text[] | no | `'{}'::text[]` |
| `missing_pages_enabled` | boolean | no | `false` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own projects | ALL | `{public}` | `(user_id = auth.uid())` |  |

### `referral_clicks`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `referral_link_id` | uuid | yes |  |
| `visited_at` | timestamp with time zone | yes | `now()` |
| `ip_hash` | text | yes |  |
| `user_agent` | text | yes |  |
| `referer` | text | yes |  |
| `country` | text | yes |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Admins can read referral_clicks | SELECT | `{public}` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |  |

### `referral_conversions`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `referral_link_id` | uuid | yes |  |
| `user_id` | uuid | no |  |
| `signed_up_at` | timestamp with time zone | yes | `now()` |
| `first_paid_at` | timestamp with time zone | yes |  |
| `current_plan` | text | yes | `'free'::text` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Admins can read referral_conversions | SELECT | `{public}` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |  |

### `referral_earnings`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `referral_link_id` | uuid | yes |  |
| `conversion_id` | uuid | yes |  |
| `user_id` | uuid | yes |  |
| `payment_source` | text | yes | `'manual'::text` |
| `payment_reference` | text | yes |  |
| `payment_amount_usd` | numeric | no |  |
| `commission_usd` | numeric | no |  |
| `paid_out` | boolean | yes | `false` |
| `payout_id` | uuid | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Admins can read referral_earnings | SELECT | `{public}` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |  |

### `referral_links`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `code` | text | no |  |
| `label` | text | no |  |
| `partner_name` | text | no |  |
| `partner_email` | text | no |  |
| `commission_type` | text | no | `'percentage'::text` |
| `commission_rate` | numeric | yes | `0.2000` |
| `flat_amount_usd` | numeric | yes |  |
| `active` | boolean | yes | `true` |
| `notes` | text | yes |  |
| `created_by` | uuid | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |
| `updated_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Admins can read referral_links | SELECT | `{public}` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |  |

### `referral_payouts`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `partner_name` | text | no |  |
| `partner_email` | text | no |  |
| `amount_usd` | numeric | no |  |
| `method` | text | yes |  |
| `reference` | text | yes |  |
| `notes` | text | yes |  |
| `created_by` | uuid | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Admins can read referral_payouts | SELECT | `{public}` | `(EXISTS ( SELECT 1 FROM profiles WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))` |  |

### `scheduled_executions`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no |  |
| `execution_type` | text | no |  |
| `payload` | jsonb | no | `'{}'::jsonb` |
| `scheduled_for` | timestamp with time zone | no |  |
| `status` | text | no | `'pending'::text` |
| `attempts` | integer | no | `0` |
| `max_attempts` | integer | no | `3` |
| `last_error` | text | yes |  |
| `idempotency_key` | text | yes |  |
| `parent_id` | uuid | yes |  |
| `parent_type` | text | yes |  |
| `result` | jsonb | yes |  |
| `ran_at` | timestamp with time zone | yes |  |
| `completed_at` | timestamp with time zone | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| user_reads_own_executions | SELECT | `{public}` | `(user_id = auth.uid())` |  |

### `scheduled_posts`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `asset_id` | uuid | no |  |
| `project_id` | uuid | yes |  |
| `channel` | text | no |  |
| `scheduled_for` | timestamp with time zone | no |  |
| `posted_at` | timestamp with time zone | yes |  |
| `status` | text | yes | `'pending'::text` |
| `error_message` | text | yes |  |
| `external_post_id` | text | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| Users can access own scheduled posts | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `site_connections`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `kind` | text | no |  |
| `site_slug` | text | yes |  |
| `base_url` | text | yes |  |
| `username` | text | yes |  |
| `secret_encrypted` | text | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_site_connections | ALL | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |

### `team_members`

RLS: enabled · policies: 4

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | yes |  |
| `invited_by` | uuid | no |  |
| `role` | text | yes | `'member'::text` |
| `status` | text | yes | `'pending'::text` |
| `created_at` | timestamp with time zone | yes | `now()` |
| `invite_email` | text | yes |  |
| `team_id` | uuid | no |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| members read own team rows | SELECT | `{public}` | `(team_id IN ( SELECT auth_user_team_ids() AS auth_user_team_ids))` |  |
| owners or admins can invite | INSERT | `{public}` |  | `(team_id IN ( SELECT auth_user_manages_team_ids() AS auth_user_manages_team_ids))` |
| owners or admins can remove | DELETE | `{public}` | `(team_id IN ( SELECT auth_user_manages_team_ids() AS auth_user_manages_team_ids))` |  |
| owners or admins can update | UPDATE | `{public}` | `(team_id IN ( SELECT auth_user_manages_team_ids() AS auth_user_manages_team_ids))` |  |

### `teams`

RLS: enabled · policies: 2

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `owner_id` | uuid | no |  |
| `name` | text | no | `'My Workspace'::text` |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| members read own teams | SELECT | `{public}` | `(id IN ( SELECT auth_user_team_ids() AS auth_user_team_ids))` |  |
| owner updates team | UPDATE | `{public}` | `(owner_id = auth.uid())` |  |

### `verified_domains`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | no |  |
| `domain` | text | no |  |
| `resend_domain_id` | text | no |  |
| `status` | text | no | `'pending'::text` |
| `dns_records` | jsonb | no | `'[]'::jsonb` |
| `verified_at` | timestamp with time zone | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| user_owns_verified_domains | ALL | `{public}` | `(user_id = auth.uid())` | `(user_id = auth.uid())` |

### `video_clips`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | yes |  |
| `project_id` | uuid | yes |  |
| `scene_type` | text | yes |  |
| `visual_description` | text | yes |  |
| `clip_url` | text | no |  |
| `provider` | text | yes |  |
| `duration_seconds` | integer | yes |  |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| video_clips_owner | ALL | `{public}` | `(user_id = auth.uid())` |  |

### `video_jobs`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | yes |  |
| `project_id` | uuid | yes |  |
| `brief` | text | no |  |
| `style` | text | no | `'presenter'::text` |
| `voice_id` | text | yes |  |
| `source_asset_id` | uuid | yes |  |
| `script_data` | jsonb | yes |  |
| `provider` | text | yes |  |
| `provider_job_id` | text | yes |  |
| `status` | text | no | `'pending'::text` |
| `progress_message` | text | yes |  |
| `error_message` | text | yes |  |
| `video_url` | text | yes |  |
| `thumbnail_url` | text | yes |  |
| `duration_seconds` | integer | yes |  |
| `credits_used` | integer | yes | `10` |
| `created_at` | timestamp with time zone | yes | `now()` |
| `completed_at` | timestamp with time zone | yes |  |
| `video_type` | text | yes | `'presenter'::text` |
| `avatar_mode` | text | yes | `'random'::text` |
| `selected_avatar_id` | text | yes |  |
| `avatar_gender` | text | yes |  |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| video_jobs_owner | ALL | `{public}` | `(user_id = auth.uid())` |  |

### `webhook_configs`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `user_id` | uuid | yes |  |
| `project_id` | uuid | yes |  |
| `name` | text | no |  |
| `type` | text | no |  |
| `endpoint_url` | text | no |  |
| `auth_token` | text | yes |  |
| `config` | jsonb | yes | `'{}'::jsonb` |
| `active` | boolean | yes | `true` |
| `created_at` | timestamp with time zone | yes | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| user_webhook_configs | ALL | `{public}` | `(user_id = auth.uid())` |  |

### `whatsapp_events`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `project_id` | uuid | no |  |
| `contact_id` | uuid | yes |  |
| `enrollment_id` | uuid | yes |  |
| `direction` | text | no |  |
| `event_type` | text | no |  |
| `wa_message_id` | text | yes |  |
| `phone` | text | yes |  |
| `body` | text | yes |  |
| `occurred_at` | timestamp with time zone | no | `now()` |
| `metadata` | jsonb | no | `'{}'::jsonb` |
| `created_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| project_owner_whatsapp_events | SELECT | `{public}` | `(project_id IN ( SELECT projects.id FROM projects WHERE (projects.user_id = auth.uid())))` |  |

### `x_account_metrics_snapshots`

RLS: enabled · policies: 0

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `snapshot_date` | date | no |  |
| `platform_user_id` | text | no |  |
| `followers_count` | integer | no |  |
| `following_count` | integer | yes |  |
| `tweet_count` | integer | yes |  |
| `listed_count` | integer | yes |  |
| `created_at` | timestamp with time zone | no | `now()` |

_No policies._

### `x_playbook_bracket_inputs`

RLS: enabled · policies: 1

| Column | Type | Nullable | Default |
|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` |
| `ref` | text | no |  |
| `field_name` | text | no |  |
| `value` | text | no |  |
| `created_at` | timestamp with time zone | no | `now()` |
| `updated_at` | timestamp with time zone | no | `now()` |

**Policies**

| Policy | Command | Roles | USING | WITH CHECK |
|---|---|---|---|---|
| x_playbook_bracket_inputs_owner_all | ALL | `{public}` | `(auth.uid() = 'e2bb2edd-6d6c-4288-a386-145151c264ba'::uuid)` | `(auth.uid() = 'e2bb2edd-6d6c-4288-a386-145151c264ba'::uuid)` |
