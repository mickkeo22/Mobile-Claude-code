"""Live suggestion engine (spec §4).

Buffers finalized transcript segments and calls the live model when:
  • ≥45s of new speech accumulated, OR a speaker turn ended after a
    substantial answer (>40 words),
  • AND ≥25 new words since the last analysis,
  • AND ≥20s since the last call (debounce).

On any failure: log, skip the cycle, never crash the UI. Transcription is
unaffected — the recording is the crown jewel.
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from collections import deque
from typing import Awaitable, Callable

from pydantic import ValidationError

from . import config
from .framework import Area, areas_for_prompt
from .llm import LLM
from .schemas import ANALYSIS_TOOL, AnalysisResult

log = logging.getLogger("copilot.engine")

STATUS_RANK = {"untouched": 0, "touched": 1, "covered": 2}
TICK_SECS = 4


def load_live_prompt() -> str:
    """Re-read each call so prompt edits apply without a restart."""
    try:
        return (config.PROMPTS_DIR / "live_suggester.md").read_text(encoding="utf-8")
    except Exception:
        log.warning("prompts/live_suggester.md missing — using minimal fallback")
        return ("You assist a consultant doing a free AI/automation audit. "
                "Track coverage and suggest at most 3 plain-English next questions.")


class SuggestionEngine:
    def __init__(
        self,
        *,
        llm: LLM,
        areas: list[Area],
        intake: dict,
        coverage: dict,
        on_update: Callable[[dict], Awaitable[None]],
        log_cycle: Callable[[dict], None],
        log_cost: Callable[[str, str, int, int], None],
    ):
        self.llm = llm
        self.areas = areas
        self.area_ids = {a.id for a in areas}
        self.intake = intake
        self.coverage = coverage
        self.on_update = on_update      # broadcast analysis to the UI
        self.log_cycle = log_cycle      # append to suggestions_log.jsonl
        self.log_cost = log_cost        # append to costs.json
        self._framework_ctx = areas_for_prompt(areas)

        self.window: deque[dict] = deque()   # rolling transcript window
        self.window_words = 0
        self.new_words = 0
        self.new_speech_secs = 0.0
        self.turn_trigger = False
        self.last_call = 0.0
        self._task: asyncio.Task | None = None
        self._stopped = asyncio.Event()

    # ── feeding + lifecycle ───────────────────────────────────────

    def feed(self, seg: dict) -> None:
        self.window.append(seg)
        self.window_words += seg.get("words", 0)
        while self.window_words > config.TRANSCRIPT_WINDOW_WORDS and len(self.window) > 1:
            old = self.window.popleft()
            self.window_words -= old.get("words", 0)
        self.new_words += seg.get("words", 0)
        self.new_speech_secs += max(0.0, seg.get("end", 0) - seg.get("start", 0))
        if seg.get("words", 0) > config.TURN_TRIGGER_WORDS:
            self.turn_trigger = True

    def start(self) -> None:
        self._task = asyncio.create_task(self._run())

    async def stop(self) -> None:
        self._stopped.set()
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except (asyncio.CancelledError, Exception):
                pass

    async def _run(self) -> None:
        while not self._stopped.is_set():
            await asyncio.sleep(TICK_SECS)
            try:
                if self._should_analyze():
                    await self.analyze()
            except asyncio.CancelledError:
                raise
            except Exception:
                log.exception("analysis cycle failed — skipping")

    def _should_analyze(self) -> bool:
        now = time.monotonic()
        if now - self.last_call < config.ANALYSIS_MIN_INTERVAL:
            return False
        if self.new_words < config.ANALYSIS_MIN_NEW_WORDS:
            return False  # dead air / small talk
        return self.turn_trigger or self.new_speech_secs >= config.ANALYSIS_SPEECH_SECONDS

    # ── the analysis call ─────────────────────────────────────────

    def _window_text(self) -> str:
        return "\n".join(
            f"Speaker {s.get('speaker', '?')}: {s.get('text', '')}" for s in self.window
        )

    def _coverage_compact(self) -> dict:
        return {
            aid: st.get("status", "untouched")
            for aid, st in self.coverage.get("areas", {}).items()
        }

    def _build_user_content(self) -> str:
        intake_bits = {
            "business": self.intake.get("business_name", ""),
            "industry": self.intake.get("industry_detail") or self.intake.get("industry", ""),
            "contact": self.intake.get("contact_name", ""),
            "meeting": self.intake.get("meeting_source", ""),
            "pre_call_notes": self.intake.get("notes", ""),
        }
        return (
            f"INTAKE:\n{json.dumps(intake_bits, ensure_ascii=False)}\n\n"
            f"DISCOVERY AREAS:\n{self._framework_ctx}\n\n"
            f"CURRENT COVERAGE:\n{json.dumps(self._coverage_compact())}\n\n"
            f"RECENT TRANSCRIPT (rolling window, oldest first):\n{self._window_text()}\n\n"
            "Analyze the newest part of the conversation and call emit_analysis."
        )

    async def analyze(self) -> None:
        # reset counters up front so a slow call doesn't double-fire
        self.last_call = time.monotonic()
        self.new_words = 0
        self.new_speech_secs = 0.0
        self.turn_trigger = False

        user_content = self._build_user_content()
        system = load_live_prompt()
        result: AnalysisResult | None = None
        error: str | None = None

        for attempt in (1, 2):  # retry once on parse failure, then skip silently
            try:
                data, usage = await self.llm.forced_tool_call(
                    model=config.LIVE_MODEL,
                    system=system,
                    user_content=user_content,
                    tool=ANALYSIS_TOOL,
                    max_tokens=1200,
                )
                self.log_cost("live_analysis", config.LIVE_MODEL,
                              usage.input_tokens, usage.output_tokens)
                result = AnalysisResult.model_validate(data)
                error = None
                break
            except (ValidationError, ValueError) as e:
                error = f"parse/validation failure (attempt {attempt}): {e}"
                log.warning(error)
            except Exception as e:
                # API hiccup — suggestions resume next cycle (spec §10)
                error = f"api error: {e}"
                log.warning("live analysis API error: %s", e)
                break

        self.log_cycle({
            "input_words": self.window_words,
            "coverage_before": self._coverage_compact(),
            "result": result.model_dump() if result else None,
            "error": error,
        })
        if result is None:
            return

        changed = self._apply_coverage(result)
        payload = {
            "type": "analysis",
            "suggestions": [s.model_dump() for s in result.suggestions[:3]],
            "move_on": result.move_on[:2],
            "notable_new": result.notable,
            "coverage": self.coverage,
            "coverage_changed": changed,
        }
        await self.on_update(payload)

    def _apply_coverage(self, result: AnalysisResult) -> bool:
        """Auto-updates only ever upgrade; manual downgrades stick (spec §4)."""
        changed = False
        areas = self.coverage.setdefault("areas", {})
        for upd in result.coverage_updates:
            if upd.area not in self.area_ids:
                continue
            st = areas.setdefault(
                upd.area, {"status": "untouched", "evidence": [], "manual": False}
            )
            if STATUS_RANK[upd.status] > STATUS_RANK.get(st.get("status", "untouched"), 0):
                st["status"] = upd.status
                changed = True
            if upd.evidence:
                st.setdefault("evidence", []).append(upd.evidence)
                st["evidence"] = st["evidence"][-8:]
        for n in result.notable:
            if n and n not in self.coverage.setdefault("notable", []):
                self.coverage["notable"].append(n)
                changed = True
        for m in result.move_on:
            self.coverage.setdefault("move_on", []).append(m)
        return changed
