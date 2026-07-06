#!/usr/bin/env python3
"""Launcher: start the server (if it isn't already) and open the UI as a
sidebar-sized browser window positioned at the right edge of the screen.

    python launch.py            # start server + open sidebar
    python launch.py --no-open  # server only
"""
from __future__ import annotations

import argparse
import shutil
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


def server_up() -> bool:
    try:
        with urllib.request.urlopen(URL + "/api/health", timeout=1.5) as r:
            return r.status == 200
    except Exception:
        return False


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
    args = ap.parse_args()

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
