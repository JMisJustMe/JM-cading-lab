#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import threading
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    dist = args.dist.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    chrome = os.environ.get("CHROME_PATH") or next((shutil.which(name) for name in ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"] if shutil.which(name)), None)
    if not chrome:
        raise SystemExit("Chrome/Chromium not found; visual screenshot gate cannot run")

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), lambda *a, **k: Handler(*a, directory=str(dist), **k))
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    time.sleep(.25)
    receipt = json.loads((dist / "VISUAL_CAMPAIGN_RECEIPT.json").read_text(encoding="utf-8"))
    targets = [(e["id"], f"engines/{e['file']}", [("android", "412,915")]) for e in receipt["engines"]]
    targets.append(("army-launcher", receipt["portableLauncher"]["file"], [("desktop", "1440,900"), ("android", "412,915")]))
    rows = []
    try:
        for name, relative, viewports in targets:
            for label, size in viewports:
                url = f"http://127.0.0.1:{port}/{relative}"
                png = out / f"{name}-{label}.png"
                dom = subprocess.run([chrome, "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--disable-background-networking", "--no-first-run", "--no-sandbox", "--hide-scrollbars", "--virtual-time-budget=900", "--dump-dom", url], check=True, capture_output=True, text=True, timeout=35).stdout
                if name != "army-launcher" and "jmvc-root" not in dom:
                    raise RuntimeError(f"{name} did not execute visual runtime at {label} viewport")
                subprocess.run([chrome, "--headless=new", "--disable-gpu", "--disable-dev-shm-usage", "--disable-background-networking", "--no-first-run", "--no-sandbox", "--hide-scrollbars", f"--window-size={size}", "--virtual-time-budget=900", f"--screenshot={png}", url], check=True, capture_output=True, timeout=35)
                if png.stat().st_size < 7000:
                    raise RuntimeError(f"{png.name} is suspiciously small")
                rows.append({"engine": name, "viewport": label, "file": png.name, "bytes": png.stat().st_size})
    finally:
        server.shutdown()
    result = {"schema": "jm.game-engine-army.visual-screenshot-smoke/0.3", "status": "PASS", "captureCount": len(rows), "captures": rows}
    (out / "SCREENSHOT_RECEIPT.json").write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
