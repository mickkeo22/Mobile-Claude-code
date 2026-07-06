'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { shortDate } from '@/lib/format';
import type { Lead } from '@/lib/types';

export function GhlPanel({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function retry() {
    setBusy(true);
    setMsg('');
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/ghl-retry`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) setMsg(body.error || 'Push failed — see delivery log below.');
      else setMsg('Pushed to GHL.');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const state =
    lead.ghl_status === 'sent' ? (
      <span className="inline-flex items-center gap-1.5 text-emerald-700">
        <CheckCircle2 className="h-4 w-4" /> Synced to GHL
        {lead.ghl_synced_at ? ` · ${shortDate(lead.ghl_synced_at)}` : ''}
      </span>
    ) : lead.ghl_status === 'failed' ? (
      <span className="inline-flex items-center gap-1.5 text-red-700">
        <AlertCircle className="h-4 w-4" /> Push failed ({lead.ghl_attempts} attempts)
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-ink/60">
        <Clock className="h-4 w-4" /> Pending — waiting for sync
      </span>
    );

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium">{state}</div>
        <button onClick={() => void retry()} disabled={busy} className="btn-outline !px-3 !py-1.5 !text-xs">
          <RefreshCw className={busy ? 'h-3.5 w-3.5 animate-spin' : 'h-3.5 w-3.5'} />
          {busy ? 'Pushing…' : 'Push now'}
        </button>
      </div>
      {lead.ghl_last_error ? (
        <p className="mt-2 break-words text-xs text-ink/50">Last error: {lead.ghl_last_error}</p>
      ) : null}
      {msg ? <p className="mt-2 text-xs font-medium text-ink/70">{msg}</p> : null}
    </div>
  );
}
