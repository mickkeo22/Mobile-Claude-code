'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FileText, RefreshCw, Copy, Eye } from 'lucide-react';
import { shortDate } from '@/lib/format';
import type { Proposal } from '@/lib/types';

export function ProposalPanel({ leadId, proposal }: { leadId: string; proposal: Proposal | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/proposal`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Proposal generation failed.');
      router.push(`/admin/proposals/${body.proposal.id}`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Proposal generation failed.');
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!proposal) return;
    const url = `${window.location.origin}/p/${proposal.slug}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!proposal) {
    return (
      <div>
        <button onClick={() => void generate()} disabled={busy} className="btn-primary !px-4 !py-2 !text-xs">
          {busy ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
          {busy ? 'Drafting…' : 'Generate proposal'}
        </button>
        <p className="mt-2 text-sm text-ink/50">
          Drafts a branded one-pager from the audit{`'`}s ready-now items and the call scope.
          Editable before anything is shared.
        </p>
        {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-ink">{proposal.content.title || 'Proposal'}</p>
          <p className="text-xs text-ink/50">
            {proposal.status === 'draft' ? 'Draft' : proposal.status === 'sent' ? 'Sent' : 'Viewed'} ·
            created {shortDate(proposal.created_at)}
            {proposal.view_count > 0 ? (
              <span className="ml-1 inline-flex items-center gap-1 font-bold text-purple-700">
                <Eye className="h-3 w-3" /> {proposal.view_count} view{proposal.view_count === 1 ? '' : 's'}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/proposals/${proposal.id}`} className="btn-outline !px-3 !py-1.5 !text-xs">
            Edit
          </Link>
          <button onClick={() => void copyLink()} className="btn-dark !px-3 !py-1.5 !text-xs">
            <Copy className="h-3.5 w-3.5" /> {copied ? 'Copied!' : 'Copy link'}
          </button>
        </div>
      </div>
    </div>
  );
}
