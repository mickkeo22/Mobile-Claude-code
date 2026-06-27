"use client";

import { useRef, useState } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function AgentTester({
  clients,
}: {
  clients: { id: string; name: string }[];
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visitorId = useRef(
    `tester-${Math.random().toString(36).slice(2, 10)}`,
  );
  const scrollRef = useRef<HTMLDivElement>(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming || !clientId) return;

    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);
    scrollToBottom();

    // Add a placeholder assistant message we stream into.
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/widget/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          messages: next,
          visitorId: visitorId.current,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Agent unavailable (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
        scrollToBottom();
      }
      if (!acc.trim()) {
        throw new Error("Empty response");
      }
    } catch {
      setError(
        "Could not reach the live agent. Add an Anthropic API key to enable streaming replies.",
      );
      setMessages((m) => {
        const copy = [...m];
        // Remove the empty placeholder.
        if (copy[copy.length - 1]?.content === "") copy.pop();
        return copy;
      });
    } finally {
      setStreaming(false);
      scrollToBottom();
    }
  }

  return (
    <div className="flex h-[28rem] flex-col rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-border p-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Bot className="h-4 w-4 text-primary" />
          Live agent tester
        </div>
        <select
          value={clientId}
          onChange={(e) => {
            setClientId(e.target.value);
            setMessages([]);
            setError(null);
          }}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              Test the agent like a visitor would
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Ask a question your client&apos;s customers might ask. Replies
              stream live from the model.
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2.5",
              m.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground",
              )}
            >
              {m.role === "user" ? (
                <User className="h-3.5 w-3.5" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
            </span>
            <div
              className={cn(
                "max-w-[75%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary",
              )}
            >
              {m.content || (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="border-t border-border bg-amber-500/10 px-4 py-2 text-xs text-amber-600 dark:text-amber-400">
          {error}
        </p>
      )}

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border p-3">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={streaming}
        />
        <Button type="submit" size="md" disabled={streaming || !input.trim()}>
          {streaming ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
