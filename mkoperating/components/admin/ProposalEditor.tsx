'use client';

// Inline proposal editor: every field editable, live preview below, share
// link + mark-sent + print. Autoslim: no rich text, just the fields that
// matter on a one-pager.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Copy, ExternalLink, Plus, Printer, Save, Send, Trash2 } from 'lucide-react';
import { ProposalDoc } from '@/components/proposal/ProposalDoc';
import type { Proposal, ProposalContent } from '@/lib/types';

const TAGS = ['Ready now', 'Run by us', 'One-time build'];
const CADENCES = ['one-time', 'monthly', ''];

export function ProposalEditor({ proposal }: { proposal: Proposal }) {
  const router = useRouter();
  const [content, setContent] = useState<ProposalContent>(proposal.content);
  const [status, setStatus] = useState(proposal.status);
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState('');

  function note(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash(''), 2000);
  }

  async function save(extra: { status?: 'sent' } = {}) {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/proposals/${proposal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, ...extra }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Save failed');
      if (extra.status) setStatus(body.proposal.status);
      note(extra.status === 'sent' ? 'Marked sent.' : 'Saved.');
      router.refresh();
    } catch (e) {
      note(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/p/${proposal.slug}`);
    note('Share link copied.');
  }

  const set = (patch: Partial<ProposalContent>) => setContent({ ...content, ...patch });

  const input = 'field-input !py-2 !text-sm';

  return (
    <div>
      {/* Action bar */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-ink/10 bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => void save()} disabled={busy} className="btn-dark !px-4 !py-2 !text-xs">
            <Save className="h-3.5 w-3.5" /> Save
          </button>
          <button onClick={() => void copyLink()} className="btn-outline !px-4 !py-2 !text-xs">
            <Copy className="h-3.5 w-3.5" /> Copy share link
          </button>
          <a
            href={`/p/${proposal.slug}?preview=1`}
            target="_blank"
            className="btn-outline !px-4 !py-2 !text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Preview
          </a>
          <a href={`/p/${proposal.slug}?preview=1`} target="_blank" className="btn-outline !px-4 !py-2 !text-xs">
            <Printer className="h-3.5 w-3.5" /> PDF (print from preview)
          </a>
          {status === 'draft' ? (
            <button
              onClick={() => void save({ status: 'sent' })}
              disabled={busy}
              className="btn-primary !px-4 !py-2 !text-xs"
            >
              <Send className="h-3.5 w-3.5" /> Mark sent
            </button>
          ) : (
            <span className="rounded-full bg-emerald-50 px-3 py-1.5 font-display text-xs font-bold uppercase text-emerald-700">
              {status}
              {proposal.view_count > 0 ? ` · ${proposal.view_count} views` : ''}
            </span>
          )}
          {flash ? <span className="text-xs font-bold text-ink/60">{flash}</span> : null}
        </div>
      </div>

      <div className="grid gap-8 2xl:grid-cols-2">
        {/* Form */}
        <div className="space-y-6">
          <div>
            <label className="field-label">Title</label>
            <input className={`${input} mt-1.5`} value={content.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className="field-label">Intro</label>
            <textarea
              className={`${input} mt-1.5 min-h-[90px] resize-y`}
              value={content.intro}
              onChange={(e) => set({ intro: e.target.value })}
            />
          </div>

          {/* Scope */}
          <fieldset>
            <legend className="field-label">Scope</legend>
            <div className="mt-2 space-y-3">
              {content.scope.map((s, i) => (
                <div key={i} className="rounded-xl border border-ink/10 bg-white p-4">
                  <div className="flex gap-2">
                    <input
                      className={input}
                      placeholder="Item title"
                      value={s.title}
                      onChange={(e) => {
                        const scope = [...content.scope];
                        scope[i] = { ...s, title: e.target.value };
                        set({ scope });
                      }}
                    />
                    <select
                      className={`${input} w-40 shrink-0`}
                      value={s.tag}
                      onChange={(e) => {
                        const scope = [...content.scope];
                        scope[i] = { ...s, tag: e.target.value };
                        set({ scope });
                      }}
                    >
                      {TAGS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                    <button
                      className="shrink-0 rounded-lg p-2 text-ink/40 hover:bg-red-50 hover:text-red-600"
                      onClick={() => set({ scope: content.scope.filter((_, j) => j !== i) })}
                      aria-label="Remove scope item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <textarea
                    className={`${input} mt-2 min-h-[60px] resize-y`}
                    placeholder="What we deliver"
                    value={s.description}
                    onChange={(e) => {
                      const scope = [...content.scope];
                      scope[i] = { ...s, description: e.target.value };
                      set({ scope });
                    }}
                  />
                </div>
              ))}
              <button
                className="btn-outline !px-3 !py-1.5 !text-xs"
                onClick={() =>
                  set({ scope: [...content.scope, { title: '', description: '', tag: 'Ready now' }] })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add scope item
              </button>
            </div>
          </fieldset>

          {/* Timeline */}
          <fieldset>
            <legend className="field-label">Timeline</legend>
            <div className="mt-2 space-y-3">
              {content.timeline.map((t, i) => (
                <div key={i} className="rounded-xl border border-ink/10 bg-white p-4">
                  <div className="flex gap-2">
                    <input
                      className={input}
                      placeholder="Phase"
                      value={t.phase}
                      onChange={(e) => {
                        const timeline = [...content.timeline];
                        timeline[i] = { ...t, phase: e.target.value };
                        set({ timeline });
                      }}
                    />
                    <input
                      className={`${input} w-32 shrink-0`}
                      placeholder="Days 1–7"
                      value={t.window}
                      onChange={(e) => {
                        const timeline = [...content.timeline];
                        timeline[i] = { ...t, window: e.target.value };
                        set({ timeline });
                      }}
                    />
                    <button
                      className="shrink-0 rounded-lg p-2 text-ink/40 hover:bg-red-50 hover:text-red-600"
                      onClick={() => set({ timeline: content.timeline.filter((_, j) => j !== i) })}
                      aria-label="Remove phase"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <input
                    className={`${input} mt-2`}
                    placeholder="What happens"
                    value={t.detail}
                    onChange={(e) => {
                      const timeline = [...content.timeline];
                      timeline[i] = { ...t, detail: e.target.value };
                      set({ timeline });
                    }}
                  />
                </div>
              ))}
              <button
                className="btn-outline !px-3 !py-1.5 !text-xs"
                onClick={() => set({ timeline: [...content.timeline, { phase: '', window: '', detail: '' }] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add phase
              </button>
            </div>
          </fieldset>

          {/* Pricing */}
          <fieldset>
            <legend className="field-label">Pricing — replace the $___ placeholders</legend>
            <div className="mt-2 space-y-2">
              {content.pricing.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className={input}
                    placeholder="Line item"
                    value={p.item}
                    onChange={(e) => {
                      const pricing = [...content.pricing];
                      pricing[i] = { ...p, item: e.target.value };
                      set({ pricing });
                    }}
                  />
                  <input
                    className={`${input} w-28 shrink-0`}
                    placeholder="$1,500"
                    value={p.price}
                    onChange={(e) => {
                      const pricing = [...content.pricing];
                      pricing[i] = { ...p, price: e.target.value };
                      set({ pricing });
                    }}
                  />
                  <select
                    className={`${input} w-32 shrink-0`}
                    value={p.cadence}
                    onChange={(e) => {
                      const pricing = [...content.pricing];
                      pricing[i] = { ...p, cadence: e.target.value };
                      set({ pricing });
                    }}
                  >
                    {CADENCES.map((c) => (
                      <option key={c} value={c}>
                        {c || '—'}
                      </option>
                    ))}
                  </select>
                  <button
                    className="shrink-0 rounded-lg p-2 text-ink/40 hover:bg-red-50 hover:text-red-600"
                    onClick={() => set({ pricing: content.pricing.filter((_, j) => j !== i) })}
                    aria-label="Remove price row"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                className="btn-outline !px-3 !py-1.5 !text-xs"
                onClick={() => set({ pricing: [...content.pricing, { item: '', price: '$___', cadence: 'one-time' }] })}
              >
                <Plus className="h-3.5 w-3.5" /> Add row
              </button>
            </div>
          </fieldset>

          <div>
            <label className="field-label">Terms</label>
            <textarea
              className={`${input} mt-1.5 min-h-[70px] resize-y`}
              value={content.terms}
              onChange={(e) => set({ terms: e.target.value })}
            />
          </div>

          <p className="text-xs text-ink/40">
            Share link: <code className="rounded bg-ink/5 px-1.5 py-0.5">/p/{proposal.slug}</code> ·
            viewed {proposal.view_count} time{proposal.view_count === 1 ? '' : 's'} ·{' '}
            <Link href={`/admin/leads/${proposal.lead_id}`} className="font-bold text-signal-700">
              back to lead
            </Link>
          </p>
        </div>

        {/* Live preview */}
        <div className="min-w-0">
          <p className="field-label mb-3">Live preview</p>
          <div className="origin-top-left">
            <ProposalDoc content={content} />
          </div>
        </div>
      </div>
    </div>
  );
}
