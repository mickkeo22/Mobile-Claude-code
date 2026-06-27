"use client";

import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, Wand2 } from "lucide-react";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Label,
} from "@/components/ui";
import type { ContentType } from "@/lib/types/database";

const TYPES: { value: ContentType; label: string }[] = [
  { value: "blog", label: "Blog post" },
  { value: "social", label: "Social post" },
  { value: "email", label: "Email" },
  { value: "review_reply", label: "Review reply" },
];

const TONES = ["Friendly", "Professional", "Playful", "Authoritative", "Warm"];

export function ContentGenerator({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [type, setType] = useState<ContentType>("blog");
  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("");
  const [tone, setTone] = useState("Friendly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; body: string } | null>(
    null,
  );
  const [copied, setCopied] = useState(false);

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/content/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          type,
          topic,
          platform: platform || undefined,
          tone,
        }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = (await res.json()) as { title: string; body: string };
      setResult(data);
    } catch {
      setError(
        "Couldn't generate content. Add an Anthropic API key to enable AI generation.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(`${result.title}\n\n${result.body}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          Generate content
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={generate} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cg-client">Client</Label>
            <select
              id="cg-client"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cg-type">Type</Label>
            <select
              id="cg-type"
              value={type}
              onChange={(e) => setType(e.target.value as ContentType)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cg-topic">Topic</Label>
            <Input
              id="cg-topic"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Why regular cleanings prevent costly dental work"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cg-platform">Platform (optional)</Label>
            <Input
              id="cg-platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Instagram, Website, Email…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cg-tone">Tone</Label>
            <select
              id="cg-tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading || !topic.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {loading ? "Generating…" : "Generate"}
            </Button>
          </div>
        </form>

        {error && (
          <p className="mt-4 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
            {error}
          </p>
        )}

        {result && (
          <div className="relative mt-5 rounded-md border border-border bg-muted/40 p-4">
            <button
              type="button"
              onClick={copyResult}
              className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </>
              )}
            </button>
            <h3 className="pr-20 text-base font-semibold">{result.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {result.body}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
