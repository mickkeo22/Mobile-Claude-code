#!/usr/bin/env python3
"""Offline smoke tests — no API keys, no network, no audio hardware needed.

    python scripts/smoke_test.py

Also (re)renders sessions/_sample/report_client.html + report_internal.md
from the hand-written report_data.json, which doubles as the renderer test.
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

# dummy keys so importing the app never trips the fail-loud check
os.environ.setdefault("DEEPGRAM_API_KEY", "smoke-test-dummy")
os.environ.setdefault("ANTHROPIC_API_KEY", "smoke-test-dummy")

FAILURES: list[str] = []


def check(name: str, fn) -> None:
    try:
        fn()
        print(f"  ✓ {name}")
    except Exception as e:
        FAILURES.append(name)
        print(f"  ✗ {name}: {e.__class__.__name__}: {e}")


def t_framework():
    from app.framework import Framework, fresh_coverage, areas_for_prompt
    fw = Framework.load()
    assert len(fw.core) == 8, f"expected 8 core areas, got {len(fw.core)}"
    assert len(fw.overlays) == 4, f"expected 4 overlays, got {len(fw.overlays)}"
    for a in fw.core:
        assert 4 <= len(a.probe_questions) <= 6, f"{a.id}: {len(a.probe_questions)} probe questions"
        assert a.depth_signals, f"{a.id}: no depth signals"
    # overlay merge is additive
    base = fw.merged_areas(None)
    retail = fw.merged_areas(fw.overlays["retail"])
    base_q = sum(len(a.probe_questions) for a in base)
    retail_q = sum(len(a.probe_questions) for a in retail)
    assert retail_q > base_q, "retail overlay added no questions"
    # keyword matching from free text
    assert fw.match_overlay("", "family furniture store").id == "retail"
    assert fw.match_overlay("", "tree service and pressure washing").id == "home_services"
    assert fw.match_overlay("other", "quantum yak grooming") is None
    assert fw.match_overlay("professional_services", "").id == "professional_services"
    cov = fresh_coverage(base)
    assert set(cov["areas"]) == {a.id for a in base}
    assert "money_in" in areas_for_prompt(base)


def t_sample_transcript():
    p = BASE_DIR / "sessions" / "_sample" / "transcript.jsonl"
    segs = [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]
    assert len(segs) > 40, "sample transcript suspiciously short"
    for s in segs:
        assert s["words"] == len(s["text"].split()), f"stale word count at {s['start']}"
        assert s["speaker"] in (0, 1)
    dur = segs[-1]["end"]
    assert 1100 <= dur <= 1300, f"expected ~20-minute sample, got {dur}s"
    total = sum(s["words"] for s in segs)
    assert 2000 <= total <= 3500, f"unrealistic word count {total}"


def t_schemas():
    from app.schemas import AnalysisResult, AuditReport
    a = AnalysisResult.model_validate({
        "coverage_updates": [{"area": "money_in", "status": "touched", "evidence": "x"}],
        "suggestions": [{"area": "books", "question": "Who reconciles?", "why": "…",
                         "priority": "dig_deeper"}],
        "move_on": [], "notable": ["paying $400/mo for a CRM nobody uses"],
    })
    assert a.suggestions[0].priority == "dig_deeper"
    data = json.loads((BASE_DIR / "sessions" / "_sample" / "report_data.json").read_text(encoding="utf-8"))
    report = AuditReport.model_validate(data)
    assert len(report.recommendations) >= 4
    assert {r.bucket for r in report.recommendations} == {
        "automation_systems", "back_office", "custom_builds"}
    assert 3 <= len(report.what_we_heard) <= 5
    assert 1 <= len(report.starting_point) <= 2


def t_render_sample_reports():
    from app.schemas import AuditReport
    from app import report_render
    sample = BASE_DIR / "sessions" / "_sample"
    report = AuditReport.model_validate(json.loads((sample / "report_data.json").read_text(encoding="utf-8")))
    intake = json.loads((sample / "intake.json").read_text(encoding="utf-8"))
    coverage = json.loads((sample / "coverage.json").read_text(encoding="utf-8"))

    html = report_render.render_client_html(report, intake, report_date="July 1, 2026")
    assert "Hartwell Home Furnishings" in html
    assert "Missed-Call Text-Back" in html
    assert "What we heard" in html
    # internal-only content must never leak into the client doc
    assert "build_hours" not in html and "gun-shy" not in html.lower()
    assert "implementation_path" not in html and "GHL" not in html
    (sample / "report_client.html").write_text(html, encoding="utf-8")

    md = report_render.render_internal_md(report, intake, coverage.get("notable", []))
    assert "Pricing anchor" in md, "pricing.yaml anchors missing from internal notes"
    assert "Red flags" in md
    assert "Gold nuggets" in md
    (sample / "report_internal.md").write_text(md, encoding="utf-8")


def t_deepgram_rest_parsing():
    from app import deepgram_rest
    fake = {"results": {
        "utterances": [
            {"start": 0.5, "end": 3.2, "speaker": 0, "transcript": "Hello there Dana."},
            {"start": 3.9, "end": 6.0, "speaker": 1, "transcript": "Hi, come on in."},
        ],
        "channels": [{"alternatives": [{"transcript": "Hello there Dana. Hi, come on in."}]}],
    }}
    segs = deepgram_rest.to_segments(fake)
    assert len(segs) == 2 and segs[1]["speaker"] == 1 and segs[0]["words"] == 3
    assert deepgram_rest.plain_text(fake).startswith("Hello")
    nosplit = {"results": {"channels": [{"alternatives": [{"transcript": "just one blob"}]}]}}
    assert deepgram_rest.to_segments(nosplit)[0]["words"] == 3


def t_session_store():
    from app.sessions import SessionStore
    with tempfile.TemporaryDirectory() as td:
        st = SessionStore(Path(td) / "20260101_000000_test")
        st.write_intake({"business_name": "Test Co"})
        st.append_segment({"start": 0, "end": 2, "speaker": 0, "text": "hello world", "words": 2})
        st.append_segment({"start": 2, "end": 4, "speaker": 1, "text": "hi", "words": 1})
        assert len(st.read_transcript()) == 2
        assert "Speaker 1" in st.transcript_text()
        st.log_cost("live_analysis", "claude-haiku-4-5", 1000, 200)
        costs = st._read_json("costs.json", {})
        assert costs["totals"]["input_tokens"] == 1000
        assert 0 < costs["totals"]["est_cost_usd"] < 0.01


def t_engine_cadence():
    """Debounce rules without any API calls."""
    import asyncio
    from app.framework import Framework, fresh_coverage
    from app.live_engine import SuggestionEngine

    async def run():
        fw = Framework.load()
        areas = fw.merged_areas(None)
        eng = SuggestionEngine(
            llm=None, areas=areas, intake={}, coverage=fresh_coverage(areas),
            on_update=None, log_cycle=lambda r: None, log_cost=lambda *a: None,
        )
        assert not eng._should_analyze(), "should not fire with no words"
        eng.feed({"start": 0, "end": 30, "speaker": 1,
                  "text": "word " * 50, "words": 50})
        assert eng.turn_trigger, ">40-word answer should set the turn trigger"
        assert eng._should_analyze(), "turn trigger + 50 new words should fire"
        eng.last_call = __import__("time").monotonic()
        eng.feed({"start": 30, "end": 60, "speaker": 1, "text": "word " * 50, "words": 50})
        assert not eng._should_analyze(), "20s debounce must hold"
        assert "RECENT TRANSCRIPT" in eng._build_user_content()
    asyncio.run(run())


def t_app_imports():
    import importlib
    m = importlib.import_module("app.main")
    routes = {r.path for r in m.app.routes}
    for needed in ["/api/bootstrap", "/api/sessions", "/api/mictest", "/ws",
                   "/api/sessions/{session_id}/stop",
                   "/api/sessions/{session_id}/generate",
                   "/api/sessions/{session_id}/files/{name}"]:
        assert needed in routes, f"missing route {needed}"


if __name__ == "__main__":
    print("Discovery Copilot smoke tests")
    check("framework loads + overlay merge + keyword match", t_framework)
    check("sample transcript integrity (~20 min, real word counts)", t_sample_transcript)
    check("pydantic schemas validate live + report payloads", t_schemas)
    check("render sample client HTML + internal MD (no leaks)", t_render_sample_reports)
    check("deepgram prerecorded response parsing", t_deepgram_rest_parsing)
    check("session store round trip + cost logging", t_session_store)
    check("live engine cadence/debounce rules", t_engine_cadence)
    check("FastAPI app imports with all routes", t_app_imports)
    if FAILURES:
        print(f"\n{len(FAILURES)} FAILED: {', '.join(FAILURES)}")
        raise SystemExit(1)
    print("\nall good ✓")
