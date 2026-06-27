import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { demoClients } from "@/lib/demo";
import { qualifyLead } from "@/lib/ai/leads";
import { sendLeadFollowup } from "@/lib/messaging";
import { env } from "@/lib/env";
import { CORS_HEADERS, corsPreflight } from "@/app/api/_lib/cors";
import { db } from "@/app/api/_lib/db";
import type { Client } from "@/lib/types/database";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    clientId: z.string().optional(),
    name: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    message: z.string().optional(),
    source: z.string().optional(),
  })
  .refine((b) => Boolean(b.email || b.phone || b.message), {
    message: "Provide at least one of email, phone, or message.",
  });

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? (err.errors[0]?.message ?? "Invalid request.")
        : "Invalid request body.";
    return Response.json(
      { ok: false, error: message },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  try {
    const { clientId, name, email, phone, message, source } = parsed;
    const supabase = db(await createClient());

    // Resolve the client. "marketing" (or missing) → generic agency context.
    let client: Pick<Client, "id" | "name" | "industry"> | null = null;

    if (clientId && clientId !== "marketing") {
      if (supabase) {
        const { data } = await supabase
          .from("clients")
          .select<Pick<Client, "id" | "name" | "industry">>("id,name,industry")
          .or(`id.eq.${clientId},slug.eq.${clientId}`)
          .limit(1)
          .maybeSingle();
        if (data) client = data;
      }
      if (!client) {
        const demo = demoClients.find(
          (c) => c.id === clientId || c.slug === clientId,
        );
        if (demo)
          client = { id: demo.id, name: demo.name, industry: demo.industry };
      }
    }

    const clientName = client?.name ?? env.appName;
    const industry = client?.industry ?? null;

    const qualification = await qualifyLead({
      name,
      email: email || null,
      phone,
      message,
      source,
      clientName,
      industry,
    });

    // Persist (live only).
    if (supabase && client?.id) {
      try {
        await supabase.from("leads").insert({
          client_id: client.id,
          name: name ?? null,
          email: email || null,
          phone: phone ?? null,
          source: source ?? null,
          message: message ?? null,
          score: qualification.score,
          status: qualification.status,
          qualification: qualification.qualification,
        });
      } catch (err) {
        console.error("[leads] insert failed", err);
      }
    }

    // Trigger follow-up (best-effort, never fails the request).
    let followup: { sent: boolean; channel?: "email" | "sms" } = {
      sent: false,
    };
    try {
      const res = await sendLeadFollowup({
        lead: { name: name ?? null, email: email || null, phone: phone ?? null },
        client: { name: clientName },
        suggestedReply: qualification.suggestedReply,
      });
      followup = { sent: res.sent, channel: res.channel };
    } catch (err) {
      console.error("[leads] followup failed", err);
    }

    return Response.json(
      {
        ok: true,
        lead: {
          score: qualification.score,
          status: qualification.status,
          qualification: qualification.qualification,
        },
        followup,
      },
      { headers: CORS_HEADERS },
    );
  } catch (err) {
    console.error("[leads] POST error", err);
    return Response.json(
      { ok: false, error: "Failed to process lead." },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
