import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { demoClients } from "@/lib/demo";
import { generateContent } from "@/lib/ai/content";
import { env } from "@/lib/env";
import { db } from "@/app/api/_lib/db";
import type { Client, ContentType } from "@/lib/types/database";

export const runtime = "nodejs";

const bodySchema = z.object({
  clientId: z.string().optional(),
  type: z.enum(["blog", "social", "email", "review_reply"]),
  topic: z.string().min(1),
  platform: z.string().optional(),
  tone: z.string().optional(),
});

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch (err) {
    const message =
      err instanceof z.ZodError
        ? (err.errors[0]?.message ?? "Invalid request.")
        : "Invalid request body.";
    return Response.json({ error: message }, { status: 400 });
  }

  try {
    const { clientId, type, topic, platform, tone } = parsed;
    const supabase = db(await createClient());

    let client: Pick<Client, "id" | "name" | "industry"> | null = null;
    if (clientId) {
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

    const result = await generateContent({
      type: type as ContentType,
      topic,
      clientName,
      industry,
      tone,
      platform,
    });

    // Persist as a draft (live only).
    if (supabase && client?.id) {
      try {
        await supabase.from("content_items").insert({
          client_id: client.id,
          type,
          title: result.title,
          body: result.body,
          platform: platform ?? null,
          status: "draft",
          scheduled_for: null,
        });
      } catch (err) {
        console.error("[content] insert failed", err);
      }
    }

    return Response.json({ title: result.title, body: result.body });
  } catch (err) {
    console.error("[content] POST error", err);
    return Response.json(
      { error: "Failed to generate content." },
      { status: 500 },
    );
  }
}
