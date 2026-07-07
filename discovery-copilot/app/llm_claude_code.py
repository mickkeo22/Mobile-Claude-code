"""Subscription backend — Claude Pro/Max powers the app, no API key.

Routes every model call through the Claude Agent SDK (which drives Claude
Code headless under your normal `claude login`). This is the sanctioned way
to run a personal local tool on a subscription; extracting OAuth tokens and
calling the raw API is not, and is deliberately not done here.

Implements the exact same interface as llm.LLM (forced_tool_call/text_call),
so the live engine and report generator don't know which backend is active.

Notes:
- Structured output: the SDK's json_schema output_format reuses our strict
  tool input_schema dicts unchanged. If the installed SDK predates
  output_format, we fall back to prompt-for-JSON + loose parsing — the
  callers' Pydantic validate → retry-once → skip machinery absorbs the rest.
- Each call spawns a fresh one-shot Claude Code run (~1–3s overhead), which
  is fine at the live engine's ≥20s cadence.
- max_tokens is accepted for interface parity but not enforced on this path.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import shutil
import subprocess

from .llm import Usage

log = logging.getLogger("copilot.llm")

LIVE_TIMEOUT_SECS = 90
REPORT_TIMEOUT_SECS = 360
# Structured output is an internal tool call in the SDK, so a run can need
# more than one turn; with allowed_tools=[] there is nothing to loop on, so
# this is a safety bound, not a behavior knob. (max_turns=1 starves the
# structured-output step — found in the live E2E.)
MAX_TURNS = 4
_JSON_FENCE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL)


def parse_json_loosely(text: str) -> dict:
    """Extract a JSON object from model text (fences / surrounding prose)."""
    text = (text or "").strip()
    m = _JSON_FENCE.search(text)
    if m:
        text = m.group(1).strip()
    if not text.startswith("{"):
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end <= start:
            raise ValueError("no JSON object found in response text")
        text = text[start:end + 1]
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("response JSON was not an object")
    return data


def output_format_for(tool: dict) -> dict:
    return {"type": "json_schema", "schema": tool["input_schema"]}


def _json_instruction(tool: dict) -> str:
    return (
        "\n\nRespond with ONLY a single JSON object matching this schema — "
        "no prose, no code fences:\n"
        + json.dumps(tool["input_schema"])
    )


class ClaudeCodeLLM:
    def __init__(self):
        try:
            from claude_agent_sdk import (  # noqa: PLC0415 — lazy on purpose
                ClaudeAgentOptions, ResultMessage, query,
            )
        except ImportError as e:
            raise RuntimeError(
                "LLM_BACKEND=claude_code but the 'claude-agent-sdk' package is "
                "missing — run: pip install -r requirements.txt"
            ) from e
        self._query = query
        self._Options = ClaudeAgentOptions
        self._ResultMessage = ResultMessage
        self._supports_output_format = True  # optimistic; downgraded on TypeError
        # Claude Code thinks by default; the API-mode path doesn't. Disabling
        # it matches API behavior and keeps report generation inside the
        # 2-minute target (thinking tripled output tokens in the live E2E).
        # The SDK type is a TypedDict, so the literal dict is the value.
        self._thinking = {"type": "disabled"}

    # ── public interface (mirrors llm.LLM) ────────────────────────

    async def forced_tool_call(
        self, *, model: str, system: str, user_content: str, tool: dict,
        max_tokens: int,
    ) -> tuple[dict, Usage]:
        timeout = REPORT_TIMEOUT_SECS if max_tokens >= 4000 else LIVE_TIMEOUT_SECS
        fmt = output_format_for(tool) if self._supports_output_format else None
        prompt = user_content if fmt else user_content + _json_instruction(tool)
        msg = await self._run(model=model, system=system, prompt=prompt,
                              output_format=fmt, tool=tool, timeout=timeout)
        data = getattr(msg, "structured_output", None)
        if data is None:
            data = parse_json_loosely(getattr(msg, "result", "") or "")
        if not isinstance(data, dict):
            raise ValueError("subscription backend returned non-object output")
        return data, _usage_of(msg)

    async def text_call(
        self, *, model: str, system: str, user_content: str, max_tokens: int,
    ) -> tuple[str, Usage]:
        timeout = REPORT_TIMEOUT_SECS if max_tokens >= 4000 else LIVE_TIMEOUT_SECS
        msg = await self._run(model=model, system=system, prompt=user_content,
                              output_format=None, tool=None, timeout=timeout)
        return (getattr(msg, "result", "") or ""), _usage_of(msg)

    # ── internals ─────────────────────────────────────────────────

    def _make_options(self, model: str, system: str, output_format: dict | None):
        kwargs = dict(model=model, system_prompt=system,
                      allowed_tools=[], max_turns=MAX_TURNS)
        if self._thinking is not None:
            kwargs["thinking"] = self._thinking
        if output_format is not None:
            kwargs["output_format"] = output_format
        for _ in range(3):  # drop kwargs an older SDK doesn't know
            try:
                return self._Options(**kwargs), "output_format" in kwargs or output_format is None
            except TypeError as e:
                msg = str(e)
                if "output_format" in kwargs and "output_format" in msg:
                    self._supports_output_format = False
                    log.warning("installed claude-agent-sdk has no output_format "
                                "support — falling back to prompt-for-JSON")
                    kwargs.pop("output_format")
                elif "thinking" in kwargs and "thinking" in msg:
                    self._thinking = None
                    log.info("installed claude-agent-sdk has no thinking option "
                             "— leaving model default")
                    kwargs.pop("thinking")
                else:
                    raise
        return self._Options(**kwargs), "output_format" in kwargs

    async def _run(self, *, model: str, system: str, prompt: str,
                   output_format: dict | None, tool: dict | None, timeout: float):
        options, fmt_used = self._make_options(model, system, output_format)
        if output_format is not None and not fmt_used and tool is not None:
            prompt = prompt + _json_instruction(tool)

        result_holder: list = []

        async def consume() -> None:
            async for message in self._query(prompt=prompt, options=options):
                if isinstance(message, self._ResultMessage):
                    result_holder.append(message)

        try:
            await asyncio.wait_for(consume(), timeout=timeout)
        except asyncio.TimeoutError:
            raise RuntimeError(
                f"Claude Code call timed out after {timeout:.0f}s "
                "(subscription backend)"
            ) from None
        if not result_holder:
            raise RuntimeError("Claude Code returned no result message")
        msg = result_holder[-1]
        if getattr(msg, "is_error", False):
            detail = getattr(msg, "result", "") or getattr(msg, "subtype", "") or "unknown error"
            raise RuntimeError(f"Claude Code error: {str(detail)[:400]}")
        return msg

    # ── startup preflight ─────────────────────────────────────────

    @classmethod
    def preflight(cls) -> list[str]:
        """Best-effort startup checks. Returns problems (empty = OK)."""
        problems: list[str] = []
        try:
            import claude_agent_sdk  # noqa: F401, PLC0415
        except ImportError:
            problems.append(
                "the 'claude-agent-sdk' package is missing — run: "
                "pip install -r requirements.txt"
            )
            return problems

        cli = shutil.which("claude")
        if cli is None:
            log.info(
                "no `claude` CLI on PATH — relying on the SDK's bundled runtime. "
                "If calls fail, install Claude Code and run `claude login`."
            )
            return problems
        try:
            r = subprocess.run([cli, "auth", "status"],
                               capture_output=True, text=True, timeout=8)
            out = ((r.stdout or "") + (r.stderr or "")).lower()
            if "unknown command" in out or "unrecognized" in out:
                log.info("`claude auth status` not supported by this CLI version "
                         "— skipping the auth preflight")
            elif (r.returncode != 0 or "not logged in" in out
                  or '"loggedin": false' in out or "no credential" in out):
                problems.append(
                    "Claude Code is installed but not logged in — run "
                    "`claude login` (subscription) or `claude setup-token`, "
                    "or set LLM_BACKEND=api in .env to use an API key instead"
                )
        except subprocess.TimeoutExpired:
            log.info("auth preflight timed out — continuing; the first call "
                     "will surface any auth problem")
        except Exception as e:
            log.info("auth preflight skipped (%s)", e)
        return problems


def _usage_of(msg) -> Usage:
    u = getattr(msg, "usage", None)
    if u is None:
        return Usage(0, 0)
    get = u.get if isinstance(u, dict) else lambda k, d=0: getattr(u, k, d)
    # count cached prefix reads as input so costs.json reflects real volume
    inp = (int(get("input_tokens", 0) or 0)
           + int(get("cache_read_input_tokens", 0) or 0)
           + int(get("cache_creation_input_tokens", 0) or 0))
    return Usage(inp, int(get("output_tokens", 0) or 0))
