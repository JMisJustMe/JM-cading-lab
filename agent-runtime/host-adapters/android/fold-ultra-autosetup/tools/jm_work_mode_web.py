#!/usr/bin/env python3
"""JM Work Mode CP02: local, manually controlled web door to the existing CP01 queue.

Only binds 127.0.0.1; no credentials, public service, Android relay or AI agent.
Each run uses the already approved, restricted jm_work_mode.py allowlist.
"""
from __future__ import annotations

import argparse
import hmac
from html import escape
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import secrets
import threading
import time
from urllib.parse import parse_qs
import webbrowser

import jm_work_mode as work

PORT = 8766
MAX_FORM = 2048


def _latest_jobs(limit: int = 8) -> list[dict]:
    if not work.LOG.is_file():
        return []
    # Small bounded log by reading from end, with a 1 MB cap to avoid OOM.
    with work.LOG.open("rb") as fp:
        fp.seek(0, 2)
        size = fp.tell()
        fp.seek(max(0, size - 1024 * 1024))
        lines = fp.read().splitlines()
    items = []
    for raw in lines[-60:]:
        try:
            item = json.loads(raw)
        except (UnicodeDecodeError, ValueError):
            continue
        if item.get("event") == "JOB_RESULT":
            items.append({"job": str(item.get("job", "?"))[:100],
                          "exit_code": item.get("exit_code"),
                          "at_utc": str(item.get("at_utc", ""))[:50]})
    return items[-limit:][::-1]


def render(token: str, status: dict, jobs: list[dict], repo: Path, message: str = "") -> bytes:
    active = status.get("status", "IDLE")
    done = status.get("completed", 0)
    total = status.get("total", 4)
    name = str(status.get("last_job") or "No work has run yet")[:120]
    lock = work.RUN_LOCK.exists()
    ready = all((repo / q).exists() for q in
                (".git", "scripts/jm_build_execution.py", "agent-runtime/jm_agent_runtime.py"))
    if not ready:
        message = "HOLD — original JM-cading-lab checkout not found. No work started."
    rows = "".join(
        f"<li><span>{escape(item['job'])}</span>"
        f"<strong class=\"{'pass' if item['exit_code'] == 0 else 'fail'}\">"
        f"{'PASS' if item['exit_code'] == 0 else 'FAIL ' + escape(str(item['exit_code']))}</strong></li>"
        for item in jobs
    ) or "<li>No job receipts yet.</li>"
    disabled = "disabled" if not ready or lock or active == "RUNNING" else ""
    stop_disabled = "" if active == "RUNNING" else "disabled"
    markup = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#121a2a">
