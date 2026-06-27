import { MessageSquare, BookOpen, Code2, Inbox } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
} from "@/components/ui";
import { AgentTester } from "@/components/dashboard/agent-tester";
import { CopySnippet } from "@/components/dashboard/copy-snippet";
import { getClients } from "@/lib/data";
import { env, features } from "@/lib/env";

export default async function AgentPage() {
  const clients = await getClients();
  const tester = clients.map((c) => ({ id: c.id, name: c.name }));
  const firstSlug = clients[0]?.slug ?? "your-client";
  const snippet = `<script src="${env.appUrl}/widget.js" data-client="${firstSlug}" async></script>`;

  return (
    <>
      <PageHeader
        title="AI Support Agent"
        description="A branded support agent that answers questions and captures leads 24/7 on each client's website."
        action={
          features.ai ? (
            <Badge tone="success">AI live</Badge>
          ) : (
            <Badge tone="warning">Demo mode — add an Anthropic key</Badge>
          )
        }
      />

      {clients.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm font-medium">Add a client first</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            The AI agent is configured per client. Create a client to test and
            install their agent.
          </p>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <AgentTester clients={tester} />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code2 className="h-4 w-4" />
                Install the widget
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Add one line of code to a client&apos;s site to launch their
                agent. It inherits their brand color and persona automatically.
              </p>
              <CopySnippet code={snippet} />
              <p className="text-xs text-muted-foreground">
                Switch clients in the tester to preview each agent&apos;s tone.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Knowledge base concept */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            How the knowledge base works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <Step
              n={1}
              title="Feed it context"
              body="Add the client's services, pricing, hours, and FAQs. The agent grounds every answer in this knowledge."
            />
            <Step
              n={2}
              title="It answers like staff"
              body="Visitors get accurate, on-brand replies in the agent's configured persona — no hallucinations off-topic."
            />
            <Step
              n={3}
              title="It captures leads"
              body="When a visitor shows intent, the agent collects their details and files a scored, qualified lead."
            />
          </div>
        </CardContent>
      </Card>

      {/* Recent conversations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Recent conversations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">No conversations yet</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              Once the widget is live on a client&apos;s site, every visitor
              chat shows up here — with transcripts and any leads it captured.
              Use the tester above to see the agent in action now.
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="rounded-md border border-border p-4">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
        {n}
      </span>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{body}</p>
    </div>
  );
}
