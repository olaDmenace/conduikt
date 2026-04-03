import { getUserDetail } from "@/src/lib/admin/queries";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { UserActions } from "./user-actions";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, projects, generations } = await getUserDetail(id);

  if (!profile) notFound();

  return (
    <div className="space-y-8">
      {/* Back link + header */}
      <div>
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-1.5 text-small text-text-tertiary hover:text-text-primary transition-colors mb-4"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to users
        </Link>
        <h1 className="text-h1 text-text-primary">
          {profile.full_name ?? "Unnamed User"}
        </h1>
        <p className="text-body text-text-secondary mt-1">
          {profile.email}{" "}
          <span className="text-text-tertiary mx-1">|</span>{" "}
          <span className="font-mono text-small text-text-tertiary">{profile.id}</span>
        </p>
      </div>

      {/* Profile info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <InfoCard label="Plan" value={profile.plan ?? "free"} />
        <InfoCard label="Generations" value={String(profile.generation_count ?? 0)} />
        <InfoCard label="Projects" value={String(projects.length)} />
        <InfoCard label="Role" value={profile.role ?? "user"} />
        <InfoCard label="Signed Up" value={new Date(profile.created_at).toLocaleDateString()} />
        <InfoCard label="Last Sign In" value={profile.lastSignIn ? new Date(profile.lastSignIn).toLocaleDateString() : "Never"} />
      </div>

      {/* Admin actions */}
      <UserActions userId={profile.id} currentPlan={profile.plan ?? "free"} />

      {/* Projects */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">
          Projects ({projects.length})
        </h2>
        {projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Name</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Website</th>
                  <th className="text-caption text-text-tertiary pb-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-border-subtle last:border-0">
                    <td className="py-3 pr-4 text-body text-text-primary">
                      {p.name}
                    </td>
                    <td className="py-3 pr-4 text-small text-text-secondary font-mono">
                      {p.website_url ?? "--"}
                    </td>
                    <td className="py-3 text-small text-text-secondary">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-tertiary">No projects</p>
        )}
      </div>

      {/* Generation history */}
      <div className="rounded-xl border border-border-default bg-surface-1 p-6">
        <h2 className="text-h3 text-text-primary mb-4">
          Generation History ({generations.length})
        </h2>
        {generations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Agent</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Model</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Tokens</th>
                  <th className="text-caption text-text-tertiary pb-3 pr-4">Duration</th>
                  <th className="text-caption text-text-tertiary pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.id} className="border-b border-border-subtle last:border-0">
                    <td className="py-3 pr-4 text-body text-text-primary capitalize">
                      {(g.agent_used ?? "unknown").replace(/-/g, " ")}
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary">
                      {g.model}
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary">
                      {((g.input_tokens ?? 0) + (g.output_tokens ?? 0)).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 text-data text-text-secondary">
                      {g.duration_ms ? `${(g.duration_ms / 1000).toFixed(1)}s` : "--"}
                    </td>
                    <td className="py-3 text-small text-text-secondary">
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-tertiary">No generations</p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border-default bg-surface-1 p-5">
      <p className="text-caption text-text-tertiary mb-1">{label}</p>
      <p className="text-[1.25rem] font-semibold text-text-primary capitalize">
        {value}
      </p>
    </div>
  );
}
