#!/usr/bin/env python3
"""RUKQUSS CP09 public-source contact: six staged subdomain destinations.

Read only. Does NOT request candidate subdomains (which are not activated),
configure DNS/TLS, deploy Workers, follow any private route or sign into
anything. Checks original RUKQUSS public shortcuts and current downstream HTML.
"""
from __future__ import annotations

import argparse
import json
import urllib.error
import urllib.parse
import urllib.request

ROUTES = {
    "games": "https://jmisjustme.github.io/JM-cading-lab/games-beyond/",
    "apps": "https://jmisjustme.github.io/JM-cading-lab/apps/",
    "music": "https://jmisjustme.github.io/JM-cading-lab/beatbody/",
    "coding": "https://jmisjustme.github.io/JM-cading-lab/coding-estate/everybody/",
    "theory": "https://jmisjustme.github.io/JM-cading-lab/theory/",
    "books": "https://jmisjustme.github.io/JM-cading-lab/books/",
}
PREFIX = "https://rukquss.com/"
UA = "JM-RUKQUSS-CP09-PublicContact/1.0"


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def check(name: str, expected: str) -> dict:
    """Require exact public shortlink 302 then reachable original HTML."""
    entry = PREFIX + name
    request = urllib.request.Request(
        entry,
        headers={"User-Agent": UA, "Accept": "text/html,*/*"},
        method="GET",
    )
    opener = urllib.request.build_opener(NoRedirect())
    try:
        try:
            response = opener.open(request, timeout=14)
        except urllib.error.HTTPError as error:
            response = error
        try:
            status = response.status
            location = response.headers.get("Location", "")
        finally:
            response.close()
        if status != 302 or location != expected:
            return {"segment": name, "pass": False,
                    "shortlink_status": status,
                    "expected_route_preserved": location == expected}
        with urllib.request.urlopen(
            urllib.request.Request(expected, headers={"User-Agent": UA},
                                   method="GET"),
            timeout=18,
        ) as destination:
            media = destination.headers.get("Content-Type", "")
            content_start = destination.read(1600).lower()
            html = ("text/html" in media.lower()
                    and (b"<!doctype html" in content_start
                         or b"<html" in content_start))
            # Do not make claims about gameplay; only the HTML entrance.
            final = urllib.parse.urlsplit(destination.url)
            host_safe = final.scheme == "https" and final.hostname == "jmisjustme.github.io"
            good = destination.status == 200 and html and host_safe
            return {"segment": name, "pass": good,
                    "shortlink_status": status,
                    "destination_status": destination.status,
                    "destination_html": html,
                    "destination_owner_host": host_safe}
    except (OSError, urllib.error.URLError, ValueError) as error:
        return {"segment": name, "pass": False, "error_type": type(error).__name__}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--online", action="store_true",
                        help="GET existing public apex redirects and original HTML")
    args = parser.parse_args()
    names = set(ROUTES)
    expected = {"games", "apps", "music", "coding", "theory", "books"}
    if names != expected or len(ROUTES) != 6:
        raise ValueError("CP09 HOLD: public alias contract changed")
    if not all(
        u.startswith("https://jmisjustme.github.io/JM-cading-lab/")
        for u in ROUTES.values()
    ):
        raise ValueError("CP09 HOLD: original source custody destination changed")
    report = {
        "schema": "JM.RUKQUSS.PublicSubdomainContact.CP09/1",
        "scope": "PUBLIC_SHORTCUT_AND_DESTINATION_ONLY" if args.online else "OFFLINE_CONTRACT",
        "candidate_hostname_activation": "NOT_CHECKED_BY_THIS_SCRIPT",
        "dns_mutated_by_this_script": False,
        "worker_deployed_by_this_script": False,
        "aliases": list(ROUTES),
    }
    if args.online:
        results = [check(name, target) for name, target in ROUTES.items()]
        report["results"] = results
        report["passed"] = sum(item["pass"] for item in results)
        report["failed"] = len(results) - report["passed"]
        print(json.dumps(report, sort_keys=True))
        return 0 if report["failed"] == 0 else 1
    report["contract_count"] = len(ROUTES)
    print(json.dumps(report, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
