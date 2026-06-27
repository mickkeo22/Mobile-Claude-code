import "server-only";
import { env } from "@/lib/env";

export interface SendSmsInput {
  to: string;
  body: string;
}

export interface SendSmsResult {
  sent: boolean;
  sid?: string;
  demo?: boolean;
  error?: string;
}

/**
 * Send an SMS via Twilio's REST API.
 * In demo mode (missing Twilio creds) logs a draft and returns {sent:false,demo:true}.
 * Never throws — always returns a result object.
 */
export async function sendSms(input: SendSmsInput): Promise<SendSmsResult> {
  if (!env.twilioSid || !env.twilioToken || !env.twilioFrom) {
    console.log("[sms:demo]", {
      from: env.twilioFrom ?? "(unset)",
      to: input.to,
      body: input.body.slice(0, 200),
    });
    return { sent: false, demo: true };
  }

  try {
    const auth = Buffer.from(`${env.twilioSid}:${env.twilioToken}`).toString(
      "base64",
    );
    const form = new URLSearchParams({
      From: env.twilioFrom,
      To: input.to,
      Body: input.body,
    });

    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${env.twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[sms] twilio error", res.status, detail);
      return { sent: false, error: `twilio ${res.status}` };
    }

    const data = (await res.json().catch(() => ({}))) as { sid?: string };
    return { sent: true, sid: data.sid };
  } catch (err) {
    console.error("[sms] send failed", err);
    return { sent: false, error: "network" };
  }
}
