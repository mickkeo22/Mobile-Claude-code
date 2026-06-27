import "server-only";
import { env } from "@/lib/env";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  id?: string;
  demo?: boolean;
  error?: string;
}

/**
 * Send a transactional email via Resend.
 * In demo mode (no RESEND_API_KEY) logs a draft and returns {sent:false,demo:true}.
 * Never throws — always returns a result object.
 */
export async function sendEmail(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!env.resendKey) {
    console.log("[email:demo]", {
      from: env.resendFrom,
      to: input.to,
      subject: input.subject,
      preview: input.text ?? stripHtml(input.html).slice(0, 200),
    });
    return { sent: false, demo: true };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFrom,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text ?? stripHtml(input.html),
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] resend error", res.status, detail);
      return { sent: false, error: `resend ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { id?: string };
    return { sent: true, id: data.id };
  } catch (err) {
    console.error("[email] send failed", err);
    return { sent: false, error: "network" };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
