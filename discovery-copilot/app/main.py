"""Discovery Copilot — FastAPI app, one process on localhost (spec §2).

Run:  uvicorn app.main:app --host 127.0.0.1 --port 8710
or:   python launch.py   (starts the server and opens the sidebar window)
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import time
from pathlib import Path

from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import audio as audio_mod
from . import config, deepgram_rest, reports
from .deepgram_live import DeepgramLive
from .framework import Framework, fresh_coverage
from .live_engine import SuggestionEngine
from .llm import make_llm
from .schemas import Intake
from .sessions import SessionStore, list_sessions

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("copilot")


# ── WebSocket hub ─────────────────────────────────────────────────

class Hub:
    def __init__(self):
        self.clients: set[WebSocket] = set()

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.clients.add(ws)

    def disconnect(self, ws: WebSocket) -> None:
        self.clients.discard(ws)

    async def broadcast(self, message: dict) -> None:
        dead = []
        for ws in list(self.clients):
            try:
                await ws.send_text(json.dumps(message, ensure_ascii=False))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


# ── Live session ──────────────────────────────────────────────────

class LiveSession:
    """Owns audio capture, the Deepgram stream, and the suggestion engine
    for one running call. Only one live session at a time."""

    LEVEL_INTERVAL = 0.6
    RECONNECT_DELAYS = [1, 2, 4, 8, 8]

    def __init__(self, store: SessionStore, fw: Framework, llm, hub: Hub):
        self.store = store
        self.hub = hub
        self.llm = llm
        self.intake = store.read_intake()
        overlay = fw.match_overlay(
            self.intake.get("industry", ""), self.intake.get("industry_detail", "")
        )
        self.areas = fw.merged_areas(overlay)
        self.overlay_label = overlay.label if overlay else None
        self.coverage = store.read_coverage() or fresh_coverage(self.areas)
        store.write_coverage(self.coverage)

        self.started_at = time.time()
        self.stopping = False
        self.audio_enabled = False
        self.capture: audio_mod.AudioCapture | None = None
        self.wav: audio_mod.WavWriter | None = None
        self.dg: DeepgramLive | None = None
        self._queue: asyncio.Queue[bytes] = asyncio.Queue(maxsize=400)
        self._sender_task: asyncio.Task | None = None
        self._reconnect_task: asyncio.Task | None = None
        self._last_level_sent = 0.0

        self.engine = SuggestionEngine(
            llm=llm,
            areas=self.areas,
            intake=self.intake,
            coverage=self.coverage,
            on_update=self._on_analysis,
            log_cycle=store.log_suggestion_cycle,
            log_cost=store.log_cost,
        )

    # ── lifecycle ─────────────────────────────────────────────────

    async def start(self, device_index: int | None, with_audio: bool) -> None:
        self.engine.start()
        if not with_audio:
            await self.hub.broadcast({"type": "status", "phase": "live",
                                      "detail": "demo mode — no audio capture"})
            return
        self.audio_enabled = True
        self.wav = audio_mod.WavWriter(self.store.path / "audio.wav")
        self.dg = self._new_dg()
        await self.dg.connect()

        loop = asyncio.get_running_loop()

        def on_chunk(chunk: bytes) -> None:  # PortAudio thread
            try:
                loop.call_soon_threadsafe(self._enqueue, chunk)
            except RuntimeError:
                pass

        self.capture = audio_mod.AudioCapture(device_index, on_chunk)
        self.capture.start()
        self._sender_task = asyncio.create_task(self._sender())

    def _enqueue(self, chunk: bytes) -> None:
        try:
            self._queue.put_nowait(chunk)
        except asyncio.QueueFull:
            with contextlib.suppress(Exception):
                self._queue.get_nowait()  # drop oldest, keep newest
                self._queue.put_nowait(chunk)

    def _new_dg(self) -> DeepgramLive:
        return DeepgramLive(on_final=self._on_final, on_interim=self._on_interim)

    async def _sender(self) -> None:
        while not self.stopping:
            try:
                chunk = await asyncio.wait_for(self._queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            if self.wav:
                self.wav.write(chunk)  # crown jewel: written no matter what
            now = time.monotonic()
            if now - self._last_level_sent > self.LEVEL_INTERVAL:
                self._last_level_sent = now
                await self.hub.broadcast(
                    {"type": "level", "peak": round(audio_mod.peak_level(chunk), 3)}
                )
            if self.dg is not None and self.dg.connected:
                try:
                    await self.dg.send_audio(chunk)
                except Exception as e:
                    log.warning("deepgram send failed: %s", e)
                    self._schedule_reconnect()
            else:
                self._schedule_reconnect()

    def _schedule_reconnect(self) -> None:
        if self.stopping or (self._reconnect_task and not self._reconnect_task.done()):
            return
        self._reconnect_task = asyncio.create_task(self._reconnect())

    async def _reconnect(self) -> None:
        await self.hub.broadcast({"type": "status", "phase": "transcription_reconnecting",
                                  "detail": "Transcription dropped — reconnecting (audio still being recorded)…"})
        for delay in self.RECONNECT_DELAYS:
            if self.stopping:
                return
            with contextlib.suppress(Exception):
                if self.dg:
                    await self.dg._teardown()
            self.dg = self._new_dg()
            try:
                await self.dg.connect()
                await self.hub.broadcast({"type": "status", "phase": "live",
                                          "detail": "Transcription reconnected."})
                return
            except Exception as e:
                log.warning("deepgram reconnect failed: %s", e)
                await asyncio.sleep(delay)
        await self.hub.broadcast({
            "type": "status", "phase": "transcription_down",
            "detail": "Transcription is down, but audio is still being recorded to audio.wav — "
                      "you can upload it after the call.",
        })

    async def stop(self) -> None:
        self.stopping = True
        if self.capture:
            self.capture.stop()
        if self._sender_task:
            self._sender_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._sender_task
        if self._reconnect_task:
            self._reconnect_task.cancel()
        if self.dg:
            await self.dg.finish()  # flush + close immediately (spec §7)
        if self.wav:
            self.wav.close()
        await self.engine.stop()
        self.store.write_coverage(self.coverage)

    # ── pipeline: finalized segments (from Deepgram OR replay) ────

    async def _on_final(self, seg: dict) -> None:
        self.store.append_segment(seg)
        self.engine.feed(seg)
        await self.hub.broadcast({"type": "transcript_final", "seg": seg})

    async def _on_interim(self, text: str) -> None:
        await self.hub.broadcast({"type": "transcript_interim", "text": text})

    async def _on_analysis(self, payload: dict) -> None:
        self.store.write_coverage(self.coverage)
        await self.hub.broadcast(payload)

    # ── manual controls ───────────────────────────────────────────

    def set_coverage(self, area: str, status: str) -> None:
        st = self.coverage.setdefault("areas", {}).setdefault(
            area, {"status": "untouched", "evidence": [], "manual": False}
        )
        st["status"] = status
        st["manual"] = True
        self.store.write_coverage(self.coverage)

    def snapshot(self) -> dict:
        return {
            "type": "live_state",
            "session_id": self.store.id,
            "business_name": self.intake.get("business_name", ""),
            "started_at": self.started_at,
            "overlay": self.overlay_label,
            "areas": [
                {"id": a.id, "label": a.label, "why": a.why_it_matters,
                 "questions": a.probe_questions}
                for a in self.areas
            ],
            "coverage": self.coverage,
            "audio": self.audio_enabled,
        }


# ── App wiring ────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    config.check_keys()  # fail loudly (spec §2)
    config.SESSIONS_DIR.mkdir(exist_ok=True)
    app.state.framework = Framework.load()
    app.state.llm = make_llm()
    app.state.live = None            # the single LiveSession, if any
    app.state.generating = set()     # session ids with a report in flight
    log.info(
        "LLM backend: %s (live=%s, report=%s)",
        "Claude subscription via Claude Code" if config.LLM_BACKEND == "claude_code"
        else "Anthropic API",
        config.LIVE_MODEL, config.REPORT_MODEL,
    )
    log.info("Discovery Copilot ready on http://%s:%s", config.HOST, config.PORT)
    yield
    live: LiveSession | None = app.state.live
    if live is not None:             # protect the recording on shutdown
        with contextlib.suppress(Exception):
            await live.stop()


app = FastAPI(title="MK Discovery Copilot", lifespan=lifespan)
hub = Hub()


app.mount("/static", StaticFiles(directory=str(config.STATIC_DIR)), name="static")


@app.get("/", response_class=HTMLResponse)
async def index() -> FileResponse:
    return FileResponse(config.STATIC_DIR / "index.html", headers={"Cache-Control": "no-store"})


@app.get("/api/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/bootstrap")
async def bootstrap() -> dict:
    fw: Framework = app.state.framework
    live: LiveSession | None = app.state.live
    return {
        "devices": audio_mod.list_input_devices(),
        "industries": fw.overlay_choices(),
        "areas": [
            {"id": a.id, "label": a.label, "why": a.why_it_matters,
             "questions": a.probe_questions}
            for a in fw.merged_areas(None)
        ],
        "sessions": list_sessions()[:12],
        "live": live.snapshot() if live else None,
        "models": {"live": config.LIVE_MODEL, "report": config.REPORT_MODEL,
                   "deepgram": config.DEEPGRAM_MODEL},
    }


# ── session lifecycle ─────────────────────────────────────────────

@app.post("/api/sessions")
async def create_session(intake: Intake) -> dict:
    store = SessionStore.create(intake.business_name)
    fw: Framework = app.state.framework
    overlay = fw.match_overlay(intake.industry, intake.industry_detail)
    data = intake.model_dump()
    data["overlay"] = overlay.id if overlay else None
    store.write_intake(data)
    store.write_coverage(fresh_coverage(fw.merged_areas(overlay)))
    return {"id": store.id, "overlay": overlay.label if overlay else None}


@app.post("/api/sessions/{session_id}/start")
async def start_session(session_id: str, body: dict) -> JSONResponse:
    store = SessionStore.open(session_id)
    if store is None:
        return JSONResponse({"error": "unknown session"}, status_code=404)
    if app.state.live is not None:
        return JSONResponse({"error": "another session is already live — stop it first"},
                            status_code=409)
    device_index = body.get("device_index")
    with_audio = bool(body.get("with_audio", True))
    live = LiveSession(store, app.state.framework, app.state.llm, hub)
    try:
        await live.start(device_index if device_index is not None else None, with_audio)
    except Exception as e:
        with contextlib.suppress(Exception):
            await live.stop()
        log.exception("failed to start live session")
        return JSONResponse({"error": f"could not start: {e}"}, status_code=500)
    app.state.live = live
    return JSONResponse(live.snapshot())


@app.post("/api/sessions/{session_id}/stop")
async def stop_session(session_id: str) -> JSONResponse:
    live: LiveSession | None = app.state.live
    if live is None or live.store.id != session_id:
        return JSONResponse({"error": "that session is not live"}, status_code=409)
    await hub.broadcast({"type": "status", "phase": "stopping",
                         "detail": "Stopping recording…"})
    await live.stop()
    app.state.live = None
    asyncio.create_task(_run_generation(live.store))
    return JSONResponse({"ok": True, "session_id": session_id})


@app.post("/api/sessions/{session_id}/generate")
async def generate(session_id: str) -> JSONResponse:
    """(Re)generate reports from the saved transcript — retry path, upload
    path, and the way to demo M5 against the sample session."""
    store = SessionStore.open(session_id)
    if store is None:
        return JSONResponse({"error": "unknown session"}, status_code=404)
    if session_id in app.state.generating:
        return JSONResponse({"error": "already generating"}, status_code=409)
    asyncio.create_task(_run_generation(store))
    return JSONResponse({"ok": True})


async def _run_generation(store: SessionStore) -> None:
    app.state.generating.add(store.id)
    t0 = time.monotonic()

    async def progress(phase: str, detail: str) -> None:
        await hub.broadcast({"type": "report_progress", "session_id": store.id,
                             "phase": phase, "detail": detail})

    try:
        links = await reports.generate_reports(store, app.state.llm, progress)
        took = round(time.monotonic() - t0, 1)
        await hub.broadcast({"type": "report_done", "session_id": store.id,
                             "links": links, "seconds": took})
        log.info("reports for %s generated in %.1fs", store.id, took)
    except Exception as e:
        log.exception("report generation failed for %s", store.id)
        await hub.broadcast({
            "type": "report_error", "session_id": store.id,
            "detail": f"{e} — the transcript is saved; hit Retry.",
        })
    finally:
        app.state.generating.discard(store.id)


# ── live controls ─────────────────────────────────────────────────

@app.post("/api/sessions/{session_id}/coverage")
async def manual_coverage(session_id: str, body: dict) -> JSONResponse:
    live: LiveSession | None = app.state.live
    area, status = body.get("area", ""), body.get("status", "")
    if status not in ("untouched", "touched", "covered"):
        return JSONResponse({"error": "bad status"}, status_code=400)
    if live is not None and live.store.id == session_id:
        live.set_coverage(area, status)
        await hub.broadcast({"type": "coverage", "coverage": live.coverage})
        return JSONResponse({"ok": True})
    return JSONResponse({"error": "session not live"}, status_code=409)


@app.post("/api/sessions/{session_id}/dismiss")
async def dismiss_suggestion(session_id: str, body: dict) -> dict:
    store = SessionStore.open(session_id)
    if store is not None:
        store.log_suggestion_cycle({"event": "dismissed",
                                    "question": body.get("question", "")})
    return {"ok": True}


@app.post("/api/sessions/{session_id}/ingest")
async def ingest_segment(session_id: str, body: dict) -> JSONResponse:
    """Feed a transcript segment through the live pipeline without audio.
    Used by scripts/replay_session.py to develop/demo M4 without a call."""
    live: LiveSession | None = app.state.live
    if live is None or live.store.id != session_id:
        return JSONResponse({"error": "session not live"}, status_code=409)
    text = str(body.get("text", "")).strip()
    if not text:
        return JSONResponse({"error": "empty text"}, status_code=400)
    seg = {
        "start": float(body.get("start", 0.0)),
        "end": float(body.get("end", 0.0)),
        "speaker": int(body.get("speaker", 0)),
        "text": text,
        "words": len(text.split()),
    }
    await live._on_final(seg)
    return JSONResponse({"ok": True})


# ── mic test + upload ─────────────────────────────────────────────

@app.post("/api/mictest")
async def mic_test(body: dict) -> JSONResponse:
    """Record 5 seconds, transcribe, return what we heard (spec §2)."""
    device_index = body.get("device_index")
    try:
        wav_bytes, peak = await asyncio.to_thread(
            audio_mod.record_seconds, device_index, 5.0
        )
    except Exception as e:
        return JSONResponse({"error": f"could not record: {e}"}, status_code=500)
    try:
        dg = await deepgram_rest.transcribe_bytes(wav_bytes, "audio/wav", diarize=False)
        text = deepgram_rest.plain_text(dg)
    except Exception as e:
        return JSONResponse({"error": f"recorded OK (peak {peak:.2f}) but "
                                      f"transcription failed: {e}"}, status_code=502)
    return JSONResponse({
        "ok": True, "peak": round(peak, 3), "text": text,
        "hint": None if peak > 0.02 else
        "Peak level is very low — check the selected device / input volume.",
    })


@app.post("/api/sessions/{session_id}/upload")
async def upload_audio(session_id: str, file: UploadFile = File(...)) -> JSONResponse:
    """Bonus path (spec §9): upload a recording → transcribe → ready to
    generate. Covers the walk-in-without-laptop case."""
    store = SessionStore.open(session_id)
    if store is None:
        return JSONResponse({"error": "unknown session"}, status_code=404)
    raw = await file.read()
    if not raw:
        return JSONResponse({"error": "empty file"}, status_code=400)
    (store.path / ("upload_" + Path(file.filename or "audio").name)).write_bytes(raw)
    content_type = file.content_type or "audio/wav"
    await hub.broadcast({"type": "status", "phase": "transcribing",
                         "detail": "Transcribing uploaded audio…"})
    try:
        dg = await deepgram_rest.transcribe_bytes(raw, content_type, diarize=True)
    except Exception as e:
        return JSONResponse({"error": f"transcription failed: {e}"}, status_code=502)
    segs = deepgram_rest.to_segments(dg)
    if not segs:
        return JSONResponse({"error": "no speech found in that file"}, status_code=422)
    for seg in segs:
        store.append_segment(seg)
    return JSONResponse({"ok": True, "segments": len(segs),
                         "words": sum(s["words"] for s in segs)})


@app.post("/api/sessions/{session_id}/retranscribe")
async def retranscribe(session_id: str) -> JSONResponse:
    """Audio rescue: rebuild the transcript from the always-written
    audio.wav via the prerecorded API (e.g. after a mid-call streaming
    outage), so the session can still generate reports."""
    store = SessionStore.open(session_id)
    if store is None:
        return JSONResponse({"error": "unknown session"}, status_code=404)
    live: LiveSession | None = app.state.live
    if live is not None and live.store.id == session_id:
        return JSONResponse({"error": "stop the live session first"}, status_code=409)
    wav = store.path / "audio.wav"
    if not wav.exists():
        return JSONResponse({"error": "no audio.wav saved for this session"},
                            status_code=404)
    await hub.broadcast({"type": "status", "phase": "transcribing",
                         "detail": "Re-transcribing saved audio…"})
    try:
        dg = await deepgram_rest.transcribe_bytes(wav.read_bytes(), "audio/wav",
                                                  diarize=True)
    except Exception as e:
        return JSONResponse({"error": f"transcription failed: {e}"}, status_code=502)
    segs = deepgram_rest.to_segments(dg)
    if not segs:
        return JSONResponse({"error": "no speech found in the saved audio"},
                            status_code=422)
    tpath = store.path / "transcript.jsonl"
    if tpath.exists():  # keep whatever the live stream managed to catch
        tpath.replace(store.path / "transcript.jsonl.bak")
    for seg in segs:
        store.append_segment(seg)
    return JSONResponse({"ok": True, "segments": len(segs),
                         "words": sum(s["words"] for s in segs)})


# ── session files ─────────────────────────────────────────────────

SERVABLE = {
    "report_client.html": "text/html",
    "report_internal.md": "text/markdown; charset=utf-8",
    "followup.txt": "text/plain; charset=utf-8",
    "report_data.json": "application/json",
    "transcript.jsonl": "text/plain; charset=utf-8",
    "intake.json": "application/json",
    "coverage.json": "application/json",
    "costs.json": "application/json",
    "suggestions_log.jsonl": "text/plain; charset=utf-8",
    "audio.wav": "audio/wav",
}


@app.get("/api/sessions")
async def sessions_index() -> dict:
    return {"sessions": list_sessions()}


@app.get("/api/sessions/{session_id}/files/{name}")
async def session_file(session_id: str, name: str):
    store = SessionStore.open(session_id)
    if store is None or name not in SERVABLE:
        return JSONResponse({"error": "not found"}, status_code=404)
    path = store.path / name
    if not path.exists():
        return JSONResponse({"error": "not generated yet"}, status_code=404)
    return FileResponse(path, media_type=SERVABLE[name],
                        headers={"Cache-Control": "no-store"})


# ── websocket ─────────────────────────────────────────────────────

@app.websocket("/ws")
async def ws_endpoint(ws: WebSocket) -> None:
    await hub.connect(ws)
    live: LiveSession | None = app.state.live
    if live is not None:
        with contextlib.suppress(Exception):
            await ws.send_text(json.dumps(live.snapshot()))
    try:
        while True:
            await ws.receive_text()  # client sends pings; content ignored
    except WebSocketDisconnect:
        hub.disconnect(ws)
    except Exception:
        hub.disconnect(ws)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=config.HOST, port=config.PORT, log_level="info")
