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
        <h1 className="text-h1 text-text-primary">Usage & Costs</h1>
        <p className="text-body text-text-secondary mt-1">
          Resource consumption and estimated API costs across the platform
        </p>
      </div>

      {/* Cost overview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <CostCard
          label="Estimated Total Cost"
          value={`$${totalCost.toFixed(2)}`}
          sub="all time"
          highlight
        />
        <CostCard
          label="Total Generations"
          value={totalGenerations.toLocaleString()}
          sub="API calls"
        />
        <CostCard
          label="Input Tokens"
          value={formatTokens(totalInputTokens)}
          sub={`~$${((totalInputTokens * 3) / 1_000_000).toFixed(2)}`}
        />
        <CostCard
          label="Output Tokens"
          value={formatTokens(totalOutputTokens)}
          sub={`~$${((totalOutputTokens * 15) / 1_000_000).toFixed(2)}`}
        />
      </div>

      {/* Cost by model */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">Cost by Model</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Model</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Calls</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Input Tokens</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Output Tokens</th>
                <th className="text-caption text-text-tertiary pb-3 text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(modelStats)
                .sort(([, a], [, b]) => b.cost - a.cost)
                .map(([model, stats]) => (
                  <tr key={model} className="border-b border-border-subtle last:border-0">
                    <td className="py-3 pr-4 text-data text-text-primary">{model}</td>
                    <td className="py-3 pr-4 text-data text-text-secondary text-right">
                      {stats.count}
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary text-right">
                      {stats.inputTokens.toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary text-right">
                      {stats.outputTokens.toLocaleString()}
                    </td>
                    <td className="py-3 text-data text-accent text-right font-medium">
                      ${stats.cost.toFixed(3)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Per-project breakdown */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">
          Cost by Project ({projectUsage.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="text-caption text-text-tertiary pb-3 pr-4">Project</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Website</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Owner</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4">Agents Used</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Generations</th>
                <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Tokens</th>
                <th className="text-caption text-text-tertiary pb-3 text-right">Est. Cost</th>
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
                    className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="py-3 pr-4 text-body text-text-primary font-medium">
                      {pu.projectName}
                    </td>
                    <td className="py-3 pr-4 text-small text-text-secondary font-mono max-w-[180px] truncate">
                      {pu.websiteUrl ?? "--"}
                    </td>
                    <td className="py-3 pr-4 text-small text-text-secondary">
                      {pu.ownerName}
                    </td>
                    <td className="py-3 pr-4 max-w-[250px]">
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(pu.agents)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 4)
                          .map(([agent, count]) => (
                            <span
                              key={agent}
                              className="inline-block rounded-full bg-accent-muted px-2 py-0.5 text-[0.6875rem] font-medium text-accent whitespace-nowrap"
                            >
                              {agent.replace(/-/g, " ")} x{count}
                            </span>
                          ))}
                        {Object.keys(pu.agents).length > 4 && (
                          <span className="text-[0.6875rem] text-text-tertiary">
                            +{Object.keys(pu.agents).length - 4} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary text-right">
                      {pu.generationCount}
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary text-right">
                      {formatTokens(pu.inputTokens + pu.outputTokens)}
                    </td>
                    <td className="py-3 text-data text-accent text-right font-medium">
                      ${pu.cost.toFixed(3)}
                    </td>
                  </tr>
                );
              })}
              {projectUsage.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-tertiary text-body">
                    No usage data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Audited websites */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">
          Audited Websites ({latestAudits.length})
        </h2>
        {latestAudits.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-caption text-text-tertiary pb-3 pr-4">URL</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Project</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Type</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4 text-right">Score</th>
                  <th className="text-caption text-text-tertiary pb-3">Last Audited</th>
                </tr>
              </thead>
              <tbody>
                {latestAudits.map((audit) => (
                  <tr
                    key={audit.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-surface-2/50 transition-colors"
                  >
                    <td className="py-3 pr-4 text-small text-text-primary font-mono max-w-[300px] truncate">
                      {audit.url}
                    </td>
                    <td className="py-3 pr-4 text-small text-text-secondary">
                      {audit.projectName}
                    </td>
                    <td className="py-3 pr-4">
                      <span className="inline-block rounded-full bg-surface-2 px-2.5 py-0.5 text-[0.75rem] font-medium text-text-secondary uppercase">
                        {audit.type}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      {audit.score != null ? (
                        <span
                          className={`text-data font-medium ${
                            audit.score >= 80
                              ? "text-success"
                              : audit.score >= 50
                                ? "text-warning"
                                : "text-error"
                          }`}
                        >
                          {audit.score}/100
                        </span>
                      ) : (
                        <span className="text-text-tertiary text-small">--</span>
                      )}
                    </td>
                    <td className="py-3 text-small text-text-secondary">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-tertiary">No audits performed yet</p>
        )}
      </div>

      {/* Pricing note */}
      <div className="rounded-lg border border-border-subtle bg-surface-0/50 px-4 py-3">
        <p className="text-small text-text-tertiary">
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
      className={`rounded-xl border p-5 ${
        highlight
          ? "border-accent/30 bg-gradient-to-br from-surface-1 to-accent/5"
          : "border-border-default bg-surface-1"
      }`}
    >
      <p className="text-caption text-text-tertiary mb-1">{label}</p>
      <p
        className={`text-[1.75rem] font-semibold font-mono leading-none ${
          highlight ? "text-accent" : "text-text-primary"
        }`}
      >
        {value}
      </p>
      <p className="text-[0.75rem] text-text-tertiary mt-1">{sub}</p>
    </div>
  );
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens);
}
