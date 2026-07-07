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
    # the follow-up draft is a separate artifact, not part of the report page
    assert "Subject:" not in html
    (sample / "report_client.html").write_text(html, encoding="utf-8")

    md = report_render.render_internal_md(report, intake, coverage.get("notable", []))
    assert "Pricing anchor" in md, "pricing.yaml anchors missing from internal notes"
    assert "Red flags" in md
    assert "Gold nuggets" in md
    (sample / "report_internal.md").write_text(md, encoding="utf-8")

    # follow-up draft: present in the sample data, exported like reports.py does
    assert report.followup_draft.startswith("Subject:")
    assert "Dana" in report.followup_draft
    (sample / "followup.txt").write_text(report.followup_draft.strip() + "\n",
                                         encoding="utf-8")


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


def t_speaker_labels():
    from app.sessions import SessionStore, speaker_label
    assert speaker_label(0, None) == "Speaker 0"
    assert speaker_label(0, 0) == "Consultant"
    assert speaker_label(1, 0) == "Owner"
    assert speaker_label(2, 0) == "Owner"  # extra voices collapse to Owner
    with tempfile.TemporaryDirectory() as td:
        st = SessionStore(Path(td) / "20260101_000000_lbl")
        st.append_segment({"start": 0, "end": 2, "speaker": 0, "text": "hi there", "words": 2})
        st.append_segment({"start": 2, "end": 5, "speaker": 1, "text": "hello back", "words": 2})
        txt = st.transcript_text(consultant_speaker=0)
        assert "Consultant: hi there" in txt and "Owner: hello back" in txt
        assert "Speaker" not in txt
    # engine window uses the same labels
    from app.framework import Framework, fresh_coverage
    from app.live_engine import SuggestionEngine
    fw = Framework.load()
    areas = fw.merged_areas(None)
    eng = SuggestionEngine(llm=None, areas=areas,
                           intake={"consultant_speaker": 0},
                           coverage=fresh_coverage(areas), on_update=None,
                           log_cycle=lambda r: None, log_cost=lambda *a: None)
    eng.feed({"start": 0, "end": 3, "speaker": 1, "text": "we lose calls", "words": 3})
    assert "Owner: we lose calls" in eng._window_text()


def t_logo_embedding():
    from app import report_render
    from app.schemas import AuditReport
    sample = BASE_DIR / "sessions" / "_sample"
    report = AuditReport.model_validate(json.loads((sample / "report_data.json").read_text(encoding="utf-8")))
    intake = json.loads((sample / "intake.json").read_text(encoding="utf-8"))
    png = bytes.fromhex(  # minimal valid 1x1 PNG
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
        "0000000d4944415478da63fcff9fa10e0003030101f0e6f2f60000000049454e44ae426082")
    with tempfile.TemporaryDirectory() as td:
        logo = Path(td) / "logo.png"
        logo.write_bytes(png)
        b = {"company_name": "MK", "prepared_by": "MK", "accent_color": "#0e7490",
             "logo_path": str(logo), "contact_line": "", "footer_note": ""}
        html = report_render.render_client_html(report, intake, branding=b)
        assert "data:image/png;base64," in html, "local logo should be inlined"
        b["logo_path"] = str(Path(td) / "missing.png")
        html2 = report_render.render_client_html(report, intake, branding=b)
        assert "<img" not in html2, "missing logo file must not leave a broken img"
    assert report_render.logo_src("https://example.com/x.png") == "https://example.com/x.png"
    assert report_render.logo_src("") is None


