#!/usr/bin/env python3
"""JM existing-homes CP01: bounded public HTTP contact; never site/body authority.

Additive companion to verify_existing_homes_cp02.py. No login, deploy, route
changes, private payloads, merges, source modification or deletion.
"""
import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

MAX_BYTES = 1_000_000
TARGETS = (
    ("rukquss", "https://rukquss.com/", "RUKQUSS", "PUBLISHED_PRESENTATION"),
    ("estate", "https://jmisjustme-estate.pages.dev/", "JM ECOSTATE", "PUBLISHED_ESTATE"),
    ("navigator", "https://jmisjustme-estate.pages.dev/navigator/", "JM3232", "PUBLISHED_NAVIGATOR"),
    ("workshop", "https://jmisjustme-estate.pages.dev/coding-estate/workshop/", "JM CODING WORKSHOP", "PUBLISHED_JM_WEB"),
    ("jm-website-001", "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/", "JM WEBSITE 001", "PUBLISHED_JM_WEB"),
    ("independent-xo", "https://jmisjustme.xo.je/", "JMISJUSTME", "NAMED_ORIGINAL_HOST"),
    ("independent-rf", "https://jmisjustme.rf.gd/", "JMISJUSTME", "SEPARATE_NAMED_HOST_HOLD"),
    ("navigator-contact", "https://jm-navigator-live-contact.pages.dev/", "JM", "SEPARATE_CONTACT_PROJECT"),
)

def classify(target, http_status, raw=b"", network_error=None, final_url=None, truncated=False):
    native_id, url, marker, role = target
    low = raw.lower()
    # InfinityFree may return HTTP 200 with this 843-byte JS cookie challenge.
    challenge = b"/aes.js" in low and b"tonumbers(" in low
    text = raw.decode("utf-8", "replace")
    if network_error:
        state, err, next_action = ("NETWORK_HOLD", "NETWORK_ERROR", "Recheck network/contact route and host deployment")
    elif not isinstance(http_status, int) or not (200 <= http_status < 300):
        state, err, next_action = ("HTTP_ERROR", "HTTP_" + str(http_status), "Inspect original host and deployment, without rerouting")
    elif challenge:
        state, err, next_action = ("ACCESS_CHALLENGE_NOT_BODY", "AES_JS_CHALLENGE", "Recheck in a browser with JS and owner contact; do not claim body")
    elif marker.casefold() not in text.casefold():
        state, err, next_action = ("BODY_MARKER_UNCONFIRMED", "MISSING_EXPECTED_MARKER", "Inspect actual rendered original content and source authority")
    else:
        state, err, next_action = ("HTTP_BODY_MARKER_OBSERVED", None, "Test navigation, interaction, original-source match and physical owner use")
    return {
        "native_id": native_id,
        "url": url,
        "observed_final_url": final_url,
        "role": role,
        "http_status": http_status,
        "http_observation": state,
        "repair_status": "BOUNDARY",
        "source_authority": "NOT_INFERRED",
        "source_custody": "NOT_ASSERTED_BY_HTTP",
        "evidence_scope": "PUBLIC_HTTP_GET_ONLY",
        "response_sha256_not_source_sha256": hashlib.sha256(raw).hexdigest() if raw else None,
        "body_capped": bool(truncated),
        "first_actionable_error": err,
        "next_safe_action": next_action,
    }

def probe(target):
    request = Request(target[1], headers={"User-Agent": "JM-Existing-Homes-CP01/1.0", "Accept": "text/html,application/xhtml+xml"})
    try:
        with urlopen(request, timeout=12) as res:
            payload = res.read(MAX_BYTES + 1)
            return classify(target, res.status, payload[:MAX_BYTES], final_url=res.url, truncated=len(payload)>MAX_BYTES)
    except HTTPError as exc:
        payload = exc.read(MAX_BYTES)
        return classify(target, exc.code, payload, final_url=exc.url)
    except (URLError, TimeoutError, OSError) as exc:
        record = classify(target, None, network_error=str(type(exc).__name__))
        record["network_error_kind"] = type(exc).__name__
        return record

def self_test():
    target = TARGETS[0]
    tests = (
        (classify(target, 200, b"<title>RUKQUSS live</title>"), "HTTP_BODY_MARKER_OBSERVED"),
        (classify(target, 200, b'<script src="/aes.js"></script><script>toNumbers("xx")</script>RUKQUSS'), "ACCESS_CHALLENGE_NOT_BODY"),
        (classify(target, 522, b"origin unavailable"), "HTTP_ERROR"),
        (classify(target, 200, b"<title>Other site</title>"), "BODY_MARKER_UNCONFIRMED"),
        (classify(target, None, network_error="timeout"), "NETWORK_HOLD"),
    )
    for result, expected in tests:
        assert result["http_observation"] == expected, (result, expected)
        assert result["repair_status"] == "BOUNDARY"
        assert result["source_authority"] == "NOT_INFERRED"
    assert TARGETS[5][1] != TARGETS[6][1], "Separate original host identities must survive"
    print("CP01 OFFLINE FIXTURES 5/5 PASS; separate hosts retained; 0 authority promotions")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--self-test", action="store_true", help="No network and no writes")
    group.add_argument("--live", action="store_true", help="GET only the eight fixed public routes")
    parser.add_argument("--output", help="Optional NEW JSON receipt path; existing file will not be overwritten")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return
    receipt = {
        "schema": "JM.CrossRoute.PublicHttpContact/CP01",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "policy": "HTTP200!=BODY; ACCESS!=AUTHORITY; NO_DING_NO_CLAIM; NO_ROUTE_CHANGE",
        "scope": "PUBLIC_READ_ONLY_NO_DEVICE_UI_NO_HOST_WRITE",
        "results": [probe(t) for t in TARGETS],
    }
    data = json.dumps(receipt, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        with Path(args.output).open("x", encoding="utf-8") as handle:
            handle.write(data)
    print(data)

if __name__ == "__main__":
    main()
