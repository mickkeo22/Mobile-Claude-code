"""Thin Deepgram streaming client (raw websocket — no SDK churn).

Sends 16kHz mono linear16 PCM; receives Results messages; emits finalized
segments via `on_final(seg)` and interim text via `on_interim(text)`.
"""
from __future__ import annotations

import asyncio
import json
import logging
import urllib.parse
from typing import Awaitable, Callable

import websockets

from . import config

log = logging.getLogger("copilot.deepgram")

KEEPALIVE_SECS = 6


async def _connect(url: str, headers: dict):
    """websockets renamed extra_headers -> additional_headers in v14."""
    try:
        return await websockets.connect(url, additional_headers=headers, max_size=None)
    except TypeError:
        return await websockets.connect(url, extra_headers=headers, max_size=None)


class DeepgramLive:
    def __init__(
        self,
        on_final: Callable[[dict], Awaitable[None]],
        on_interim: Callable[[str], Awaitable[None]] | None = None,
    ):
        self.on_final = on_final
        self.on_interim = on_interim
        self._ws = None
        self._recv_task: asyncio.Task | None = None
        self._keepalive_task: asyncio.Task | None = None
        self._last_audio = 0.0
        self.closed = asyncio.Event()

    @property
    def connected(self) -> bool:
        return self._ws is not None and not self.closed.is_set()

    async def connect(self) -> None:
        params = {
            "model": config.DEEPGRAM_MODEL,
            "encoding": "linear16",
            "sample_rate": str(config.SAMPLE_RATE),
            "channels": str(config.CHANNELS),
            "smart_format": "true",
            "diarize": "true",
            "interim_results": "true",
            "punctuate": "true",
            "vad_events": "false",
        }
        url = f"{config.DEEPGRAM_WS_URL}?{urllib.parse.urlencode(params)}"
        headers = {"Authorization": f"Token {config.DEEPGRAM_API_KEY}"}
        self._ws = await _connect(url, headers)
        self.closed.clear()
        self._recv_task = asyncio.create_task(self._receiver())
        self._keepalive_task = asyncio.create_task(self._keepalive())
        log.info("deepgram connected (model=%s)", config.DEEPGRAM_MODEL)

    async def send_audio(self, chunk: bytes) -> None:
        if not self.connected:
            raise ConnectionError("deepgram not connected")
        self._last_audio = asyncio.get_running_loop().time()
        await self._ws.send(chunk)

    async def finish(self) -> None:
        """Flush and close — called on Stop. Closes the connection
        immediately per spec §7 (no lingering paid stream)."""
        if self._ws is None:
            return
        try:
            await self._ws.send(json.dumps({"type": "CloseStream"}))
            # give Deepgram a moment to flush the final Results
            try:
                await asyncio.wait_for(self.closed.wait(), timeout=4.0)
            except asyncio.TimeoutError:
                pass
        except Exception:
            pass
        await self._teardown()

    async def _teardown(self) -> None:
        self.closed.set()
        for t in (self._keepalive_task, self._recv_task):
            if t and not t.done():
                t.cancel()
        if self._ws is not None:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

    async def _keepalive(self) -> None:
        try:
            while not self.closed.is_set():
                await asyncio.sleep(KEEPALIVE_SECS)
                loop_now = asyncio.get_running_loop().time()
                if self._ws is not None and loop_now - self._last_audio > KEEPALIVE_SECS - 1:
                    try:
                        await self._ws.send(json.dumps({"type": "KeepAlive"}))
                    except Exception:
                        return
        except asyncio.CancelledError:
            pass

    async def _receiver(self) -> None:
        try:
            async for raw in self._ws:
                if isinstance(raw, bytes):
                    continue
                try:
                    msg = json.loads(raw)
                except Exception:
                    continue
                await self._handle(msg)
        except asyncio.CancelledError:
            pass
        except Exception as e:
            log.warning("deepgram receiver ended: %s", e)
        finally:
            self.closed.set()

    async def _handle(self, msg: dict) -> None:
        channel = msg.get("channel")
        if not isinstance(channel, dict):
            return  # Metadata / SpeechStarted / UtteranceEnd etc.
        alts = channel.get("alternatives") or []
        if not alts:
            return
        alt = alts[0]
        text = (alt.get("transcript") or "").strip()
        if not text:
            return
        if msg.get("is_final"):
            words = alt.get("words") or []
            seg = {
                "start": round(float(msg.get("start", 0.0)), 2),
                "end": round(float(msg.get("start", 0.0)) + float(msg.get("duration", 0.0)), 2),
                "speaker": _majority_speaker(words),
                "text": text,
                "words": len(text.split()),
            }
            await self.on_final(seg)
        elif self.on_interim is not None:
            await self.on_interim(text)


def _majority_speaker(words: list[dict]) -> int:
    counts: dict[int, int] = {}
    for w in words:
        s = w.get("speaker")
        if s is not None:
            counts[int(s)] = counts.get(int(s), 0) + 1
    if not counts:
        return 0
    return max(counts, key=counts.get)