def t_keyterm_boosting():
    from app.deepgram_rest import boost_params, intake_keyterms
    terms = intake_keyterms({"business_name": "Hartwell Home Furnishings",
                             "contact_name": "Dana", "industry": "retail"})
    assert terms == ["Hartwell Home Furnishings", "Dana"]
    assert intake_keyterms({"business_name": " ", "contact_name": ""}) == []
    assert boost_params("nova-3", terms) == [
        ("keyterm", "Hartwell Home Furnishings"), ("keyterm", "Dana")]
    assert boost_params("nova-2", ["Dana"]) == [("keywords", "Dana")]
    assert boost_params("flux-general-en", ["Dana"])[0][0] == "keyterm"
    assert boost_params("nova-3", []) == []
    # streaming URL construction embeds repeated keyterm params
    import urllib.parse
    q = urllib.parse.urlencode([("model", "nova-3")] + boost_params("nova-3", terms))
    assert q.count("keyterm=") == 2 and "Hartwell+Home+Furnishings" in q


def t_readiness_doctor():
    import launch
    rows = launch.readiness_report(network=False)  # offline: no Deepgram ping
    by_name = {name: (status, detail) for status, name, detail in rows}
    for required in ("config", "python deps", "framework", "renderer",
                     "intelligence", "deepgram", "audio", "port"):
        assert required in by_name, f"doctor is missing the {required} row"
    assert by_name["python deps"][0] == "ok"
    assert by_name["framework"][0] == "ok" and "8 core areas" in by_name["framework"][1]
    assert by_name["renderer"][0] == "ok"
    # dummy key + network skipped → warn, never a false ✓
    assert by_name["deepgram"][0] == "warn"
    assert all(s in ("ok", "warn", "fail") for s, _ in by_name.values())


def t_session_store():
    from app import config
    from app.sessions import SessionStore
    with tempfile.TemporaryDirectory() as td:
        st = SessionStore(Path(td) / "20260101_000000_test")
        st.write_intake({"business_name": "Test Co"})
        st.append_segment({"start": 0, "end": 2, "speaker": 0, "text": "hello world", "words": 2})
        st.append_segment({"start": 2, "end": 4, "speaker": 1, "text": "hi", "words": 1})
        assert len(st.read_transcript()) == 2
        assert "Speaker 1" in st.transcript_text()
        assert st.status()["has_audio"] is False
        (st.path / "audio.wav").write_bytes(b"RIFF")
        assert st.status()["has_audio"] is True
        orig = config.LLM_BACKEND
        try:
            config.LLM_BACKEND = "api"  # metered mode: real dollar estimates
            st.log_cost("live_analysis", "claude-haiku-4-5", 1000, 200)
            costs = st._read_json("costs.json", {})
            assert costs["totals"]["input_tokens"] == 1000
            assert 0 < costs["totals"]["est_cost_usd"] < 0.01
            config.LLM_BACKEND = "claude_code"  # subscription: tokens logged, $0
            st.log_cost("live_analysis", "claude-haiku-4-5", 1000, 200)
            costs = st._read_json("costs.json", {})
            assert costs["totals"]["input_tokens"] == 2000
            assert costs["calls"][-1]["est_cost_usd"] == 0.0
        finally:
            config.LLM_BACKEND = orig


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


def t_backend_factory():
    from app import config
    from app.llm import LLM, make_llm
    from app.llm_claude_code import ClaudeCodeLLM
    orig = config.LLM_BACKEND
    try:
        config.LLM_BACKEND = "api"
        assert isinstance(make_llm(), LLM)
        config.LLM_BACKEND = "claude_code"
        assert isinstance(make_llm(), ClaudeCodeLLM)
    finally:
        config.LLM_BACKEND = orig


