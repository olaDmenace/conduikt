"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserPlus,
  Trash2,
  Mail,
  Shield,
  Eye,
  Crown,
  Send,
} from "@/src/components/ui/lucide-icons";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { Button, IconButton } from "@/src/components/ui/button";
import { Input, Field } from "@/src/components/ui/input";
import { Skeleton } from "@/src/components/ui/skeleton";
import { EmptyState } from "@/src/components/ui/empty-state";
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
  { icon: typeof Crown; label: string; variant: "default" | "secondary" | "success" | "warning" | "info" | "count" }
> = {
  owner: { icon: Crown, label: "Owner", variant: "count" },
  admin: { icon: Shield, label: "Admin", variant: "success" },
  member: { icon: Users, label: "Member", variant: "info" },
  viewer: { icon: Eye, label: "Viewer", variant: "secondary" },
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const { toast } = useToast();

  async function fetchMembers() {
    const res = await fetch("/api/team", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setMembers(Array.isArray(data) ? data : []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchMembers();
  }, []);

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
      if (newMember.email?.delivered) {
        toast("Invite sent. The email is on its way.", "success");
      } else {
        toast(
          `Invite saved, but email didn't send: ${newMember.email?.error ?? "unknown error"}`,
          "error"
        );
      }
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
      toast(err.error || "We couldn't send the invite. Try again.", "error");
    }
    setInviting(false);
  }

  async function handleResend(memberId: string) {
    setResendingId(memberId);
    const res = await fetch("/api/team/invite/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });

    const data = await res.json();
    if (res.ok) {
      if (data.email?.delivered) {
        toast("Invite sent again. The email is on its way.", "success");
      } else {
        toast(
          `Couldn't resend the invite: ${data.email?.error ?? "unknown error"}`,
          "error"
        );
      }
    } else {
      toast(data.error || "We couldn't resend the invite. Try again.", "error");
    }
    setResendingId(null);
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
      toast(err.error || "We couldn't remove that member. Try again.", "error");
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Invite people and choose what they can do."
      />

      {/* Invite form */}
      <Card className="mb-8 animate-in">
        <h2 className="mb-4 text-heading text-text">Invite a team member</h2>
        <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="relative flex-1">
            <Input
              label="Email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="pl-10"
            />
            <Mail className="pointer-events-none absolute bottom-3 left-3 h-4 w-4 text-text-3" aria-hidden />
          </div>
          <Field label="Role" htmlFor="invite-role">
            <select
              id="invite-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="h-10 cursor-pointer rounded-md border border-line-strong bg-surface px-3.5 text-[15px] text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <option value="admin">Admin</option>
              <option value="member">Member</option>
              <option value="viewer">Viewer</option>
            </select>
          </Field>
          <Button type="submit" disabled={inviting} className="h-10 shrink-0">
            {!inviting && <UserPlus className="h-4 w-4" />}
            {inviting ? "Sending…" : "Send invite"}
          </Button>
        </form>
      </Card>

      {/* Members list */}
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading team members">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-line bg-surface p-4 md:p-6">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
            </div>
          ))}
        </div>
      ) : members.length === 0 ? (
        <EmptyState
          className="animate-in"
          icon={<Users className="h-8 w-8" />}
          title="No team members yet. Invite someone above to work on campaigns, content and audits together."
        />
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
                className="animate-in flex flex-wrap items-center gap-4"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-2 font-mono text-caption font-medium text-text-2"
                  aria-hidden
                >
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-title text-text">
                    {displayName}
                  </p>
                  {member.invite_email && member.profiles?.full_name && (
                    <p className="truncate text-body-s text-text-3">
                      {member.invite_email}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={config.variant}>
                    <RoleIcon className="h-3 w-3" aria-hidden />
                    {config.label}
                  </Badge>
                  {isPending && (
                    <Badge variant="warning">Pending</Badge>
                  )}
                  {isPending && (
                    <IconButton
                      label={resendingId === member.id ? "Sending invite again" : "Resend invite email"}
                      onClick={() => handleResend(member.id)}
                      disabled={resendingId === member.id}
                      title="Resend invite email"
                      className="disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                    </IconButton>
                  )}
                  {member.role !== "owner" && (
                    <IconButton
                      label="Remove member"
                      onClick={() => handleRevoke(member.id)}
                      title="Remove member"
                      className="hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
