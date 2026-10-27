#!/usr/bin/env python3
"""JM Unique Bodies CP11: fail-closed read-only live history vs cold Atlas archive.

Does not trigger a deploy, a backup, a production write, an owner grant, or a
remote restore. Comparing an archive with live MCP history is an admission
observation only, not proof of external durable custody or deploy approval.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request

import atlas_custody as custody

SCHEMA = "JM.UniqueBodies.LiveColdReconciliation/1"
MAX_RESPONSE = 1024 * 1024
RPC_ID = 17


class GateHold(ValueError):
    pass


def refuse(reason):
    raise GateHold("PREDEPLOY_HOLD:" + reason)


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        refuse("REDIRECT_NOT_AUTHORIZED")


def validate_endpoint(endpoint):
    try:
        value = urllib.parse.urlsplit(endpoint)
        name = value.hostname
        port = value.port
    except (ValueError, AttributeError):
        refuse("INVALID_URL")
    if not name or value.username is not None or value.password is not None:
        refuse("INVALID_OR_CREDENTIAL_URL")
    if value.query or value.fragment or value.path not in ("", "/"):
        refuse("ROOT_URL_ONLY_NO_QUERY")
    if value.scheme == "https":
        if not name or port is not None and port < 1:
            refuse("INVALID_HTTPS_TARGET")
    elif value.scheme == "http" and name in ("127.0.0.1", "localhost", "::1"):
        pass
    else:
        refuse("HTTPS_REQUIRED_EXCEPT_LOOPBACK")
    return value


def read_live_history(endpoint, bearer):
    p = validate_endpoint(endpoint)
    if not isinstance(bearer, str) or len(bearer) < 24 or any(x in bearer for x in "\r\n"):
        refuse("PRIVATE_BEARER_NOT_PRESENT")
    url = urllib.parse.urlunsplit((p.scheme, p.netloc, "/mcp", "", ""))
    payload = json.dumps({
        "jsonrpc": "2.0", "id": RPC_ID, "method": "tools/call",
        "params": {"name": "atomic_contact_history", "arguments": {}}
    }, separators=(",", ":")).encode("utf-8")
    request = urllib.request.Request(
        url, data=payload, method="POST",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Cache-Control": "no-store",
            "Authorization": "Bearer " + bearer,
        }
    )
    # A redirect must not leak a bearer token to a different host.
    opener = urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request, timeout=10) as response:
            if response.status != 200:
                refuse("LIVE_HTTP_NOT_200")
            if "application/json" not in response.headers.get("Content-Type", ""):
                refuse("NONJSON_LIVE_RESPONSE")
            body = response.read(MAX_RESPONSE + 1)
            if len(body) > MAX_RESPONSE:
                refuse("LIVE_RESPONSE_TOO_LARGE")
    except urllib.error.HTTPError as exc:
        refuse("REMOTE_HTTP_" + str(exc.code))
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        refuse("LIVE_CONTACT_UNAVAILABLE")
    try:
        message = json.loads(body)
    except (UnicodeDecodeError, json.JSONDecodeError):
        refuse("MALFORMED_LIVE_RPC")
    if (not isinstance(message, dict) or
            message.get("jsonrpc") != "2.0" or message.get("id") != RPC_ID or
            not isinstance(message.get("result"), dict) or
            message["result"].get("isError") is not False or
            not isinstance(message["result"].get("structuredContent"), dict)):
        refuse("INVALID_LIVE_RPC_ENVELOPE")
    return message["result"]["structuredContent"]


def assess(remote_history, archive, expected_archive_sha256):
    # Verify FULL local archive integrity and original CP07 receipt+event history.
    proof = custody.verify(archive, expected_archive_sha256)
    expected = proof["history"]
    if remote_history.get("integrity_valid") is not True or remote_history.get("holds"):
        refuse("LIVE_RECEIPTS_OR_CHAIN_NOT_VALID")
    if not isinstance(remote_history.get("runs"), list):
        refuse("LIVE_RUN_LIST_MISSING")
    if expected["run_count"] < 1 or expected["event_count"] < 1:
        refuse("NO_RECOVERABLE_NONEMPTY_ATLAS_RECEIPTS")
    current = {
        "run_count": remote_history.get("run_count"),
        "event_count": remote_history.get("total_atlas_contact_events"),
        "body_count": remote_history.get("registered_body_count"),
        "history_sha256": hashlib.sha256(custody.canonical(remote_history).encode("utf-8")).hexdigest()
    }
    if current != expected:
        refuse("ARCHIVE_NOT_EQUAL_TO_LIVE_HISTORY")
    return {
        "schema": SCHEMA,
        "state": "LIVE_COLD_RECEIPTS_MATCH_OBSERVED",
        "run_count": current["run_count"],
        "event_count": current["event_count"],
        "body_count": current["body_count"],
        "history_sha256": current["history_sha256"],
        "archive_sha256": proof["archive_sha256"],
        "authority": "READ_ONLY_MATCH_NO_DEPLOY_APPROVAL",
        "deployment_safe": False,
        "claim": "Receipt-equivalent live history and independently verified cold archive at observation time",
        "holds": [
            "Owner approval and separately durable off-host archival still required",
            "Live endpoint response is bearer-authenticated but not an independent signed attestation",
            "New writes after this observation invalidate the match",
            "No deploy/restart/replace operation is authorised by this result"
        ]
    }


def check(endpoint, archive, expected_archive_sha256, bearer):
    # Check archive first: don't send a secret to the network if custody fails.
    custody.verify(archive, expected_archive_sha256)
    return assess(read_live_history(endpoint, bearer), archive, expected_archive_sha256)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--endpoint", required=True, help="Exact HTTPS service origin, no path/query")
    ap.add_argument("--archive", required=True, help="Offline verified CP09 full SQLite archive")
    ap.add_argument("--expect-sha256", required=True, help="Independently held SHA256")
    args = ap.parse_args()
    try:
        result = check(args.endpoint, args.archive, args.expect_sha256,
                       os.getenv("JM_BODIES_TOKEN", ""))
        print(custody.canonical(result))
    except (GateHold, ValueError, OSError, UnicodeError, json.JSONDecodeError) as exc:
        print(custody.canonical({"state": "PREDEPLOY_HOLD",
                                 "reason": str(exc).splitlines()[0][:180]}), file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
