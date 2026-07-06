"""Configuration: .env loading, paths, models, cost rates.

Fails loudly at startup if either API key is missing (see check_keys).
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

SESSIONS_DIR = BASE_DIR / "sessions"
FRAMEWORK_DIR = BASE_DIR / "framework"
PROMPTS_DIR = BASE_DIR / "prompts"
STATIC_DIR = BASE_DIR / "app" / "static"
BRANDING_PATH = BASE_DIR / "branding.json"
PRICING_PATH = BASE_DIR / "pricing.yaml"

DEEPGRAM_API_KEY = os.environ.get("DEEPGRAM_API_KEY", "").strip()
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "").strip()

DEEPGRAM_MODEL = os.environ.get("DEEPGRAM_MODEL", "nova-3").strip()
DEEPGRAM_WS_URL = "wss://api.deepgram.com/v1/listen"
DEEPGRAM_REST_URL = "https://api.deepgram.com/v1/listen"

# "claude_code" (default) = your Claude Pro/Max subscription via Claude Code /
# the Agent SDK, no ANTHROPIC_API_KEY needed. "api" = metered Anthropic API.
LLM_BACKEND = os.environ.get("LLM_BACKEND", "claude_code").strip().lower()

LIVE_MODEL = os.environ.get("LIVE_MODEL", "claude-haiku-4-5").strip()
REPORT_MODEL = os.environ.get("REPORT_MODEL", "claude-sonnet-4-6").strip()

PORT = int(os.environ.get("DC_PORT", "8710"))
HOST = "127.0.0.1"

SAMPLE_RATE = 16000
CHANNELS = 1
BLOCK_MS = 200  # audio callback block size

# Live engine cadence (seconds / words) — spec §4
# LIVE_MIN_INTERVAL_SECS knob: on a Claude Pro plan raise this to ~45–60 so a
# long call doesn't eat the 5-hour usage window. Max plans are fine at 20.
try:
    ANALYSIS_MIN_INTERVAL = max(5, int(os.environ.get("LIVE_MIN_INTERVAL_SECS", "20")))
except ValueError:
    ANALYSIS_MIN_INTERVAL = 20
ANALYSIS_SPEECH_SECONDS = 45    # ...or when ~45s of new speech accumulated
ANALYSIS_MIN_NEW_WORDS = 25     # skip entirely below this
TURN_TRIGGER_WORDS = 40         # substantial prospect answer ends a turn
TRANSCRIPT_WINDOW_WORDS = 2000  # rolling window sent to the live engine
MAPREDUCE_THRESHOLD_WORDS = 25000  # above this, summarize per-chunk first

# USD per 1M tokens (input, output) — used for costs.json estimates.
MODEL_RATES = {
    "claude-haiku-4-5": (1.00, 5.00),
    "claude-sonnet-4-6": (3.00, 15.00),
    "claude-sonnet-4-5": (3.00, 15.00),
    "claude-opus-4-8": (5.00, 25.00),
}
DEFAULT_RATE = (3.00, 15.00)


def estimate_cost_usd(model: str, input_tokens: int, output_tokens: int) -> float:
    if LLM_BACKEND == "claude_code":
        return 0.0  # flat-rate subscription — no per-token dollars
    rate_in, rate_out = MODEL_RATES.get(model, DEFAULT_RATE)
    return (input_tokens * rate_in + output_tokens * rate_out) / 1_000_000


def check_keys() -> None:
    """Fail loudly at startup with a clear, actionable message."""
    problems: list[str] = []
    if not DEEPGRAM_API_KEY:
        problems.append(
            "DEEPGRAM_API_KEY is missing — speech-to-text has no subscription "
            "substitute (console.deepgram.com; sub-cent per minute)"
        )
    if LLM_BACKEND == "api":
        if not ANTHROPIC_API_KEY:
            problems.append(
                "ANTHROPIC_API_KEY is missing (required when LLM_BACKEND=api; "
                "or switch to LLM_BACKEND=claude_code to use your Claude "
                "subscription instead)"
            )
    elif LLM_BACKEND == "claude_code":
        from .llm_claude_code import ClaudeCodeLLM  # noqa: PLC0415 — avoid import cycle
        problems += ClaudeCodeLLM.preflight()
    else:
        problems.append(
            f"Unknown LLM_BACKEND={LLM_BACKEND!r} — use 'claude_code' "
            "(subscription, default) or 'api'"
        )
    if problems:
        sys.stderr.write(
            "\n"
            + "=" * 62 + "\n"
            + "  Discovery Copilot cannot start:\n"
            + "".join(f"    • {p}\n" for p in problems)
            + "\n"
            + f"  Config lives in {BASE_DIR / '.env'} (copy .env.example).\n"
            + "=" * 62 + "\n\n"
        )
        raise SystemExit(1)
