import { FileText, Clock, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, Badge } from "@/components/ui";
import { ContentGenerator } from "@/components/dashboard/content-generator";
import { getClients, getContent } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import type { ContentItem, ContentStatus } from "@/lib/types/database";

const GROUPS: {
  status: ContentStatus;
  label: string;
  tone: "muted" | "warning" | "success";
  icon: React.ReactNode;
}[] = [
  {
    status: "draft",
    label: "Drafts",
    tone: "muted",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    status: "scheduled",
    label: "Scheduled",
    tone: "warning",
    icon: <Clock className="h-4 w-4" />,
  },
  {
    status: "published",
    label: "Published",
    tone: "success",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
];

export default async function ContentPage() {
  const [clients, content] = await Promise.all([getClients(), getContent()]);
  const clientNames: Record<string, string> = Object.fromEntries(
    clients.map((c) => [c.id, c.name]),
  );
  const clientOptions = clients.map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <PageHeader
        title="Content Studio"
        description="Generate on-brand blogs, social posts, emails, and review replies for every client."
      />

      {clientOptions.length > 0 && (
        <ContentGenerator clients={clientOptions} />
      )}

      <div className="space-y-6">
        {GROUPS.map((group) => {
          const items = content.filter((c) => c.status === group.status);
          return (
            <section key={group.status}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-medium">
                <span className="text-muted-foreground">{group.icon}</span>
                {group.label}
                <span className="text-muted-foreground">({items.length})</span>
              </h2>
              {items.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Nothing {group.label.toLowerCase()} yet.
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item: ContentItem) => (
                    <Card key={item.id} className="flex flex-col p-4">
                      <div className="flex items-center justify-between gap-2">
                        <Badge tone="info">{item.type.replace("_", " ")}</Badge>
                        <Badge tone={group.tone}>{item.status}</Badge>
                      </div>
                      <p className="mt-3 font-medium leading-snug">
                        {item.title}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                        {item.body}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                        <span>{clientNames[item.client_id] ?? "—"}</span>
                        <span>
                          {item.scheduled_for
                            ? `Scheduled ${formatDate(item.scheduled_for)}`
                            : item.platform ?? formatDate(item.created_at)}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
