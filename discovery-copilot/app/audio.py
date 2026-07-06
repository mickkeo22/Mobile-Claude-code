"""Audio capture via sounddevice (PortAudio), with graceful degradation.

sounddevice is imported lazily: if PortAudio isn't installed the app still
runs — device list comes back empty with a hint, and the upload / demo
paths keep working.
"""
from __future__ import annotations

import io
import logging
import time
import wave
from array import array
from typing import Callable

from . import config

log = logging.getLogger("copilot.audio")

_sd = None
_sd_error: str | None = None


def _sounddevice():
    global _sd, _sd_error
    if _sd is None and _sd_error is None:
        try:
            import sounddevice as sd  # noqa: PLC0415 — lazy on purpose
            _sd = sd
        except Exception as e:  # OSError when PortAudio lib missing
            _sd_error = f"sounddevice unavailable: {e}"
            log.warning(_sd_error)
    return _sd


def list_input_devices() -> dict:
    sd = _sounddevice()
    if sd is None:
        return {"devices": [], "error": _sd_error}
    try:
        devices = []
        default_in = None
        try:
            default_in = sd.default.device[0]
        except Exception:
            pass
        for idx, d in enumerate(sd.query_devices()):
            if d.get("max_input_channels", 0) > 0:
                devices.append({
                    "index": idx,
                    "name": d.get("name", f"Device {idx}"),
                    "default": idx == default_in,
                    "samplerate": int(d.get("default_samplerate") or config.SAMPLE_RATE),
                })
        return {"devices": devices, "error": None}
    except Exception as e:
        return {"devices": [], "error": f"could not query audio devices: {e}"}


def peak_level(chunk: bytes) -> float:
    """0.0–1.0 peak of a 16-bit mono PCM chunk."""
    if not chunk:
        return 0.0
    samples = array("h")
    samples.frombytes(chunk[: len(chunk) - (len(chunk) % 2)])
    if not samples:
        return 0.0
    return min(1.0, max(abs(s) for s in samples) / 32768.0)


class AudioCapture:
    """Streams 16kHz mono int16 chunks from a device to `on_chunk`.

    `on_chunk(bytes)` is called from the PortAudio thread — keep it cheap
    (the caller bridges into asyncio with call_soon_threadsafe).
    """

    def __init__(self, device_index: int | None, on_chunk: Callable[[bytes], None]):
        self.device_index = device_index
        self.on_chunk = on_chunk
        self._stream = None

    def start(self) -> None:
        sd = _sounddevice()
        if sd is None:
            raise RuntimeError(_sd_error or "audio unavailable")
        blocksize = int(config.SAMPLE_RATE * config.BLOCK_MS / 1000)

        def callback(indata, frames, t, status):
            if status:
                log.debug("audio status: %s", status)
            try:
                self.on_chunk(bytes(indata))
            except Exception:
                pass

        self._stream = sd.RawInputStream(
            samplerate=config.SAMPLE_RATE,
            channels=config.CHANNELS,
            dtype="int16",
            blocksize=blocksize,
            device=self.device_index,
            callback=callback,
        )
        self._stream.start()
        log.info("audio capture started (device=%s)", self.device_index)

    def stop(self) -> None:
        if self._stream is not None:
            try:
                self._stream.stop()
                self._stream.close()
            except Exception:
                pass
            self._stream = None
            log.info("audio capture stopped")


class WavWriter:
    """Appends raw PCM to <session>/audio.wav — never lose a call."""

    def __init__(self, path):
        self._wav = wave.open(str(path), "wb")
        self._wav.setnchannels(config.CHANNELS)
        self._wav.setsampwidth(2)
        self._wav.setframerate(config.SAMPLE_RATE)

    def write(self, chunk: bytes) -> None:
        try:
            self._wav.writeframes(chunk)
        except Exception:
            pass

    def close(self) -> None:
        try:
            self._wav.close()
        except Exception:
            pass


def record_seconds(device_index: int | None, seconds: float = 5.0) -> tuple[bytes, float]:
    """Blocking capture used by the mic test. Returns (wav_bytes, peak)."""
    sd = _sounddevice()
    if sd is None:
        raise RuntimeError(_sd_error or "audio unavailable")
    chunks: list[bytes] = []

    def cb(indata, frames, t, status):
        chunks.append(bytes(indata))

    blocksize = int(config.SAMPLE_RATE * config.BLOCK_MS / 1000)
    stream = sd.RawInputStream(
        samplerate=config.SAMPLE_RATE, channels=config.CHANNELS, dtype="int16",
        blocksize=blocksize, device=device_index, callback=cb,
    )
    with stream:
        time.sleep(seconds)
    pcm = b"".join(chunks)
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(config.CHANNELS)
        w.setsampwidth(2)
        w.setframerate(config.SAMPLE_RATE)
        w.writeframes(pcm)
    return buf.getvalue(), peak_level(pcm)
