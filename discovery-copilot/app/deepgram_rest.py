"""Deepgram pre-recorded API — mic test + the upload-a-recording path."""
from __future__ import annotations

import logging

import httpx

from . import config

log = logging.getLogger("copilot.deepgram")


async def transcribe_bytes(
    audio: bytes,
    content_type: str = "audio/wav",
    diarize: bool = True,
) -> dict:
    """Returns the raw Deepgram prerecorded response JSON."""
    params = {
        "model": config.DEEPGRAM_MODEL,
        "smart_format": "true",
        "punctuate": "true",
    }
    if diarize:
        params["diarize"] = "true"
        params["utterances"] = "true"
    async with httpx.AsyncClient(timeout=httpx.Timeout(300.0, connect=15.0)) as client:
        resp = await client.post(
            config.DEEPGRAM_REST_URL,
            params=params,
            headers={
                "Authorization": f"Token {config.DEEPGRAM_API_KEY}",
                "Content-Type": content_type,
            },
            content=audio,
        )
        resp.raise_for_status()
        return resp.json()


def to_segments(dg_response: dict) -> list[dict]:
    """Convert a prerecorded response into transcript.jsonl segments."""
    results = dg_response.get("results", {})
    utterances = results.get("utterances")
    segs: list[dict] = []
    if utterances:
        for u in utterances:
            text = (u.get("transcript") or "").strip()
            if not text:
                continue
            segs.append({
                "start": round(float(u.get("start", 0.0)), 2),
                "end": round(float(u.get("end", 0.0)), 2),
                "speaker": int(u.get("speaker", 0) or 0),
                "text": text,
                "words": len(text.split()),
            })
        return segs
    # fallback: single alternative, no utterance split
    channels = results.get("channels") or []
    if channels:
        alt = (channels[0].get("alternatives") or [{}])[0]
        text = (alt.get("transcript") or "").strip()
        if text:
            segs.append({"start": 0.0, "end": 0.0, "speaker": 0,
                         "text": text, "words": len(text.split())})
    return segs


def plain_text(dg_response: dict) -> str:
    channels = dg_response.get("results", {}).get("channels") or []
    if not channels:
        return ""
    alt = (channels[0].get("alternatives") or [{}])[0]
    return (alt.get("transcript") or "").strip()
