import { createClient } from "@/lib/supabase/server";
import { demoClients } from "@/lib/demo";
import { env } from "@/lib/env";
import { CORS_HEADERS, corsPreflight } from "@/app/api/_lib/cors";
import { db } from "@/app/api/_lib/db";
import type { Client } from "@/lib/types/database";

export const runtime = "nodejs";

export async function OPTIONS() {
  return corsPreflight();
}

export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get("client") ?? "";

  let name = env.appName;
  let brandColor = "#6366f1";

  if (slug) {
    const supabase = db(await createClient());
    let resolved = false;

    if (supabase) {
      try {
        const { data } = await supabase
          .from("clients")
          .select<Pick<Client, "name" | "brand_color">>("name,brand_color")
          .or(`id.eq.${slug},slug.eq.${slug}`)
          .limit(1)
          .maybeSingle();
        if (data) {
          name = data.name;
          brandColor = data.brand_color;
          resolved = true;
        }
      } catch {
        // ignore — fall through to demo
      }
    }

    if (!resolved) {
      const demo = demoClients.find((c) => c.id === slug || c.slug === slug);
      if (demo) {
        name = demo.name;
        brandColor = demo.brand_color;
      }
    }
  }

  const greeting = `Hi! 👋 I'm the AI assistant for ${name}. How can I help you today?`;

  return Response.json(
    { name, brandColor, greeting },
    {
      headers: {
        ...CORS_HEADERS,
        "Cache-Control": "public, max-age=60",
      },
    },
  );
}
