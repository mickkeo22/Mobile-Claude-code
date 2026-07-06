# MK Discovery Copilot

Internal tool for MK Operating Company. A **desktop sidebar app** that listens
to a live discovery conversation (in-person or Zoom), tracks which discovery
areas have been covered, suggests the next question to ask, and — on one
button press — generates a client-facing AI audit report plus internal build
notes in under ~2 minutes.

Single user, single machine, localhost only. No auth, no cloud, no database.

---

## Quick start

```bash
cd discovery-copilot
python3 -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env      # then fill in the two keys:
                          #   DEEPGRAM_API_KEY   (console.deepgram.com)
                          #   ANTHROPIC_API_KEY  (console.anthropic.com)

python launch.py          # starts the server + opens the sidebar window
```

The launcher opens a ~440px browser app-window pinned to the right edge of
your screen. No Chrome/Edge/Brave installed? It falls back to a normal tab —
just resize it into a sidebar.

The app **refuses to start** with a clear message if either key is missing.

### Before your first real call: the 30-second mic test

On the intake screen, pick your input device and hit **🎙 Test mic (5s)** —
it records five seconds, transcribes it, and shows you exactly what it heard.
If the test can't hear you, a real call can't either. Fix audio problems
here, not mid-discovery.

---

## Using it on a call

1. **Intake (30 seconds).** Business name, industry, contact, how the meeting
   happened, any notes you already have. Pick the audio source. Hit **Start**.
2. **During the call**, the sidebar shows:
   - **Coverage pills** for the 8 discovery areas — gray (untouched) →
     yellow (touched) → green (covered). Click a pill to override manually;
     you know better than the model sometimes.
   - **Up to 3 suggested questions**, each with the area it targets and *why*
     ("They mentioned invoices go out late — dig into who creates them").
     Hit **Used it ✓** (or press **Space**) to clear the top one.
   - **Move on** flags when an area is covered deeply and others are untouched.
   - A **💡 gold nuggets** list — quotable ammunition for the report.
   - A collapsible **live transcript** (off by default — look at the human).
3. **Stop & Generate** (big red button, or press **S**). Recording stops,
   and both documents generate — target is under 2 minutes:
   - `report_client.html` — clean, brandable, screen-shareable audit organized
     into Automation Systems / Back-Office Services / Custom Builds.
   - `report_internal.md` — per-recommendation implementation paths, honest
     build-hour ranges, dependencies/risks, and pricing anchors from
     `pricing.yaml`. For your eyes only.
4. **Present.** Open the client report in a new tab and walk the owner
   through it on the spot. If generation fails, the transcript is already
   saved — hit **Retry report**. Never lose a call.

**Keyboard:** `Space` dismisses the top suggestion, `S` = stop & generate.
Both are ignored while you're typing in a form field.

Everything is saved per session under `sessions/{timestamp}_{business}/`:
intake, transcript, coverage, suggestions log, both reports, token costs
(`costs.json`), and the raw `audio.wav` (so even a total transcription outage
can't lose the call — upload the WAV afterwards).

---

## Audio setup

### In person (zero setup)

Pick the built-in laptop mic. Done. Sit the laptop between you and the owner.

### Zoom / Meet calls

Best quality comes from capturing **system audio** via a loopback device:

**macOS — BlackHole (free):**
1. `brew install blackhole-2ch` (or download from existential.audio).
2. Open **Audio MIDI Setup** → `+` → **Create Multi-Output Device**; check
   *both* your speakers/headphones **and** BlackHole 2ch.
3. Set the Mac's **output** to that Multi-Output Device (you still hear the
   call; BlackHole gets a copy).
4. In Discovery Copilot's device dropdown, pick **BlackHole 2ch** as the input.
5. Run the mic test while playing any audio to confirm.

**Windows — VB-Cable (free):**
1. Install VB-CABLE from vb-audio.com, reboot.
2. In Zoom's audio settings, set **speaker** to *CABLE Input*. To still hear
   the call, enable "Listen to this device" on *CABLE Output* (Sound Control
   Panel → Recording → CABLE Output → Properties → Listen).
3. In Discovery Copilot, pick **CABLE Output** as the input device.
4. Mic test to confirm.