def t_claude_code_parsing():
    from app.llm_claude_code import output_format_for, parse_json_loosely
    from app.schemas import ANALYSIS_TOOL
    fmt = output_format_for(ANALYSIS_TOOL)
    assert fmt == {"type": "json_schema", "schema": ANALYSIS_TOOL["input_schema"]}
    assert parse_json_loosely('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json_loosely('Sure! Here it is: {"a": {"b": 2}} hope that helps') == {"a": {"b": 2}}
    assert parse_json_loosely('{"plain": true}') == {"plain": True}
    for bad in ("no json here", "[1, 2, 3]"):
        try:
            parse_json_loosely(bad)
            raise AssertionError(f"should have rejected {bad!r}")
        except ValueError:
            pass


def t_claude_code_mocked_query():
    """Exercise the subscription backend against a fake Agent SDK."""
    import asyncio
    from app.llm_claude_code import ClaudeCodeLLM
    from app.schemas import ANALYSIS_TOOL

    class FakeResult:
        def __init__(self, structured=None, result="", is_error=False):
            self.structured_output = structured
            self.result = result
            self.is_error = is_error
            self.usage = {"input_tokens": 123, "output_tokens": 45}

    class FakeOptions:
        def __init__(self, **kw):
            self.kw = kw

    def fake_query_returning(msg):
        async def q(*, prompt, options):
            assert options.kw["allowed_tools"] == []
            assert options.kw["max_turns"] == 1
            yield FakeResult(structured={"decoy": True})  # non-Result messages ignored below
            yield msg
        return q

    async def run():
        llm = ClaudeCodeLLM.__new__(ClaudeCodeLLM)  # skip real SDK import
        llm._Options = FakeOptions
        llm._supports_output_format = True

        # A: structured output path
        good = FakeResult(structured={"coverage_updates": [], "suggestions": [],
                                      "move_on": [], "notable": ["x"]})
        llm._ResultMessage = FakeResult
        llm._query = fake_query_returning(good)
        data, usage = await llm.forced_tool_call(
            model="claude-haiku-4-5", system="s", user_content="u",
            tool=ANALYSIS_TOOL, max_tokens=1200)
        assert data["notable"] == ["x"] and usage.input_tokens == 123

        # B: fallback — no structured_output, fenced JSON in text
        fenced = FakeResult(structured=None, result='```json\n{"coverage_updates": [], '
                            '"suggestions": [], "move_on": [], "notable": []}\n```')
        llm._query = fake_query_returning(fenced)
        data, _ = await llm.forced_tool_call(
            model="claude-haiku-4-5", system="s", user_content="u",
            tool=ANALYSIS_TOOL, max_tokens=1200)
        assert data["notable"] == []

        # C: error result raises (feeds the retry/skip machinery)
        err = FakeResult(structured=None, result="rate limit reached", is_error=True)
        llm._query = fake_query_returning(err)
        try:
            await llm.forced_tool_call(model="m", system="s", user_content="u",
                                       tool=ANALYSIS_TOOL, max_tokens=1200)
            raise AssertionError("error result should raise")
        except RuntimeError as e:
            assert "rate limit" in str(e)

        # D: text_call returns final text
        llm._query = fake_query_returning(FakeResult(result="a plain summary"))
        text, usage = await llm.text_call(model="m", system="s",
                                          user_content="u", max_tokens=800)
        assert text == "a plain summary" and usage.output_tokens == 45

    asyncio.run(run())


def t_check_keys_modes():
    from app import config
    orig = (config.LLM_BACKEND, config.DEEPGRAM_API_KEY, config.ANTHROPIC_API_KEY)
    try:
        config.DEEPGRAM_API_KEY = "x"
        # api mode without an anthropic key must fail loudly
        config.LLM_BACKEND, config.ANTHROPIC_API_KEY = "api", ""
        try:
            config.check_keys()
            raise AssertionError("api mode without key should exit")
        except SystemExit:
            pass
        # api mode with both keys passes
        config.ANTHROPIC_API_KEY = "x"
        config.check_keys()
        # unknown backend fails loudly
        config.LLM_BACKEND = "bogus"
        try:
            config.check_keys()
            raise AssertionError("unknown backend should exit")
        except SystemExit:
            pass
        # subscription preflight runs without crashing (result is env-dependent)
        from app.llm_claude_code import ClaudeCodeLLM
        assert isinstance(ClaudeCodeLLM.preflight(), list)
    finally:
        config.LLM_BACKEND, config.DEEPGRAM_API_KEY, config.ANTHROPIC_API_KEY = orig


def t_engine_with_fake_backend():
    """Full analyze() cycle against a backend-shaped fake — proves the engine
    is backend-agnostic (works identically on API or subscription)."""
    import asyncio
    from app.framework import Framework, fresh_coverage
    from app.live_engine import SuggestionEngine
    from app.llm import Usage

    class FakeLLM:
        async def forced_tool_call(self, **kw):
            return ({
                "coverage_updates": [
                    {"area": "leads", "status": "covered", "evidence": "missed calls"}],
                "suggestions": [
                    {"area": "books", "question": f"Q{i}?", "why": "w",
                     "priority": "new_area"} for i in range(5)],  # engine must cap at 3
                "move_on": ["move along"],
                "notable": ["gold"],
            }, Usage(10, 5))

    async def run():
        fw = Framework.load()
        areas = fw.merged_areas(None)
        updates, cycles, costs = [], [], []
        eng = SuggestionEngine(
            llm=FakeLLM(), areas=areas, intake={"business_name": "T"},
            coverage=fresh_coverage(areas),
            on_update=lambda p: (updates.append(p), asyncio.sleep(0))[1],
            log_cycle=cycles.append,
            log_cost=lambda *a: costs.append(a),
        )
        eng.feed({"start": 0, "end": 30, "speaker": 1, "text": "word " * 50, "words": 50})
        await eng.analyze()
        assert updates and len(updates[0]["suggestions"]) == 3
        assert updates[0]["coverage"]["areas"]["leads"]["status"] == "covered"
        assert "gold" in updates[0]["coverage"]["notable"]
        assert cycles and cycles[0]["error"] is None
        assert costs and costs[0][0] == "live_analysis"
    asyncio.run(run())


def t_app_imports():
    import importlib
    m = importlib.import_module("app.main")
    routes = {r.path for r in m.app.routes}
    for needed in ["/api/bootstrap", "/api/sessions", "/api/mictest", "/ws",
                   "/api/sessions/{session_id}/stop",
                   "/api/sessions/{session_id}/generate",
                   "/api/sessions/{session_id}/retranscribe",
                   "/api/sessions/{session_id}/speaker",
                   "/api/sessions/{session_id}/files/{name}"]:
        assert needed in routes, f"missing route {needed}"
    assert "followup.txt" in m.SERVABLE


if __name__ == "__main__":
    print("Discovery Copilot smoke tests")
    check("framework loads + overlay merge + keyword match", t_framework)
    check("sample transcript integrity (~20 min, real word counts)", t_sample_transcript)
    check("pydantic schemas validate live + report payloads", t_schemas)
    check("render sample client HTML + internal MD (no leaks)", t_render_sample_reports)
    check("readiness doctor rows + offline statuses", t_readiness_doctor)
    check("consultant/owner speaker labeling", t_speaker_labels)
    check("logo embedding in client report", t_logo_embedding)
    check("deepgram keyterm/keywords boosting", t_keyterm_boosting)
    check("deepgram prerecorded response parsing", t_deepgram_rest_parsing)
    check("session store round trip + cost logging", t_session_store)
    check("live engine cadence/debounce rules", t_engine_cadence)
    check("LLM backend factory (api / claude_code)", t_backend_factory)
    check("claude_code JSON parsing + schema passthrough", t_claude_code_parsing)
    check("claude_code backend against a mocked Agent SDK", t_claude_code_mocked_query)
    check("mode-aware check_keys fail-loud behavior", t_check_keys_modes)
    check("engine end-to-end with backend-shaped fake", t_engine_with_fake_backend)
    check("FastAPI app imports with all routes", t_app_imports)
    if FAILURES:
        print(f"\n{len(FAILURES)} FAILED: {', '.join(FAILURES)}")
        raise SystemExit(1)
    print("\nall good ✓")
