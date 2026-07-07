'use client';

// CRUD for the trust pages — add real testimonials and work items without
// touching code. Unpublished entries stay hidden from the public site.

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Eye, EyeOff, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import clsx from 'clsx';
import type { Testimonial, WorkItem } from '@/lib/types';

const input = 'field-input !py-2 !text-sm';

function TestimonialForm({
  initial,
  onClose,
}: {
  initial: Partial<Testimonial>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [t, setT] = useState<Partial<Testimonial>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(published: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/content/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...t, published }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-signal/40 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Quote *</label>
          <textarea
            className={`${input} mt-1 min-h-[80px]`}
            value={t.quote ?? ''}
            onChange={(e) => setT({ ...t, quote: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Author *</label>
          <input className={`${input} mt-1`} value={t.author ?? ''} onChange={(e) => setT({ ...t, author: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Company</label>
          <input className={`${input} mt-1`} value={t.company ?? ''} onChange={(e) => setT({ ...t, company: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Role</label>
          <input className={`${input} mt-1`} placeholder="Owner" value={t.role ?? ''} onChange={(e) => setT({ ...t, role: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Headline result</label>
          <input
            className={`${input} mt-1`}
            placeholder="Booked 9 extra jobs in 30 days"
            value={t.result ?? ''}
            onChange={(e) => setT({ ...t, result: e.target.value })}
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button onClick={() => void save(true)} disabled={busy} className="btn-primary !px-4 !py-2 !text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save & publish
        </button>
        <button onClick={() => void save(false)} disabled={busy} className="btn-outline !px-4 !py-2 !text-xs">
          Save draft
        </button>
        <button onClick={onClose} className="btn-outline !border-transparent !px-3 !py-2 !text-xs">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

function WorkForm({ initial, onClose }: { initial: Partial<WorkItem>; onClose: () => void }) {
  const router = useRouter();
  const [w, setW] = useState<Partial<WorkItem>>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save(published: boolean) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/content/work', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...w, published }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      onClose();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border-2 border-signal/40 bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Title *</label>
          <input
            className={`${input} mt-1`}
            placeholder="Missed-call rescue for a two-crew tree service"
            value={w.title ?? ''}
            onChange={(e) => setW({ ...w, title: e.target.value })}
          />
        </div>
        <div>
          <label className="field-label">Niche</label>
          <input className={`${input} mt-1`} placeholder="Tree service" value={w.niche ?? ''} onChange={(e) => setW({ ...w, niche: e.target.value })} />
        </div>
        <div>
          <label className="field-label">Town</label>
          <input className={`${input} mt-1`} value={w.town ?? ''} onChange={(e) => setW({ ...w, town: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">The leak (problem)</label>
          <textarea className={`${input} mt-1 min-h-[60px]`} value={w.problem ?? ''} onChange={(e) => setW({ ...w, problem: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">What we built</label>
          <textarea className={`${input} mt-1 min-h-[60px]`} value={w.built ?? ''} onChange={(e) => setW({ ...w, built: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label">Result (with a number if you have one)</label>
          <input
            className={`${input} mt-1`}
            placeholder="11 recovered calls in the first month — 4 became jobs"
            value={w.result ?? ''}
            onChange={(e) => setW({ ...w, result: e.target.value })}
          />
        </div>
      </div>
      {error ? <p className="mt-2 text-sm font-medium text-red-700">{error}</p> : null}
      <div className="mt-4 flex gap-2">
        <button onClick={() => void save(true)} disabled={busy} className="btn-primary !px-4 !py-2 !text-xs">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null} Save & publish
        </button>
        <button onClick={() => void save(false)} disabled={busy} className="btn-outline !px-4 !py-2 !text-xs">
          Save draft
        </button>
        <button onClick={onClose} className="btn-outline !border-transparent !px-3 !py-2 !text-xs">
          <X className="h-3.5 w-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

export function ContentManager({
  testimonials,
  work,
}: {
  testimonials: Testimonial[];
  work: WorkItem[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<'testimonials' | 'work'>('testimonials');
  const [editing, setEditing] = useState<string | 'new' | null>(null);

  async function togglePublish(kind: 'testimonials' | 'work', item: Testimonial | WorkItem) {
    await fetch(`/api/admin/content/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, published: !item.published }),
    });
    router.refresh();
  }

  async function remove(kind: 'testimonials' | 'work', id: string) {
    if (!window.confirm('Delete this entry for good?')) return;
    await fetch(`/api/admin/content/${kind}?id=${id}`, { method: 'DELETE' });
    router.refresh();
  }

  const items = tab === 'testimonials' ? testimonials : work;

  return (
    <div>
      <div className="flex gap-2">
        {(['testimonials', 'work'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setEditing(null);
            }}
            className={clsx(
              'rounded-full border px-4 py-2 font-display text-xs font-bold capitalize',
              tab === t ? 'border-ink bg-ink text-paper' : 'border-ink/20 bg-white text-ink/60'
            )}
          >
            {t === 'work' ? 'Our work' : 'Testimonials'} ({t === 'work' ? work.length : testimonials.length})
          </button>
        ))}
        <button onClick={() => setEditing('new')} className="btn-primary ml-auto !px-4 !py-2 !text-xs">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {editing === 'new' ? (
        <div className="mt-4">
          {tab === 'testimonials' ? (
            <TestimonialForm initial={{}} onClose={() => setEditing(null)} />
          ) : (
            <WorkForm initial={{}} onClose={() => setEditing(null)} />
          )}
        </div>
      ) : null}

      <div className="mt-4 space-y-2">
        {items.length === 0 && editing !== 'new' ? (
          <div className="rounded-xl border border-dashed border-ink/20 bg-white/60 p-8 text-center">
            <p className="font-display font-bold text-ink/70">Nothing here yet</p>
            <p className="mt-1 text-sm text-ink/50">
              Add real entries as results land — they appear on the public pages the moment you publish.
            </p>
          </div>
        ) : null}

        {items.map((item) =>
          editing === item.id ? (
            tab === 'testimonials' ? (
              <TestimonialForm key={item.id} initial={item} onClose={() => setEditing(null)} />
            ) : (
              <WorkForm key={item.id} initial={item} onClose={() => setEditing(null)} />
            )
          ) : (
            <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-display font-bold text-ink">
                  {'quote' in item && tab === 'testimonials'
                    ? (item as Testimonial).author
                    : (item as WorkItem).title}
                  {!item.published ? (
                    <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-[0.65rem] font-bold uppercase text-ink/50">
                      draft
                    </span>
                  ) : null}
                </p>
                <p className="truncate text-sm text-ink/55">
                  {tab === 'testimonials' ? (item as Testimonial).quote : (item as WorkItem).problem}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => void togglePublish(tab, item)}
                  className="rounded-lg p-2 text-ink/40 hover:bg-ink/5 hover:text-ink"
                  title={item.published ? 'Unpublish' : 'Publish'}
                >
                  {item.published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => setEditing(item.id)}
                  className="rounded-lg p-2 text-ink/40 hover:bg-ink/5 hover:text-ink"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => void remove(tab, item.id)}
                  className="rounded-lg p-2 text-ink/40 hover:bg-red-50 hover:text-red-600"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
