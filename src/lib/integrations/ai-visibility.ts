import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/src/lib/supabase/service";

// Found-by-AI monitor (audit 2026-10-24 §5.9 item 4).
//
// Ask the answer engines the questions a customer would ask, and record
// whether the business was named or cited and who was instead. Perplexity
// is the first engine (PERPLEXITY_API_KEY); the others plug in through
// the AnswerEngine interface. With no key at all, NullEngine is the only
// engine and checkVisibility records nothing and returns a plain reason.

export type EngineName = "perplexity" | "openai" | "gemini" | "claude";

export interface EngineAnswer {
  text: string;
  citations: string[];
  raw?: unknown;
}

export interface AnswerEngine {
  readonly name: EngineName;
  readonly available: boolean;
  ask(question: string): Promise<EngineAnswer>;
}

export const DAILY_QUESTION_CAP = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Db = SupabaseClient<any>;

// ---------------------------------------------------------------------------
// Engines
// ---------------------------------------------------------------------------

export class NullEngine implements AnswerEngine {
  readonly name: EngineName;
  readonly available = false;
  constructor(name: EngineName = "perplexity") {
    this.name = name;
  }
  async ask(): Promise<EngineAnswer> {
    return { text: "", citations: [] };
  }
}

export class PerplexityEngine implements AnswerEngine {
  readonly name = "perplexity" as const;
  readonly available: boolean;
  private apiKey: string | undefined;
  private model: string;

  constructor(apiKey = process.env.PERPLEXITY_API_KEY, model = "sonar") {
    this.apiKey = apiKey;
    this.model = model;
    this.available = !!apiKey;
  }

  async ask(question: string): Promise<EngineAnswer> {
    if (!this.apiKey) return { text: "", citations: [] };
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: "system",
            content:
              "Answer like a helpful local guide. Name specific businesses, services or products when you recommend them, and include their websites.",
          },
          { role: "user", content: question },
        ],
        max_tokens: 600,
        temperature: 0.2,
      }),
    });
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Perplexity error ${res.status}: ${err.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      citations?: string[];
      search_results?: Array<{ url?: string }>;
    };
    const text = data.choices?.[0]?.message?.content ?? "";
    const fromCitations = Array.isArray(data.citations) ? data.citations : [];
    const fromSearch = Array.isArray(data.search_results)
      ? data.search_results.map((r) => r.url).filter((u): u is string => !!u)
      : [];
    const citations = Array.from(new Set([...fromCitations, ...fromSearch]));
    return { text, citations, raw: data };
  }
}

