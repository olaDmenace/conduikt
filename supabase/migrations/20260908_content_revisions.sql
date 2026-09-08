-- content_revisions: preserve prior states of a generated asset so that
-- regeneration and manual editing never obliterate a user's earlier work
-- silently. Every write path (initial generation, manual save, autosave,
-- explicit restore) records a snapshot; the UI reads recent revisions
-- to power the History drawer and one-click restore.
--
-- The source column encodes provenance so we can (a) show a source
-- badge in the timeline UI and (b) implement analytics like "how often
-- do users restore an earlier revision after a regenerate?" — a real
-- signal that regen quality dipped.
--
-- Content is stored as a full JSONB snapshot. Storing a diff would be
-- cheaper on disk but the payloads are small (~5-50KB) and full-blob
-- restore is a single query rather than a diff-replay chain.

create table if not exists content_revisions (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references assets(id) on delete cascade,
  content jsonb not null,
  source text not null check (source in ('generation', 'manual_edit', 'autosave', 'restore')),
  created_at timestamptz not null default now()
);

-- Primary access pattern: fetch the last N revisions for one asset, newest first.
create index if not exists content_revisions_asset_created_idx
  on content_revisions (asset_id, created_at desc);

alter table content_revisions enable row level security;

-- Project owner sees + writes revisions for their assets. Uses an EXISTS
-- lookup through assets → projects so RLS survives any future asset
-- ownership refactor without a policy rewrite.
create policy "project_owner_revisions" on content_revisions
  for all using (
    exists (
      select 1
      from assets a
      join projects p on p.id = a.project_id
      where a.id = content_revisions.asset_id
        and p.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1
      from assets a
      join projects p on p.id = a.project_id
      where a.id = content_revisions.asset_id
        and p.user_id = auth.uid()
    )
  );

-- Service role bypass for cron / analyzer jobs that might snapshot on
-- behalf of the user (e.g. an autosave triggered by a background sync).
create policy "service_role_revisions" on content_revisions
  for all to service_role using (true) with check (true);

-- Housekeeping: cap per-asset revision count implicitly via a client-
-- side pruner rather than a trigger. The API route deletes revisions
-- beyond the 50 most recent for any asset — keeps the table small
-- without runtime SQL cost on every insert.
