# ⚠️ SYNTHETIC TEST DATA

Everything in this folder is **fabricated** — a made-up 20-minute discovery
conversation with a fictional furniture store ("Hartwell Home Furnishings",
owner "Dana"). It exists so the live suggestion engine (M4) and report
generation (M5) can be developed and demoed **without a live call**:

- Replay it through the live UI:
  `python scripts/replay_session.py --speed 20`
- Generate reports from it: open the app → *Previous sessions* →
  **Hartwell Home Furnishings (SAMPLE)** → *Generate*.

`report_client.html` / `report_internal.md` here were rendered from the
hand-written `report_data.json` to demo the document design — also synthetic.

No real business, person, or conversation is represented.
