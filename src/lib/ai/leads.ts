import "server-only";
import { anthropic, FAST_MODEL } from "./client";

export interface LeadInput {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  source?: string | null;
  clientName: string;
  industry?: string | null;
}

export interface LeadQualification {
  score: number; // 0-100
  status: "new" | "qualified";
  qualification: string; // one-line rationale
  suggestedReply: string; // ready-to-send follow-up
}

/**
 * Score and qualify an inbound lead, and draft an instant follow-up.
 * Degrades to a heuristic in demo mode so the pipeline always works.
 */
export async function qualifyLead(input: LeadInput): Promise<LeadQualification> {
  if (!anthropic) return heuristicQualify(input);

  try {
    const res = await anthropic.messages.create({
      model: FAST_MODEL,
      max_tokens: 500,
      system:
        "You are a sales development expert for a small business. You score inbound leads 0-100 on buying intent and fit, then draft a short, warm, personalized follow-up. Reply ONLY with minified JSON: {\"score\":number,\"qualification\":string,\"suggestedReply\":string}. The suggestedReply must be ready to send, 2-4 sentences, signed off generically.",
      messages: [
        {
          role: "user",
          content: `Business: ${input.clientName}${
            input.industry ? ` (${input.industry})` : ""
          }\nLead name: ${input.name ?? "unknown"}\nEmail: ${
            input.email ?? "none"
          }\nPhone: ${input.phone ?? "none"}\nSource: ${
            input.source ?? "website"
          }\nMessage: ${input.message ?? "(none provided)"}`,
        },
      ],
    });

    const text =
      res.content[0]?.type === "text" ? res.content[0].text : "{}";
    const parsed = JSON.parse(extractJson(text));
    const score = clampScore(parsed.score);
    return {
      score,
      status: score >= 60 ? "qualified" : "new",
      qualification: String(parsed.qualification ?? "Reviewed by AI."),
      suggestedReply: String(parsed.suggestedReply ?? defaultReply(input)),
    };
  } catch (err) {
    console.error("qualifyLead error", err);
    return heuristicQualify(input);
  }
}

function heuristicQualify(input: LeadInput): LeadQualification {
  let score = 30;
  if (input.email) score += 20;
  if (input.phone) score += 20;
  const msg = (input.message ?? "").toLowerCase();
  if (/quote|price|buy|book|hire|urgent|asap|today|interested/.test(msg))
    score += 25;
  if (msg.length > 80) score += 5;
  score = clampScore(score);
  return {
    score,
    status: score >= 60 ? "qualified" : "new",
    qualification:
      score >= 60
        ? "Strong intent signals (contact details + buying language)."
        : "Early-stage inquiry — nurture and gather more detail.",
    suggestedReply: defaultReply(input),
  };
}

function defaultReply(input: LeadInput): string {
  const first = (input.name ?? "there").split(" ")[0];
  return `Hi ${first}, thanks so much for reaching out to ${input.clientName}! I'd love to help with what you described. Are you free for a quick call this week, or would you prefer I send details over email? Looking forward to it.`;
}

function clampScore(n: unknown): number {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return 40;
  return Math.max(0, Math.min(100, x));
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : "{}";
}
