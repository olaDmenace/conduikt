// The "Builder" step: one search phrase in, one page JSON out, via the
// Missing Page agent. The Claude call is injectable so the orchestration
// test never touches the network.

import { z } from "zod";
import { generateWithClaude, type GenerationResult } from "@/src/lib/ai/client";
import { getAgent } from "@/src/lib/ai/agents";
import type { ProjectContext } from "@/src/lib/ai/agents/types";
import type { CandidateKind, MissingPageContent, ProjectFacts } from "./types";

const pageSchema = z.object({
  title: z.string().min(1),
  metaDescription: z.string().min(1),
  h1: z.string().min(1),
  entitySentence: z.string().default(""),
  answer: z.string().min(1),
  sections: z.array(z.object({ heading: z.string().min(1), body: z.string().min(1) })).min(1),
  faq: z.array(z.object({ q: z.string().min(1), a: z.string().min(1) })).default([]),
  cta: z.object({ label: z.string().min(1), href: z.string().min(1) }),
  updatedOn: z.string().default(""),
  changes: z.array(z.string()).optional(),
});

export type GenerateFn = (args: { systemPrompt: string; userPrompt: string; maxTokens?: number; temperature?: number }) => Promise<GenerationResult>;

export interface BuildInput {
  facts: ProjectFacts;
  query: string;
  kind: CandidateKind;
  /** For 'update': the page being revised. */
  existingPage?: { url: string; title: string | null; text: string } | null;
  /** The team's direction (projects.positioning_statement), if any. */
  direction?: string | null;
  today?: string;
  generate?: GenerateFn;
}

export interface BuildResult {
  page: MissingPageContent;
  usage: { inputTokens: number; outputTokens: number; model: string; durationMs: number };
}

export function factsToContext(facts: ProjectFacts, direction?: string | null): ProjectContext {
  return {
    name: facts.name,
    websiteUrl: facts.websiteUrl ?? "",
    description: facts.description ?? facts.valueProposition ?? undefined,
    industry: facts.category ?? undefined,
    targetAudience: facts.audience.length ? { personas: facts.audience, pain_points: [] } : undefined,
    valueProposition: facts.valueProposition ?? undefined,
    competitors: facts.competitors.map((name) => ({ name, url: "", strengths: [] })),
    direction: direction ?? undefined,
  };
}

/** Strip exclamation marks and emoji the model may have slipped in. */
export function tidyText(s: string): string {
  return s
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/!+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function normalisePage(raw: unknown, today: string): MissingPageContent {
  const p = pageSchema.parse(raw);
  const updatedOn = /^\d{4}-\d{2}-\d{2}$/.test(p.updatedOn) ? p.updatedOn : today;
  return {
    title: tidyText(p.title).slice(0, 70),
    metaDescription: tidyText(p.metaDescription).slice(0, 160),
    h1: tidyText(p.h1).slice(0, 90),
    entitySentence: tidyText(p.entitySentence),
    answer: tidyText(p.answer),
    sections: p.sections.map((s) => ({ heading: tidyText(s.heading), body: tidyText(s.body) })),
    faq: p.faq.slice(0, 5).map((f) => ({ q: tidyText(f.q), a: tidyText(f.a) })),
    cta: { label: tidyText(p.cta.label).slice(0, 40), href: p.cta.href.trim() },
    updatedOn,
    ...(p.changes && p.changes.length ? { changes: p.changes.slice(0, 3).map(tidyText) } : {}),
  };
}

export async function buildMissingPage(input: BuildInput): Promise<BuildResult> {
  const agent = getAgent("missing-page");
  if (!agent) throw new Error("missing-page agent is not registered");
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const generate: GenerateFn = input.generate ?? ((args) => generateWithClaude({ ...args, model: agent.model }));

  const systemPrompt = agent.buildSystemPrompt(factsToContext(input.facts, input.direction));
  const userPrompt = agent.buildUserPrompt({
    query: input.query,
    kind: input.kind,
    today,
    facts: {
      services: input.facts.services,
      location: input.facts.location,
      phone: input.facts.phone ?? null,
      email: input.facts.email ?? null,
      category: input.facts.category,
      competitors: input.facts.competitors,
    },
    existingPage: input.kind === "update" ? input.existingPage ?? null : null,
  });

  const result = await generate({ systemPrompt, userPrompt, maxTokens: agent.maxTokens, temperature: 0.7 });
  const parsed = agent.parseResponse(result.content);
  const page = normalisePage(parsed.data, today);
  return {
    page,
    usage: { inputTokens: result.inputTokens, outputTokens: result.outputTokens, model: result.model, durationMs: result.durationMs },
  };
}
