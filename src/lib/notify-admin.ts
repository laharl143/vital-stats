import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function getRecipients(): Promise<string[]> {
  const configured = process.env.ADMIN_NOTIFICATION_EMAILS;
  if (configured) {
    return configured.split(",").map((email) => email.trim()).filter(Boolean);
  }

  const admins = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    select: { email: true },
  });
  return admins.map((admin) => admin.email);
}

type ConsultNotification = {
  kind: "consult";
  fullName: string;
  email: string;
  phone: string;
};

type InquiryNotification = {
  kind: "inquiry";
  name: string;
  contactInfo: string;
  message: string;
};

export async function notifyAdmin(notification: ConsultNotification | InquiryNotification) {
  if (!resend) {
    console.warn("[notifyAdmin] RESEND_API_KEY not set — skipping notification email");
    return;
  }

  const recipients = await getRecipients();
  if (recipients.length === 0) {
    console.warn("[notifyAdmin] No recipients configured — skipping notification email");
    return;
  }

  const siteUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const from = process.env.RESEND_FROM_EMAIL ?? "VitalStats <onboarding@resend.dev>";

  const now = new Date();
  const today = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(now);
  const submittedAt = `${new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(now)} - ${new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(now)}`;

  const { subject, html } =
    notification.kind === "consult"
      ? {
          subject: `[${today}] Book a Consult: ${notification.fullName}`,
          html: renderNotificationEmail({
            badge: "New submission",
            title: `New "Book a Consult" received`,
            submittedAt,
            rows: [
              ["Name", notification.fullName],
              ["Email", notification.email],
              ["Phone", notification.phone],
            ],
            ctaHref: `${siteUrl}/admin/medical-history`,
            ctaLabel: "View in admin portal",
          }),
        }
      : {
          subject: `[${today}] Inquiry: ${notification.name}`,
          html: renderNotificationEmail({
            badge: "New submission",
            title: `New "Inquiry" received`,
            submittedAt,
            rows: [
              ["Name", notification.name],
              ["Contact", notification.contactInfo],
              ["Message", notification.message],
            ],
            ctaHref: `${siteUrl}/admin/inquiries`,
            ctaLabel: "View in admin portal",
          }),
        };

  const { error } = await resend.emails.send({ from, to: recipients, subject, html });
  if (error) {
    throw new Error(`Resend API error: ${error.name} - ${error.message}`);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderNotificationEmail(params: {
  badge: string;
  title: string;
  submittedAt: string;
  rows: [string, string][];
  ctaHref: string;
  ctaLabel: string;
}) {
  const { badge, title, submittedAt, rows, ctaHref, ctaLabel } = params;

  const rowsHtml = rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:10px 0;border-top:1px solid #eef2f0;color:#5b6b64;width:80px;">${escapeHtml(label)}</td>
          <td style="padding:10px 0;border-top:1px solid #eef2f0;">${escapeHtml(value)}</td>
        </tr>`
    )
    .join("");

  return `
    <body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f7f9f8;">
      <table role="presentation" width="100%" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #dce3df;">
        <tr><td style="background:#1f6f5c;padding:20px 28px;">
          <span style="color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.02em;">VITAL-STATS</span>
          <span style="color:#bfe3d6;font-size:12px;float:right;margin-top:3px;">${escapeHtml(badge)}</span>
        </td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 4px;font-size:19px;color:#1b2421;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 20px;font-size:13px;color:#5b6b64;">${escapeHtml(submittedAt)}</p>
          <table role="presentation" width="100%" style="font-size:14px;border-collapse:collapse;">${rowsHtml}
          </table>
          <table role="presentation" style="margin-top:24px;"><tr><td style="background:#1f6f5c;border-radius:6px;">
            <a href="${ctaHref}" style="display:inline-block;padding:11px 20px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">${escapeHtml(ctaLabel)}</a>
          </td></tr></table>
        </td></tr>
      </table>
    </body>
  `;
}
