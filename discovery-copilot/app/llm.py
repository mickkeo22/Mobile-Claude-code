"""Anthropic API wrapper.

Strict forced tool use gives us schema-valid JSON from the model; we still
validate with Pydantic and retry once on mismatch (spec §4). Every call's
token usage is logged to the session's costs.json by the caller.
"""
from __future__ import annotations

import logging
from typing import Any

from anthropic import AsyncAnthropic

from . import config

log = logging.getLogger("copilot.llm")


class Usage:
    def __init__(self, input_tokens: int = 0, output_tokens: int = 0):
        self.input_tokens = input_tokens
        self.output_tokens = output_tokens


class LLM:
    def __init__(self, api_key: str | None = None):
        self.client = AsyncAnthropic(api_key=api_key or config.ANTHROPIC_API_KEY)

    async def forced_tool_call(
        self,
        *,
        model: str,
        system: str,
        user_content: str,
        tool: dict,
        max_tokens: int,
    ) -> tuple[dict, Usage]:
        """One request with tool_choice forced to `tool`. Returns the tool
        input dict (already schema-validated server-side via strict:true)."""
        resp = await self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_content}],
            tools=[tool],
            tool_choice={"type": "tool", "name": tool["name"]},
        )
        usage = Usage(
            getattr(resp.usage, "input_tokens", 0) or 0,
            getattr(resp.usage, "output_tokens", 0) or 0,
        )
        if resp.stop_reason == "refusal":
            raise RuntimeError("model refused the request")
        for block in resp.content:
            if getattr(block, "type", "") == "tool_use" and block.name == tool["name"]:
                if not isinstance(block.input, dict):
                    raise ValueError("tool input was not an object")
                return block.input, usage
        raise ValueError(f"no {tool['name']} tool_use block in response "
                         f"(stop_reason={resp.stop_reason})")

    async def text_call(
        self,
        *,
        model: str,
        system: str,
        user_content: str,
        max_tokens: int,
    ) -> tuple[str, Usage]:
        resp = await self.client.messages.create(
            model=model,
            max_tokens=max_tokens,
            system=system,
            messages=[{"role": "user", "content": user_content}],
        )
        usage = Usage(
            getattr(resp.usage, "input_tokens", 0) or 0,
            getattr(resp.usage, "output_tokens", 0) or 0,
        )
        text = "".join(
            getattr(b, "text", "") for b in resp.content if getattr(b, "type", "") == "text"
        )
        return text, usage


def validated(model_cls, data: dict) -> Any:
    """Pydantic validation with a readable error."""
    return model_cls.model_validate(data)


def make_llm():
    """Backend factory: metered API or the Claude subscription (Claude Code).

    Both backends expose the same forced_tool_call/text_call interface, so
    the live engine and report generator are backend-agnostic.
    """
    if config.LLM_BACKEND == "claude_code":
        from .llm_claude_code import ClaudeCodeLLM  # lazy — api mode never imports it
        return ClaudeCodeLLM()
    return LLM()
