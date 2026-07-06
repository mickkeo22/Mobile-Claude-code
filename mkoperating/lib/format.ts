import type { LeadStatus } from './types';

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export const STATUS_META: Record<LeadStatus, { label: string; className: string }> = {
  new: { label: 'New', className: 'bg-signal/15 text-signal-700 border-signal/40' },
  emailed: { label: 'Emailed', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  booked: { label: 'Booked', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  call_done: { label: 'Call done', className: 'bg-teal-50 text-teal-700 border-teal-200' },
  proposal_sent: { label: 'Proposal sent', className: 'bg-purple-50 text-purple-700 border-purple-200' },
  won: { label: 'Won', className: 'bg-ink text-signal border-ink' },
  lost: { label: 'Lost', className: 'bg-ink/5 text-ink/50 border-ink/10' },
};

export const STATUS_ORDER: LeadStatus[] = [
  'new',
  'emailed',
  'booked',
  'call_done',
  'proposal_sent',
  'won',
  'lost',
];
