"""Render the structured audit into the two documents (spec §5).

Document A — report_client.html : single-file HTML, inline CSS, branding
from branding.json, print-to-PDF friendly. Internal fields never leak in.

Document B — report_internal.md : markdown for Mick's eyes, with pricing
anchors injected from pricing.yaml per effort tier.
"""
from __future__ import annotations

import html
import json
from datetime import date

import yaml

from . import config
from .schemas import (AuditReport, BUCKET_LABELS, EFFORT_LABELS,
                      Recommendation)

BUCKET_ORDER = ["automation_systems", "back_office", "custom_builds"]
BUCKET_TAGLINES = {
    "automation_systems": "Systems that respond, follow up, and remind — automatically.",
    "back_office": "Work we take off your plate and run for you.",
    "custom_builds": "Purpose-built tools for how your business actually works.",
}


def load_branding() -> dict:
    defaults = {
        "company_name": "MK Operating Company LLC",
        "prepared_by": "MK Operating Company",
        "logo_path": "",
        "accent_color": "#0e7490",
        "contact_line": "",
        "footer_note": "",
    }
    try:
        defaults.update(json.loads(config.BRANDING_PATH.read_text(encoding="utf-8")))
    except Exception:
        pass
    return defaults


def load_pricing() -> dict:
    try:
        data = yaml.safe_load(config.PRICING_PATH.read_text(encoding="utf-8")) or {}
        return data.get("tiers", {})
    except Exception:
        return {}


def _e(s: str) -> str:
    return html.escape(str(s or ""), quote=True)


# ── Document A: client-facing HTML ────────────────────────────────

def render_client_html(report: AuditReport, intake: dict, report_date: str | None = None) -> str:
    b = load_branding()
    accent = b.get("accent_color", "#0e7490")
    business = intake.get("business_name", "Your Business")
    contact = intake.get("contact_name", "")
    d = report_date or date.today().strftime("%B %d, %Y").replace(" 0", " ")

    logo_html = ""
    if b.get("logo_path"):
        logo_html = f'<img class="logo" src="{_e(b["logo_path"])}" alt="{_e(b["prepared_by"])}">'

    heard = "\n".join(f"<li>{_e(x)}</li>" for x in report.what_we_heard)

    bucket_sections = []
    for bucket in BUCKET_ORDER:
        recs = [r for r in report.recommendations if r.bucket == bucket]
        if not recs:
            continue
        cards = "\n".join(_rec_card(r) for r in recs)
        bucket_sections.append(f"""
      <section class="bucket">
        <h3>{_e(BUCKET_LABELS[bucket])}</h3>
        <p class="bucket-tag">{_e(BUCKET_TAGLINES[bucket])}</p>
        {cards}
      </section>""")

    starting = "\n".join(
        f'<div class="start-item"><strong>{_e(s.name)}</strong><p>{_e(s.why)}</p></div>'
        for s in report.starting_point
    )
    steps = "\n".join(f"<li>{_e(x)}</li>" for x in report.next_steps)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI &amp; Automation Audit — {_e(business)}</title>
