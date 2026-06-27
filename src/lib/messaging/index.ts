import "server-only";
import { features, env } from "@/lib/env";
import { sendEmail } from "./email";
import { sendSms } from "./sms";
import type { Client, Lead } from "@/lib/types/database";

export { sendEmail } from "./email";
export { sendSms } from "./sms";
export type { SendEmailInput, SendEmailResult } from "./email";
export type { SendSmsInput, SendSmsResult } from "./sms";

export interface LeadFollowupInput {
  lead: Pick<Lead, "name" | "email" | "phone">;
  client: Pick<Client, "name">;
  suggestedReply: string;
}

export interface LeadFollowupResult {
  sent: boolean;
  channel?: "email" | "sms";
  demo?: boolean;
  error?: string;
}

/**
 * Send an instant follow-up to a freshly captured lead.
 * Prefers email, falls back to SMS. Composes a friendly message from the
 * AI-drafted suggestedReply. Never throws.
 */
export async function sendLeadFollowup(
  input: LeadFollowupInput,
): Promise<LeadFollowupResult> {
  const { lead, client, suggestedReply } = input;
  const firstName = (lead.name ?? "there").split(" ")[0];
  const body =
    suggestedReply?.trim() ||
    `Hi ${firstName}, thanks for reaching out to ${client.name}! We received your message and a team member will be in touch shortly.`;

  if (lead.email && features.email) {
    const res = await sendEmail({
      to: lead.email,
      subject: `Thanks for contacting ${client.name}`,
      html: toHtml(body, client.name),
      text: body,
    });
    return {
      sent: res.sent,
      channel: "email",
      demo: res.demo,
      error: res.error,
    };
  }

  if (lead.phone && features.sms) {
    const res = await sendSms({ to: lead.phone, body });
    return {
      sent: res.sent,
      channel: "sms",
      demo: res.demo,
      error: res.error,
    };
  }

  // Nothing live to send through — log a draft so demo mode still "works".
  if (lead.email) {
    await sendEmail({
      to: lead.email,
      subject: `Thanks for contacting ${client.name}`,
      html: toHtml(body, client.name),
      text: body,
    });
    return { sent: false, channel: "email", demo: true };
  }
  if (lead.phone) {
    await sendSms({ to: lead.phone, body });
    return { sent: false, channel: "sms", demo: true };
  }

  return { sent: false };
}

function toHtml(body: string, clientName: string): string {
  const paragraphs = body
    .split(/\n{2,}|\n/)
    .filter((p) => p.trim().length > 0)
    .map((p) => `<p style="margin:0 0 12px;line-height:1.6">${escapeHtml(p)}</p>`)
    .join("");

  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;color:#111;max-width:560px">
    ${paragraphs}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
    <p style="font-size:12px;color:#888;margin:0">Sent on behalf of ${escapeHtml(
      clientName,
    )} via ${escapeHtml(env.appName)}.</p>
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
