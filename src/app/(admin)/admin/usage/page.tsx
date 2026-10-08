import { Badge } from "@/src/components/ui/badge";
import { getUsageData } from "@/src/lib/admin/queries";

export const dynamic = "force-dynamic";

export default async function AdminUsagePage() {
  const {
    totalCost,
    totalInputTokens,
    totalOutputTokens,
    totalGenerations,
    modelStats,
    projectUsage,
    auditedSites,
  } = await getUsageData();

  // Unique audited URLs
  const uniqueAudits = new Map<string, typeof auditedSites[number]>();
  auditedSites.forEach((a) => {
    const key = `${a.project_id}-${a.url}`;
    if (!uniqueAudits.has(key) || new Date(a.created_at) > new Date(uniqueAudits.get(key)!.created_at)) {
      uniqueAudits.set(key, a);
    }
  });
  const latestAudits = [...uniqueAudits.values()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display-s text-text">Usage and costs</h1>
        <p className="mt-1 text-body text-text-2">
          Resource consumption and estimated API costs across the platform
        </p>
      </div>

      {/* Cost overview cards */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <CostCard
          label="Estimated total cost"
          value={`$${totalCost.toFixed(2)}`}
          sub="all time"
          highlight
        />
        <CostCard
          label="Pieces of content"
          value={totalGenerations.toLocaleString()}
          sub="API calls"
        />
        <CostCard
          label="Input tokens"
          value={formatTokens(totalInputTokens)}
          sub={`~$${((totalInputTokens * 3) / 1_000_000).toFixed(2)}`}
        />
        <CostCard
          label="Output tokens"
          value={formatTokens(totalOutputTokens)}
          sub={`~$${((totalOutputTokens * 15) / 1_000_000).toFixed(2)}`}
        />
      </div>

      {/* Cost by model */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">Cost by model</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="text-label text-text-3 pb-3 pr-4">Model</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Calls</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Input tokens</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Output tokens</th>
                <th className="text-label text-text-3 pb-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(modelStats)
                .sort(([, a], [, b]) => b.cost - a.cost)
                .map(([model, stats]) => (
                  <tr key={model} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 font-mono text-body-s text-text">{model}</td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2 text-right">
                      {stats.count}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2 text-right">
                      {stats.inputTokens.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2 text-right">
                      {stats.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-mono text-body-s font-medium text-text">
                      ${stats.cost.toFixed(3)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-project breakdown */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">
          Cost by project ({projectUsage.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="text-label text-text-3 pb-3 pr-4">Project</th>
                <th className="text-label text-text-3 pb-3 pr-4">Website</th>
                <th className="text-label text-text-3 pb-3 pr-4">Owner</th>
                <th className="text-label text-text-3 pb-3 pr-4">Agents used</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Pieces of content</th>
                <th className="text-label text-text-3 pb-3 pr-4 text-right">Tokens</th>
                <th className="text-label text-text-3 pb-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {projectUsage.map((pu) => {
                const agentList = Object.entries(pu.agents)
                  .sort(([, a], [, b]) => b - a)
                  .map(([agent, count]) => `${agent.replace(/-/g, " ")} (${count})`)
                  .join(", ");

                return (
                  <tr
                    key={pu.projectId}
                    className="border-b border-line transition-colors duration-[var(--duration-fast)] last:border-0 hover:bg-surface-2"
                  >
                    <td className="py-3 pr-4 text-body font-medium text-text">
                      {pu.projectName}
                    </td>
                    <td className="py-3 pr-4 text-body-s text-text-2 font-mono max-w-[180px] truncate">
                      {pu.websiteUrl ?? "Not set"}
                    </td>
                    <td className="py-3 pr-4 text-body-s text-text-2">
                      {pu.ownerName}
                    </td>
                    <td className="py-3 pr-4 max-w-[250px]">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(pu.agents)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 4)
                          .map(([agent, count]) => (
                            <Badge key={agent} variant="secondary" className="normal-case">
                              {agent.replace(/-/g, " ")} x{count}
                            </Badge>
                          ))}
                        {Object.keys(pu.agents).length > 4 && (
                          <span className="text-caption text-text-3">
                            +{Object.keys(pu.agents).length - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2 text-right">
                      {pu.generationCount}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2 text-right">
                      {formatTokens(pu.inputTokens + pu.outputTokens)}
                    </td>
                    <td className="py-3 text-right font-mono text-body-s font-medium text-text">
                      ${pu.cost.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
              {projectUsage.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-body text-text-3">
                    No usage data yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audited websites */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">
          Audited websites ({latestAudits.length})
        </h2>
        {latestAudits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-label text-text-3 pb-3 pr-4">URL</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Project</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Type</th>
                  <th className="text-label text-text-3 pb-3 pr-4 text-right">Score</th>
                  <th className="text-label text-text-3 pb-3">Last audited</th>
                </tr>
              </thead>
              <tbody>
                {latestAudits.map((audit) => (
                  <tr
                    key={audit.id}
                    className="border-b border-line transition-colors duration-[var(--duration-fast)] last:border-0 hover:bg-surface-2"
                  >
                    <td className="py-3 pr-4 text-body-s text-text font-mono max-w-[300px] truncate">
                      {audit.url}
                    </td>
                    <td className="py-3 pr-4 text-body-s text-text-2">
                      {audit.projectName}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary">{audit.type}</Badge>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {audit.score != null ? (
                        <span
                          className={`font-mono text-body-s font-medium ${
                            audit.score >= 80
                              ? "text-teal"
                              : audit.score >= 50
                                ? "text-accent"
                                : "text-danger"
                          }`}
                        >
                          {audit.score}/100
                        </span>
                      ) : (
                        <span className="text-body-s text-text-3">No score</span>
                      )}
                    </td>
                    <td className="py-3 text-body-s text-text-2">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-3">No audits performed yet.</p>
        )}
      </div>

      {/* Pricing note */}
      <div className="rounded-lg border border-line bg-ground px-4 py-3">
        <p className="text-body-s text-text-3">
          Cost estimates based on Anthropic API pricing: Sonnet $3/MTok input, $15/MTok output.
          Actual costs may vary with batching, caching, or plan discounts.
        </p>
      </div>
    </div>
  );
}

function CostCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={highlight ? "band-ink p-5" : "bg-surface p-5"}
    >
      <p className={`mb-2 text-label ${highlight ? "text-ink-text-3" : "text-text-3"}`}>{label}</p>
      <p
        className={`text-numeric text-[1.75rem] ${
          highlight ? "text-ink-text" : "text-text"
        }`}
      >
        {value}
      </p>
      <p className={`mt-1 text-caption ${highlight ? "text-ink-text-2" : "text-text-3"}`}>{sub}</p>
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}
