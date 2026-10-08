import { getUserDetail } from "@/src/lib/admin/queries";
import Link from "next/link";
import { ArrowLeft } from "@/src/components/ui/lucide-icons";
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
          className="hover-link mb-4 inline-flex items-center gap-1.5 text-body-s text-text-3 hover:text-text"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to users
        </Link>
        <h1 className="text-display-s text-text">
          {profile.full_name ?? "Unnamed user"}
        </h1>
        <p className="mt-1 text-body text-text-2">
          {profile.email}{" "}
          <span className="mx-1 text-text-3" aria-hidden>·</span>{" "}
          <span className="font-mono text-body-s text-text-3">{profile.id}</span>
        </p>
      </div>

      {/* Profile info cards */}
      <div className="grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <InfoCard label="Plan" value={profile.plan ?? "free"} />
        <InfoCard label="Pieces of content" value={String(profile.generation_count ?? 0)} />
        <InfoCard label="Projects" value={String(projects.length)} />
        <InfoCard label="Role" value={profile.role ?? "user"} />
        <InfoCard label="Signed up" value={new Date(profile.created_at).toLocaleDateString()} />
        <InfoCard label="Last sign in" value={profile.lastSignIn ? new Date(profile.lastSignIn).toLocaleDateString() : "Never"} />
      </div>

      {/* Admin actions */}
      <UserActions userId={profile.id} currentPlan={profile.plan ?? "free"} />

      {/* Projects */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">
          Projects ({projects.length})
        </h2>
        {projects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-label text-text-3 pb-3 pr-4">Name</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Website</th>
                  <th className="text-label text-text-3 pb-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 text-body text-text">
                      {p.name}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                      {p.website_url ?? "Not set"}
                    </td>
                    <td className="py-3 text-body-s text-text-2">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-3">No projects yet.</p>
        )}
      </div>

      {/* Generation history */}
      <div className="rounded-lg border border-line bg-surface p-6">
        <h2 className="mb-4 text-title text-text">
          Content history ({generations.length})
        </h2>
        {generations.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="text-label text-text-3 pb-3 pr-4">Agent</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Model</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Tokens</th>
                  <th className="text-label text-text-3 pb-3 pr-4">Duration</th>
                  <th className="text-label text-text-3 pb-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {generations.map((g) => (
                  <tr key={g.id} className="border-b border-line last:border-0">
                    <td className="py-3 pr-4 text-body text-text capitalize">
                      {(g.agent_used ?? "unknown").replace(/-/g, " ")}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                      {g.model}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                      {((g.input_tokens ?? 0) + (g.output_tokens ?? 0)).toLocaleString()}
                    </td>
                    <td className="py-3 pr-4 font-mono text-body-s text-text-2">
                      {g.duration_ms ? `${(g.duration_ms / 1000).toFixed(1)}s` : "Not recorded"}
                    </td>
                    <td className="py-3 text-body-s text-text-2">
                      {new Date(g.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body text-text-3">No pieces of content yet.</p>
        )}
      </div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface p-5">
      <p className="mb-2 text-label text-text-3">{label}</p>
      <p className="text-numeric text-[1.25rem] capitalize text-text">
        {value}
      </p>
    </div>
  );
}
