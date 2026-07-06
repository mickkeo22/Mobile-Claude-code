'use client';

// Full-screen call mode. Designed for one hand and a glance: dark screen,
// huge type, tap targets everywhere, minimal typing. Autosaves continuously.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Check, Sparkles, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import type { CallLive, CallRecord, Lead } from '@/lib/types';

const DEFAULT_QUESTIONS = [
  { q: 'When a lead calls and you can’t answer, what happens to them today?', why: 'sizes the leak' },
  { q: 'How many estimates go out a month — and how many close?', why: 'follow-up value' },
  { q: 'Who chases overdue invoices, and when?', why: 'back-office fit' },
  { q: 'What would need to be true to take a full day off?', why: 'emotional driver' },
  { q: 'If we fixed one thing in 30 days, what should it be?', why: 'priority anchor' },
];

const SIGNALS = [
  'Pain confirmed',
  'Urgent',
  'Budget OK',
  'Price sensitive',
  'Skeptical of tech',
  'Tried software before',
  'Wants it done for them',
  'Mentioned competitor',
  'Ready to start',
  'Needs partner sign-off',
];

const CHECKLIST = [
  'Walked the audit',
  'Named the biggest leak',
  'Ready-now scope agreed',
  'Pricing discussed',
  'Next step agreed',
  'Follow-up scheduled',
];

