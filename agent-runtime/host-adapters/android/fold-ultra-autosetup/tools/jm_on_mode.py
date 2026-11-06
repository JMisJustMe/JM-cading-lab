#!/usr/bin/env python3
"""JM ON MODE CP01: bounded owner-requested screen-on session. No new app.

Runs on authorised GroundZeroJM, using existing ADB pairing. Keeps the Windows
display/system awake through a reversible process-owned power request. ADB
screen timeout adjustments are per-device, recorded and restored. No root,
LAN server, credentials, Android HOME role or package installation is involved.
"""
import argparse
import ctypes
import datetime as dt
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

DIR = Path(os.environ.get("LOCALAPPDATA") or Path.home()) / "JM_ECOSTATE" / "JM_ON_MODE_CP01"
STATE = DIR / "state.json"
STOP = DIR / "stop.request"
LOG = DIR / "session.log"
DEVICES = (("FOLD8", "RFGL83GFK0F", "SM-F976B"), ("OPPO", "7e2af3ec", "CPH2305"))
MAX_MINUTES = 120
DEFAULT_MINUTES = 60

def utc():
    return dt.datetime.now(dt.timezone.utc).isoformat()

def save(state):
    DIR.mkdir(parents=True, exist_ok=True)
    tmp = STATE.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")
    os.replace(tmp, STATE)

def load():
    if not STATE.is_file():
        return {}
    return json.loads(STATE.read_text(encoding="utf-8"))

def log(message):
    DIR.mkdir(parents=True, exist_ok=True)
    with LOG.open("a", encoding="utf-8") as out:
        out.write(utc() + " " + message + "\n")

