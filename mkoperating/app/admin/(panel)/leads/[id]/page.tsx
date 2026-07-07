import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Mail } from 'lucide-react';
import { getCallForLead, getLead, getProposalForLead, listEvents } from '@/lib/db';
import { shortDate } from '@/lib/format';
import { StatusControl } from '@/components/admin/StatusControl';
import { GhlPanel } from '@/components/admin/GhlPanel';
import { NotesTimeline } from '@/components/admin/NotesTimeline';
import { CopilotPanel } from '@/components/admin/CopilotPanel';
import { ProposalPanel } from '@/components/admin/ProposalPanel';
import { AuditResults } from '@/components/audit/AuditResults';
import { WIZARD_STEPS } from '@/lib/wizard';
import type { MultiAnswer } from '@/lib/types';

export const dynamic = 'force-dynamic';

function AnswerRow({ label, value }: { label: string; value?: MultiAnswer | string }) {
  if (!value || (typeof value !== 'string' && !value.picks?.length && !value.detail)) return null;
  return (
    <div>
      <p className="field-label">{label}</p>
      {typeof value === 'string' ? (
        <p className="mt-1 text-sm text-ink/80">{value}</p>
      ) : (
        <div className="mt-1.5">
          {value.picks?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {value.picks.map((p) => (
                <span key={p} className="rounded-full bg-paper px-2.5 py-1 text-xs font-medium text-ink/80">
                  {p}
                </span>
              ))}
            </div>
          ) : null}
          {value.detail ? (
            <p className="mt-2 border-l-2 border-signal/60 pl-3 text-sm italic text-ink/70">
              &ldquo;{value.detail}&rdquo;
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
  const lead = await getLead(params.id);
  if (!lead) notFound();

  const [events, call, proposal] = await Promise.all([
    listEvents(lead.id),
    getCallForLead(lead.id),
    getProposalForLead(lead.id),
  ]);

  const a = lead.answers;

  return (
    <main className="px-4 py-6 sm:px-8">
      <Link
        href="/admin/leads"
        className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-ink/50 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Leads
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-extrabold text-ink sm:text-3xl">
            {lead.business_name || lead.email}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink/60">
            {lead.first_name ? <span>{lead.first_name}</span> : null}
            <a
              href={`mailto:${lead.email}`}
              className="inline-flex items-center gap-1 font-medium text-signal-700 hover:text-ink"
            >
              <Mail className="h-3.5 w-3.5" /> {lead.email}
            </a>
            <span>captured {shortDate(lead.created_at)}</span>
            {lead.stage === 'partial' ? (
              <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink/50">
                partial — abandoned mid-wizard
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <StatusControl leadId={lead.id} status={lead.status} />
      </div>

      <div className="mt-6 grid gap-8 xl:grid-cols-[1fr,380px]">
        <div className="min-w-0 space-y-8">
          {/* GHL sync */}
          <section>
            <h2 className="mb-2 font-display text-lg font-extrabold text-ink">GHL sync</h2>
            <GhlPanel lead={lead} />
          </section>

          {/* Copilot */}
          <section>
            <h2 className="mb-2 font-display text-lg font-extrabold text-ink">Discovery copilot</h2>
            <CopilotPanel leadId={lead.id} call={call} />
          </section>

          {/* Proposal */}
          <section>
            <h2 className="mb-2 font-display text-lg font-extrabold text-ink">Proposal</h2>
            <ProposalPanel leadId={lead.id} proposal={proposal} />
          </section>

          {/* Answers */}
          <section>
            <h2 className="mb-2 font-display text-lg font-extrabold text-ink">Their answers</h2>
            <div className="space-y-4 rounded-xl border border-ink/10 bg-white p-5">
              <AnswerRow label="Business name" value={lead.business_name ?? undefined} />
              {WIZARD_STEPS.filter((s) => s.kind === 'multi').map((s) => (
                <AnswerRow
                  key={s.key}
                  label={s.label}
                  value={a[s.key as keyof typeof a] as MultiAnswer | undefined}
                />
              ))}
            </div>
          </section>

          {/* Audit */}
          <section>
            <h2 className="mb-3 font-display text-lg font-extrabold text-ink">Their audit</h2>
            {lead.audit ? (
              <AuditResults audit={lead.audit} showBooking={false} compact />
            ) : (
              <p className="rounded-xl border border-dashed border-ink/20 bg-white/60 p-6 text-sm text-ink/50">
                No audit yet — they left before finishing the wizard.
              </p>
            )}
          </section>
        </div>

        {/* Timeline */}
        <aside>
          <h2 className="mb-2 font-display text-lg font-extrabold text-ink">Activity & notes</h2>
          <div className="rounded-xl border border-ink/10 bg-white p-5">
            <NotesTimeline leadId={lead.id} events={events} />
          </div>
        </aside>
      </div>
    </main>
  );
}
