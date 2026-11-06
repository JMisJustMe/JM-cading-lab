#!/usr/bin/env python3
"""JM Work Mode CP03: one-click, owner-triggered local launcher.

Reuses the CP02 web controller and original CP01 queue from the same Git tree.
No auto-running work jobs, system wake changes, network listening outside
127.0.0.1, repository mutation, phone installations or public publishing.
"""
from __future__ import annotations

import argparse
import http.client
from pathlib import Path
import socket
import subprocess
import sys
import time
import webbrowser

import jm_work_mode as work

PORT = 8766


def url(port: int = PORT) -> str:
    return f"http://127.0.0.1:{port}/"


def verified_page(port: int = PORT) -> bool:
    """Local controller identity sanity check, not a substitute for authentication."""
    connection = http.client.HTTPConnection("127.0.0.1", port, timeout=1.5)
    try:
        connection.request("GET", "/", headers={"Host": f"127.0.0.1:{port}"})
        response = connection.getresponse()
        body = response.read(60_000)
        return (response.status == 200 and
                b"JM ECOSTATE" in body and b"ACTIVATE NOW" in body and
                b'form method="post" action="/activate"' in body and
                response.getheader("X-Frame-Options") == "DENY")
    except (OSError, TimeoutError, http.client.HTTPException):
        return False
    finally:
        connection.close()


def occupied(port: int = PORT) -> bool:
    try:
        with socket.create_connection(("127.0.0.1", port), timeout=1.0):
            return True
    except OSError:
        return False


def launch(repo: Path, *, port: int = PORT, open_browser: bool = True) -> int:
    repo = work.ensure_repo(repo)
    location = url(port)
    if verified_page(port):
        print("JM WORK MODE: existing verified local controller available: " + location)
        if open_browser:
            webbrowser.open(location)
        return 0
    if occupied(port):
        print("HOLD: local port occupied by an unverified process; not opening or replacing it.")
        return 2
    work.WORK_DIR.mkdir(parents=True, exist_ok=True)
    script = Path(__file__).resolve().with_name("jm_work_mode_web.py")
    argv = [sys.executable, str(script), "--repo", str(repo), "--port", str(port), "--no-browser"]
    flags = (subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW) if sys.platform == "win32" else 0
    with (work.WORK_DIR / "web-server.out").open("a", encoding="utf-8") as out, \
         (work.WORK_DIR / "web-server.err").open("a", encoding="utf-8") as err:
        process = subprocess.Popen(argv, cwd=repo, stdin=subprocess.DEVNULL,
                                   stdout=out, stderr=err, close_fds=True,
                                   creationflags=flags, start_new_session=sys.platform != "win32")
    for _ in range(35):
        if verified_page(port):
            print("JM WORK MODE: local controller started and verified: " + location)
            if open_browser:
                webbrowser.open(location)
            return 0
        if process.poll() is not None:
            print("HOLD: controller exited unexpectedly. See local web-server.err.")
            return 2
        time.sleep(0.1)
    print("HOLD: controller start not verified. Inspect the local server log and port.")
    return 2


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-browser", action="store_true", help="verification-only, leave browser untouched")
    parser.add_argument("--repo", type=Path, default=work.repo_default())
    parser.add_argument("--port", type=int, default=PORT)
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("invalid port")
    try:
        return launch(args.repo, port=args.port, open_browser=not args.no_browser)
    except (OSError, RuntimeError) as exc:
        print("HOLD: " + str(exc))
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