export function CallMode({ lead, call: initialCall }: { lead: Lead; call: CallRecord | null }) {
  const router = useRouter();
  const [live, setLive] = useState<CallLive>(
    initialCall?.live ?? { notes: '', asked: [], signals: [], checklist: [] }
  );
  const [briefBusy, setBriefBusy] = useState(false);
  const [brief, setBrief] = useState(initialCall?.brief ?? null);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const startRef = useRef<number>(
    initialCall?.live.started_at ? new Date(initialCall.live.started_at).getTime() : Date.now()
  );
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const liveRef = useRef(live);
  liveRef.current = live;

  const questions = useMemo(
    () => (brief?.questions?.length ? brief.questions : DEFAULT_QUESTIONS),
    [brief]
  );

  // mark the call live on mount
  useEffect(() => {
    void fetch(`/api/admin/leads/${lead.id}/call`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'live', live: liveRef.current }),
    });
    const t = setInterval(() => setElapsed(Date.now() - startRef.current), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  const scheduleSave = useCallback(
    (next: CallLive) => {
      setLive(next);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        void fetch(`/api/admin/leads/${lead.id}/call`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ live: next }),
          keepalive: true,
        }).then((r) => r.ok && setSavedAt(Date.now()));
      }, 700);
    },
    [lead.id]
  );

  function toggleIn(list: string[], value: string): string[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  async function loadBrief() {
    setBriefBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/brief`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Brief failed.');
      setBrief(body.call.brief);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Brief failed.');
    } finally {
      setBriefBusy(false);
    }
  }

  async function endCall() {
    if (!window.confirm('End the call and generate the summary + recommended scope?')) return;
    setEnding(true);
    setError('');
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      await fetch(`/api/admin/leads/${lead.id}/call`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ live: { ...liveRef.current, ended_at: new Date().toISOString() } }),
      });
      const res = await fetch(`/api/admin/leads/${lead.id}/summary`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Summary failed.');
      router.push(`/admin/leads/${lead.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Summary failed — your notes are saved.');
      setEnding(false);
    }
  }

  const mm = String(Math.floor(elapsed / 60000)).padStart(2, '0');
  const ss = String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0');

  return (
    <div className="min-h-screen bg-ink text-paper">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-paper/10 bg-ink/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold">
              {lead.business_name || lead.email}
            </p>
            <p className="text-xs text-paper/50">
              {lead.first_name ? `${lead.first_name} · ` : ''}
              <span className="tabular-nums">{mm}:{ss}</span>
              {savedAt ? ' · saved' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => void endCall()}
              disabled={ending}
              className="rounded-lg bg-signal px-4 py-2 font-display text-xs font-bold text-ink disabled:opacity-60"
            >
              {ending ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Summarizing…
                </span>
              ) : (
                'End call → summary'
              )}
            </button>
            <Link
              href={`/admin/leads/${lead.id}`}
              className="rounded-lg p-2 text-paper/60 hover:bg-paper/10 hover:text-paper"
              aria-label="Exit call mode"
            >
              <X className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-6 pb-28">
        {error ? (
          <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
            {error}
          </p>
        ) : null}

        {/* The leak, always visible */}
        {lead.audit?.pain_named ? (
          <div className="rounded-xl border-l-4 border-signal bg-paper/5 p-4">
            <p className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-signal">
              Their biggest leak
            </p>
            <p className="mt-1 text-base leading-snug text-paper/90">{lead.audit.pain_named}</p>
          </div>
        ) : null}

        {!brief ? (
          <button
            onClick={() => void loadBrief()}
            disabled={briefBusy}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-paper/25 p-4 font-display text-sm font-bold text-paper/70 hover:bg-paper/5"
          >
            {briefBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {briefBusy ? 'Prepping brief…' : 'Generate tailored questions from their audit'}
          </button>
        ) : null}

        {/* Questions — tap when asked */}
        <section aria-label="Discovery questions">
          <h2 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-paper/50">
            Ask — tap when covered
          </h2>
          <ul className="mt-3 space-y-2">
            {questions.map((q, i) => {
              const key = q.q;
              const asked = live.asked.includes(key);
              return (
                <li key={i}>
                  <button
                    onClick={() => scheduleSave({ ...live, asked: toggleIn(live.asked, key) })}
                    className={clsx(
                      'flex w-full items-start gap-3 rounded-xl p-4 text-left transition-colors',
                      asked ? 'bg-paper/5 text-paper/35' : 'bg-paper/10 hover:bg-paper/15'
                    )}
                  >
                    <span
                      className={clsx(
                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2',
                        asked ? 'border-signal bg-signal text-ink' : 'border-paper/30'
                      )}
                    >
                      {asked ? <Check className="h-4 w-4" /> : null}
                    </span>
                    <span>
                      <span className={clsx('block text-lg font-medium leading-snug', asked && 'line-through')}>
                        {q.q}
                      </span>
                      <span className="mt-0.5 block text-xs text-paper/40">{q.why}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Signals — quick capture */}
        <section aria-label="Signals">
          <h2 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-paper/50">
            Tap what you hear
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {SIGNALS.map((s) => {
              const on = live.signals.includes(s);
              return (
                <button
                  key={s}
                  onClick={() => scheduleSave({ ...live, signals: toggleIn(live.signals, s) })}
                  aria-pressed={on}
                  className={clsx(
                    'rounded-full border-2 px-4 py-2.5 font-display text-sm font-bold transition-colors',
                    on
                      ? 'border-signal bg-signal text-ink'
                      : 'border-paper/25 text-paper/70 hover:border-paper/50'
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </section>

        {/* Checklist */}
        <section aria-label="Call checklist">
          <h2 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-paper/50">
            Before you hang up
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {CHECKLIST.map((item) => {
              const on = live.checklist.includes(item);
              return (
                <li key={item}>
                  <button
                    onClick={() => scheduleSave({ ...live, checklist: toggleIn(live.checklist, item) })}
                    className={clsx(
                      'flex w-full items-center gap-3 rounded-xl p-3.5 text-left font-medium transition-colors',
                      on ? 'bg-signal/20 text-paper' : 'bg-paper/10 text-paper/70 hover:bg-paper/15'
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2',
                        on ? 'border-signal bg-signal text-ink' : 'border-paper/30'
                      )}
                    >
                      {on ? <Check className="h-4 w-4" /> : null}
                    </span>
                    {item}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Notes */}
        <section aria-label="Notes">
          <h2 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-paper/50">
            Notes — shorthand is fine
          </h2>
          <textarea
            className="mt-3 min-h-[140px] w-full resize-y rounded-xl border border-paper/20 bg-paper/5 p-4 text-base leading-relaxed text-paper placeholder:text-paper/30 focus:border-signal focus:outline-none"
            placeholder="20 quotes/mo, closes 8 · wants storm-season ready · wife does books…"
            value={live.notes}
            onChange={(e) => scheduleSave({ ...live, notes: e.target.value })}
          />
        </section>

        {/* Objection cheat-sheet from the brief */}
        {brief?.objections?.length ? (
          <section aria-label="Objections">
            <h2 className="font-display text-[0.65rem] font-bold uppercase tracking-[0.16em] text-paper/50">
              If they push back
            </h2>
            <div className="mt-3 space-y-2">
              {brief.objections.map((o, i) => (
                <details key={i} className="rounded-xl bg-paper/5 p-4">
                  <summary className="cursor-pointer font-medium text-paper/85">{o.objection}</summary>
                  <p className="mt-2 text-sm leading-relaxed text-paper/60">{o.response}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
