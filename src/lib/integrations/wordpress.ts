// WordPress publish target for Missing Pages: the REST API with an
// Application Password (Users > Profile > Application Passwords). We
// search for a page by slug and update it, else create it, so a re-run
// of the same search phrase revises the page instead of duplicating it.
// Every request goes through safeFetch (public hosts only).

import { safeFetch } from "@/src/lib/security/safe-fetch";

export interface WordPressConnection {
  /** https://example.com (any trailing slash is removed) */
  baseUrl: string;
  username: string;
  appPassword: string;
}

export interface WordPressPageInput {
  slug: string;
  title: string;
  /** HTML body (see hosted-pages/html.ts) */
  content: string;
  excerpt?: string;
  status?: "publish" | "draft";
}

export interface WordPressPageResult {
  id: number;
  link: string;
  created: boolean;
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export function normaliseBaseUrl(raw: string): string {
  const withScheme = raw.includes("://") ? raw : `https://${raw}`;
  const u = new URL(withScheme);
  return `${u.origin}${u.pathname.replace(/\/+$/, "")}`;
}

function authHeader(conn: WordPressConnection): string {
  return `Basic ${Buffer.from(`${conn.username}:${conn.appPassword}`).toString("base64")}`;
}

async function wpFetch(conn: WordPressConnection, path: string, init: RequestInit, fetchImpl: FetchLike): Promise<Response> {
  const url = `${normaliseBaseUrl(conn.baseUrl)}/wp-json/wp/v2${path}`;
  return fetchImpl(url, {
    ...init,
    headers: {
      Authorization: authHeader(conn),
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
}

/** GET /users/me: proves the URL, user and password work together. */
export async function testWordPressConnection(
  conn: WordPressConnection,
  fetchImpl: FetchLike = (u, i) => safeFetch(u, i)
): Promise<{ ok: true; name: string } | { ok: false; error: string }> {
  let res: Response;
  try {
    res = await wpFetch(conn, "/users/me?context=edit", { method: "GET" }, fetchImpl);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Could not reach that site" };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, error: "WordPress said the username or application password is wrong" };
  if (!res.ok) return { ok: false, error: `WordPress responded ${res.status}. Is the REST API switched on?` };
  const me = (await res.json().catch(() => null)) as { name?: string; capabilities?: Record<string, boolean> } | null;
  if (!me) return { ok: false, error: "WordPress sent something we could not read" };
  if (me.capabilities && me.capabilities.publish_pages === false) {
    return { ok: false, error: "That user cannot publish pages. Use an Editor or Administrator" };
  }
  return { ok: true, name: me.name ?? conn.username };
}

/** Create the page, or update the one that already has this slug. */
export async function upsertWordPressPage(
  conn: WordPressConnection,
  page: WordPressPageInput,
  fetchImpl: FetchLike = (u, i) => safeFetch(u, i)
): Promise<WordPressPageResult> {
  const status = page.status ?? "publish";
  const search = await wpFetch(
    conn,
    `/pages?slug=${encodeURIComponent(page.slug)}&status=publish,draft,pending,private&per_page=1&context=edit`,
    { method: "GET" },
    fetchImpl
  );
  if (!search.ok) throw new Error(`WordPress responded ${search.status} while looking for the page`);
  const existing = ((await search.json().catch(() => [])) as Array<{ id: number }>)[0];

  const body = JSON.stringify({
    slug: page.slug,
    title: page.title,
    content: page.content,
    excerpt: page.excerpt ?? "",
    status,
  });

  const res = existing
    ? await wpFetch(conn, `/pages/${existing.id}`, { method: "POST", body }, fetchImpl)
    : await wpFetch(conn, `/pages`, { method: "POST", body }, fetchImpl);

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(detail?.message ? `WordPress: ${detail.message}` : `WordPress responded ${res.status}`);
  }
  const saved = (await res.json()) as { id: number; link: string };
  return { id: saved.id, link: saved.link, created: !existing };
}