<style>
  :root {{ --accent: {accent}; --ink: #1c1f23; --muted: #5b6470; --line: #e4e7ec; }}
  * {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{ font-family: Georgia, 'Times New Roman', serif; color: var(--ink);
         background: #fff; line-height: 1.55; }}
  .page {{ max-width: 780px; margin: 0 auto; padding: 48px 32px 64px; }}
  header {{ border-bottom: 3px solid var(--accent); padding-bottom: 20px; margin-bottom: 32px; }}
  .logo {{ max-height: 48px; margin-bottom: 14px; display: block; }}
  .kicker {{ font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
             font-size: 12px; letter-spacing: .18em; text-transform: uppercase;
             color: var(--accent); font-weight: 700; margin-bottom: 6px; }}
  h1 {{ font-size: 30px; line-height: 1.2; margin-bottom: 8px; }}
  .meta {{ color: var(--muted); font-size: 14px;
           font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }}
  h2 {{ font-size: 21px; margin: 36px 0 12px;
        border-bottom: 1px solid var(--line); padding-bottom: 6px; }}
  h3 {{ font-size: 18px; color: var(--accent); margin: 26px 0 2px; }}
  .bucket-tag {{ color: var(--muted); font-size: 14px; margin-bottom: 12px; font-style: italic; }}
  ul.heard {{ padding-left: 22px; }}
  ul.heard li {{ margin: 8px 0; }}
  .rec {{ border: 1px solid var(--line); border-left: 4px solid var(--accent);
          border-radius: 6px; padding: 16px 18px; margin: 12px 0;
          page-break-inside: avoid; }}
  .rec-head {{ display: flex; justify-content: space-between; align-items: baseline;
               gap: 12px; flex-wrap: wrap; }}
  .rec h4 {{ font-size: 17px; }}
  .badge {{ font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
            font-size: 11px; font-weight: 700; letter-spacing: .06em;
            text-transform: uppercase; color: var(--accent);
            border: 1px solid var(--accent); border-radius: 99px;
            padding: 2px 10px; white-space: nowrap; }}
  .rec p {{ margin: 8px 0 0; font-size: 15px; }}
  .rec .lbl {{ font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif;
               font-size: 11px; font-weight: 700; letter-spacing: .08em;
               text-transform: uppercase; color: var(--muted); display: block;
               margin-top: 10px; }}
  .start {{ background: color-mix(in srgb, var(--accent) 7%, white);
            border-radius: 8px; padding: 18px 20px; margin-top: 8px; }}
  .start-item {{ margin: 10px 0; }}
  .start-item p {{ font-size: 15px; margin-top: 2px; }}
  ol.steps {{ padding-left: 22px; }}
  ol.steps li {{ margin: 8px 0; }}
  footer {{ margin-top: 44px; border-top: 1px solid var(--line); padding-top: 16px;
            color: var(--muted); font-size: 13px;
            font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; }}
  @media print {{
    .page {{ padding: 0; max-width: 100%; }}
    .rec {{ break-inside: avoid; }}
    a {{ color: inherit; text-decoration: none; }}
  }}
</style>
</head>
<body>
<div class="page">
  <header>
    {logo_html}
    <div class="kicker">AI &amp; Automation Audit</div>
    <h1>{_e(business)}</h1>
    <div class="meta">{_e(d)} &nbsp;·&nbsp; Prepared for {_e(contact) if contact else 'the owner'} by {_e(b['prepared_by'])}</div>
  </header>

  <h2>What we heard</h2>
  <ul class="heard">
    {heard}
  </ul>

  <h2>Recommendations</h2>
  {''.join(bucket_sections)}

  <h2>Suggested starting point</h2>
  <div class="start">
    {starting}
  </div>

  <h2>Next steps</h2>
  <ol class="steps">
    {steps}
  </ol>

  <footer>
    <p>{_e(b.get('contact_line', ''))}</p>
    <p>{_e(b.get('footer_note', ''))}</p>
    <p>© {_e(b['company_name'])}</p>
  </footer>
</div>
</body>
</html>
"""


def _rec_card(r: Recommendation) -> str:
    return f"""
        <div class="rec">
          <div class="rec-head">
            <h4>{_e(r.name)}</h4>
            <span class="badge">{_e(EFFORT_LABELS[r.effort])}</span>
          </div>
          <span class="lbl">The problem</span>
          <p>{_e(r.problem)}</p>
          <span class="lbl">What it does</span>
          <p>{_e(r.what_it_does)}</p>
          <span class="lbl">What changes for you</span>
          <p>{_e(r.what_changes)}</p>
        </div>"""


# ── Document B: internal build notes (markdown) ───────────────────

def render_internal_md(report: AuditReport, intake: dict, notable: list[str]) -> str:
    pricing = load_pricing()
    business = intake.get("business_name", "Unknown business")
    lines: list[str] = []
    lines.append(f"# Internal Build Notes — {business}")
    lines.append("")
    lines.append(f"*Internal only. Companion to the client audit for {business}.*")
    lines.append("")

    if report.red_flags:
        lines.append("## ⚠️ Red flags / handle with care")
        lines.append("")
        for f in report.red_flags:
            lines.append(f"- {f}")
        lines.append("")

    lines.append("## Recommendations — implementation detail")
    lines.append("")
    for i, r in enumerate(report.recommendations, 1):
        tier = pricing.get(r.effort, {})
        lines.append(f"### {i}. {r.name}")
        lines.append("")
        lines.append(f"- **Bucket:** {BUCKET_LABELS[r.bucket]}")
        lines.append(f"- **Effort tier:** {EFFORT_LABELS[r.effort]}")
        lines.append(f"- **Client-facing problem:** {r.problem}")
        lines.append(f"- **Implementation path:** {r.implementation_path or 'TBD'}")
        if r.components:
            lines.append("- **Components:**")
            for c in r.components:
                lines.append(f"  - {c}")
        if r.build_hours_high:
            lines.append(f"- **Estimated build:** {r.build_hours_low}–{r.build_hours_high} hours")
        if r.monthly_maintenance:
            lines.append(f"- **Monthly maintenance:** {r.monthly_maintenance}")
        if r.dependencies_risks:
            lines.append("- **Dependencies & risks:**")
            for d in r.dependencies_risks:
                lines.append(f"  - {d}")
        if tier:
            lines.append(
                f"- **Pricing anchor** (pricing.yaml · {tier.get('label', r.effort)}): "
                f"setup ${tier.get('setup_low', '?'):,}–${tier.get('setup_high', '?'):,}, "
                f"monthly ${tier.get('monthly_low', '?'):,}–${tier.get('monthly_high', '?'):,}"
            )
        lines.append("")

    if report.starting_point:
        lines.append("## Suggested sequencing")
        lines.append("")
        for s in report.starting_point:
            lines.append(f"- **Start with {s.name}** — {s.why}")
        lines.append("")

    if notable:
        lines.append("## Gold nuggets captured live")
        lines.append("")
        for n in notable:
            lines.append(f"- {n}")
        lines.append("")

    return "\n".join(lines)
