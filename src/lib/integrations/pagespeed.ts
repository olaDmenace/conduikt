// Google PageSpeed Insights API v5 — https://developers.google.com/speed/docs/insights/v5/get-started
// Free tier: 25,000 requests/day, 400 QPS. No billing required.

const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

export type PageSpeedStrategy = "mobile" | "desktop";

export interface PageSpeedMetrics {
  strategy: PageSpeedStrategy;
  performanceScore: number | null; // 0-100
  seoScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  lcp: string | null; // Largest Contentful Paint
  fcp: string | null; // First Contentful Paint
  cls: string | null; // Cumulative Layout Shift
  inp: string | null; // Interaction to Next Paint
  tbt: string | null; // Total Blocking Time
  speedIndex: string | null;
  opportunities: Array<{
    id: string;
    title: string;
    description: string;
    savingsMs: number;
  }>;
}

interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  displayValue?: string;
  score: number | null;
  details?: {
    overallSavingsMs?: number;
  };
}

interface LighthouseCategory {
  score: number | null;
}

interface LighthouseResult {
  categories: {
    performance?: LighthouseCategory;
    seo?: LighthouseCategory;
    accessibility?: LighthouseCategory;
    "best-practices"?: LighthouseCategory;
  };
  audits: Record<string, LighthouseAudit>;
}

interface PsiResponse {
  lighthouseResult?: LighthouseResult;
  error?: { message?: string };
}

function auditValue(audit?: LighthouseAudit): string | null {
  return audit?.displayValue ?? null;
}

function toScore(cat?: LighthouseCategory): number | null {
  if (!cat || cat.score == null) return null;
  return Math.round(cat.score * 100);
}

export async function fetchPageSpeed(
  url: string,
  strategy: PageSpeedStrategy
): Promise<PageSpeedMetrics | null> {
  const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY;
  if (!apiKey) return null;

  const params = new URLSearchParams({ url, strategy, key: apiKey });
  // PSI API requires repeated `category` params, not comma-separated
  for (const cat of ["performance", "seo", "accessibility", "best-practices"]) {
    params.append("category", cat);
  }

  const endpoint = `${PSI_ENDPOINT}?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const json: PsiResponse = await res.json();
    if (json.error) return null;

    const lhr = json.lighthouseResult;
    if (!lhr) return null;

    const opportunities = Object.values(lhr.audits)
      .filter(
        (a) =>
          a.details?.overallSavingsMs &&
          a.details.overallSavingsMs > 0 &&
          a.score !== null &&
          a.score < 0.9
      )
      .map((a) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        savingsMs: Math.round(a.details!.overallSavingsMs!),
      }))
      .sort((a, b) => b.savingsMs - a.savingsMs)
      .slice(0, 5);

    const metrics: PageSpeedMetrics = {
      strategy,
      performanceScore: toScore(lhr.categories.performance),
      seoScore: toScore(lhr.categories.seo),
      accessibilityScore: toScore(lhr.categories.accessibility),
      bestPracticesScore: toScore(lhr.categories["best-practices"]),
      lcp: auditValue(lhr.audits["largest-contentful-paint"]),
      fcp: auditValue(lhr.audits["first-contentful-paint"]),
      cls: auditValue(lhr.audits["cumulative-layout-shift"]),
      inp: auditValue(lhr.audits["interaction-to-next-paint"]),
      tbt: auditValue(lhr.audits["total-blocking-time"]),
      speedIndex: auditValue(lhr.audits["speed-index"]),
      opportunities,
    };

    return metrics;
  } catch {
    return null;
  }
}

export async function fetchPageSpeedBoth(url: string): Promise<{
  mobile: PageSpeedMetrics | null;
  desktop: PageSpeedMetrics | null;
}> {
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeed(url, "mobile"),
    fetchPageSpeed(url, "desktop"),
  ]);
  return { mobile, desktop };
}

export function formatPageSpeedForPrompt(
  mobile: PageSpeedMetrics | null,
  desktop: PageSpeedMetrics | null
): string {
  if (!mobile && !desktop) return "PageSpeed data unavailable.";
  const lines: string[] = [];
  for (const m of [mobile, desktop]) {
    if (!m) continue;
    lines.push(
      `${m.strategy.toUpperCase()}: perf=${m.performanceScore ?? "?"}, seo=${m.seoScore ?? "?"}, a11y=${m.accessibilityScore ?? "?"}, bp=${m.bestPracticesScore ?? "?"}, LCP=${m.lcp ?? "?"}, FCP=${m.fcp ?? "?"}, CLS=${m.cls ?? "?"}, TBT=${m.tbt ?? "?"}`
    );
    if (m.opportunities.length) {
      lines.push(
        `  Top opportunities: ${m.opportunities.map((o) => `${o.title} (save ${o.savingsMs}ms)`).join("; ")}`
      );
    }
  }
  return lines.join("\n");
}
