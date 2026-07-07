'use client';

// Outbound workspace: paste/upload a CSV of local service businesses, batch-
// generate personalized teasers + email drafts, copy and send manually.
// Deliberately no auto-send — the status pipeline is ready for automation
// to bolt on later.

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import {
  ChevronDown,
  Copy,
  Globe,
  Loader2,
  Mail,
  Sparkles,
  Upload,
} from 'lucide-react';
import clsx from 'clsx';
import type { Prospect, ProspectStatus } from '@/lib/types';

const STATUS_STYLE: Record<ProspectStatus, string> = {
  new: 'bg-signal/15 text-signal-700',
  drafted: 'bg-blue-50 text-blue-700',
  sent: 'bg-emerald-50 text-emerald-700',
  replied: 'bg-purple-50 text-purple-700',
  converted: 'bg-ink text-signal',
  dead: 'bg-ink/5 text-ink/40',
};

const NEXT_STATUSES: ProspectStatus[] = ['new', 'drafted', 'sent', 'replied', 'converted', 'dead'];

function ImportPanel({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState('');
  const [batch, setBatch] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function importCsv() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/outbound/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv, batch }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Import failed');
      setMsg(`Imported ${body.imported} prospects into batch “${body.batch}”${body.skipped ? ` (${body.skipped} rows skipped)` : ''}.`);
      setCsv('');
      onDone();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(String(reader.result ?? ''));
    reader.readAsText(f);
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 font-display text-sm font-bold text-ink"
      >
        <span className="inline-flex items-center gap-2">
          <Upload className="h-4 w-4 text-signal-700" /> Import CSV
        </span>
        <ChevronDown className={clsx('h-4 w-4 transition-transform', open && 'rotate-180')} />
      </button>
      {open ? (
        <div className="border-t border-ink/10 p-4">
          <p className="text-sm text-ink/60">
            Columns: <code className="rounded bg-ink/5 px-1">name, niche, town, website, email</code>{' '}
            (header row optional — extra columns are ignored).
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="btn-outline !px-3 !py-1.5 !text-xs">
              Choose file…
            </button>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            <input
              className="field-input !w-56 !py-1.5 !text-sm"
              placeholder={`Batch name (default ${new Date().toISOString().slice(0, 10)})`}
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
            />
          </div>
          <textarea
            className="field-input mt-3 min-h-[120px] font-mono !text-xs"
            placeholder={'Or paste CSV here…\nSummit Tree & Land,Tree service,Fairfield,summittree.com,dave@summittree.com'}
            value={csv}
            onChange={(e) => setCsv(e.target.value)}
          />
          <div className="mt-3 flex items-center gap-3">
            <button onClick={() => void importCsv()} disabled={busy || !csv.trim()} className="btn-primary !px-4 !py-2 !text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              Import
            </button>
            {msg ? <p className="text-xs font-medium text-ink/70">{msg}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProspectCard({ prospect, onChanged }: { prospect: Prospect; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/outbound/${prospect.id}/generate`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Generation failed');
      setOpen(true);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: ProspectStatus) {
    await fetch(`/api/admin/outbound/${prospect.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    onChanged();
  }

  async function copy(kind: string, text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(''), 1200);
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-white">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <p className="truncate font-display font-bold text-ink">
            {prospect.name}
            <span className="ml-2 text-xs font-medium text-ink/40">
              {[prospect.niche, prospect.town].filter(Boolean).join(' · ')}
            </span>
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-ink/50">
            {prospect.email ? (
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3 w-3" /> {prospect.email}
              </span>
            ) : (
              <span className="italic">no email</span>
            )}
            {prospect.website ? (
              <span className="inline-flex items-center gap-1">
                <Globe className="h-3 w-3" /> {prospect.website}
              </span>
            ) : null}
          </p>
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={clsx(
              'rounded-full px-2.5 py-1 font-display text-[0.65rem] font-bold uppercase tracking-wide',
              STATUS_STYLE[prospect.status]
            )}
          >
            {prospect.status}
          </span>
          {!prospect.email_body ? (
            <button onClick={() => void generate()} disabled={busy} className="btn-primary !px-3 !py-1.5 !text-xs">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              Draft
            </button>
          ) : (
            <button
              onClick={() => setOpen(!open)}
              className="btn-outline !px-3 !py-1.5 !text-xs"
              aria-expanded={open}
            >
              <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', open && 'rotate-180')} />
            </button>
          )}
        </div>
      </div>

      {error ? <p className="px-4 pb-3 text-xs font-medium text-red-700">{error}</p> : null}

      {open && (prospect.teaser || prospect.email_body) ? (
        <div className="space-y-4 border-t border-ink/10 p-4">
          {prospect.teaser ? (
            <div className="rounded-lg bg-paper p-3.5 text-sm">
              <p className="field-label">Mini-audit teaser</p>
              <p className="mt-1.5 font-medium text-ink">{prospect.teaser.hook}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-ink/75">
                {prospect.teaser.leaks.map((l, i) => (
                  <li key={i}>{l}</li>
                ))}
              </ul>
              <p className="mt-2 text-ink/75">
                <strong>First fix:</strong> {prospect.teaser.fix}
              </p>
            </div>
          ) : null}

          {prospect.email_body ? (
            <div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="field-label">Email draft — copy, tweak, send from your inbox</p>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => void copy('subject', prospect.email_subject ?? '')}
                    className="btn-outline !px-2.5 !py-1 !text-[0.65rem]"
                  >
                    <Copy className="h-3 w-3" /> {copied === 'subject' ? 'Copied!' : 'Subject'}
                  </button>
                  <button
                    onClick={() => void copy('body', prospect.email_body ?? '')}
                    className="btn-outline !px-2.5 !py-1 !text-[0.65rem]"
                  >
                    <Copy className="h-3 w-3" /> {copied === 'body' ? 'Copied!' : 'Body'}
                  </button>
                  {prospect.email ? (
                    <a
                      href={`mailto:${prospect.email}?subject=${encodeURIComponent(prospect.email_subject ?? '')}&body=${encodeURIComponent(prospect.email_body ?? '')}`}
                      className="btn-dark !px-2.5 !py-1 !text-[0.65rem]"
                    >
                      <Mail className="h-3 w-3" /> Open in mail
                    </a>
                  ) : null}
                </div>
              </div>
              <div className="mt-2 rounded-lg border border-ink/10 bg-white p-3.5 text-sm">
                <p className="font-bold text-ink">{prospect.email_subject}</p>
                <p className="mt-2 whitespace-pre-wrap leading-relaxed text-ink/80">{prospect.email_body}</p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-ink/40">Mark:</span>
            {NEXT_STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => void setStatus(s)}
                className={clsx(
                  'rounded-full border px-2.5 py-1 font-display text-[0.65rem] font-bold uppercase',
                  s === prospect.status
                    ? 'border-ink bg-ink text-paper'
                    : 'border-ink/15 text-ink/50 hover:border-ink/40'
                )}
              >
                {s}
              </button>
            ))}
            <button onClick={() => void generate()} disabled={busy} className="ml-auto btn-outline !px-2.5 !py-1 !text-[0.65rem]">
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Redraft
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function OutboundClient({
  prospects,
  batches,
}: {
  prospects: Prospect[];
  batches: string[];
}) {
  const router = useRouter();
  const [batch, setBatch] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  const refresh = () => router.refresh();

  const visible = prospects.filter(
    (p) => (batch === 'all' || p.batch === batch) && (status === 'all' || p.status === status)
  );
  const undrafted = visible.filter((p) => !p.email_body);

  async function draftAll() {
    if (!undrafted.length || bulkBusy) return;
    if (!window.confirm(`Generate drafts for ${undrafted.length} prospects? Runs one at a time.`)) return;
    setBulkBusy(true);
    let done = 0;
    for (const p of undrafted) {
      setBulkProgress(`${done + 1}/${undrafted.length} — ${p.name}`);
      try {
        await fetch(`/api/admin/outbound/${p.id}/generate`, { method: 'POST' });
      } catch {
        /* keep going */
      }
      done++;
    }
    setBulkBusy(false);
    setBulkProgress('');
    refresh();
  }

  return (
    <div className="space-y-4">
      <ImportPanel onDone={refresh} />

      <div className="flex flex-wrap items-center gap-2">
        <select className="field-input !w-auto !py-2 !text-sm" value={batch} onChange={(e) => setBatch(e.target.value)}>
          <option value="all">All batches</option>
          {batches.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
        <select className="field-input !w-auto !py-2 !text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {NEXT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {undrafted.length > 0 ? (
          <button onClick={() => void draftAll()} disabled={bulkBusy} className="btn-dark !px-4 !py-2 !text-xs">
            {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {bulkBusy ? bulkProgress : `Draft all ${undrafted.length} undrafted`}
          </button>
        ) : null}
        <span className="ml-auto text-sm text-ink/50">{visible.length} prospects</span>
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/20 bg-white/60 p-8 text-center">
            <p className="font-display font-bold text-ink/70">No prospects yet</p>
            <p className="mt-1 text-sm text-ink/50">
              Import a CSV of local service businesses to start a batch.
            </p>
          </div>
        ) : (
          visible.map((p) => <ProspectCard key={p.id} prospect={p} onChanged={refresh} />)
        )}
      </div>
    </div>
  );
}
