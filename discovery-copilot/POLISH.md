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
- [ ] **D. Consultant/owner labeling** — mark which diarized speaker is Mick;
      transcripts feed the models as Consultant:/Owner: so "their own words"
      quotes attribute correctly.
- [ ] **E. Logo embedding** — base64-inline `branding.json.logo_path` into the
      client report so it stays a single, print-perfect file.
- [ ] **F. Keyterm boosting** — pass business/contact/industry terms from
      intake to Deepgram (streaming + prerecorded) so proper nouns transcribe
      right. Verify exact nova-3 param against Deepgram docs first.

## P2 — presentation polish

- [ ] **G. Report-state extras** — Print/save-as-PDF button + one-line session
      cost/usage summary from `costs.json`.
- [ ] **H. Quick-capture nugget** — `N` in live state opens a one-line input;
      the note joins the gold-nuggets list and the report context.

## Final gate

- [ ] Playwright pass over all three UI states with the new controls;
      screenshots delivered. Then the loop stops itself.

## Out of scope (spec §9)

CRM/email sending, calendar, presenter mode, multi-user, pipeline views.
