import clsx from 'clsx';
import { STATUS_META } from '@/lib/format';
import type { LeadStatus } from '@/lib/types';

export function StatusPill({ status, className }: { status: LeadStatus; className?: string }) {
  const meta = STATUS_META[status] ?? STATUS_META.new;
  return (
    <span
      className={clsx(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-display text-[0.68rem] font-bold uppercase tracking-wide',
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}

export function KpiTile({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-ink/10 bg-white p-4">
      <p className="font-display text-[0.68rem] font-bold uppercase tracking-[0.12em] text-ink/50">
        {label}
      </p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-ink/50">{hint}</p> : null}
    </div>
  );
}

export function PageHeader({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink">{title}</h1>
        {sub ? <p className="mt-1 text-sm text-ink/60">{sub}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-ink/20 bg-white/60 p-8 text-center">
      <p className="font-display font-bold text-ink/70">{title}</p>
      {body ? <p className="mt-1 text-sm text-ink/50">{body}</p> : null}
    </div>
  );
}
