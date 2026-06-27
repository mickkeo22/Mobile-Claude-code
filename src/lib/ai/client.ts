import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

/** Shared Anthropic client. Null in demo mode (no API key). */
export const anthropic: Anthropic | null = env.anthropicKey
  ? new Anthropic({ apiKey: env.anthropicKey })
  : null;

export const MODEL = env.anthropicModel;

/** A fast, cheap model for classification/scoring work. */
export const FAST_MODEL = "claude-haiku-4-5-20251001";
