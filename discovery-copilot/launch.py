#!/usr/bin/env python3
"""Launcher + readiness doctor.

    python launch.py            # start server + open the sidebar window
    python launch.py --no-open  # server only
    python launch.py --check    # readiness doctor: verify keys/auth/audio,
                                # exit 0 when good to go (run this right
                                # after pasting a new API key)
"""
from __future__ import annotations

import argparse
import shutil
import socket
import subprocess
import sys
import time
import urllib.request
import webbrowser
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))

from app import config  # noqa: E402

URL = f"http://{config.HOST}:{config.PORT}"
WIN_W, WIN_H = 440, 1000

OK, WARN, FAIL = "ok", "warn", "fail"


def server_up() -> bool:
    try:
        with urllib.request.urlopen(URL + "/api/health", timeout=1.5) as r:
            return r.status == 200
    except Exception:
        return False


def port_free() -> bool:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind((config.HOST, config.PORT))
        return True
    except OSError:
        return False
    finally:
        s.close()


# ── readiness doctor (--check) ────────────────────────────────────

def readiness_report(network: bool = True) -> list[tuple[str, str, str]]:
    """Every row: (ok|warn|fail, name, detail). fail = blocks a real call."""
    rows: list[tuple[str, str, str]] = []

    env_path = config.BASE_DIR / ".env"
    rows.append((OK, "config", f".env found ({env_path})") if env_path.exists()
                else (WARN, "config", ".env not found — copy .env.example "
                                      "(plain environment variables work too)"))

    missing = []
    for mod in ("fastapi", "uvicorn", "websockets", "anthropic",
                "pydantic", "yaml", "dotenv", "httpx"):
        try:
            __import__(mod)
        except ImportError:
            missing.append(mod)
    rows.append((FAIL, "python deps", "missing: " + ", ".join(missing)
                 + " — pip install -r requirements.txt") if missing
                else (OK, "python deps", "all packages importable"))

    try:
        from app.framework import Framework
        fw = Framework.load()
        rows.append((OK, "framework",
                     f"{len(fw.core)} core areas, {len(fw.overlays)} overlays"))
    except Exception as e:
        rows.append((FAIL, "framework", f"failed to load framework/: {e}"))

    try:
        import json as _json
        from app import report_render
        from app.schemas import AuditReport
        sample = config.SESSIONS_DIR / "_sample"
        rep = AuditReport.model_validate(
            _json.loads((sample / "report_data.json").read_text(encoding="utf-8")))
        intake = _json.loads((sample / "intake.json").read_text(encoding="utf-8"))
        html = report_render.render_client_html(rep, intake)
        rows.append((OK, "renderer",
                     f"sample client report renders ({len(html) // 1024} KB)"))
    except Exception as e:
        rows.append((FAIL, "renderer", f"sample render failed: {e}"))

    rows.append(_intelligence_row())
    rows.append(_deepgram_row(network))

    try:
        from app import audio as audio_mod
        info = audio_mod.list_input_devices()
        if info["devices"]:
            names = "; ".join(d["name"] for d in info["devices"][:3])
            more = "…" if len(info["devices"]) > 3 else ""
            rows.append((OK, "audio", f"{len(info['devices'])} input device(s): {names}{more}"))
        else:
            rows.append((WARN, "audio", (info.get("error") or "no input devices found")
                         + " — upload/demo modes still work"))
    except Exception as e:
        rows.append((WARN, "audio", f"device check failed ({e}) — upload/demo modes still work"))

    if server_up():
        rows.append((WARN, "port", f"a Discovery Copilot server is already running at {URL}"))
    elif port_free():
        rows.append((OK, "port", f"{config.PORT} is free"))
    else:
        rows.append((FAIL, "port", f"{config.PORT} is taken by another program — "
                                   "set DC_PORT in .env"))
    return rows


def _intelligence_row() -> tuple[str, str, str]:
    if config.LLM_BACKEND == "claude_code":
        try:
            from app.llm_claude_code import ClaudeCodeLLM
            problems = ClaudeCodeLLM.preflight()
            if problems:
                return (FAIL, "intelligence", "; ".join(problems))
            if shutil.which("claude") is None:
                return (WARN, "intelligence",
                        "subscription mode: no `claude` CLI on PATH — the SDK's "
                        "bundled runtime will be tried; install Claude Code + "
                        "`claude login` if calls fail")
            return (OK, "intelligence", "Claude subscription via Claude Code — logged in")
        except Exception as e:
            return (FAIL, "intelligence", str(e))
    if config.LLM_BACKEND == "api":
        if not config.ANTHROPIC_API_KEY:
            return (FAIL, "intelligence",
                    "LLM_BACKEND=api but ANTHROPIC_API_KEY is missing "
                    "(console.anthropic.com)")
        if not config.ANTHROPIC_API_KEY.startswith("sk-ant-"):
            return (WARN, "intelligence",
                    "ANTHROPIC_API_KEY is set but doesn't look like an "
                    "Anthropic key (sk-ant-…) — double-check the paste")
        return (OK, "intelligence", "Anthropic API key set (metered mode)")
    return (FAIL, "intelligence",
            f"unknown LLM_BACKEND={config.LLM_BACKEND!r} — use 'claude_code' or 'api'")


