// Morning digest: yesterday's leads, who booked, who to chase. Sent via
// Resend by /api/cron/digest (7:00am ET = 11:00 UTC, see vercel.json).

import { listEventsBetween, listLeads, listLeadsBetween, listProspects } from './db';
import { whoToChase } from './analytics';
import { env } from './env';
import type { Lead } from './types';

export interface DigestData {
  dateLabel: string;
  newLeads: Lead[];
  booked: Lead[];
  chase: { lead: Lead; reason: string }[];
  outboundDrafted: number;
  totalLeads: number;
}

export async function buildDigest(): Promise<DigestData> {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setUTCHours(0, 0, 0, 0);
  const startYesterday = new Date(startToday.getTime() - 24 * 60 * 60 * 1000);

  const fromIso = startYesterday.toISOString();
  const toIso = startToday.toISOString();

  const [yesterdayLeads, events, allLeads, drafted] = await Promise.all([
    listLeadsBetween(fromIso, toIso),
    listEventsBetween(fromIso, toIso),
    listLeads({ limit: 500 }),
    listProspects({ status: 'drafted', limit: 500 }),
  ]);

  // Booked yesterday = status_changed→booked or GHL booking webhook events.
  const bookedIds = new Set(
    events
      .filter(
        (e) =>
          e.type === 'booked_webhook' ||
          (e.type === 'status_changed' && (e.data as { to?: string }).to === 'booked')
      )
      .map((e) => e.lead_id)
  );
  const byId = new Map(allLeads.map((l) => [l.id, l]));
  const booked = [...bookedIds].map((id) => byId.get(id)).filter((l): l is Lead => Boolean(l));

  return {
    dateLabel: startYesterday.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }),
    newLeads: yesterdayLeads,
    booked,
    chase: whoToChase(allLeads).slice(0, 6),
    outboundDrafted: drafted.length,
    totalLeads: allLeads.length,
  };
}

const S = {
  body: 'margin:0;padding:24px;background:#F6F5F2;font-family:Helvetica,Arial,sans-serif;color:#13212E;',
  card: 'max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:28px;border:1px solid rgba(19,33,46,0.08);',
  h1: 'margin:0 0 4px;font-size:20px;font-weight:800;',
  kicker: 'margin:0 0 18px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#A87600;font-weight:700;',
  h2: 'margin:24px 0 8px;font-size:14px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#576169;',
  row: 'padding:10px 12px;background:#F6F5F2;border-radius:8px;margin-bottom:6px;font-size:14px;line-height:1.45;',
  link: 'color:#A87600;font-weight:700;text-decoration:none;',
  muted: 'color:#576169;',
  footer: 'max-width:560px;margin:14px auto 0;font-size:12px;color:#576169;text-align:center;',
};

function leadLine(l: Lead, extra?: string): string {
  const name = l.business_name || l.email;
  const url = `${env.siteUrl}/admin/leads/${l.id}`;
  const leak = l.audit?.pain_named ? ` — <span style="${S.muted}">${escapeHtml(truncate(l.audit.pain_named, 110))}</span>` : '';
  const tag = l.stage === 'partial' ? ' <strong>(partial)</strong>' : '';
  const phone = l.phone ? ` <span style="${S.muted}">· ${escapeHtml(l.phone)}</span>` : '';
  return `<div style="${S.row}"><a href="${url}" style="${S.link}">${escapeHtml(name)}</a>${phone}${tag}${
    extra ? ` — <span style="${S.muted}">${escapeHtml(extra)}</span>` : leak
  }</div>`;
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function escapeHtml(s: string): string {
  return s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function digestHtml(d: DigestData): string {
  const sections: string[] = [];

  sections.push(
    `<h2 style="${S.h2}">Yesterday’s leads (${d.newLeads.length})</h2>` +
      (d.newLeads.length
        ? d.newLeads.map((l) => leadLine(l)).join('')
        : `<div style="${S.row}"><span style="${S.muted}">No new leads yesterday.</span></div>`)
  );

  sections.push(
    `<h2 style="${S.h2}">Booked (${d.booked.length})</h2>` +
      (d.booked.length
        ? d.booked.map((l) => leadLine(l, 'booked a call')).join('')
        : `<div style="${S.row}"><span style="${S.muted}">No new bookings yesterday.</span></div>`)
  );

  sections.push(
    `<h2 style="${S.h2}">Who to chase (${d.chase.length})</h2>` +
      (d.chase.length
        ? d.chase.map(({ lead, reason }) => leadLine(lead, reason)).join('')
        : `<div style="${S.row}"><span style="${S.muted}">Nobody needs chasing. Nice.</span></div>`)
  );

  if (d.outboundDrafted > 0) {
    sections.push(
      `<h2 style="${S.h2}">Outbound</h2><div style="${S.row}">${d.outboundDrafted} drafted email${
        d.outboundDrafted === 1 ? '' : 's'
      } waiting to be sent — <a href="${env.siteUrl}/admin/outbound" style="${S.link}">open outbound</a></div>`
    );
  }

  return `<!doctype html><html><body style="${S.body}">
  <div style="${S.card}">
    <p style="${S.kicker}">MK Operating — morning digest</p>
    <h1 style="${S.h1}">${d.dateLabel}</h1>
    ${sections.join('')}
    <p style="margin-top:24px;font-size:14px;"><a href="${env.siteUrl}/admin" style="${S.link}">Open the command center →</a></p>
  </div>
  <p style="${S.footer}">${d.totalLeads} leads in the system.</p>
</body></html>`;
}

export function digestSubject(d: DigestData): string {
  const bits = [`${d.newLeads.length} lead${d.newLeads.length === 1 ? '' : 's'}`];
  if (d.booked.length) bits.push(`${d.booked.length} booked`);
  if (d.chase.length) bits.push(`${d.chase.length} to chase`);
  return `MK digest: ${bits.join(', ')}`;
}
