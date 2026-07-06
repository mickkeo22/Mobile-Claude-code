import Link from 'next/link';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import { listLeads } from '@/lib/db';
import { STATUS_META, STATUS_ORDER, timeAgo } from '@/lib/format';
import { PageHeader, StatusPill, EmptyState } from '@/components/admin/ui';
import type { LeadStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; stage?: string };
}) {
  const q = searchParams.q?.trim() || '';
  const status = (searchParams.status as LeadStatus | 'all') || 'all';
  const stage = (searchParams.stage as 'partial' | 'completed' | 'all') || 'all';
  const leads = await listLeads({ search: q || undefined, status, stage, limit: 300 });

  const filterHref = (patch: Record<string, string>) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status !== 'all') params.set('status', status);
    if (stage !== 'all') params.set('stage', stage);
    for (const [k, v] of Object.entries(patch)) {
      if (v === 'all' || !v) params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return `/admin/leads${s ? `?${s}` : ''}`;
  };

  return (
    <main className="px-4 py-6 sm:px-8">
      <PageHeader title="Leads" sub={`${leads.length} shown`} />

      {/* Search */}
      <form action="/admin/leads" method="GET" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search name, business, or email…"
          className="field-input !py-2.5 pl-10"
        />
        {status !== 'all' ? <input type="hidden" name="status" value={status} /> : null}
        {stage !== 'all' ? <input type="hidden" name="stage" value={stage} /> : null}
      </form>

      {/* Status filter pills */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={filterHref({ status: 'all' })}
          className={clsx(
            'rounded-full border px-3 py-1.5 font-display text-xs font-bold',
            status === 'all' ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white text-ink/60 hover:border-ink/50'
          )}
        >
          All
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link
            key={s}
            href={filterHref({ status: s === status ? 'all' : s })}
            className={clsx(
              'rounded-full border px-3 py-1.5 font-display text-xs font-bold',
              s === status ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white text-ink/60 hover:border-ink/50'
            )}
          >
            {STATUS_META[s].label}
          </Link>
        ))}
        <span className="mx-1 hidden w-px bg-ink/10 sm:block" />
        {(['completed', 'partial'] as const).map((st) => (
          <Link
            key={st}
            href={filterHref({ stage: st === stage ? 'all' : st })}
            className={clsx(
              'rounded-full border px-3 py-1.5 font-display text-xs font-bold capitalize',
              st === stage ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white text-ink/60 hover:border-ink/50'
            )}
          >
            {st}
          </Link>
        ))}
      </div>

      {/* List */}
      <div className="mt-5 space-y-2">
        {leads.length === 0 ? (
          <EmptyState title="No leads match" body="Try clearing the filters or searching differently." />
        ) : (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/admin/leads/${lead.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3.5 transition-colors hover:border-signal"
            >
              <div className="min-w-0">
                <p className="truncate font-display font-bold text-ink">
                  {lead.business_name || lead.email}
                  {lead.stage === 'partial' ? (
                    <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink/50">
                      partial
                    </span>
                  ) : null}
                  {lead.ghl_status === 'failed' ? (
                    <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-red-600">
                      ghl failed
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-ink/60">
                  {lead.first_name ? `${lead.first_name} · ` : ''}
                  {lead.email} · {timeAgo(lead.created_at)}
                </p>
              </div>
              <StatusPill status={lead.status} />
            </Link>
          ))
        )}
      </div>
    </main>
  );
}
