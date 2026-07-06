"""Framework loader: core areas + industry overlay merge (spec §3).

Loaded once at startup — edit the YAML, restart, and it's live.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from . import config

log = logging.getLogger("copilot.framework")


@dataclass
class Area:
    id: str
    label: str
    why_it_matters: str
    probe_questions: list[str] = field(default_factory=list)
    depth_signals: list[str] = field(default_factory=list)


@dataclass
class Overlay:
    id: str
    label: str
    match_keywords: list[str] = field(default_factory=list)
    areas: dict[str, dict] = field(default_factory=dict)


class Framework:
    def __init__(self, core: list[Area], overlays: list[Overlay]):
        self.core = core
        self.overlays = {o.id: o for o in overlays}

    @classmethod
    def load(cls, framework_dir: Path | None = None) -> "Framework":
        d = framework_dir or config.FRAMEWORK_DIR
        raw = yaml.safe_load((d / "core.yaml").read_text(encoding="utf-8"))
        core = [
            Area(
                id=a["id"],
                label=a.get("label", a["id"]),
                why_it_matters=a.get("why_it_matters", ""),
                probe_questions=list(a.get("probe_questions", []) or []),
                depth_signals=list(a.get("depth_signals", []) or []),
            )
            for a in raw.get("areas", [])
        ]
        overlays: list[Overlay] = []
        overlay_dir = d / "overlays"
        if overlay_dir.is_dir():
            for path in sorted(overlay_dir.glob("*.yaml")):
                try:
                    o = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
                    overlays.append(
                        Overlay(
                            id=o.get("id", path.stem),
                            label=o.get("label", path.stem),
                            match_keywords=[str(k).lower() for k in o.get("match_keywords", []) or []],
                            areas=o.get("areas", {}) or {},
                        )
                    )
                except Exception:
                    log.exception("Skipping unreadable overlay %s", path)
        log.info("Framework: %d core areas, %d overlays", len(core), len(overlays))
        return cls(core, overlays)

    def match_overlay(self, industry: str, industry_detail: str = "") -> Overlay | None:
        """Dropdown value wins; otherwise keyword-match the free text."""
        if industry in self.overlays:
            return self.overlays[industry]
        text = f"{industry} {industry_detail}".lower()
        if not text.strip():
            return None
        for o in self.overlays.values():
            if any(kw in text for kw in o.match_keywords):
                return o
        return None

    def merged_areas(self, overlay: Overlay | None) -> list[Area]:
        """Core areas with the overlay's questions/signals appended."""
        merged: list[Area] = []
        for a in self.core:
            extra = (overlay.areas.get(a.id) if overlay else None) or {}
            merged.append(
                Area(
                    id=a.id,
                    label=a.label,
                    why_it_matters=a.why_it_matters,
                    probe_questions=a.probe_questions + list(extra.get("probe_questions", []) or []),
                    depth_signals=a.depth_signals + list(extra.get("depth_signals", []) or []),
                )
            )
        return merged

    def overlay_choices(self) -> list[dict]:
        return [{"id": o.id, "label": o.label} for o in self.overlays.values()]


def areas_for_prompt(areas: list[Area], max_questions: int = 4) -> str:
    """Compact framework context for the live engine: ids, labels, depth
    signals, and a few probe questions — not the full bank (spec §4)."""
    lines: list[str] = []
    for a in areas:
        lines.append(f"- {a.id} ({a.label}): {a.why_it_matters}")
        if a.depth_signals:
            lines.append(f"  covered when known: {'; '.join(a.depth_signals)}")
        if a.probe_questions:
            qs = a.probe_questions[:max_questions]
            lines.append(f"  example probes: {' | '.join(qs)}")
    return "\n".join(lines)


def fresh_coverage(areas: list[Area]) -> dict:
    return {
        "areas": {
            a.id: {"status": "untouched", "evidence": [], "manual": False}
            for a in areas
        },
        "notable": [],
        "move_on": [],
    }
