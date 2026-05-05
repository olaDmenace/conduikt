import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/src/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { memberId } = (await request.json()) as { memberId?: string };
  if (!memberId) {
    return NextResponse.json({ error: "memberId is required" }, { status: 400 });
  }

  // Caller must be owner/admin of an active team.
  const { data: callerMembership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .eq("status", "active")
    .in("role", ["owner", "admin"])
    .limit(1)
    .maybeSingle();

  if (!callerMembership) {
    return NextResponse.json(
      { error: "Not authorized to resend invites" },
      { status: 403 }
    );
  }

  // Look up the pending invite — must be on caller's team.
  const { data: invite } = await supabase
    .from("team_members")
    .select("id, team_id, invite_email, role, status")
    .eq("id", memberId)
    .eq("team_id", callerMembership.team_id)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json(
      { error: "Invite not found on your team" },
      { status: 404 }
    );
  }

  if (invite.status !== "pending" || !invite.invite_email) {
    return NextResponse.json(
      { error: "This invite is not pending — nothing to resend" },
      { status: 400 }
    );
  }

  // Send the email.
  let emailStatus: { delivered: boolean; id?: string; error?: string } = {
    delivered: false,
  };

  try {
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: `Conduikt <noreply@${process.env.RESEND_FROM_DOMAIN || "contacts.conduikt.com"}>`,
      to: invite.invite_email,
      subject: "Reminder: you've been invited to join a team on Conduikt",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #2F8C85;">You're invited to Conduikt</h2>
          <p>This is a reminder that you've been invited to join a team as a <strong>${invite.role}</strong>.</p>
          <p>Conduikt is an AI-powered marketing automation platform that helps you audit, generate, and publish marketing content.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://conduikt.com"}/signup?invite=${invite.id}&email=${encodeURIComponent(invite.invite_email)}"
             style="display: inline-block; padding: 12px 24px; background: #2F8C85; color: #FFFFFF; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Accept Invite
          </a>
          <p style="color: #9B958C; font-size: 0.875rem; margin-top: 24px;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });

    if (emailError) {
      console.error("[team invite resend] Resend returned error for", invite.invite_email, emailError);
      emailStatus = { delivered: false, error: emailError.message };
    } else {
      emailStatus = { delivered: true, id: emailData?.id };
    }
  } catch (err) {
    console.error("[team invite resend] Resend threw for", invite.invite_email, err);
    emailStatus = {
      delivered: false,
      error: err instanceof Error ? err.message : "unknown error",
    };
  }

  return NextResponse.json({ memberId: invite.id, email: emailStatus });
}
