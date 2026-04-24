"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Loader2,
  Trash2,
  Mail,
  Shield,
  Eye,
  Crown,
} from "lucide-react";
import { Card, CardContent } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { PageHeader } from "@/src/components/layout/page-header";
import { useToast } from "@/src/components/ui/toast";

interface TeamMember {
  id: string;
  user_id: string | null;
  role: string;
  invite_email: string | null;
  created_at: string;
  profiles: { full_name: string | null; avatar_url: string | null } | null;
}

const roleConfig: Record<
  string,
  { icon: typeof Crown; label: string; variant: "default" | "success" | "warning" | "info" }
> = {
  owner: { icon: Crown, label: "Owner", variant: "warning" },
  admin: { icon: Shield, label: "Admin", variant: "success" },
  member: { icon: Users, label: "Member", variant: "info" },
  viewer: { icon: Eye, label: "Viewer", variant: "default" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    const res = await fetch("/api/team", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setInviting(true);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });

    if (res.ok) {
      const newMember = await res.json();
      toast("Invite sent successfully!", "success");
      setEmail("");
      // Optimistic append so the pending invite shows immediately,
      // even if /api/team returns a stale/cached result.
      setMembers((prev) => {
        if (prev.some((m) => m.id === newMember.id)) return prev;
        return [
          ...prev,
          {
            id: newMember.id,
            user_id: newMember.user_id ?? null,
            role: newMember.role,
            invite_email: newMember.invite_email ?? null,
            created_at: newMember.created_at,
            profiles: null,
          } satisfies TeamMember,
        ];
      });
      fetchMembers();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to send invite", "error");
    }
    setInviting(false);
  }

  async function handleRevoke(memberId: string) {
    const res = await fetch("/api/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });

    if (res.ok) {
      toast("Member removed", "success");
      fetchMembers();
    } else {
      const err = await res.json();
      toast(err.error || "Failed to remove member", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite members and manage access"
      />

      {/* Invite Form */}
      <Card className="mb-8 animate-in">
        <CardContent>
          <h3 className="text-h3 text-text-primary mb-4">Invite a team member</h3>
          <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
              <input
                type="email"
                placeholder="colleague@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-border-default bg-surface-1 py-2.5 pl-10 pr-4 text-[0.875rem] text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-glow)]"
              />
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="rounded-lg border border-border-default bg-surface-1 px-4 py-2.5 text-[0.875rem] text-text-primary transition-colors focus:border-accent focus:outline-none appearance-none cursor-pointer"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
            <Button type="submit" size="sm" disabled={inviting} className="shrink-0">
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {inviting ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Members List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-accent animate-spin" />
        </div>
      ) : members.length === 0 ? (
        <Card className="border-dashed border-border-strong animate-in" style={{ animationDelay: "60ms" }}>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 rounded-xl bg-accent-muted p-4">
              <Users className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-h2 text-text-primary">No team members yet</h3>
            <p className="mt-2 max-w-md text-body text-text-secondary">
              Invite your first team member to start collaborating on
              campaigns, content, and audits together.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {members.map((member, i) => {
            const config = roleConfig[member.role] || roleConfig.viewer;
            const RoleIcon = config.icon;
            const displayName =
              member.profiles?.full_name ||
              member.invite_email ||
              "Unknown";
            const isPending = !member.user_id;
            const initials = displayName
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase();

            return (
              <Card
                key={member.id}
                className="animate-in"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-[0.75rem] font-medium text-text-secondary shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-text-primary truncate">
                      {displayName}
                    </p>
                    {member.invite_email && member.profiles?.full_name && (
                      <p className="text-small text-text-tertiary truncate">
                        {member.invite_email}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={config.variant}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    {isPending && (
                      <Badge variant="warning">Pending</Badge>
                    )}
                    {member.role !== "owner" && (
                      <button
                        onClick={() => handleRevoke(member.id)}
                        className="rounded-lg p-2 text-text-tertiary hover:text-error hover:bg-error/10 transition-colors"
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