<meta http-equiv="refresh" content="10">
<title>JM Work Mode · ECOSTATE</title>
<style>
:root {{ color-scheme: dark; --bg:#0c1422; --ink:#ecf4ff; --sub:#aabbd5; --panel:#172237; --border:#374765; --ok:#71e7bd; --warn:#ffcc7a; }}
* {{ box-sizing:border-box }} html,body {{ margin:0; min-height:100%; background:var(--bg); color:var(--ink); font-family:system-ui,Segoe UI,Arial,sans-serif; }}
main {{ max-width:650px; margin:0 auto; padding:24px 18px 48px }}
.brand {{ text-transform:uppercase; letter-spacing:0.14em; font-size:0.8rem; color:var(--sub); font-weight:700 }}
h1 {{ font-size:clamp(2rem,6vw,3rem); line-height:1.14; margin:14px 0 8px }} p {{ color:var(--sub); line-height:1.55 }}
.card {{ margin:20px 0; padding:22px; border:1px solid var(--border); border-radius:20px; background:var(--panel); box-shadow:0 12px 40px #0002 }}
.status {{ display:flex; justify-content:space-between; gap:8px; align-items:center; font-weight:700 }}
.status strong {{ color:var(--ok) }}
button {{ border:0; width:100%; border-radius:16px; color:white; padding:20px 12px; min-height:64px; font-size:1.18rem; font-weight:800; cursor:pointer; touch-action:manipulation }}
.start {{ background:#2769cf }} .stop {{ background:#394b67 }} button:disabled {{ opacity:.35; cursor:not-allowed }}
form {{ margin:14px 0 0 }} .tiny {{ font-size:.83rem; color:var(--sub) }}
.warning {{ color:var(--warn); line-height:1.5; font-weight:600 }} .detail {{ font-family:ui-monospace,Consolas,monospace; overflow-wrap:anywhere; color:var(--sub); font-size:.85rem }}
ul {{ list-style:none; padding:0 }} li {{ display:flex; gap:12px; justify-content:space-between; border-top:1px solid var(--border); padding:12px 0; font-size:.93rem }}
li span {{ max-width:75% }} .pass {{ color:var(--ok) }} .fail {{ color:var(--warn) }}
footer {{ font-size:.8rem; color:var(--sub); line-height:1.6 }}
</style></head><body><main>
<div class="brand">JM ECOSTATE · HOME LAB</div>
<h1>Work Mode</h1>
<p>One manual tap. Real authorised laptop checks. Your phone remains yours.</p>
<div class="card">
<div class="status"><span>Current state</span><strong>{escape(str(active))}</strong></div>
<p>{escape(str(done))} of {escape(str(total))} jobs completed</p>
<div class="detail">{escape(name)}</div>
{f'<p class="warning">{escape(message)}</p>' if message else ''}
<form method="post" action="/activate"><input type="hidden" name="token" value="{escape(token, quote=True)}">
<button class="start" {disabled}>▶ ACTIVATE NOW</button></form>
<form method="post" action="/stop"><input type="hidden" name="token" value="{escape(token, quote=True)}">
<button class="stop" {stop_disabled}>■ STOP AFTER CURRENT JOB</button></form>
<p class="tiny">This launches a bounded queue, not a timed screen-awake session.</p>
</div>
<div class="card"><div class="status">Previous job receipts <span class="tiny">Local only</span></div><ul>{rows}</ul></div>
<footer>Independent of this ChatGPT conversation. Bound to the laptop's 127.0.0.1 interface only. The computer must remain powered; normal system sleep is unchanged. No public phone access or continuous AI execution is claimed.</footer>
</main></body></html>'''
    return markup.encode("utf-8")


class WorkServer(ThreadingHTTPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self, repo: Path, address: tuple[str, int] = ("127.0.0.1", PORT)):
        if address[0] != "127.0.0.1":
            raise ValueError("SECURITY HOLD: work mode must bind loopback only")
        self.repo = repo.resolve()
        self.token = secrets.token_urlsafe(32)
        self.action_lock = threading.Lock()
        self.last_started = 0.0
        super().__init__(address, WorkHandler)


class WorkHandler(BaseHTTPRequestHandler):
    server: WorkServer

    def log_message(self, *_args):
        pass  # No referer, command token, body or private paths in HTTP logs.

    def _trusted_host(self) -> bool:
        return self.headers.get("Host", "") in (
            f"127.0.0.1:{self.server.server_port}",
            f"localhost:{self.server.server_port}",
        )

    def _respond(self, status: int, body: bytes, mime: str = "text/plain; charset=utf-8") -> None:
        self.send_response(status)
        self.send_header("Content-Type", mime)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store, max-age=0")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if not self._trusted_host():
            return self._respond(403, b"Host rejected")
        if self.path not in ("/", "/status"):
            return self._respond(404, b"Not found")
        state = work.read_state()
        payload = render(self.server.token, state, _latest_jobs(), self.server.repo)
        self._respond(200, payload, "text/html; charset=utf-8")

    def do_POST(self):
        if not self._trusted_host():
            return self._respond(403, b"Host rejected")
        expected_origins = (f"http://127.0.0.1:{self.server.server_port}",
                            f"http://localhost:{self.server.server_port}")
        if self.headers.get("Origin") not in expected_origins:
            return self._respond(403, b"Origin rejected")
        if self.path not in ("/activate", "/stop"):
            return self._respond(404, b"Not found")
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/x-www-form-urlencoded":
            return self._respond(415, b"Form required")
        try:
            size = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return self._respond(400, b"Invalid length")
        if not 0 < size <= MAX_FORM:
            return self._respond(413, b"Invalid form size")
        try:
            fields = parse_qs(self.rfile.read(size).decode("utf-8", errors="strict"))
        except (UnicodeError, ValueError):
            return self._respond(400, b"Invalid encoding")
        secret = fields.get("token", [""])
        if len(secret) != 1 or not hmac.compare_digest(secret[0], self.server.token):
            return self._respond(403, b"Token rejected")
        with self.server.action_lock:
            if self.path == "/activate":
                if time.monotonic() - self.server.last_started < 5:
                    return self._respond(409, b"Launch already requested")
                try:
                    code = work.start(self.server.repo)
                except (OSError, ValueError, RuntimeError):
                    return self._respond(409, b"HOLD: existing checkout or execution unavailable")
                if code != 0:
                    return self._respond(409, b"HOLD: job running or blocked")
                self.server.last_started = time.monotonic()
            else:
                work.stop()
        self.send_response(303)
        self.send_header("Location", "/")
        self.send_header("Cache-Control", "no-store")
        self.end_headers()


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=work.repo_default())
    parser.add_argument("--port", type=int, default=PORT)
    parser.add_argument("--no-browser", action="store_true")
    ns = parser.parse_args(argv)
    if not 0 <= ns.port <= 65535:
        parser.error("port out of range")
    with WorkServer(ns.repo, ("127.0.0.1", ns.port)) as server:
        url = f"http://127.0.0.1:{server.server_port}/"
        print("JM WORK MODE — LOCAL ONLY: " + url, flush=True)
        if not ns.no_browser:
            webbrowser.open(url)
        try:
            server.serve_forever(poll_interval=.2)
        except KeyboardInterrupt:
            pass
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
