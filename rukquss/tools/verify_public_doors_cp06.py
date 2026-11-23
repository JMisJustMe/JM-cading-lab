#!/usr/bin/env python3
"""RUKQUSS CP06: verify source anchors and live public door destinations.

Read only. No deploys, cookies, account credentials, private routes, generated
clones, or changes to public sites. Live GET checks prove only a momentary
public HTTP response, not every downstream experience.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

EXPECTED_HTML_BLOB = "151aa2c04267f3a9ded81384ceae53b2e152a212"
PUBLIC_HOSTS = frozenset((
    "rukquss.com", "jmisjustme.github.io", "jmisjustme-estate.pages.dev"
))
REQUIRED_PATHS = frozenset(("/games", "/apps", "/music"))
USER_AGENT = "JM-RUKQUSS-PublicDoorQA/1.0 (read-only)"


class Scan(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.links: list[str] = []

    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if data.get("id"):
            self.ids.add(data["id"])
        if tag == "a" and data.get("href"):
            self.links.append(data["href"])


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob " + str(len(data)).encode() + b"\0" + data).hexdigest()


def permitted(url: str) -> bool:
    parts = urllib.parse.urlsplit(url)
    return (
        parts.scheme == "https"
        and parts.hostname in PUBLIC_HOSTS
        and parts.username is None
        and parts.password is None
        and (parts.port is None or parts.port == 443)
    )


def check(url: str) -> dict:
    try:
        req = urllib.request.Request(
            url,
            headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=17) as response:
            final = response.geturl()
            status = response.status
            media = response.headers.get("Content-Type", "")
            response.read(300)
            ok = status == 200 and media.lower().startswith("text/html") and permitted(final)
            return {"url": url, "final": final, "status": status,
                    "html": media.lower().startswith("text/html"), "pass": ok}
    except (OSError, ValueError, urllib.error.URLError) as exc:
        return {"url": url, "pass": False, "error": str(exc)[:130]}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--html", required=True, type=Path, help="RUKQUSS HTML source")
    p.add_argument("--offline", action="store_true", help="validate source and anchors only")
    args = p.parse_args()
    b = args.html.read_bytes()
    actual_blob = blob_sha(b)
    if actual_blob != EXPECTED_HTML_BLOB:
        raise SystemExit(f"CP06 HOLD: changed original-source blob {actual_blob}")
    scanner = Scan()
    scanner.feed(b.decode("utf-8"))
    fragments = [item[1:] for item in scanner.links if item.startswith("#")]
    missing = sorted(set(fragments) - scanner.ids)
    public = sorted(set(item for item in scanner.links if item.startswith("http")))
    bad = sorted(item for item in public if not permitted(item))
    relative = sorted(set(item for item in scanner.links
                          if not item.startswith("http") and not item.startswith("#")))
    if missing or bad or relative:
        raise SystemExit(json.dumps({
            "result": "HOLD",
            "missing_anchors": missing,
            "nonapproved_public_links": bad,
            "unexpected_relative_links": relative,
        }, indent=2))
    public_paths = {urllib.parse.urlsplit(item).path for item in public
                    if urllib.parse.urlsplit(item).hostname == "rukquss.com"}
    if not REQUIRED_PATHS.issubset(public_paths):
        raise SystemExit("CP06 HOLD: original game/app/music short routes missing")
    report = {"schema": "JM.RUKQUSS.PublicDoors.CP06/1",
              "scope": "SOURCE_CHECK" if args.offline else "PUBLIC_GET_AT_CHECK_TIME",
              "html_blob": actual_blob,
              "internal_anchor_references": len(fragments),
              "broken_internal_anchors": len(missing),
              "external_distinct_links": len(public)}
    if not args.offline:
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as pool:
            details = sorted(pool.map(check, public), key=lambda x: x["url"])
        report["external_pass"] = sum(item["pass"] for item in details)
        report["external_fail"] = len(details) - report["external_pass"]
        report["results"] = details
        print(json.dumps(report, sort_keys=True))
        if report["external_fail"]:
            raise SystemExit("CP06 HOLD: public link contact incomplete")
    else:
        print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