def cmd(*argv, timeout=12):
    try:
        return subprocess.run(argv, stdout=subprocess.PIPE, stderr=subprocess.PIPE,
                              text=True, encoding="utf-8", errors="replace",
                              timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        return None

def find_devices():
    """Use original ADB discovery IDs, not last week's rotating TCP port."""
    result = cmd("adb", "mdns", "services", timeout=12)
    if not result or result.returncode:
        return {}
    found = {}
    for line in result.stdout.splitlines():
        for name, identity, expected in DEVICES:
            if not line.startswith("adb-" + identity) or "_adb-tls-connect._tcp" not in line:
                continue
            m = re.search(r"((?:[0-9]{1,3}\.){3}[0-9]{1,3}:[0-9]{2,5})", line)
            if m:
                found[name] = (m.group(1), expected)
    return found

def connected():
    found = find_devices()
    live = {}
    for name, (address, expected) in found.items():
        candidate = cmd("adb", "connect", address, timeout=8)
        if not candidate or candidate.returncode:
            continue
        model = cmd("adb", "-s", address, "shell", "getprop", "ro.product.model", timeout=8)
        if model and model.returncode == 0 and model.stdout.strip() == expected:
            live[name] = address
    return live

def get_timeout(serial):
    result = cmd("adb", "-s", serial, "shell", "settings", "get", "system",
                 "screen_off_timeout", timeout=8)
    if result and result.returncode == 0:
        value = result.stdout.strip()
        if value.isdecimal() and 0 < int(value) <= 2147483647:
            return int(value)
    return None

def put_timeout(serial, value):
    result = cmd("adb", "-s", serial, "shell", "settings", "put", "system",
                 "screen_off_timeout", str(value), timeout=8)
    return bool(result and result.returncode == 0 and get_timeout(serial) == value)

def windows_awake():
    if os.name != "nt":
        raise RuntimeError("Windows host required")
    # Unlike powercfg, this does not permanently change the Windows power plan.
    # ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED | ES_CONTINUOUS.
    state = ctypes.windll.kernel32.SetThreadExecutionState(0x80000003)
    if not state:
        raise RuntimeError("Windows temporary power request failed")

def windows_release():
    ctypes.windll.kernel32.SetThreadExecutionState(0x80000000)

def apply_phones(state, live, deadline):
    for name, serial in live.items():
        if name in state["phones"]:
            continue
        original = get_timeout(serial)
        if original is None:
            log(name + " HOLD: original timeout unreadable")
            continue
        # Bounded timeout; never a never-sleep value even if host crashes.
        remaining_ms = max(10 * 60000, int((deadline - time.monotonic()) * 1000) + 5 * 60000)
        target = min(remaining_ms, (MAX_MINUTES + 5) * 60000)
        if not put_timeout(serial, target):
            log(name + " HOLD: no verified timeout write")
            continue
        state["phones"][name] = {"original_ms": original, "temporary_ms": target}
        save(state)
        log(name + " ON: temporary screen timeout verified")

def restore_phones(state):
    pending = []
    live = connected()
    for name, item in list(state.get("phones", {}).items()):
        serial = live.get(name)
        if serial is None or not put_timeout(serial, item["original_ms"]):
            pending.append(name)
            log(name + " HOLD: reconnect phone to restore previous timeout")
        else:
            log(name + " OFF: previous timeout restored and verified")
    return pending

def guard(minutes):
    DIR.mkdir(parents=True, exist_ok=True)
    if STATE.exists() and load().get("status") in ("ACTIVE", "RESTORE_PENDING"):
        raise RuntimeError("Existing active/pending session: use OFF or STATUS")
    STOP.unlink(missing_ok=True)
    state = {
        "schema": "JM.ONMODE/1.0",
        "status": "ACTIVE",
        "host": "GroundZeroJM",
        "started_utc": utc(),
        "duration_minutes": minutes,
        "pid": os.getpid(),
        "phones": {},
        "windows": "PROCESS_OWNED_SCREEN_AND_SLEEP_HOLD",
        "notes": "ADB owner session only. Never force unlock. No secrets saved."
    }
    save(state)
    deadline = time.monotonic() + minutes * 60
    last_check = -9999.0
    try:
        windows_awake()
        log("Windows ON: bounded system+display wake request")
        while time.monotonic() < deadline and not STOP.exists():
            if time.monotonic() - last_check >= 30:
                last_check = time.monotonic()
                apply_phones(state, connected(), deadline)
            time.sleep(3)
    finally:
        windows_release()
        log("Windows OFF: process-owned power request released")
        state["windows"] = "RELEASED"
        pending = restore_phones(state)
        state["status"] = "RESTORE_PENDING" if pending else "ENDED_RESTORED"
        state["restore_pending"] = pending
        state["finished_utc"] = utc()
        save(state)
        STOP.unlink(missing_ok=True)

def stop():
    state = load()
    if not state:
        print("JM ON MODE: no session recorded")
        return
    if state.get("status") == "ACTIVE":
        STOP.parent.mkdir(parents=True, exist_ok=True)
        STOP.write_text("Owner requested OFF\n", encoding="utf-8")
        print("JM ON MODE OFF requested: guardian releases Windows and restores phone timeouts.")
    elif state.get("status") == "RESTORE_PENDING":
        remaining = restore_phones(state)
        state["restore_pending"] = remaining
        state["status"] = "RESTORE_PENDING" if remaining else "ENDED_RESTORED"
        save(state)
        print("JM ON MODE restore pending: " + ",".join(remaining) if remaining else "JM ON MODE restored")
    else:
        print("JM ON MODE already off: " + state.get("status", "UNKNOWN"))

def start(minutes):
    if os.name != "nt":
        raise RuntimeError("Windows host required")
    if not 5 <= minutes <= MAX_MINUTES:
        raise ValueError("Minutes must be between 5 and 120")
    existing = load()
    if existing.get("status") in ("ACTIVE", "RESTORE_PENDING"):
        print("HOLD: an existing session needs OFF/STATUS; no second guard started")
        return
    DIR.mkdir(parents=True, exist_ok=True)
    flags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW
    subprocess.Popen([sys.executable, str(Path(__file__).resolve()), "guard",
                      "--minutes", str(minutes)],
                     stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                     stderr=(DIR / "error.log").open("a", encoding="utf-8"),
                     creationflags=flags, cwd=str(DIR), close_fds=True)
    for attempt in range(10):
        time.sleep(.5)
        state = load()
        if state.get("status") == "ACTIVE":
            print("JM ON MODE ON: bounded " + str(minutes) + " minute session started on GroundZeroJM.")
            print("Status/restore: " + str(Path(__file__).resolve()))
            return
    raise RuntimeError("Guardian did not report an active state; check error.log")

def status():
    state = load()
    if not state:
        print("JM ON MODE: no active or recorded session")
        return
    summary = {k: state.get(k) for k in
               ("status", "started_utc", "duration_minutes", "windows", "restore_pending")}
    summary["phone_timeouts"] = {
        name: {"original_min": round(v["original_ms"] / 60000, 1),
               "temporary_min": round(v["temporary_ms"] / 60000, 1)}
        for name, v in state.get("phones", {}).items()
    }
    print(json.dumps(summary, indent=2))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["on", "off", "status", "guard"])
    parser.add_argument("--minutes", type=int, default=DEFAULT_MINUTES)
    args = parser.parse_args()
    if args.mode == "on":
        start(args.minutes)
    elif args.mode == "guard":
        guard(args.minutes)
    elif args.mode == "off":
        stop()
    else:
        status()

if __name__ == "__main__":
    main()
