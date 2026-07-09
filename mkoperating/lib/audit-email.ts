// The lead-facing audit report email — the fixed template Mick approved.
// One function renders it from any lead's stored audit; nothing here calls
// a generation service. Email-client-safe: tables, inline styles, no JS.

import { BUCKET_META } from './wizard';
import { toAuditText } from './audit-content';
import { sendEmail } from './email';
import { logEvent, updateLead } from './db';
import { env } from './env';
import type { AuditItem, BucketKey, Lead } from './types';

export function auditEmailEnabled(): boolean {
  return Boolean(env.resendKey && env.auditEmailFrom);
}

const FONT = "font-family:Arial,Helvetica,sans-serif;";

function esc(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function reportRef(lead: Lead): string {
  return `MK-${lead.id.replaceAll('-', '').slice(0, 4).toUpperCase()}`;
}

function recBlock(item: AuditItem, n: number, color: string, tint: string): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border:1px solid #e4e7ec;border-left:4px solid ${color};border-radius:10px;">
  <tr><td style="padding:16px 18px;${FONT}">
    <div style="font-size:16px;font-weight:800;color:#13212E;">${n}&nbsp;&nbsp;${esc(item.title)}</div>
    <div style="padding-top:5px;"><span style="background-color:${tint};color:${color};font-size:11px;font-weight:700;border-radius:99px;padding:2px 10px;">${esc(item.impact)}</span></div>
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#98a1ab;padding-top:12px;">What it is</div>
    <div style="font-size:14px;line-height:1.6;color:#3d4a56;padding-top:3px;">${esc(item.what)}</div>
    <div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${color};padding-top:11px;">How it helps your business</div>
    <div style="font-size:14px;line-height:1.6;color:#3d4a56;padding-top:3px;">${esc(item.how)}</div>
    ${
      item.rollout
        ? `<div style="font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#98a1ab;padding-top:11px;">What getting it looks like</div>
    <div style="font-size:14px;line-height:1.6;color:#3d4a56;padding-top:3px;">${esc(item.rollout)}</div>`
        : ''
    }
  </td></tr>
</table>`;
}

export function auditEmailSubject(lead: Lead): string {
  const n = lead.audit?.buckets.reduce((acc, b) => acc + b.items.length, 0) ?? 0;
  const name = lead.business_name || 'your business';
  return `Your audit is ready — ${n} fixes for ${name}, ranked`;
}

export function auditEmailHtml(lead: Lead): string {
  const audit = lead.audit;
  if (!audit) throw new Error('lead has no audit');

  const first = lead.first_name?.trim();
  const business = lead.business_name || 'your business';
  const dateLabel = new Date(lead.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const total = audit.buckets.reduce((acc, b) => acc + b.items.length, 0);
  const count = (k: BucketKey) => audit.buckets.find((b) => b.bucket === k)?.items.length ?? 0;
  const bookParams = new URLSearchParams({ email: lead.email });
  const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ');
  if (fullName) bookParams.set('name', fullName);
  if (lead.phone) bookParams.set('phone', lead.phone);
  const bookUrl = `${env.siteUrl}/book?${bookParams.toString()}`;
  const reportUrl = `${env.siteUrl}/r/${lead.id}`;

  let n = 0;
  const sections = audit.buckets
    .map((group) => {
      const meta = BUCKET_META[group.bucket];
      if (!meta || !group.items.length) return '';
      const recs = group.items.map((item) => recBlock(item, ++n, meta.color, meta.tint)).join('');
      return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;">
  <tr>
    <td style="${FONT}font-size:18px;font-weight:800;color:#13212E;">${esc(meta.label)}</td>
    <td align="right"><span style="${FONT}background-color:${meta.color};color:#ffffff;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;border-radius:99px;padding:4px 12px;">${esc(meta.tag)}</span></td>
  </tr>
  <tr><td colspan="2" style="border-bottom:2px solid ${meta.color};padding-top:8px;"></td></tr>
</table>
${recs}`;
    })
    .join('');

  const facts = [
    { n: total, label: 'fixes ranked', bg: '#F6F5F2', color: '#13212E' },
    { n: count('ghl'), label: 'ready in ~a week', bg: BUCKET_META.ghl.tint, color: BUCKET_META.ghl.color },
    { n: count('plugin'), label: 'run for you', bg: BUCKET_META.plugin.tint, color: BUCKET_META.plugin.color },
    { n: count('build'), label: count('build') === 1 ? 'custom build' : 'custom builds', bg: BUCKET_META.build.tint, color: BUCKET_META.build.color },
  ]
    .map(
      (f) => `<td width="25%" align="center" style="background-color:${f.bg};border-radius:10px;padding:12px 4px;${FONT}">
      <div style="font-size:22px;font-weight:800;color:${f.color};">${f.n}</div><div style="font-size:10.5px;color:${f.color === '#13212E' ? '#5b6470' : f.color};">${f.label}</div></td>`
    )
    .join('<td width="8">&nbsp;</td>');

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${esc(auditEmailSubject(lead))}</title></head>
<body style="margin:0;padding:0;background-color:#EDEBE5;">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Your biggest leak, ${total} ranked fixes, and the one move to make first — your full audit inside.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EDEBE5;">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;">

    <tr><td style="background-color:#13212E;border-radius:14px 14px 0 0;padding:28px 32px 30px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="${FONT}">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
              <td style="background-color:#E5A100;border-radius:8px;width:34px;height:34px;text-align:center;vertical-align:middle;${FONT}font-weight:800;font-size:13px;color:#13212E;">MK</td>
              <td style="padding-left:10px;font-weight:800;font-size:14px;color:#F6F5F2;">MK Operating Company
                <span style="display:block;font-weight:400;font-size:11px;color:#8fa1b0;">mkoperating.com</span></td>
            </tr></table>
          </td>
          <td align="right" style="${FONT}font-size:10px;font-weight:700;letter-spacing:2px;color:#E5A100;text-transform:uppercase;line-height:1.5;">AI &amp; Automation<br>Audit</td>
        </tr>
      </table>
      <div style="border-top:1px solid #2a3b4a;margin:22px 0 24px;"></div>
      <div style="${FONT}font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#E5A100;">Prepared from your answers</div>
      <div style="${FONT}font-weight:800;font-size:27px;line-height:1.15;color:#F6F5F2;padding:10px 0 14px;">${esc(audit.headline)}</div>
      <div style="${FONT}font-size:13px;color:#8fa1b0;">Prepared for <span style="color:#F6F5F2;font-weight:600;">${esc(first || business)}</span> &nbsp;·&nbsp; ${dateLabel} &nbsp;·&nbsp; Report <span style="color:#F6F5F2;font-weight:600;">${reportRef(lead)}</span></div>
    </td></tr>

    <tr><td style="background-color:#FFFFFF;padding:30px 32px 8px;">
      <div style="${FONT}font-size:15px;line-height:1.65;color:#13212E;">
        ${first ? `${esc(first)} — here's` : 'Here’s'} your audit, exactly as promised. Two minutes of your answers, read closely.
      </div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;">
        <tr><td style="background-color:#13212E;border-left:5px solid #E5A100;border-radius:10px;padding:18px 20px;">
          <div style="${FONT}font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#E5A100;">Your biggest leak</div>
          <div style="${FONT}font-size:15px;line-height:1.55;color:#F6F5F2;padding-top:7px;">${esc(audit.pain_named)}</div>
        </td></tr>
      </table>

      <div style="${FONT}font-size:14.5px;line-height:1.65;color:#3d4a56;padding-top:18px;">${esc(audit.summary)}</div>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:20px;"><tr>${facts}</tr></table>

      ${sections}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:30px;">
        <tr><td style="background-color:#FBF1D9;border:2px solid #E5A100;border-radius:12px;padding:20px 22px;${FONT}">
          <div style="font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;color:#A87600;">Start here — your first move</div>
          <div style="font-size:15.5px;font-weight:600;line-height:1.55;color:#13212E;padding-top:7px;">${esc(audit.first_move)}</div>
        </td></tr>
      </table>

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;">
        <tr><td align="center" style="background-color:#13212E;border-radius:12px;padding:26px 24px;${FONT}">
          <div style="font-size:19px;font-weight:800;color:#F6F5F2;">Questions? Let's answer them — free.</div>
          <div style="font-size:13.5px;color:#8fa1b0;padding:8px 0 18px;line-height:1.6;">Grab 15 minutes and I'll walk this report with you: what each fix looks like in your business, what's worth starting with, and what to skip. No pitch, no obligation — the report is yours either way.</div>
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
            <td style="background-color:#E5A100;border-radius:9px;">
              <a href="${bookUrl}" style="display:inline-block;padding:13px 26px;${FONT}font-size:14px;font-weight:800;color:#13212E;text-decoration:none;">Get your questions answered — free →</a>
            </td>
          </tr></table>
          <div style="font-size:12px;padding-top:14px;"><a href="${reportUrl}" style="color:#8fa1b0;text-decoration:underline;">Or view your interactive report online</a></div>
        </td></tr>
      </table>

      <div style="padding:22px 0 20px;${FONT}font-size:12px;line-height:1.6;color:#98a1ab;border-top:1px solid #e4e7ec;margin-top:26px;">
        Prepared by MK Operating Company for ${esc(first ? `${first} at ${business}` : business)}, from the
        answers you gave at mkoperating.com. Based only on what you told us — no invented numbers. No
        obligation; this report is yours to keep either way.<br><br>
        MK Operating Company · <a href="${env.siteUrl}" style="color:#A87600;">mkoperating.com</a> ·
        You're receiving this because you requested a free audit.
      </div>
    </td></tr>
    <tr><td style="background-color:#FFFFFF;border-radius:0 0 14px 14px;height:6px;"></td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}

/** Send the report to the lead. Never throws; logs the outcome per-lead. */
export async function sendAuditReportEmail(lead: Lead): Promise<boolean> {
  if (!lead.audit) return false;
  if (!auditEmailEnabled()) {
    console.warn('[mk:audit-email] skipped — RESEND_API_KEY / AUDIT_EMAIL_FROM not configured');
    return false;
  }
  try {
    const result = await sendEmail({
      to: lead.email,
      from: env.auditEmailFrom,
      subject: auditEmailSubject(lead),
      html: auditEmailHtml(lead),
      text: toAuditText(lead.audit, lead.business_name),
    });
    if (result.ok) {
      await logEvent(lead.id, 'audit_emailed', {});
      if (lead.status === 'new') await updateLead(lead.id, { status: 'emailed' });
      return true;
    }
    await logEvent(lead.id, 'audit_email_failed', { error: result.error ?? 'unknown' });
    return false;
  } catch (e) {
    console.error('[mk:audit-email] send failed:', e);
    await logEvent(lead.id, 'audit_email_failed', { error: String(e).slice(0, 300) });
    return false;
  }
}
