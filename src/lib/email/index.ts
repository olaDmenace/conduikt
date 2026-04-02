import { Resend } from "resend";

const FROM = "Conduikt <hello@conduikt.com>";

// Lazy client — only instantiated when RESEND_API_KEY is present
function getResend(): Resend {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(process.env.RESEND_API_KEY);
}

// ---------------------------------------------------------------------------
// Email Templates
// ---------------------------------------------------------------------------

function welcomeHtml(name: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const greeting = name ? `Welcome, ${name}!` : "Welcome!";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to Conduikt</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e0db;">
          <!-- Header -->
          <tr>
            <td style="background:#1a1714;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#C88540;letter-spacing:-0.5px;">Conduikt</p>
              <p style="margin:4px 0 0;font-size:12px;color:#8a8176;letter-spacing:0.5px;text-transform:uppercase;">AI Marketing Automation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1a1714;line-height:1.25;">${greeting}</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#4a4540;line-height:1.7;">
                You're in. Conduikt is your AI-powered marketing command center — built to help you rank higher, publish faster, and grow smarter.
              </p>
              <p style="margin:0 0 20px;font-size:15px;font-weight:600;color:#1a1714;">Here's what to do first:</p>
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;width:100%;">
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0ebe5;">
                    <p style="margin:0;font-size:14px;color:#1a1714;"><span style="color:#C88540;font-weight:700;">01 /</span> &nbsp;Create a project</p>
                    <p style="margin:4px 0 0 32px;font-size:13px;color:#6a6560;">Connect your website to unlock all AI tools</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #f0ebe5;">
                    <p style="margin:0;font-size:14px;color:#1a1714;"><span style="color:#C88540;font-weight:700;">02 /</span> &nbsp;Run an SEO audit</p>
                    <p style="margin:4px 0 0 32px;font-size:13px;color:#6a6560;">Get a score and actionable findings in seconds</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:10px 0;">
                    <p style="margin:0;font-size:14px;color:#1a1714;"><span style="color:#C88540;font-weight:700;">03 /</span> &nbsp;Generate content</p>
                    <p style="margin:4px 0 0 32px;font-size:13px;color:#6a6560;">Blog posts, social content, email sequences — powered by Claude AI</p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#C88540;border-radius:8px;">
                    <a href="${appUrl}/dashboard" style="display:block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Go to Dashboard &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f6f2;padding:20px 40px;border-top:1px solid #e5e0db;">
              <p style="margin:0;font-size:12px;color:#8a8176;line-height:1.6;">You received this because you created a Conduikt account. Questions? Reply to this email — we read every one.</p>
              <p style="margin:8px 0 0;font-size:12px;"><a href="${appUrl}" style="color:#C88540;text-decoration:none;">conduikt.com</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function planUpgradeHtml(name: string, plan: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const planLabels: Record<string, string> = {
    pro: "Pro",
    growth: "Growth",
    agency: "Agency",
  };
  const planLabel = planLabels[plan] ?? plan;
  const greeting = name ? `Hey ${name}, you` : "You";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>You're on ${planLabel}!</title>
</head>
<body style="margin:0;padding:0;background:#f5f0eb;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f5f0eb;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" role="presentation" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e0db;">
          <!-- Header -->
          <tr>
            <td style="background:#1a1714;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#C88540;letter-spacing:-0.5px;">Conduikt</p>
              <p style="margin:4px 0 0;font-size:12px;color:#8a8176;letter-spacing:0.5px;text-transform:uppercase;">AI Marketing Automation</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#C88540;text-transform:uppercase;letter-spacing:1px;">Plan Activated</p>
              <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#1a1714;line-height:1.25;">You're now on ${planLabel}</h1>
              <p style="margin:0 0 20px;font-size:15px;color:#4a4540;line-height:1.7;">
                ${greeting}'re all set. Your ${planLabel} plan is now active — your generation limits have been updated and your usage counter has been reset.
              </p>
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;width:100%;background:#f9f6f2;border-radius:8px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#8a8176;text-transform:uppercase;letter-spacing:0.5px;">Your active plan</p>
                    <p style="margin:0;font-size:22px;font-weight:700;color:#C88540;">Conduikt ${planLabel}</p>
                  </td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#C88540;border-radius:8px;">
                    <a href="${appUrl}/dashboard" style="display:block;padding:14px 28px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">Go to Dashboard &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9f6f2;padding:20px 40px;border-top:1px solid #e5e0db;">
              <p style="margin:0;font-size:12px;color:#8a8176;line-height:1.6;">
                Manage your billing at <a href="${appUrl}/settings/billing" style="color:#C88540;text-decoration:none;">Settings &rarr; Billing</a>. Questions? Reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Send helpers — always fire-and-forget (never throw)
// ---------------------------------------------------------------------------

export async function sendWelcomeEmail(to: string, name?: string) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set — skipping welcome email");
    return;
  }
  try {
    await getResend().emails.send({
      from: FROM,
      to: [to],
      subject: "Welcome to Conduikt — your AI marketing command center",
      html: welcomeHtml(name ?? ""),
    });
  } catch (err) {
    console.error("[email] Failed to send welcome email:", err);
  }
}

export async function sendPlanUpgradeEmail(
  to: string,
  plan: string,
  name?: string
) {
  if (!process.env.RESEND_API_KEY) {
    console.log("[email] RESEND_API_KEY not set — skipping plan upgrade email");
    return;
  }
  try {
    const planLabels: Record<string, string> = {
      pro: "Pro",
      growth: "Growth",
      agency: "Agency",
    };
    const planLabel = planLabels[plan] ?? plan;
    await getResend().emails.send({
      from: FROM,
      to: [to],
      subject: `Your Conduikt ${planLabel} plan is now active`,
      html: planUpgradeHtml(name ?? "", plan),
    });
  } catch (err) {
    console.error("[email] Failed to send plan upgrade email:", err);
  }
}