def _deepgram_row(network: bool) -> tuple[str, str, str]:
    if not config.DEEPGRAM_API_KEY:
        return (FAIL, "deepgram",
                "DEEPGRAM_API_KEY missing — console.deepgram.com "
                "(required for all transcription; no subscription substitute)")
    if not network:
        return (WARN, "deepgram", "key set (auth not verified — network check skipped)")
    try:
        import httpx
        r = httpx.get("https://api.deepgram.com/v1/projects",
                      headers={"Authorization": f"Token {config.DEEPGRAM_API_KEY}"},
                      timeout=8)
        if r.status_code == 200:
            return (OK, "deepgram", "key verified — Deepgram auth OK")
        if r.status_code in (401, 403):
            return (FAIL, "deepgram",
                    f"Deepgram rejected the key (HTTP {r.status_code}) — "
                    "check DEEPGRAM_API_KEY for typos/expiry")
        return (WARN, "deepgram", f"unexpected Deepgram response (HTTP {r.status_code})")
    except Exception as e:
        return (WARN, "deepgram",
                f"key set, but couldn't reach Deepgram to verify "
                f"({e.__class__.__name__}) — check your connection")


def run_check() -> int:
    try:  # keep ✓/✗ printable on Windows consoles
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    import logging
    logging.getLogger("copilot").setLevel(logging.ERROR)  # table only, no log noise
    icons = {OK: "✓", WARN: "!", FAIL: "✗"}
    print("Discovery Copilot readiness check\n")
    rows = readiness_report(network=True)
    for status, name, detail in rows:
        print(f"  {icons[status]} {name:<12} {detail}")
    fails = sum(1 for r in rows if r[0] == FAIL)
    warns = sum(1 for r in rows if r[0] == WARN)
    print()
    if fails:
        print(f"NOT READY — fix the {fails} ✗ item(s) above, then run "
              "`python launch.py --check` again.")
        return 1
    if warns:
        print(f"READY — {warns} non-blocking warning(s) above. "
              "Start with: python launch.py")
        return 0
    print("READY — everything checks out. Start with: python launch.py")
    return 0


# ── sidebar launcher ──────────────────────────────────────────────

def screen_width() -> int:
    try:
        import tkinter
        root = tkinter.Tk()
        root.withdraw()
        w = root.winfo_screenwidth()
        root.destroy()
        return int(w)
    except Exception:
        return 1512  # sensible laptop default


def open_sidebar() -> None:
    x = max(0, screen_width() - WIN_W - 8)
    args = [
        f"--app={URL}",
        f"--window-size={WIN_W},{WIN_H}",
        f"--window-position={x},40",
        "--disable-features=TranslateUI",
    ]
    candidates: list[list[str]] = []
    if sys.platform == "darwin":
        for app_name in ("Google Chrome", "Chromium", "Microsoft Edge", "Brave Browser"):
            candidates.append(["open", "-na", app_name, "--args", *args])
    elif sys.platform.startswith("win"):
        for exe in ("chrome", "msedge", "brave"):
            path = shutil.which(exe)
            if path:
                candidates.append([path, *args])
    else:
        for exe in ("google-chrome", "chromium", "chromium-browser", "microsoft-edge", "brave-browser"):
            path = shutil.which(exe)
            if path:
                candidates.append([path, *args])
    for cmd in candidates:
        try:
            subprocess.Popen(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            print(f"sidebar window opened at {URL} (position {x},40)")
            return
        except Exception:
            continue
    print(f"no Chromium-family browser found for app mode — opening a normal tab: {URL}")
    webbrowser.open(URL)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-open", action="store_true", help="don't open the browser window")
    ap.add_argument("--check", action="store_true",
                    help="run the readiness doctor and exit (0 = ready)")
    args = ap.parse_args()

    if args.check:
        return run_check()

    config.check_keys()  # fail loudly before anything spawns

    if server_up():
        print(f"server already running at {URL}")
        if not args.no_open:
            open_sidebar()
        return 0

    print(f"starting Discovery Copilot on {URL} …")
    proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "app.main:app",
         "--host", config.HOST, "--port", str(config.PORT), "--log-level", "info"],
        cwd=str(BASE_DIR),
    )
    try:
        for _ in range(60):
            if server_up():
                break
            if proc.poll() is not None:
                print("server exited during startup — see output above", file=sys.stderr)
                return 1
            time.sleep(0.5)
        else:
            print("server did not come up in 30s", file=sys.stderr)
            proc.terminate()
            return 1
        if not args.no_open:
            open_sidebar()
        print("Ctrl-C to stop.")
        proc.wait()
    except KeyboardInterrupt:
        print("\nshutting down…")
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
