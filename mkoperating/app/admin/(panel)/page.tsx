import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { dashboardData } from '@/lib/analytics';
import { storageMode } from '@/lib/db';
import { env } from '@/lib/env';
import { emailConfigured } from '@/lib/email';
import { timeAgo } from '@/lib/format';
import { KpiTile, PageHeader, StatusPill, EmptyState } from '@/components/admin/ui';

export const dynamic = 'force-dynamic';

function ConfigWarnings() {
  const warnings: { key: string; text: string }[] = [];
  if (storageMode() === 'memory') {
    warnings.push({
      key: 'db',
      text: 'Supabase is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY) — leads are NOT being stored durably.',
    });
  }
  if (!env.ghlWebhookUrl) {
    warnings.push({
      key: 'ghl',
      text: 'GHL_WEBHOOK_URL is not set — leads are stored here but not pushed to GHL. They queue as “pending” and sync automatically once you set it.',
    });
  }
  if (!env.anthropicKey && !env.demoMode) {
    warnings.push({ key: 'ai', text: 'ANTHROPIC_API_KEY is not set — audit generation will fail.' });
  }
  if (!emailConfigured()) {
    warnings.push({
      key: 'email',
      text: 'Resend is not configured (RESEND_API_KEY / DIGEST_EMAIL_TO) — the morning digest is skipped.',
    });
  }
  if (!warnings.length) return null;
  return (
    <div className="mb-6 space-y-2">
      {warnings.map((w) => (
        <div
          key={w.key}
          className="flex items-start gap-3 rounded-xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-ink"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-signal-700" />
          <p>{w.text}</p>
        </div>
      ))}
    </div>
  );
}

export default async function AdminDashboard() {
  const { funnel, kpis, chase, leads } = await dashboardData();
  const recent = leads.slice(0, 8);
  const bookRate = funnel.auditsReady ? Math.round((kpis.booked / Math.max(kpis.completed, 1)) * 100) : 0;

  return (
    <main className="px-4 py-6 sm:px-8">
      <PageHeader title="Dashboard" sub={`Last ${funnel.days} days of funnel activity`}>
        <a
          href="/api/admin/digest-test"
          target="_blank"
          className="font-display text-sm font-bold text-signal-700 hover:text-ink"
        >
          Preview morning digest →
        </a>
      </PageHeader>
      <ConfigWarnings />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile label="Leads (7 days)" value={kpis.last7} hint={`${kpis.total} all time`} />
        <KpiTile label="Audits generated" value={funnel.auditsReady} hint={`${funnel.auditErrors} errors`} />
        <KpiTile label="Booked+" value={kpis.booked} hint={`${bookRate}% of completed`} />
        <KpiTile label="Won" value={kpis.won} hint={`${kpis.byStatus['lost'] ?? 0} lost`} />
      </div>

      {(kpis.ghlFailed > 0 || kpis.ghlPending > 0) && (
        <div className="mt-3 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink/70">
          GHL sync: <strong>{kpis.ghlPending}</strong> pending · <strong>{kpis.ghlFailed}</strong>{' '}
          failed — the hourly sweep retries automatically.
        </div>
      )}

      <div className="mt-8 grid gap-8 xl:grid-cols-2">
        {/* Funnel drop-off */}
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">Wizard drop-off</h2>
          <p className="text-sm text-ink/50">Unique sessions reaching each step</p>
          <div className="card mt-3 space-y-2.5 !p-5">
            {funnel.steps.map((s) => {
              const max = Math.max(funnel.steps[0]?.views ?? 1, 1);
              const pct = Math.round((s.views / max) * 100);
              return (
                <div key={s.key}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink/80">{s.label}</span>
                    <span className="font-display text-xs font-bold text-ink/50">
                      {s.views} viewed · {s.completes} completed
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
                    <div
                      className="h-full rounded-full bg-signal"
                      style={{ width: `${Math.max(pct, s.views > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-baseline justify-between border-t border-ink/10 pt-3 text-sm">
              <span className="font-bold text-ink">Audits generated</span>
              <span className="font-display text-xs font-bold text-ink/50">
                {funnel.auditsReady} of {funnel.submits} submits
              </span>
            </div>
          </div>
        </section>

        {/* Who to chase */}
        <section>
          <h2 className="font-display text-lg font-extrabold text-ink">Who to chase</h2>
          <p className="text-sm text-ink/50">Ordered by what will move revenue today</p>
          <div className="mt-3 space-y-2">
            {chase.length === 0 ? (
              <EmptyState title="Nobody needs chasing" body="New leads and stalled deals show up here." />
            ) : (
              chase.slice(0, 8).map(({ lead, reason }) => (
                <Link
                  key={lead.id}
                  href={`/admin/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 transition-colors hover:border-signal"
                >
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold text-ink">
                      {lead.business_name || lead.email}
                    </p>
                    <p className="truncate text-sm text-ink/60">{reason}</p>
                  </div>
                  <StatusPill status={lead.status} />
                </Link>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Recent leads */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-lg font-extrabold text-ink">Recent leads</h2>
          <Link href="/admin/leads" className="font-display text-sm font-bold text-signal-700 hover:text-ink">
            All leads →
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {recent.length === 0 ? (
            <EmptyState
              title="No leads yet"
              body="Completed and partial audits land here the moment they happen."
            />
          ) : (
            recent.map((lead) => (
              <Link
                key={lead.id}
                href={`/admin/leads/${lead.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3 transition-colors hover:border-signal"
              >
                <div className="min-w-0">
                  <p className="truncate font-display font-bold text-ink">
                    {lead.business_name || lead.email}
                    {lead.stage === 'partial' ? (
                      <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink/50">
                        partial
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-sm text-ink/60">
                    {lead.email} · {timeAgo(lead.created_at)}
                  </p>
                </div>
                <StatusPill status={lead.status} />
              </Link>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