/** Engines with a key present. Empty when none is configured. */
export function availableEngines(env: NodeJS.ProcessEnv = process.env): AnswerEngine[] {
  const engines: AnswerEngine[] = [];
  if (env.PERPLEXITY_API_KEY) engines.push(new PerplexityEngine(env.PERPLEXITY_API_KEY));
  // openai / gemini / claude: add here when their search-grounded APIs are wired.
  return engines;
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

export interface ProjectFacts {
  name: string | null;
  website_url?: string | null;
  business_type?: string | null;
  services?: string[] | null;
  business_location?: string | null;
  target_audience?: string | null;
  value_proposition?: string | null;
  description?: string | null;
}

function clean(s: string | null | undefined): string {
  return (s ?? "").replace(/\s+/g, " ").trim();
}

/** First short noun phrase from a longer sentence, for question slots. */
function shortPhrase(s: string | null | undefined, maxWords = 6): string {
  const words = clean(s).split(" ").filter(Boolean);
  if (words.length === 0) return "";
  const phrase = words.slice(0, maxWords).join(" ");
  return phrase.replace(/[.,;:!?]+$/, "");
}

/**
 * Build 5 to 10 "money questions" from what the project says about itself.
 * Local businesses get "near {location}" and "who should I call" forms;
 * everyone gets category and alternatives questions. Deduplicated,
 * capped at 10.
 */
export function buildMoneyQuestions(project: ProjectFacts, cap = DAILY_QUESTION_CAP): string[] {
  const location = clean(project.business_location);
  const services = (project.services ?? []).map(clean).filter(Boolean).slice(0, 4);
  const audience = shortPhrase(project.target_audience, 5);
  const category = services[0] || shortPhrase(project.description, 5) || shortPhrase(project.value_proposition, 5);
  const name = clean(project.name);
  const isLocal = project.business_type === "local" || (!!location && services.length > 0);

  const questions: string[] = [];
  const push = (q: string) => {
    const t = clean(q);
    if (t && !questions.some((x) => x.toLowerCase() === t.toLowerCase())) questions.push(t);
  };

  if (isLocal && location) {
    for (const s of services) {
      push(`Who should I call for ${s} in ${location}?`);
      push(`Best ${s} near ${location}`);
    }
    if (category) push(`Which ${category} in ${location} do people recommend?`);
  } else {
    for (const s of services) {
      push(`Best ${s}${audience ? ` for ${audience}` : ""}`);
    }
  }

  if (category && audience) push(`${category} for ${audience}`);
  if (category) push(`What is the best ${category}${location && isLocal ? ` in ${location}` : ""}?`);
  if (name) push(`${name} alternatives`);
  if (name && category) push(`Is ${name} good for ${category}?`);
  if (project.value_proposition) {
    const vp = shortPhrase(project.value_proposition, 8);
    if (vp) push(`How do I ${vp.charAt(0).toLowerCase()}${vp.slice(1)}?`);
  }

  // Keep at least five when the project gave us very little.
  if (questions.length < 5 && category) {
    push(`${category} recommendations`);
    push(`Top ${category} options${location ? ` around ${location}` : ""}`);
    push(`Who offers ${category}${location ? ` in ${location}` : ""}?`);
  }

  return questions.slice(0, cap);
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

/** "https://www.Example.com/path" -> "example.com". Null for junk. */
export function domainOf(urlOrDomain: string | null | undefined): string | null {
  if (!urlOrDomain) return null;
  let host = urlOrDomain.trim().toLowerCase();
  try {
    if (!/^[a-z]+:\/\//.test(host)) host = `https://${host}`;
    host = new URL(host).hostname;
  } catch {
    return null;
  }
  host = host.replace(/^www\./, "");
  return host.includes(".") ? host : null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export interface DetectionInput {
  name: string | null;
  domain: string | null;
}

export interface Detection {
  mentioned: boolean;
  cited: boolean;
  position: number | null;
  competitors: string[];
  excerpt: string | null;
}

/** Does the answer text name the business (by name or domain)? */
export function detectMention(text: string, ours: DetectionInput): boolean {
  const t = text.toLowerCase();
  if (ours.domain && t.includes(ours.domain.toLowerCase())) return true;
  const name = clean(ours.name);
  if (name.length >= 3) {
    const re = new RegExp(`(^|[^a-z0-9])${escapeRegExp(name.toLowerCase())}([^a-z0-9]|$)`, "i");
    if (re.test(t)) return true;
  }
  return false;
}

/** 1-based position of our domain among citations, or null. */
export function citationPosition(citations: string[], ourDomain: string | null): number | null {
  if (!ourDomain) return null;
  const target = ourDomain.toLowerCase();
  for (let i = 0; i < citations.length; i++) {
    const d = domainOf(citations[i]);
    if (d && (d === target || d.endsWith(`.${target}`))) return i + 1;
  }
  return null;
}

const NOISE_DOMAINS = new Set([
  "google.com",
  "facebook.com",
  "instagram.com",
  "x.com",
  "twitter.com",
  "linkedin.com",
  "youtube.com",
  "wikipedia.org",
  "reddit.com",
  "quora.com",
  "yelp.com",
  "tripadvisor.com",
  "nairaland.com",
]);

/** Cited domains that are not ours and not platforms/directories. */
export function competitorDomains(citations: string[], ourDomain: string | null): string[] {
  const out: string[] = [];
  for (const c of citations) {
    const d = domainOf(c);
    if (!d) continue;
    if (ourDomain && (d === ourDomain || d.endsWith(`.${ourDomain}`))) continue;
    if (NOISE_DOMAINS.has(d)) continue;
    if (!out.includes(d)) out.push(d);
  }
  return out;
}

/** Up to ~300 characters around the first mention, or the start of the answer. */
export function excerptAround(text: string, ours: DetectionInput, width = 300): string | null {
  const t = clean(text);
  if (!t) return null;
  const needles = [ours.domain, ours.name].map(clean).filter((n) => n.length >= 3);
  let idx = -1;
  for (const n of needles) {
    idx = t.toLowerCase().indexOf(n.toLowerCase());
    if (idx >= 0) break;
  }
  if (idx < 0) return t.slice(0, width);
  const start = Math.max(0, idx - Math.floor(width / 3));
  return t.slice(start, start + width);
}

export function detect(answer: EngineAnswer, ours: DetectionInput): Detection {
  const position = citationPosition(answer.citations, ours.domain);
  return {
    mentioned: detectMention(answer.text, ours),
    cited: position !== null,
    position,
    competitors: competitorDomains(answer.citations, ours.domain),
    excerpt: excerptAround(answer.text, ours),
  };
}

// ---------------------------------------------------------------------------
// Check one project
// ---------------------------------------------------------------------------

export interface CheckResult {
  ok: boolean;
  reason?: string;
  asked: number;
  mentioned: number;
  cited: number;
  engines: EngineName[];
}

async function askedToday(db: Db, projectId: string, now: Date): Promise<number> {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const { count } = await db
    .from("ai_visibility_checks")
    .select("id", { count: "exact", head: true })
    .eq("project_id", projectId)
    .gte("asked_at", dayStart.toISOString());
  return count ?? 0;
}

/**
 * Ask every available engine the project's money questions and store one
 * ai_visibility_checks row per question per engine. Capped at
 * DAILY_QUESTION_CAP rows per project per day across engines.
 */
export async function checkVisibility(
  projectId: string,
  opts: { db?: Db; engines?: AnswerEngine[]; now?: Date; cap?: number } = {}
): Promise<CheckResult> {
  const db = opts.db ?? createServiceClient();
  const engines = (opts.engines ?? availableEngines()).filter((e) => e.available);
  const now = opts.now ?? new Date();
  const cap = opts.cap ?? DAILY_QUESTION_CAP;

  if (engines.length === 0) {
    return {
      ok: false,
      reason: "No answer engine is configured. Add PERPLEXITY_API_KEY to start checking.",
      asked: 0,
      mentioned: 0,
      cited: 0,
      engines: [],
    };
  }

  const { data: project } = await db
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle();
  if (!project) {
    return { ok: false, reason: "Project not found", asked: 0, mentioned: 0, cited: 0, engines: [] };
  }

  const facts = project as ProjectFacts & { website_url?: string | null };
  const ours: DetectionInput = {
    name: facts.name ?? null,
    domain: domainOf(facts.website_url),
  };
  const questions = buildMoneyQuestions(facts);
  if (questions.length === 0) {
    return {
      ok: false,
      reason: "The project needs a name, what it offers and where it works before it can be checked.",
      asked: 0,
      mentioned: 0,
      cited: 0,
      engines: engines.map((e) => e.name),
    };
  }

  let budget = cap - (await askedToday(db, projectId, now));
  if (budget <= 0) {
    return {
      ok: true,
      reason: "Daily question limit reached",
      asked: 0,
      mentioned: 0,
      cited: 0,
      engines: engines.map((e) => e.name),
    };
  }

  let asked = 0;
  let mentioned = 0;
  let cited = 0;

  outer: for (const question of questions) {
    for (const engine of engines) {
      if (budget <= 0) break outer;
      budget--;
      let answer: EngineAnswer;
      try {
        answer = await engine.ask(question);
      } catch (err) {
        console.warn(`[ai-visibility] ${engine.name} failed for "${question}":`, err instanceof Error ? err.message : err);
        continue;
      }
      const d = detect(answer, ours);
      asked++;
      if (d.mentioned) mentioned++;
      if (d.cited) cited++;
      const { error } = await db.from("ai_visibility_checks").insert({
        project_id: projectId,
        engine: engine.name,
        question,
        asked_at: now.toISOString(),
        mentioned: d.mentioned,
        cited: d.cited,
        position: d.position,
        competitors_mentioned: d.competitors,
        answer_excerpt: d.excerpt,
        raw: { citations: answer.citations },
      });
      if (error) console.error("[ai-visibility] insert failed:", error.message);
    }
  }

  return { ok: true, asked, mentioned, cited, engines: engines.map((e) => e.name) };
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

export interface VisibilityQuestionRow {
  question: string;
  engine: EngineName;
  askedAt: string;
  mentioned: boolean;
  cited: boolean;
  competitors: string[];
  excerpt: string | null;
}

export interface VisibilitySummary {
  configured: boolean;
  checkedQuestions: number;
  mentionedCount: number;
  citedCount: number;
  lastCheckedAt: string | null;
  /** Latest result per (question, engine). */
  questions: VisibilityQuestionRow[];
  /** Domains that keep showing up where we do not, most frequent first. */
  topCompetitors: Array<{ domain: string; count: number }>;
}

export async function getVisibilitySummary(
  db: Db,
  projectId: string,
  days = 14
): Promise<VisibilitySummary> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const { data } = await db
    .from("ai_visibility_checks")
    .select("question, engine, asked_at, mentioned, cited, competitors_mentioned, answer_excerpt")
    .eq("project_id", projectId)
    .gte("asked_at", since)
    .order("asked_at", { ascending: false })
    .limit(500);

  const rows = (data ?? []) as Array<{
    question: string;
    engine: EngineName;
    asked_at: string;
    mentioned: boolean;
    cited: boolean;
    competitors_mentioned: string[] | null;
    answer_excerpt: string | null;
  }>;

  const latest = new Map<string, VisibilityQuestionRow>();
  const competitorCounts = new Map<string, number>();
  for (const r of rows) {
    const key = `${r.engine}|${r.question.toLowerCase()}`;
    if (!latest.has(key)) {
      latest.set(key, {
        question: r.question,
        engine: r.engine,
        askedAt: r.asked_at,
        mentioned: r.mentioned,
        cited: r.cited,
        competitors: r.competitors_mentioned ?? [],
        excerpt: r.answer_excerpt,
      });
      if (!r.mentioned && !r.cited) {
        for (const c of r.competitors_mentioned ?? []) {
          competitorCounts.set(c, (competitorCounts.get(c) ?? 0) + 1);
        }
      }
    }
  }

  const questions = Array.from(latest.values());
  return {
    configured: availableEngines().length > 0,
    checkedQuestions: questions.length,
    mentionedCount: questions.filter((q) => q.mentioned).length,
    citedCount: questions.filter((q) => q.cited).length,
    lastCheckedAt: rows[0]?.asked_at ?? null,
    questions,
    topCompetitors: Array.from(competitorCounts.entries())
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5),
  };
}

/**
 * Plain-text block for the performance context: which questions the
 * business is missing from and who is answering them instead. Empty when
 * nothing has been checked.
 */
export async function visibilitySummaryForPrompt(db: Db, projectId: string): Promise<string> {
  let s: VisibilitySummary;
  try {
    s = await getVisibilitySummary(db, projectId);
  } catch {
    return "";
  }
  if (s.checkedQuestions === 0) return "";

  const lost = s.questions.filter((q) => !q.mentioned && !q.cited);
  const won = s.questions.filter((q) => q.mentioned || q.cited);
  const lines: string[] = [];
  lines.push("### Found by AI answers (last 14 days)");
  lines.push(
    `- ${s.mentionedCount} of ${s.checkedQuestions} questions name the business; ${s.citedCount} cite its website.`
  );
  if (lost.length > 0) {
    lines.push("- Questions where the business is missing from the answer (write for these first):");
    for (const q of lost.slice(0, 8)) {
      const who = q.competitors.length > 0 ? ` answered with ${q.competitors.slice(0, 3).join(", ")}` : "";
      lines.push(`  - "${q.question}" (${q.engine})${who}`);
    }
  }
  if (won.length > 0) {
    lines.push("- Questions already won:");
    for (const q of won.slice(0, 4)) lines.push(`  - "${q.question}" (${q.engine})`);
  }
  if (s.topCompetitors.length > 0) {
    lines.push(
      `- Most frequent names in answers instead of us: ${s.topCompetitors.map((c) => `${c.domain} (${c.count})`).join(", ")}`
    );
  }
  return lines.join("\n");
}
