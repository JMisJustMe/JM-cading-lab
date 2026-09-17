#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shutil
import struct
import subprocess
import tempfile
import threading
import time
import zlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


MIN_PNG_BYTES = 7000
MIN_COLORFUL_RATIO = 0.006
MIN_LUMINOUS_RATIO = 0.012
MIN_LUMA_STDDEV = 5.5


def png_visual_stats(path: Path) -> dict[str, float]:
    data = path.read_bytes()
    if not data.startswith(b"\x89PNG\r\n\x1a\n"):
        raise RuntimeError(f"{path.name} is not a PNG")

    pos = 8
    width = height = bit_depth = color_type = None
    compressed = bytearray()
    while pos + 12 <= len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        kind = data[pos + 4 : pos + 8]
        payload = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if kind == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(
                ">IIBBBBB", payload
            )
        elif kind == b"IDAT":
            compressed.extend(payload)
        elif kind == b"IEND":
            break

    if not width or not height or bit_depth != 8 or color_type not in {2, 6}:
        raise RuntimeError(
            f"{path.name}: unsupported PNG format "
            f"width={width} height={height} depth={bit_depth} type={color_type}"
        )

    channels = 3 if color_type == 2 else 4
    raw = zlib.decompress(bytes(compressed))
    stride = width * channels
    rows: list[bytearray] = []
    offset = 0
    prior = bytearray(stride)

    for _ in range(height):
        mode = raw[offset]
        offset += 1
        scan = bytearray(raw[offset : offset + stride])
        offset += stride
        for i in range(stride):
            left = scan[i - channels] if i >= channels else 0
            up = prior[i]
            upper_left = prior[i - channels] if i >= channels else 0
            if mode == 1:
                scan[i] = (scan[i] + left) & 255
            elif mode == 2:
                scan[i] = (scan[i] + up) & 255
            elif mode == 3:
                scan[i] = (scan[i] + ((left + up) // 2)) & 255
            elif mode == 4:
                estimate = left + up - upper_left
                dl = abs(estimate - left)
                du = abs(estimate - up)
                dul = abs(estimate - upper_left)
                predictor = left if dl <= du and dl <= dul else up if du <= dul else upper_left
                scan[i] = (scan[i] + predictor) & 255
            elif mode != 0:
                raise RuntimeError(f"{path.name}: unsupported PNG filter {mode}")
        rows.append(scan)
        prior = scan

    x0, x1 = int(width * 0.08), int(width * 0.92)
    y0, y1 = int(height * 0.18), int(height * 0.82)
    samples = colorful = luminous = 0
    values: list[float] = []
    step = max(1, min(width, height) // 180)

    for y in range(y0, y1, step):
        row = rows[y]
        for x in range(x0, x1, step):
            i = x * channels
            r, g, b = row[i], row[i + 1], row[i + 2]
            luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
            values.append(luma)
            samples += 1
            if max(r, g, b) - min(r, g, b) >= 22 and max(r, g, b) >= 42:
                colorful += 1
            if luma >= 36:
                luminous += 1

    mean = sum(values) / max(1, len(values))
    variance = sum((value - mean) ** 2 for value in values) / max(1, len(values))
    return {
        "colorfulRatio": colorful / max(1, samples),
        "luminousRatio": luminous / max(1, samples),
        "lumaStdDev": variance**0.5,
    }


def capture_png(
    chrome: str,
    url: str,
    png: Path,
    size: str,
    *,
    retries: int = 3,
) -> dict[str, object]:
    errors: list[str] = []
    for attempt in range(1, retries + 1):
        png.unlink(missing_ok=True)
        with tempfile.TemporaryDirectory(prefix="jmvc-chrome-") as profile:
            command = [
                chrome,
                "--headless=new",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--disable-background-networking",
                "--disable-background-timer-throttling",
                "--disable-backgrounding-occluded-windows",
                "--disable-renderer-backgrounding",
                "--disable-extensions",
                "--disable-sync",
                "--no-first-run",
                "--no-default-browser-check",
                "--no-sandbox",
                "--hide-scrollbars",
                f"--user-data-dir={profile}",
                f"--window-size={size}",
                "--virtual-time-budget=2400",
                f"--screenshot={png}",
                url,
            ]
            started = time.monotonic()
            process = subprocess.Popen(
                command,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            timed_out = False
            try:
                stdout, stderr = process.communicate(timeout=25)
            except subprocess.TimeoutExpired:
                timed_out = True
                process.kill()
                stdout, stderr = process.communicate()

            elapsed = round(time.monotonic() - started, 3)
            if png.is_file() and png.stat().st_size >= MIN_PNG_BYTES:
                try:
                    visual = png_visual_stats(png)
                    return {
                        "attempt": attempt,
                        "elapsedSeconds": elapsed,
                        "chromeTimedOutAfterCapture": timed_out,
                        "chromeReturnCode": process.returncode,
                        "chromeStderrTail": stderr[-600:],
                        **visual,
                    }
                except Exception as error:
                    errors.append(f"attempt {attempt}: invalid PNG: {error}")
            else:
                reason = "timeout" if timed_out else f"exit {process.returncode}"
                errors.append(
                    f"attempt {attempt}: {reason}; bytes="
                    f"{png.stat().st_size if png.exists() else 0}; stderr={stderr[-300:]}"
                )

        time.sleep(0.35 * attempt)

    raise RuntimeError("; ".join(errors))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dist", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()

    dist = args.dist.resolve()
    out = args.out.resolve()
    out.mkdir(parents=True, exist_ok=True)
    chrome = os.environ.get("CHROME_PATH") or next(
        (
            shutil.which(name)
            for name in [
                "google-chrome-stable",
                "google-chrome",
                "chromium",
                "chromium-browser",
            ]
            if shutil.which(name)
        ),
        None,
    )
    if not chrome:
        raise SystemExit("Chrome/Chromium not found; visual screenshot gate cannot run")

    class Handler(SimpleHTTPRequestHandler):
        def log_message(self, *_: object) -> None:
            pass

    server = ThreadingHTTPServer(
        ("127.0.0.1", 0),
        lambda *a, **k: Handler(*a, directory=str(dist), **k),
    )
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    port = server.server_address[1]
    time.sleep(0.25)

    receipt = json.loads(
        (dist / "VISUAL_CAMPAIGN_RECEIPT.json").read_text(encoding="utf-8")
    )
    targets = [
        (engine["id"], f"engines/{engine['file']}", [("android", "412,915")])
        for engine in receipt["engines"]
    ]
    targets.append(
        (
            "army-launcher",
            receipt["portableLauncher"]["file"],
            [("desktop", "1440,900"), ("android", "412,915")],
        )
    )

    rows: list[dict[str, object]] = []
    failures: list[dict[str, object]] = []
    try:
        total = sum(len(viewports) for _, _, viewports in targets)
        ordinal = 0
        for name, relative, viewports in targets:
            for label, size in viewports:
                ordinal += 1
                url = f"http://127.0.0.1:{port}/{relative}"
                png = out / f"{name}-{label}.png"
                row: dict[str, object] = {
                    "engine": name,
                    "viewport": label,
                    "file": png.name,
                }
                print(
                    f"JM_CAPTURE_START {ordinal}/{total} {name} {label}",
                    flush=True,
                )
                try:
                    capture = capture_png(chrome, url, png, size)
                    row["bytes"] = png.stat().st_size
                    row.update(capture)
                    errors: list[str] = []
                    if (
                        name != "army-launcher"
                        and float(row["colorfulRatio"]) < MIN_COLORFUL_RATIO
                        and float(row["luminousRatio"]) < MIN_LUMINOUS_RATIO
                    ):
                        errors.append("empty-central-field")
                    if float(row["lumaStdDev"]) < MIN_LUMA_STDDEV:
                        errors.append("visually-flat")
                    if errors:
                        raise RuntimeError(",".join(errors))
                    row["status"] = "PASS"
                    print(
                        "JM_CAPTURE_PASS " + json.dumps(row, sort_keys=True),
                        flush=True,
                    )
                except Exception as error:
                    row["status"] = "FAIL"
                    row["error"] = f"{type(error).__name__}: {error}"
                    failures.append(row)
                    print(
                        "JM_CAPTURE_FAIL " + json.dumps(row, sort_keys=True),
                        flush=True,
                    )
                rows.append(row)
    finally:
        server.shutdown()

    result = {
        "schema": "jm.game-engine-army.visual-screenshot-smoke/0.3.2",
        "status": "PASS" if not failures else "FAIL",
        "captureCount": len(rows),
        "failureCount": len(failures),
        "captures": rows,
        "failures": failures,
        "thresholds": {
            "minimumPngBytes": MIN_PNG_BYTES,
            "minimumColorfulRatioUnlessLuminous": MIN_COLORFUL_RATIO,
            "minimumLuminousRatioUnlessColorful": MIN_LUMINOUS_RATIO,
            "minimumLumaStdDev": MIN_LUMA_STDDEV,
        },
        "capturePolicy": {
            "attemptsPerFrame": 3,
            "isolatedChromeProfilePerAttempt": True,
            "acceptCompletePngAfterChromeExitTimeout": True,
            "runAllCompositorStagesBeforeDraw": False,
        },
    }
    (out / "SCREENSHOT_RECEIPT.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2), flush=True)
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
