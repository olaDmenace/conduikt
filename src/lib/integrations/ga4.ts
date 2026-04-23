export interface Ga4Metric {
  metric: string;
  value: number;
}

export interface Ga4TopPage {
  pagePath: string;
  pageViews: number;
  sessions: number;
  engagementRate: number;
}

export interface Ga4TopSource {
  source: string;
  medium: string;
  sessions: number;
}

export interface Ga4Summary {
  totals: {
    activeUsers: number;
    sessions: number;
    screenPageViews: number;
    averageSessionDuration: number;
    engagementRate: number;
    conversions: number;
  };
  topPages: Ga4TopPage[];
  topSources: Ga4TopSource[];
}

interface RunReportRow {
  dimensionValues: { value: string }[];
  metricValues: { value: string }[];
}

async function runReport(
  propertyName: string,
  accessToken: string,
  body: unknown
): Promise<{ rows: RunReportRow[] }> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/${propertyName}:runReport`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`GA4 runReport error ${res.status}: ${err}`);
  }
  const data = await res.json();
  return { rows: data.rows ?? [] };
}

export async function fetchGa4Summary(
  propertyName: string,
  accessToken: string,
  days = 28
): Promise<Ga4Summary> {
  const dateRange = { startDate: `${days}daysAgo`, endDate: "today" };

  const [totalsReport, pagesReport, sourcesReport] = await Promise.all([
    runReport(propertyName, accessToken, {
      dateRanges: [dateRange],
      metrics: [
        { name: "activeUsers" },
        { name: "sessions" },
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "engagementRate" },
        { name: "conversions" },
      ],
    }),
    runReport(propertyName, accessToken, {
      dateRanges: [dateRange],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "sessions" },
        { name: "engagementRate" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: "10",
    }),
    runReport(propertyName, accessToken, {
      dateRanges: [dateRange],
      dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }],
      metrics: [{ name: "sessions" }],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: "10",
    }),
  ]);

  const t = totalsReport.rows[0]?.metricValues ?? [];
  const totals = {
    activeUsers: parseInt(t[0]?.value ?? "0", 10),
    sessions: parseInt(t[1]?.value ?? "0", 10),
    screenPageViews: parseInt(t[2]?.value ?? "0", 10),
    averageSessionDuration: parseFloat(t[3]?.value ?? "0"),
    engagementRate: parseFloat(t[4]?.value ?? "0"),
    conversions: parseFloat(t[5]?.value ?? "0"),
  };

  const topPages = pagesReport.rows.map((row) => ({
    pagePath: row.dimensionValues[0]?.value ?? "",
    pageViews: parseInt(row.metricValues[0]?.value ?? "0", 10),
    sessions: parseInt(row.metricValues[1]?.value ?? "0", 10),
    engagementRate: parseFloat(row.metricValues[2]?.value ?? "0"),
  }));

  const topSources = sourcesReport.rows.map((row) => ({
    source: row.dimensionValues[0]?.value ?? "",
    medium: row.dimensionValues[1]?.value ?? "",
    sessions: parseInt(row.metricValues[0]?.value ?? "0", 10),
  }));

  return { totals, topPages, topSources };
}
