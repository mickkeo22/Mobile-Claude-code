'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { shortDate } from '@/lib/format';
import type { LeadEvent, LeadEventType } from '@/lib/types';

const EVENT_LABEL: Record<LeadEventType, string> = {
  lead_created: 'Lead captured',
  step_saved: 'Wizard step saved',
  audit_generated: 'Audit generated',
  audit_failed: 'Audit generation failed',
  ghl_push_ok: 'Pushed to GHL',
  ghl_push_failed: 'GHL push failed',
  ghl_push_skipped: 'GHL push deferred',
  status_changed: 'Status changed',
  note: 'Note',
  brief_generated: 'Call brief generated',
  call_started: 'Call started',
  call_summary: 'Call summarized',
  proposal_created: 'Proposal drafted',
  proposal_sent: 'Proposal marked sent',
  proposal_viewed: 'Proposal viewed',
  booked_webhook: 'Booking received from GHL',
};

const DOT: Partial<Record<LeadEventType, string>> = {
  audit_generated: 'bg-signal',
  ghl_push_failed: 'bg-red-500',
  audit_failed: 'bg-red-500',
  ghl_push_ok: 'bg-emerald-500',
  note: 'bg-blue-400',
  proposal_viewed: 'bg-purple-500',
  booked_webhook: 'bg-emerald-500',
};

function detail(e: LeadEvent): string {
  const d = e.data as Record<string, unknown>;
  switch (e.type) {
    case 'status_changed':
      return `${d.from} → ${d.to}`;
    case 'step_saved':
      return String(d.step ?? '');
    case 'note':
      return String(d.text ?? '');
    case 'ghl_push_failed':
      return String(d.error ?? '');
    case 'ghl_push_skipped':
      return String(d.reason ?? '');
    case 'call_summary':
      return String(d.pain ?? '');
    default:
      return '';
  }
}

export function NotesTimeline({ leadId, events }: { leadId: string; events: LeadEvent[] }) {
  const router = useRouter();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/leads/${leadId}/note`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      setText('');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={addNote} className="flex gap-2">
        <input
          className="field-input !py-2.5"
          placeholder="Add a note…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn-dark !px-4 !py-2.5" disabled={busy || !text.trim()}>
          Save
        </button>
      </form>

      <ol className="mt-5 space-y-0">
        {events.map((e, i) => (
          <li key={e.id} className="relative flex gap-3 pb-5">
            {i < events.length - 1 ? (
              <span className="absolute left-[5px] top-4 h-full w-px bg-ink/10" aria-hidden />
            ) : null}
            <span
              className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ${DOT[e.type] ?? 'bg-ink/25'}`}
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink">
                {EVENT_LABEL[e.type] ?? e.type}
                <span className="ml-2 text-xs font-normal text-ink/40">{shortDate(e.created_at)}</span>
              </p>
              {detail(e) ? (
                <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-ink/60">{detail(e)}</p>
              ) : null}
            </div>
          </li>
        ))}
        {events.length === 0 ? <p className="text-sm text-ink/50">No activity yet.</p> : null}
      </ol>
    </div>
  );
}
