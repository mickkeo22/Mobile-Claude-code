#!/usr/bin/env python3
"""Replay a saved transcript through the live pipeline — develop/demo the
live suggestion engine (M4) without a real call.

    python scripts/replay_session.py                 # replays _sample at 15x
    python scripts/replay_session.py --speed 30      # faster
    python scripts/replay_session.py --session <id>  # replay any session
    python scripts/replay_session.py --no-stop       # leave it live at the end

Requires the server to be running (python launch.py or uvicorn app.main:app).
Creates a NEW session (suffix "-replay"), feeds segments through /ingest at
conversational pacing ÷ speed, then hits Stop & Generate unless --no-stop.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import httpx

BASE_DIR = Path(__file__).resolve().parent.parent


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--session", default="_sample", help="session folder to replay")
    ap.add_argument("--speed", type=float, default=15.0, help="time compression factor")
    ap.add_argument("--host", default="http://127.0.0.1:8710")
    ap.add_argument("--no-stop", action="store_true",
                    help="don't stop/generate at the end (leave the session live)")
    args = ap.parse_args()

    src = BASE_DIR / "sessions" / args.session
    transcript = src / "transcript.jsonl"
    if not transcript.exists():
        print(f"no transcript at {transcript}", file=sys.stderr)
        return 1
    intake = {}
    if (src / "intake.json").exists():
        intake = json.loads((src / "intake.json").read_text(encoding="utf-8"))

    segs = [json.loads(l) for l in transcript.read_text(encoding="utf-8").splitlines() if l.strip()]
    print(f"replaying {len(segs)} segments from {args.session} at {args.speed}x")

    c = httpx.Client(base_url=args.host, timeout=30.0)
    try:
        c.get("/api/health").raise_for_status()
    except Exception as e:
        print(f"server not reachable at {args.host} — start it first ({e})", file=sys.stderr)
        return 1

    created = c.post("/api/sessions", json={
        "business_name": (intake.get("business_name", args.session) + " (replay)"),
        "industry": intake.get("industry", ""),
        "industry_detail": intake.get("industry_detail", ""),
        "contact_name": intake.get("contact_name", ""),
        "meeting_source": intake.get("meeting_source", ""),
        "notes": "REPLAY of saved session — synthetic/dev data.",
        "audio_source": "none",
    }).json()
    sid = created["id"]
    r = c.post(f"/api/sessions/{sid}/start", json={"with_audio": False})
    if r.status_code != 200:
        print(f"could not start: {r.text}", file=sys.stderr)
        return 1
    print(f"live session {sid} — watch it at {args.host}")

    prev = segs[0].get("start", 0.0)
    for i, seg in enumerate(segs):
        gap = max(0.0, (seg.get("start", 0.0) - prev)) / max(args.speed, 0.1)
        time.sleep(min(gap, 8.0))
        prev = seg.get("start", 0.0)
        c.post(f"/api/sessions/{sid}/ingest", json=seg).raise_for_status()
        print(f"  [{i + 1}/{len(segs)}] S{seg.get('speaker')}: {seg.get('text', '')[:70]}…")

    if args.no_stop:
        print(f"done — session {sid} is still live; stop it from the UI.")
        return 0
    print("stopping + generating reports…")
    c.post(f"/api/sessions/{sid}/stop").raise_for_status()
    print("watch the UI for progress; reports land in sessions/" + sid)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
