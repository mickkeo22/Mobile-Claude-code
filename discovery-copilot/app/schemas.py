"""Pydantic models + strict tool schemas for the two Anthropic calls."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

# ── Live suggestion engine output (spec §4) ───────────────────────

CoverageStatus = Literal["untouched", "touched", "covered"]


class CoverageUpdate(BaseModel):
    area: str
    status: Literal["touched", "covered"]
    evidence: str = ""


class Suggestion(BaseModel):
    area: str
    question: str
    why: str = ""
    priority: Literal["dig_deeper", "new_area", "clarify"] = "dig_deeper"


class AnalysisResult(BaseModel):
    coverage_updates: list[CoverageUpdate] = Field(default_factory=list)
    suggestions: list[Suggestion] = Field(default_factory=list)
    move_on: list[str] = Field(default_factory=list)
    notable: list[str] = Field(default_factory=list)


# Strict tool schema for the Haiku live call. All fields required +
# additionalProperties:false so `strict: true` guarantees valid input.
ANALYSIS_TOOL = {
    "name": "emit_analysis",
    "description": (
        "Report coverage updates, up to 3 suggested next questions, move-on "
        "flags, and notable quotes from the latest slice of conversation."
    ),
    "strict": True,
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["coverage_updates", "suggestions", "move_on", "notable"],
        "properties": {
            "coverage_updates": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["area", "status", "evidence"],
                    "properties": {
                        "area": {"type": "string"},
                        "status": {"type": "string", "enum": ["touched", "covered"]},
                        "evidence": {"type": "string"},
                    },
                },
            },
            "suggestions": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["area", "question", "why", "priority"],
                    "properties": {
                        "area": {"type": "string"},
                        "question": {"type": "string"},
                        "why": {"type": "string"},
                        "priority": {
                            "type": "string",
                            "enum": ["dig_deeper", "new_area", "clarify"],
                        },
                    },
                },
            },
            "move_on": {"type": "array", "items": {"type": "string"}},
            "notable": {"type": "array", "items": {"type": "string"}},
        },
    },
}


# ── Report generation output (spec §5) ────────────────────────────

Bucket = Literal["automation_systems", "back_office", "custom_builds"]
Effort = Literal["quick_win", "standard_build", "larger_project"]

BUCKET_LABELS = {
    "automation_systems": "Automation Systems",
    "back_office": "Back-Office Services",
    "custom_builds": "Custom Builds",
}
EFFORT_LABELS = {
    "quick_win": "Quick win",
    "standard_build": "Standard build",
    "larger_project": "Larger project",
}


class Recommendation(BaseModel):
    name: str
    bucket: Bucket
    problem: str
    what_it_does: str
    what_changes: str
    effort: Effort
    # internal-only fields (never rendered into the client HTML)
    implementation_path: str = ""
    components: list[str] = Field(default_factory=list)
    build_hours_low: int = 0
    build_hours_high: int = 0
    monthly_maintenance: str = ""
    dependencies_risks: list[str] = Field(default_factory=list)


class StartingPoint(BaseModel):
    name: str
    why: str


class AuditReport(BaseModel):
    what_we_heard: list[str]
    recommendations: list[Recommendation]
    starting_point: list[StartingPoint]
    next_steps: list[str]
    red_flags: list[str] = Field(default_factory=list)
    followup_draft: str = ""  # recap email/text Mick pastes after the meeting


REPORT_TOOL = {
    "name": "emit_audit",
    "description": (
        "Emit the full audit: client-facing sections plus internal build "
        "fields per recommendation. Everything must be grounded in the "
        "transcript — no invented statistics or claims."
    ),
    "strict": True,
    "input_schema": {
        "type": "object",
        "additionalProperties": False,
        "required": [
            "what_we_heard",
            "recommendations",
            "starting_point",
            "next_steps",
            "red_flags",
            "followup_draft",
        ],
        "properties": {
            "what_we_heard": {"type": "array", "items": {"type": "string"}},
            "recommendations": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": [
                        "name", "bucket", "problem", "what_it_does",
                        "what_changes", "effort", "implementation_path",
                        "components", "build_hours_low", "build_hours_high",
                        "monthly_maintenance", "dependencies_risks",
                    ],
                    "properties": {
                        "name": {"type": "string"},
                        "bucket": {
                            "type": "string",
                            "enum": ["automation_systems", "back_office", "custom_builds"],
                        },
                        "problem": {"type": "string"},
                        "what_it_does": {"type": "string"},
                        "what_changes": {"type": "string"},
                        "effort": {
                            "type": "string",
                            "enum": ["quick_win", "standard_build", "larger_project"],
                        },
                        "implementation_path": {"type": "string"},
                        "components": {"type": "array", "items": {"type": "string"}},
                        "build_hours_low": {"type": "integer"},
                        "build_hours_high": {"type": "integer"},
                        "monthly_maintenance": {"type": "string"},
                        "dependencies_risks": {"type": "array", "items": {"type": "string"}},
                    },
                },
            },
            "starting_point": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["name", "why"],
                    "properties": {
                        "name": {"type": "string"},
                        "why": {"type": "string"},
                    },
                },
            },
            "next_steps": {"type": "array", "items": {"type": "string"}},
            "red_flags": {"type": "array", "items": {"type": "string"}},
            "followup_draft": {"type": "string"},
        },
    },
}


# ── Intake ────────────────────────────────────────────────────────

class Intake(BaseModel):
    business_name: str
    industry: str = ""            # dropdown value (overlay id or "other")
    industry_detail: str = ""     # free text
    contact_name: str = ""
    meeting_source: str = ""      # walk-in | cold_call | referral | zoom
    notes: str = ""
    audio_source: str = "mic"     # mic | none | upload
