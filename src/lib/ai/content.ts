import "server-only";
import { anthropic, MODEL } from "./client";
import type { ContentType } from "@/lib/types/database";

export interface ContentRequest {
  type: ContentType;
  topic: string;
  clientName: string;
  industry?: string | null;
  tone?: string;
  platform?: string | null;
}

export interface GeneratedContent {
  title: string;
  body: string;
}

const FORMAT: Record<ContentType, string> = {
  blog: "An SEO-aware blog post: a compelling H1 title, then 400-600 words with clear subheadings and a soft call-to-action.",
  social:
    "A punchy social post for the given platform: a scroll-stopping hook, 80-150 words, 3-5 relevant hashtags, and a clear CTA.",
  email:
    "A marketing email: a high-open-rate subject line as the title, then a warm 120-200 word body with one clear CTA.",
  review_reply:
    "A gracious, on-brand reply to a customer review (assume the topic is the review text). 2-4 sentences, never defensive.",
};

/**
 * Generate marketing content. Degrades to a structured template in demo mode.
 */
export async function generateContent(
  req: ContentRequest,
): Promise<GeneratedContent> {
  if (!anthropic) return demoContent(req);

  try {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1200,
      system: `You are an elite marketing copywriter for ${req.clientName}${
        req.industry ? `, a ${req.industry} business` : ""
      }. Tone: ${req.tone ?? "confident, friendly, human"}. Reply ONLY with minified JSON: {"title":string,"body":string}. ${
        FORMAT[req.type]
      }`,
      messages: [
        {
          role: "user",
          content: `Create ${req.type} content about: ${req.topic}${
            req.platform ? ` (platform: ${req.platform})` : ""
          }`,
        },
      ],
    });
    const text = res.content[0]?.type === "text" ? res.content[0].text : "{}";
    const parsed = JSON.parse(extractJson(text));
    return {
      title: String(parsed.title ?? req.topic),
      body: String(parsed.body ?? ""),
    };
  } catch (err) {
    console.error("generateContent error", err);
    return demoContent(req);
  }
}

function demoContent(req: ContentRequest): GeneratedContent {
  return {
    title: `${req.topic} — by ${req.clientName}`,
    body: `This is a demo ${req.type} draft about "${req.topic}" for ${req.clientName}. Add an ANTHROPIC_API_KEY to generate publish-ready ${req.type} copy tailored to your client's brand voice, industry, and platform.`,
  };
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  return start >= 0 && end > start ? text.slice(start, end + 1) : "{}";
}
