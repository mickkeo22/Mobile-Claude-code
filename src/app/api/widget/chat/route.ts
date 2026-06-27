import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { demoClients } from "@/lib/demo";
import { streamAgentReply, type AgentTurn } from "@/lib/ai/agent";
import { env } from "@/lib/env";
import { CORS_HEADERS, corsPreflight } from "@/app/api/_lib/cors";
import { db } from "@/app/api/_lib/db";
import type { Client, KnowledgeDoc } from "@/lib/types/database";

export const runtime = "nodejs";

const KNOWLEDGE_CAP = 6000;

const bodySchema = z.object({
  clientId: z.string().optional(),
  visitorId: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    )
    .min(1),
});

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(req: Request) {
  let parsed: z.infer<typeof bodySchema>;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return Response.json(
      { error: "Invalid request body." },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const { clientId, visitorId, messages } = parsed;
  const supabase = db(await createClient());

  // Resolve the client (by id OR slug). Falls back to a generic assistant so
  // the widget never breaks even with a missing/unknown clientId.
  let client: Pick<Client, "id" | "name" | "industry" | "agent_persona"> | null =
    null;

  if (clientId) {
    if (supabase) {
      try {
        const { data } = await supabase
          .from("clients")
          .select<Pick<Client, "id" | "name" | "industry" | "agent_persona">>(
            "id,name,industry,agent_persona",
          )
          .or(`id.eq.${clientId},slug.eq.${clientId}`)
          .limit(1)
          .maybeSingle();
        if (data) client = data;
      } catch {
        // ignore — fall through to demo/generic
      }
    }
    if (!client) {
      const demo = demoClients.find(
        (c) => c.id === clientId || c.slug === clientId,
      );
      if (demo) {
        client = {
          id: demo.id,
          name: demo.name,
          industry: demo.industry,
          agent_persona: demo.agent_persona,
        };
      }
    }
  }

  const clientName = client?.name ?? env.appName;
  const industry = client?.industry ?? null;
  const persona = client?.agent_persona ?? null;

  // Pull knowledge for grounding (live only).
  let knowledge = "";
  if (supabase && client?.id) {
    try {
      const { data } = await supabase
        .from("knowledge_docs")
        .select<Pick<KnowledgeDoc, "title" | "content">>("title,content")
        .eq("client_id", client.id);
      if (data && data.length > 0) {
        knowledge = data
          .map((d) => `# ${d.title}\n${d.content}`)
          .join("\n\n")
          .slice(0, KNOWLEDGE_CAP);
      }
    } catch {
      // ignore
    }
  }

  const history: AgentTurn[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  let stream: ReadableStream<Uint8Array>;
  try {
    stream = await streamAgentReply(
      { clientName, industry, persona, knowledge },
      history,
    );
  } catch (err) {
    console.error("[widget/chat] stream error", err);
    return Response.json(
      { error: "Assistant unavailable." },
      { status: 500, headers: CORS_HEADERS },
    );
  }

  // Best-effort persistence: tee the stream so we can capture the reply text
  // without blocking or breaking the response if anything fails.
  let responseStream = stream;
  if (supabase && client?.id) {
    const [a, b] = stream.tee();
    responseStream = a;
    void persistConversation(b, client.id, visitorId, history);
  }

  return new Response(responseStream, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

async function persistConversation(
  stream: ReadableStream<Uint8Array>,
  clientId: string,
  visitorId: string | undefined,
  history: AgentTurn[],
): Promise<void> {
  try {
    // Drain the teed stream to assemble the assistant reply text.
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let reply = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) reply += decoder.decode(value, { stream: true });
    }
    reply += decoder.decode();

    const supabase = db(await createClient());
    if (!supabase) return;

    const { data: conv } = await supabase
      .from("conversations")
      .insert({
        client_id: clientId,
        channel: "web",
        visitor_id: visitorId ?? null,
        status: "open",
      })
      .select<{ id: string }>("id")
      .single();

    if (!conv?.id) return;
    const conversationId = conv.id;

    const lastUser = history[history.length - 1];
    const rows = [
      lastUser
        ? {
            conversation_id: conversationId,
            role: lastUser.role,
            content: lastUser.content,
          }
        : null,
      {
        conversation_id: conversationId,
        role: "assistant" as const,
        content: reply,
      },
    ].filter(Boolean);

    await supabase.from("messages").insert(rows);
  } catch (err) {
    console.error("[widget/chat] persist failed", err);
  }
}
