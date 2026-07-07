# Polish backlog — key-drop-in readiness loop

Working list for the autonomous polish loop. Each iteration: implement item →
extend `scripts/smoke_test.py` → verify → commit + push. Edit priorities here
any time; the loop reads this file each pass.

Loop stops when everything below is ☑ and the final UI pass is green.

## P1 — readiness & report quality

- [x] **A. Readiness doctor** — `python launch.py --check`: one command to run
      after pasting a key. ✓/✗ table: .env, Python deps, framework, sample
      render, intelligence backend (Claude Code login or API key), Deepgram
      key + live auth ping, audio devices, port. Exit code for scripting.
- [x] **B. Follow-up draft** — report generation also produces a short,
      grounded recap email/text (`followup.txt`) with a Copy button in the
      report state. Drafting only — no sending (spec §9).
- [x] **C. Audio rescue** — "Rescue" button per session: re-transcribe
      `audio.wav` via Deepgram prerecorded, rebuild the transcript, then
      generate. Makes the always-written WAV actionable after an outage.
- [x] **D. Consultant/owner labeling** — mark which diarized speaker is Mick;
      transcripts feed the models as Consultant:/Owner: so "their own words"
      quotes attribute correctly. ("I'm speaker" toggle in the transcript pane.)
- [x] **E. Logo embedding** — base64-inline `branding.json.logo_path` into the
      client report so it stays a single, print-perfect file.
- [x] **F. Keyterm boosting** — business + contact names from intake sent to
      Deepgram on streaming, upload, and rescue paths (`keyterm` on
      nova-3/flux, `keywords` on nova-2 — verified against Deepgram docs).

## P2 — presentation polish

- [x] **G. Report-state extras** — Print/save-as-PDF button + one-line session
      cost/usage summary from `costs.json` ($0 wording on subscription).
- [x] **H. Quick-capture nugget** — `N` in live state opens a one-line input;
      the note joins the gold-nuggets list and the report context.

## Final gate

- [x] Playwright pass over all three UI states with the new controls
      (me-toggle roundtrip, N-key nugget through the real endpoint, report
      controls + cost line); screenshots delivered. Loop stopped.

**Backlog complete — 2026-07-07.** Restart the loop any time with /loop if
new items get added here.

## Out of scope (spec §9)

CRM/email sending, calendar, presenter mode, multi-user, pipeline views.
