#!/usr/bin/env python3
"""JM Home Lab: offline read-only inspection of an owner-shared device request.

No network, pairing, remote execution, shell dispatch, credentials or file mutation.
A valid envelope is UNSIGNED / UNAUTHENTICATED and is NEVER an execution grant.
"""
import argparse
import hashlib
import json
from pathlib import Path

VERSION = "JM.DeviceLink.Handoff/0.1"
FIELDS = ("authority", "from", "to", "request", "private_payload", "paired",
          "recipient_must_approve")
ROLES = frozenset(("FOLD8", "OPPO", "GROUNDZEROJM"))
REQUESTS = frozenset(("OPEN_JM_ROOT", "REQUEST_PROJECT_POINTER"))

class Hold(ValueError):
    """Refused envelope; no action taken."""

def inspect(raw: bytes) -> dict:
    if not isinstance(raw, bytes) or not 0 < len(raw) <= 1024:
        raise Hold("invalid-size")
    try:
        content = raw.decode("ascii")
    except UnicodeDecodeError:
        raise Hold("non-ascii")
    if "\r" in content or "\x00" in content or not content.endswith("\n"):
        raise Hold("invalid-line-endings")
    rows = content.splitlines()
    if len(rows) != len(FIELDS) + 1 or rows[0] != VERSION:
        raise Hold("unexpected-schema-or-fields")
    values = {}
    for expected, line in zip(FIELDS, rows[1:]):
        key, sep, value = line.partition("=")
        if not sep or key != expected or not value:
            raise Hold("field-order-or-content")
        values[key] = value
    if (values["authority"] != "REQUEST_ONLY"
        or values["private_payload"] != "NONE"
        or values["paired"] != "false"
        or values["recipient_must_approve"] != "true"):
        raise Hold("privilege-escalation-attempt")
    if (values["from"] not in ROLES or values["to"] not in ROLES
        or values["from"] == values["to"]):
        raise Hold("invalid-device-roles")
    if values["request"] not in REQUESTS:
        raise Hold("unapproved-operation")
    return {
        "schema": VERSION,
        "sha256": hashlib.sha256(raw).hexdigest(),
        "from": values["from"],
        "to": values["to"],
        "request": values["request"],
        "status": "UNAUTHENTICATED_REQUEST_ONLY",
        "paired": False,
        "remote_execution": False,
        "owner_receiver_consent": "NOT_VERIFIED",
    }

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("file",type=Path,help="Owner-selected local text export")
    args=parser.parse_args()
    try:
        result=inspect(args.file.read_bytes())
    except (OSError,Hold) as exc:
        print(json.dumps({"status":"HOLD","reason":str(exc)}))
        raise SystemExit(2)
    print(json.dumps(result,indent=2))

if __name__=="__main__":
    main()
