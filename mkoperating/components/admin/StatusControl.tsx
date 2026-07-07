'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import clsx from 'clsx';
import { STATUS_META, STATUS_ORDER } from '@/lib/format';
import type { LeadStatus } from '@/lib/types';

export function StatusControl({ leadId, status }: { leadId: string; status: LeadStatus }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function setStatus(next: LeadStatus) {
    if (next === status || busy) return;
    setBusy(true);
    try {
      await fetch(`/api/admin/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lead status">
      {STATUS_ORDER.map((s) => (
        <button
          key={s}
          onClick={() => void setStatus(s)}
          disabled={busy}
          aria-pressed={s === status}
          className={clsx(
            'rounded-full border px-3 py-1.5 font-display text-xs font-bold transition-colors disabled:opacity-60',
            s === status
              ? 'border-ink bg-ink text-paper'
              : 'border-ink/20 bg-white text-ink/60 hover:border-ink/50'
          )}
        >
          {STATUS_META[s].label}
        </button>
      ))}
    </div>
  );
}