**Zero-setup fallback that always works:** play Zoom through your speakers
and let the laptop mic pick everything up. Speaker-separation (diarization)
quality drops, but the tool still functions fine. If loopback setup is
fighting you five minutes before a call, just do this.

### Forgot the laptop? (upload path)

Record the conversation on your phone, then: intake form → audio source →
**⬆ Upload a recording**. It transcribes the file (m4a/mp3/wav/etc.) and
generates both reports.

---

## The discovery framework is yours to edit

The "brain" lives in `framework/` as plain YAML — **no code changes needed**:

- `framework/core.yaml` — 8 industry-agnostic areas (money in, books, leads,
  scheduling, customer comms, internal ops, tools stack, owner's time), each
  with probe questions and *depth signals* (what "covered" means).
- `framework/overlays/*.yaml` — additive industry overlays: home services,
  retail, professional services, restaurant/hospitality. Matched from the
  intake industry dropdown, or by keyword from your free-text description.
  No match → core runs alone; the tool works for any business.

Add a question to any YAML file, restart the app, and it shows up (check the
*Discovery framework* drawer on the intake screen to see the merged result).

Prompts are equally editable, in `prompts/`:
- `live_suggester.md` — the live engine's instructions (re-read every call,
  no restart needed).
- `report_client.md` — report generation rules, including the
  anti-hallucination language rules.

Branding (`branding.json`: logo path, accent color, footer) and pricing
anchors (`pricing.yaml`) are config files too.

---

## Costs

- **Deepgram** streaming (nova tier) is well under a cent per minute — a
  45-minute discovery call is trivial. The stream is closed the moment you
  hit Stop.
- **Live suggestions** run on `claude-haiku-4-5` with debounce rules (at most
  one call per 20s, skipped entirely during dead air, rolling 2,000-word
  window) — a 45-minute call lands well under a dollar.
- **Reports** are one `claude-sonnet-4-6` call per session (map-reduce first
  if the transcript exceeds ~25k words).

Every call's token counts and estimated dollars are logged to each session's
`costs.json`.

---

## Developing / demoing without a live call

A fully fabricated (clearly labeled) 20-minute furniture-store session ships
in `sessions/_sample/` — see its README.

- **Demo the report pipeline (M5):** intake screen → *Previous sessions* →
  **Hartwell Home Furnishings (SAMPLE)** → *Generate*. Watch both documents
  appear.
- **Demo the live engine (M4):** with the server running,
  `python scripts/replay_session.py --speed 20` creates a live session and
  feeds the sample transcript through the real pipeline — pills light up,
  suggestions stream in, and it finishes with a real report.
- **Offline sanity checks:** `python scripts/smoke_test.py` (no keys, no
  network, no audio needed).

## Build milestones (spec §8)

| Milestone | Where |
|---|---|
| M1 audio + transcription | `app/audio.py`, `app/deepgram_live.py` → `transcript.jsonl` |
| M2 UI shell + WebSocket | `app/main.py` (`/ws`), `app/static/` |
| M3 framework loader | `app/framework.py`, `framework/*.yaml`, manual pill toggling |
| M4 live suggestion engine | `app/live_engine.py`, `prompts/live_suggester.md`, replay script |
| M5 report generation | `app/reports.py`, `app/report_render.py`, works on saved sessions |
| M6 polish | mic test, reconnect/error states, retry button, this README, `launch.py` |

## Troubleshooting

- **"No input devices found"** — PortAudio missing (`brew install portaudio`
  on macOS, `apt install libportaudio2` on Linux) or mic permissions denied
  (macOS: System Settings → Privacy & Security → Microphone → your terminal).
- **Mic test hears nothing** — wrong device selected, or input volume at
  zero. For loopback devices, remember the test only hears *played* audio.
- **"Transcription dropped — reconnecting"** mid-call — network blip; the
  app retries with backoff and keeps writing `audio.wav` regardless. Worst
  case, upload the WAV after the call.
- **Report failed** — the transcript is safe on disk; hit *Retry report*.
  Check the terminal for the underlying API error.
- **Anthropic hiccups mid-call** — suggestions silently skip a cycle and
  resume; transcription is unaffected.

## Explicitly not here (v1)

Mobile capture, CRM/email/calendar integration, multi-user/auth/cloud,
tone coaching, proposal generation. See the build spec.
