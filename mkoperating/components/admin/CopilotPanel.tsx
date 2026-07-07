'use client';

// Discovery copilot on the lead detail page: pre-brief + entry into
// full-screen call mode + the post-call summary once it exists.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Sparkles, PhoneCall, RefreshCw } from 'lucide-react';
import { BUCKET_META } from '@/lib/wizard';
import type { CallRecord } from '@/lib/types';

export function CopilotPanel({ leadId, call }: { leadId: string; call: CallRecord | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function generateBrief() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/brief`, { method: 'POST' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Brief generation failed.');
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brief generation failed.');
    } finally {
      setBusy(false);
    }
  }

  const brief = call?.brief;
  const summary = call?.summary;

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => void generateBrief()} disabled={busy} className="btn-outline !px-4 !py-2 !text-xs">
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {busy ? 'Prepping…' : brief ? 'Regenerate brief' : 'Prep the call'}
        </button>
        <Link href={`/admin/leads/${leadId}/call`} className="btn-primary !px-4 !py-2 !text-xs">
          <PhoneCall className="h-3.5 w-3.5" />
          {call?.status === 'done' ? 'Reopen call mode' : 'Call mode'}
        </Link>
      </div>
      {error ? <p className="text-sm font-medium text-red-700">{error}</p> : null}

      {/* Pre-brief */}
      {brief ? (
        <div className="space-y-4 rounded-xl border border-ink/10 bg-white p-5">
          <div>
            <p className="field-label">Snapshot</p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{brief.snapshot}</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="field-label">Likely pains</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink/80">
                {brief.pains.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="field-label">Quick wins</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink/80">
                {brief.quick_wins.map((p, i) => (
                  <li key={i}>{p}</li>
                ))}
              </ul>
            </div>
          </div>
          <div>
            <p className="field-label">Objections to expect</p>
            <div className="mt-2 space-y-2">
              {brief.objections.map((o, i) => (
                <div key={i} className="rounded-lg bg-paper p-3 text-sm">
                  <p className="font-bold text-ink">{o.objection}</p>
                  <p className="mt-1 text-ink/70">{o.response}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="field-label">Discovery questions</p>
            <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-sm text-ink/80">
              {brief.questions.map((q, i) => (
                <li key={i}>
                  {q.q} <span className="text-ink/45">— {q.why}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink/50">
          No brief yet. “Prep the call” builds pains, objections, and tailored questions from their
          answers and audit.
        </p>
      )}

      {/* Post-call summary */}
      {summary ? (
        <div className="space-y-4 rounded-xl border-2 border-signal/40 bg-signal/5 p-5">
          <p className="eyebrow text-signal-700">Call summary</p>
          <p className="text-sm leading-relaxed text-ink/85">{summary.summary}</p>
          <div>
            <p className="field-label">Pain confirmed</p>
            <p className="mt-1 text-sm font-medium text-ink">{summary.pain_confirmed}</p>
          </div>
          <div>
            <p className="field-label">Recommended scope</p>
            <ul className="mt-2 space-y-2">
              {summary.scope.map((s, i) => {
                const meta = BUCKET_META[s.bucket];
                return (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span
                      className="mt-1 rounded-full px-2 py-0.5 text-[0.6rem] font-bold uppercase text-white"
                      style={{ backgroundColor: meta?.color ?? '#13212E' }}
                    >
                      {meta?.tag ?? s.bucket}
                    </span>
                    <span>
                      <strong>{s.title}</strong>{' '}
                      <span className="text-ink/60">— {s.note}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="field-label">Next steps</p>
              <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink/80">
                {summary.next_steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            {summary.risks.length ? (
              <div>
                <p className="field-label">Risks</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-ink/80">
                  {summary.risks.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
