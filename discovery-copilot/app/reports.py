"""Report generation — the Stop button (spec §5).

One Sonnet call produces the full structured audit (client + internal
fields together, so the two documents can never disagree); code renders
both files. Long transcripts are map-reduced first with the live model.
Progress is streamed to the UI; failures leave the transcript untouched
and surface a Retry button.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Awaitable, Callable

from pydantic import ValidationError

from . import config, report_render
from .llm import LLM
from .schemas import REPORT_TOOL, AuditReport
from .sessions import SessionStore

log = logging.getLogger("copilot.reports")

CHUNK_WORDS = 6000
SUMMARY_MAX_TOKENS = 1500
REPORT_MAX_TOKENS = 16000


def load_report_prompt() -> str:
    try:
        return (config.PROMPTS_DIR / "report_client.md").read_text(encoding="utf-8")
    except Exception:
        log.warning("prompts/report_client.md missing — using minimal fallback")
        return ("Produce an honest, jargon-free AI/automation audit grounded only "
                "in the transcript. Never invent statistics or claims.")


async def generate_reports(
    store: SessionStore,
    llm: LLM,
    progress: Callable[[str, str], Awaitable[None]],
) -> dict:
    """Runs the full pipeline. Raises on failure (caller reports + offers retry)."""
    intake = store.read_intake()
    coverage = store.read_coverage()
    segs = store.read_transcript()
    if not segs:
        raise RuntimeError("no transcript found for this session")

    consultant_speaker = intake.get("consultant_speaker")
    transcript_text = store.transcript_text(segs, consultant_speaker)
    total_words = sum(s.get("words", 0) for s in segs)

    await progress("analyzing", "Analyzing conversation…")
    if total_words > config.MAPREDUCE_THRESHOLD_WORDS:
        transcript_text = await _map_reduce(store, llm, segs, consultant_speaker)

    await progress("drafting", "Drafting report…")
    context = _build_report_context(intake, coverage, transcript_text)
    system = load_report_prompt()

    data = None
    last_err: Exception | None = None
    for attempt in (1, 2):
        try:
            raw, usage = await llm.forced_tool_call(
                model=config.REPORT_MODEL,
                system=system,
                user_content=context,
                tool=REPORT_TOOL,
                max_tokens=REPORT_MAX_TOKENS,
            )
            store.log_cost("report", config.REPORT_MODEL,
                           usage.input_tokens, usage.output_tokens)
            data = AuditReport.model_validate(raw)
            break
        except (ValidationError, ValueError) as e:
            last_err = e
            log.warning("report parse failure (attempt %d): %s", attempt, e)
        # API errors propagate immediately — retrying a 4xx wastes the 2-min budget
    if data is None:
        raise RuntimeError(f"report generation failed to produce valid output: {last_err}")

    await progress("formatting", "Formatting documents…")
    client_html = report_render.render_client_html(data, intake)
    internal_md = report_render.render_internal_md(
        data, intake, coverage.get("notable", [])
    )
    store.write_report_files(data.model_dump(), client_html, internal_md)

    links = {
        "client": f"/api/sessions/{store.id}/files/report_client.html",
        "internal": f"/api/sessions/{store.id}/files/report_internal.md",
        "client_path": str(store.path / "report_client.html"),
        "internal_path": str(store.path / "report_internal.md"),
    }
    followup = (data.followup_draft or "").strip()
    if followup:
        (store.path / "followup.txt").write_text(followup + "\n", encoding="utf-8")
        links["followup"] = f"/api/sessions/{store.id}/files/followup.txt"
    return links


def _build_report_context(intake: dict, coverage: dict, transcript_text: str) -> str:
    import json
    cov_compact = {
        aid: {
            "status": st.get("status", "untouched"),
            "evidence": st.get("evidence", [])[-4:],
        }
        for aid, st in coverage.get("areas", {}).items()
    }
    return (
        f"INTAKE:\n{json.dumps(intake, ensure_ascii=False, indent=1)}\n\n"
        f"FINAL COVERAGE STATE:\n{json.dumps(cov_compact, ensure_ascii=False, indent=1)}\n\n"
        f"NOTABLE ITEMS CAPTURED LIVE:\n"
        + "\n".join(f"- {n}" for n in coverage.get("notable", []) or ["(none)"])
        + f"\n\nTRANSCRIPT:\n{transcript_text}\n\n"
        "Write the audit now by calling emit_audit."
    )


async def _map_reduce(store: SessionStore, llm: LLM, segs: list[dict],
                      consultant_speaker: int | None = None) -> str:
    """Summarize per ~6k-word chunk in parallel, keep quotes + area facts."""
    chunks: list[list[dict]] = [[]]
    count = 0
    for s in segs:
        chunks[-1].append(s)
        count += s.get("words", 0)
        if count >= CHUNK_WORDS:
            chunks.append([])
            count = 0
    chunks = [c for c in chunks if c]

    async def summarize(i: int, chunk: list[dict]) -> str:
        text = store.transcript_text(chunk, consultant_speaker)
        try:
            summary, usage = await llm.text_call(
                model=config.LIVE_MODEL,
                system=(
                    "Summarize this slice of a small-business discovery call for the "
                    "consultant writing the audit. Preserve: who does what, tools "
                    "named, costs/prices mentioned, delays, pain points, and short "
                    "verbatim quotes worth reflecting back. Bullet points. No fluff."
                ),
                user_content=text,
                max_tokens=SUMMARY_MAX_TOKENS,
            )
            store.log_cost("map_reduce", config.LIVE_MODEL,
                           usage.input_tokens, usage.output_tokens)
            return f"--- Part {i + 1} summary ---\n{summary}"
        except Exception as e:
            log.warning("chunk %d summary failed (%s) — passing raw text", i, e)
            return f"--- Part {i + 1} (raw excerpt) ---\n{text[:8000]}"

    summaries = await asyncio.gather(*(summarize(i, c) for i, c in enumerate(chunks)))
    return "\n\n".join(summaries)
