#!/usr/bin/env python3
"""JM Fold Ultra 0.6 — authorised USB ADB bridge, debug APK only.

No network, root, Samsung launcher writes, secrets on command line, or
unattended phone-side changes. ADB run-as is possible for *debuggable* APKs
on devices whose owner has authorised USB debugging from a trusted computer.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import secrets
import subprocess
import sys
import re
from urllib.parse import urlsplit
import ipaddress

PACKAGE = "com.jmisjustme.foldultra"
REQUEST_SCHEMA = "JM.FoldBridgeRequest/0.6"
CONFIG_SCHEMA = "JM.FoldUltraSetup/0.6"
VALID_CONFIG_SCHEMAS = {
    CONFIG_SCHEMA, "JM.FoldUltraSetup/0.5", "JM.FoldUltraSetup/0.4",
    "JM.FoldUltraSetup/0.3", "JM.FoldUltraSetup/0.2",
}
VALID_SESSIONS = {"MAKE": "CREATE", "PLAYTEST": "PLAY",
                  "RESEARCH": "EVERYDAY", "RECOVERY": "CREATE"}
ALLOWED_FOCUS = {"CREATE", "PLAY", "EVERYDAY"}
MAX_SIZE = 65536
STAGING = "files/bridge_request.json"
SNAPSHOT = "files/bridge_snapshot.json"
RECEIPT = "files/bridge_receipt.json"


class BridgeError(Exception):
    pass


PROJECT_FAMILIES = {"GAMES", "MUSIC", "BUILD", "ESTATE"}
PROJECT_ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,31}$")
PROJECT_LIMIT = 24


def safe_project_url(url: str) -> str:
    if not isinstance(url, str) or len(url) > 1024:
        raise BridgeError("Project URL must be text of at most 1024 characters")
    if not url:
        return ""
    if not url.startswith("https://") or any(x in url for x in ("\\", "\n", "\r", " ")):
        raise BridgeError("Project URL must use public HTTPS without spaces")
    parts = urlsplit(url)
    host = parts.hostname or ""
    if not host or parts.username is not None or parts.password is not None or \
            parts.port is not None or parts.fragment:
        raise BridgeError("Project URL cannot contain credentials, port or fragment")
    if host.lower() == "localhost" or host.lower().endswith(".local"):
        raise BridgeError("Local-only URLs are not supported")
    try:
        address = ipaddress.ip_address(host)
        if not address.is_global:
            raise BridgeError("Private or reserved IP address forbidden")
    except ValueError:
        pass
    if host.startswith("10.") or host.startswith("192.168.") or host.startswith("127."):
        raise BridgeError("Private address forbidden")
    return url


def validate_project(project: object) -> dict:
    if not isinstance(project, dict):
        raise BridgeError("Project must be a JSON object")
    item_id = project.get("id")
    title = project.get("title")
    family = project.get("family")
    if not isinstance(item_id, str) or not PROJECT_ID.fullmatch(item_id):
        raise BridgeError("Bad project ID (lowercase letters, numbers and hyphens)")
    if not isinstance(title, str) or not 2 <= len(title.strip()) <= 64:
        raise BridgeError("Bad project title")
    if family not in PROJECT_FAMILIES:
        raise BridgeError("Bad project family")
    url = safe_project_url(project.get("url", ""))
    return {"id": item_id, "title": title.strip(), "family": family, "url": url}


def validate_project_shelf(projects: object, active: str) -> list[dict]:
    if not isinstance(projects, list) or not (1 <= len(projects) <= PROJECT_LIMIT):
        raise BridgeError("Project shelf must contain 1–24 references")
    clean = [validate_project(p) for p in projects]
    ids = [p["id"] for p in clean]
    if len(ids) != len(set(ids)) or active not in ids:
        raise BridgeError("Duplicate IDs or missing active project")
    return clean


def project_select_request(project_id: str) -> dict:
    if not isinstance(project_id, str) or not PROJECT_ID.fullmatch(project_id):
        raise BridgeError("Invalid selected project ID")
    return {"schema": REQUEST_SCHEMA, "request_id": secrets.token_hex(16),
            "kind": "project_select", "project_id": project_id}


def project_bind_request(item_id: str, title: str, family: str, url: str) -> dict:
    p = validate_project({"id": item_id, "title": title, "family": family, "url": url})
    return {"schema": REQUEST_SCHEMA, "request_id": secrets.token_hex(16),
            "kind": "project_bind", "project": p}


def validate_config(data: object) -> dict:
    if not isinstance(data, dict):
        raise BridgeError("JM configuration must be a JSON object")
    if data.get("schema") not in VALID_CONFIG_SCHEMAS:
        raise BridgeError("Unknown or unsupported JM configuration schema")
    root = data.get("root")
    if not isinstance(root, str) or len(root) > 10000:
        raise BridgeError("JM root must be text of at most 10,000 characters")
    if data.get("focus", "CREATE") not in ALLOWED_FOCUS:
        raise BridgeError("Unknown quick-route focus")
    if data.get("session", "MAKE") not in VALID_SESSIONS:
        raise BridgeError("Unknown JM session")
    if data.get("native_group", "ASSIST") not in {"ASSIST", "CREATE", "WORK"}:
        raise BridgeError("Unknown Galaxy group")
    if not isinstance(data.get("stage", 0), int) or isinstance(data.get("stage", 0), bool) or not 0 <= data.get("stage", 0) <= 4:
        raise BridgeError("Invalid opening stage")
    for name in ("native_owner_marks", "owner_test_marks"):
        if name in data and not isinstance(data[name], dict):
            raise BridgeError(f"{name} must be an object")
    if data.get("schema") == CONFIG_SCHEMA:
        validate_project_shelf(data.get("project_shelf"), data.get("active_project"))
    return data


def document_bytes(value: dict) -> bytes:
    data = (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
            .encode("utf-8"))
    if len(data) > MAX_SIZE:
        raise BridgeError("Payload exceeds 64 KiB safety limit")
    return data


def new_profile_request(session: str, focus: str | None = None) -> dict:
    session = session.upper()
    if session not in VALID_SESSIONS:
        raise BridgeError("Unknown JM session")
    focus = (focus or VALID_SESSIONS[session]).upper()
    if focus not in ALLOWED_FOCUS:
        raise BridgeError("Unknown quick-route focus")
    return {"schema": REQUEST_SCHEMA, "request_id": secrets.token_hex(16),
            "kind": "profile", "session": session, "focus": focus}


def new_restore_request(config: dict) -> dict:
    validate_config(config)
    return {"schema": REQUEST_SCHEMA, "request_id": secrets.token_hex(16),
            "kind": "restore", "config": config}


def adb_run(adb: str, serial: str, *command: str,
            stdin: bytes | None = None, timeout: int = 25) -> bytes:
    args = [adb, "-s", serial, *command]
    try:
        p = subprocess.run(args, input=stdin, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE, timeout=timeout, check=False)
    except FileNotFoundError as e:
        raise BridgeError("ADB executable missing; install official Android platform-tools") from e
    except subprocess.TimeoutExpired as e:
        raise BridgeError("ADB operation timed out") from e
    if p.returncode != 0:
        err = p.stderr.decode("utf-8", "replace").strip()
        raise BridgeError(f"ADB operation refused ({p.returncode}): {err[:400]}")
    return p.stdout


def connected(adb: str, explicit_serial: str | None) -> str:
    try:
        p = subprocess.run([adb, "devices"], capture_output=True, text=True,
                           timeout=15, check=False)
    except FileNotFoundError as e:
        raise BridgeError("ADB missing; install Android platform-tools") from e
    if p.returncode:
        raise BridgeError("ADB could not list devices")
    lines = [s.strip().split("\t") for s in p.stdout.splitlines()[1:] if "\t" in s]
    authorised = [parts[0] for parts in lines if len(parts) >= 2 and parts[1].startswith("device")]
    if explicit_serial is not None:
        if explicit_serial not in authorised:
            raise BridgeError("Requested device is not connected and authorised")
        return explicit_serial
    if len(authorised) != 1:
        raise BridgeError(f"Expected exactly one authorised device; found {len(authorised)}. Use --serial.")
    return authorised[0]


def ensure_debug(adb: str, serial: str) -> None:
    # Debug variant only. run-as must be rejected by Android for non-debuggable builds.
    adb_run(adb, serial, "shell", "run-as", PACKAGE, "pwd")


def stage_payload(adb: str, serial: str, body: dict) -> str:
    ensure_debug(adb, serial)
    payload = document_bytes(body)
    # The Android app never polls a network socket. ADB streams into an
    # app-private file which is consumed exactly once after launch.
    adb_run(adb, serial, "exec-in", "run-as", PACKAGE, "sh", "-c",
            f"cat > {STAGING}", stdin=payload)
    # Verify byte-for-byte contact while the request is still staged.
    # If transport alters the payload, do not launch any phone-side approval.
    echoed = adb_run(adb, serial, "exec-out", "run-as", PACKAGE, "cat", STAGING)
    if echoed != payload:
        try:
            adb_run(adb, serial, "shell", "run-as", PACKAGE, "rm", STAGING)
        except BridgeError:
            pass
        raise BridgeError(
            "USB staging readback mismatch; no request launched. "
            f"Sent {len(payload)} bytes sha256={hashlib.sha256(payload).hexdigest()[:12]}; "
            f"read {len(echoed)} bytes sha256={hashlib.sha256(echoed).hexdigest()[:12]}.")
    # Never say applied: Android will display a human approval dialog.
    adb_run(adb, serial, "shell", "am", "start", "-n",
            f"{PACKAGE}/.MainActivity")
    return body["request_id"]


def read_private(adb: str, serial: str, file: str) -> bytes:
    ensure_debug(adb, serial)
    content = adb_run(adb, serial, "exec-out", "run-as", PACKAGE, "cat", file)
    if not content or len(content) > MAX_SIZE:
        raise BridgeError("Bridge file missing or too large")
    return content


def protected_write(target: Path, content: bytes) -> None:
    target = target.expanduser()
    target.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(str(target), os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(content)
            stream.flush()
            os.fsync(stream.fileno())
    except BaseException:
        target.unlink(missing_ok=True)
        raise


def read_config_file(path: Path) -> dict:
    if path.stat().st_size > MAX_SIZE:
        raise BridgeError("Input configuration too large")
    data = json.loads(path.read_text(encoding="utf-8"))
    return validate_config(data)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="JM Fold Ultra v0.6 — owner-approved USB contact")
    p.add_argument("--adb", default="adb", help="Android platform-tools adb executable")
    p.add_argument("--serial", help="ADB serial; mandatory if multiple devices are present")
    sub = p.add_subparsers(dest="action", required=True)
    sub.add_parser("status", help="Read device identity and debug-app contact")
    profile = sub.add_parser("profile", help="Stage a bounded JM route; phone must approve")
    profile.add_argument("session", choices=sorted(VALID_SESSIONS))
    profile.add_argument("--focus", choices=sorted(ALLOWED_FOCUS))
    restore = sub.add_parser("restore", help="Stage local JM configuration; phone must approve")
    restore.add_argument("file", type=Path)
    backup = sub.add_parser("backup", help="Retrieve owner-prepared JM snapshot from phone")
    backup.add_argument("file", type=Path)
    select = sub.add_parser("project-select", help="Stage existing JM project selection for approval")
    select.add_argument("id", help="JM shelf project ID")
    bind = sub.add_parser("project-bind", help="Stage a JM project reference or route for approval")
    bind.add_argument("id", help="JM project ID")
    bind.add_argument("--title", required=True, help="JM project display title")
    bind.add_argument("--family", required=True, choices=sorted(PROJECT_FAMILIES))
    bind.add_argument("--url", required=True, help="Public HTTPS URL, or '' for unbound")
    sub.add_parser("receipt", help="Read the last phone-side USB decision")
    args = p.parse_args(argv)
    try:
        serial = connected(args.adb, args.serial)
        if args.action == "status":
            ensure_debug(args.adb, serial)
            model = adb_run(args.adb, serial, "shell", "getprop", "ro.product.model").decode().strip()
            sdk = adb_run(args.adb, serial, "shell", "getprop", "ro.build.version.sdk").decode().strip()
            package_path = adb_run(args.adb, serial, "shell", "pm", "path", PACKAGE).decode().strip()
            print(f"USB CONTACT READY / {serial} / model {model} / Android API {sdk}")
            print(f"JM debug app installed: {bool(package_path)}")
            print("No phone settings changed. ADB trust remains your responsibility.")
        elif args.action in {"profile", "restore", "project-select", "project-bind"}:
            if args.action == "profile":
                body = new_profile_request(args.session, args.focus)
            elif args.action == "restore":
                body = new_restore_request(read_config_file(args.file))
            elif args.action == "project-select":
                body = project_select_request(args.id)
            else:
                body = project_bind_request(args.id, args.title, args.family, args.url)
            request_id = stage_payload(args.adb, serial, body)
            print(f"REQUEST STAGED: {request_id}")
            print("OPEN / confirm or reject on the phone. No settings have been applied by this command.")
        elif args.action == "backup":
            payload = read_private(args.adb, serial, SNAPSHOT)
            validate_config(json.loads(payload.decode("utf-8")))
            protected_write(args.file, payload)
            print(f"OWNER-PREPARED SNAPSHOT SAVED: {args.file}")
            print("File mode 0600 on supporting systems; protect it because your root note is included.")
            print("SHA-256:", hashlib.sha256(payload).hexdigest())
        elif args.action == "receipt":
            data = json.loads(read_private(args.adb, serial, RECEIPT))
            if data.get("schema") != "JM.FoldBridgeReceipt/0.6":
                raise BridgeError("Unknown receipt schema")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            if data.get("status") != "ACCEPTED":
                print("DING NOT CLAIMED: no accepted phone-side operation in this receipt.")
        return 0
    except (BridgeError, FileNotFoundError, OSError, json.JSONDecodeError) as e:
        print("HOLD:", str(e), file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
