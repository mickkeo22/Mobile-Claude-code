"""Session storage: one folder per session, plain files, no database.

./sessions/{timestamp}_{business-slug}/
    intake.json           — form data + timestamps
    transcript.jsonl      — one finalized segment per line
    coverage.json         — coverage state + notable + move_on history
    suggestions_log.jsonl — every analysis call and result (prompt tuning)
    costs.json            — token counts + estimated USD per call
    audio.wav             — raw capture (the recording is the crown jewel)
    report_data.json      — structured audit (renderer input, enables re-render)
    report_client.html    — client-facing document
    report_internal.md    — internal build notes
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

from . import config


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", (name or "session").lower()).strip("-")
    return s[:40] or "session"


class SessionStore:
    """File IO for a single session folder."""

    def __init__(self, path: Path):
        self.path = path
        self.path.mkdir(parents=True, exist_ok=True)

    # ── creation / lookup ─────────────────────────────────────────

    @classmethod
    def create(cls, business_name: str) -> "SessionStore":
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        folder = config.SESSIONS_DIR / f"{stamp}_{slugify(business_name)}"
        return cls(folder)

    @classmethod
    def open(cls, session_id: str) -> "SessionStore | None":
        # session_id is the folder name; refuse anything path-like
        if not session_id or "/" in session_id or "\\" in session_id or ".." in session_id:
            return None
        p = config.SESSIONS_DIR / session_id
        return cls(p) if p.is_dir() else None

    @property
    def id(self) -> str:
        return self.path.name

    # ── json / jsonl helpers ──────────────────────────────────────

    def _read_json(self, name: str, default):
        p = self.path / name
        if not p.exists():
            return default
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            return default

    def _write_json(self, name: str, data) -> None:
        tmp = self.path / (name + ".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self.path / name)

    def _append_jsonl(self, name: str, record: dict) -> None:
        with (self.path / name).open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    # ── intake ────────────────────────────────────────────────────

    def write_intake(self, intake: dict) -> None:
        intake = dict(intake)
        intake.setdefault("created_at", datetime.now().isoformat(timespec="seconds"))
        self._write_json("intake.json", intake)

    def read_intake(self) -> dict:
        return self._read_json("intake.json", {})

    # ── transcript ────────────────────────────────────────────────

    def append_segment(self, seg: dict) -> None:
        self._append_jsonl("transcript.jsonl", seg)

    def read_transcript(self) -> list[dict]:
        p = self.path / "transcript.jsonl"
        segs: list[dict] = []
        if p.exists():
            for line in p.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    segs.append(json.loads(line))
                except Exception:
                    continue
        return segs

    def transcript_text(self, segs: list[dict] | None = None,
                        consultant_speaker: int | None = None) -> str:
        segs = self.read_transcript() if segs is None else segs
        return "\n".join(
            f"[{format_ts(s.get('start', 0))}] "
            f"{speaker_label(s.get('speaker'), consultant_speaker)}: {s.get('text', '')}"
            for s in segs
        )

    # ── coverage / suggestions / costs ────────────────────────────

    def write_coverage(self, coverage: dict) -> None:
        self._write_json("coverage.json", coverage)

    def read_coverage(self) -> dict:
        return self._read_json("coverage.json", {})

    def log_suggestion_cycle(self, record: dict) -> None:
        record.setdefault("t", datetime.now().isoformat(timespec="seconds"))
        self._append_jsonl("suggestions_log.jsonl", record)

    def log_cost(self, kind: str, model: str, input_tokens: int, output_tokens: int) -> None:
        costs = self._read_json("costs.json", {"calls": [], "totals": {}})
        cost = config.estimate_cost_usd(model, input_tokens, output_tokens)
        costs["calls"].append({
            "t": datetime.now().isoformat(timespec="seconds"),
            "kind": kind,
            "model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "est_cost_usd": round(cost, 6),
        })
        totals = costs.setdefault("totals", {})
        totals["input_tokens"] = totals.get("input_tokens", 0) + input_tokens
        totals["output_tokens"] = totals.get("output_tokens", 0) + output_tokens
        totals["est_cost_usd"] = round(totals.get("est_cost_usd", 0.0) + cost, 6)
        self._write_json("costs.json", costs)

    # ── reports ───────────────────────────────────────────────────

    def write_report_files(self, data: dict, client_html: str, internal_md: str) -> None:
        self._write_json("report_data.json", data)
        (self.path / "report_client.html").write_text(client_html, encoding="utf-8")
        (self.path / "report_internal.md").write_text(internal_md, encoding="utf-8")

    def status(self) -> dict:
        return {
            "id": self.id,
            "business_name": self.read_intake().get("business_name", self.id),
            "created_at": self.read_intake().get("created_at", ""),
            "has_transcript": (self.path / "transcript.jsonl").exists(),
            "has_report": (self.path / "report_client.html").exists(),
            "has_audio": (self.path / "audio.wav").exists(),
            "is_sample": self.id.startswith("_"),
        }


def list_sessions() -> list[dict]:
    config.SESSIONS_DIR.mkdir(exist_ok=True)
    out = []
    for p in sorted(config.SESSIONS_DIR.iterdir(), reverse=True):
        if p.is_dir():
            out.append(SessionStore(p).status())
    return out


def format_ts(seconds: float) -> str:
    seconds = int(seconds or 0)
    return f"{seconds // 60:02d}:{seconds % 60:02d}"


def speaker_label(speaker, consultant_speaker: int | None) -> str:
    """Once Mick marks which diarized speaker he is, transcripts read
    Consultant:/Owner: — so the models attribute quotes correctly.
    (Any additional diarized voices collapse into 'Owner' — fine for a
    discovery conversation.)"""
    if consultant_speaker is None or speaker is None:
        return f"Speaker {speaker if speaker is not None else '?'}"
    return "Consultant" if int(speaker) == int(consultant_speaker) else "Owner"
