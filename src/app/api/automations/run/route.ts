import { z } from "zod";
import { env } from "@/lib/env";
import { runAutomation, runDueAutomations } from "@/lib/automations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  automationId: z.string().optional(),
});

/**
 * Authorize the request. When CRON_SECRET is set, require it via the
 * "x-cron-secret" header or a ?secret= query param (for Vercel Cron GETs).
 * When no secret is configured we allow it (demo mode).
 */
function authorize(req: Request): boolean {
  if (!env.cronSecret) return true;
  const header = req.headers.get("x-cron-secret");
  const query = new URL(req.url).searchParams.get("secret");
  return header === env.cronSecret || query === env.cronSecret;
}

export async function POST(req: Request) {
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let automationId: string | undefined;
  try {
    const text = await req.text();
    if (text) {
      automationId = bodySchema.parse(JSON.parse(text)).automationId;
    }
  } catch {
    // Empty or malformed body → run all due automations.
  }

  try {
    const summary = automationId
      ? await runAutomation(automationId)
      : await runDueAutomations();
    return Response.json(summary);
  } catch (err) {
    console.error("[automations/run] error", err);
    return Response.json(
      { ran: 0, results: [], error: "Failed to run automations." },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const automationId =
    new URL(req.url).searchParams.get("automationId") ?? undefined;

  try {
    const summary = automationId
      ? await runAutomation(automationId)
      : await runDueAutomations();
    return Response.json(summary);
  } catch (err) {
    console.error("[automations/run] error", err);
    return Response.json(
      { ran: 0, results: [], error: "Failed to run automations." },
      { status: 500 },
    );
  }
}
