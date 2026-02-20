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

  const { email, role } = await request.json();

  if (!email || !role) {
    return NextResponse.json(
      { error: "Email and role are required" },
      { status: 400 }
    );
  }

  const validRoles = ["admin", "member", "viewer"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Get caller's team (must be owner/admin)
  const { data: callerMembership } = await supabase
    .from("team_members")
    .select("team_id, role")
    .eq("user_id", user.id)
    .in("role", ["owner", "admin"])
    .limit(1)
    .single();

  if (!callerMembership) {
    return NextResponse.json(
      { error: "Not authorized to invite members" },
      { status: 403 }
    );
  }

  // Check if already invited
  const { data: existing } = await supabase
    .from("team_members")
    .select("id")
    .eq("team_id", callerMembership.team_id)
    .eq("invite_email", email)
    .limit(1)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "This email has already been invited" },
      { status: 409 }
    );
  }

  // Create pending team member row
  const { data: member, error: insertError } = await supabase
    .from("team_members")
    .insert({
      team_id: callerMembership.team_id,
      invite_email: email,
      role,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Send invite email via Resend
  try {
    await resend.emails.send({
      from: "Conduikt <noreply@conduikt.com>",
      to: email,
      subject: "You've been invited to join a team on Conduikt",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #D4945A;">You're invited to Conduikt</h2>
          <p>You've been invited to join a team as a <strong>${role}</strong>.</p>
          <p>Conduikt is an AI-powered marketing automation platform that helps you audit, generate, and publish marketing content.</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || "https://conduikt.com"}/signup?invite=${member.id}"
             style="display: inline-block; padding: 12px 24px; background: #D4945A; color: #0C0C0E; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px;">
            Accept Invite
          </a>
          <p style="color: #9B958C; font-size: 0.875rem; margin-top: 24px;">
            If you didn't expect this email, you can safely ignore it.
          </p>
        </div>
      `,
    });
  } catch {
    // Email send failed but invite was created — log but don't fail
    console.error("Failed to send invite email to", email);
  }

  return NextResponse.json(member);
}
