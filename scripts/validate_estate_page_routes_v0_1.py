#!/usr/bin/env python3
"""JM ECOSTATE source-route guard v0.1.

Inspect every checked-in HTML page, not just the main navigation. Resolve
actual HTML element URLs and literal serviceWorker.register() routes against
the Git tree. A source-generated FUTARIZED playable target is recovered and
hash-verified, not falsely labelled dead. This is source/transport evidence,
NOT proof of public deployment, browser playability, or owner Fold contact.
"""
from __future__ import annotations

import base64
import gzip
import hashlib
import json
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
FUT = ROOT / "estate-publication/apps-tools-games/games/futarized-v3.1"
FUT_PARTS = {
    "FUTARIZED_PART_I_LIVING_REFIT.html": [
        "part-i.part00.b64", "part-i.part01a.b64", "part-i.part01b.b64",
        "part-i.part01c.b64", "part-i.part01d.b64",
    ],
    "FUTARIZED_PART_II_FUTARIAN_FIELD.html": [
        "part-ii.part00.b64", "part-ii.part01.b64",
    ],
}
TAGS = {
    "a": "href", "link": "href", "script": "src",
    "img": "src", "iframe": "src", "source": "src",
    "video": "src", "audio": "src", "track": "src",
    "form": "action",
}
SW_PATTERN = re.compile(r"serviceWorker\s*\.\s*register\s*\(\s*['\"]([^'\"]+)['\"]", re.I)


# Exact ancestry from protected PATCH_RECEIPT_v1_1.json files.
# An origin-resolved source reference is NOT archive-relative delivery proof.
HISTORICAL_ORIGINS = {
    "estate-publication/contact-organ-descendants/phone-studios/index_CONTACT_ORGAN_v1_1_DESCENDANT.html": "games-beyond/index.html",
    "estate-publication/contact-organ-descendants/phone-lyricstudio/index_CONTACT_ORGAN_v1_1_DESCENDANT.html": "lyrics/index.html",
    "estate-publication/contact-organ-descendants/phone-money/index_CONTACT_ORGAN_v1_1_DESCENDANT.html": "money-menu/index.html",
}


class RouteParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.refs: list[tuple[str, str]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        field = TAGS.get(tag.lower())
        if field:
            values = dict(attrs)
            if values.get(field):
                self.refs.append((tag.lower(), values[field] or ""))


def file_inside_root(path: Path) -> bool:
    return path == ROOT or ROOT in path.parents


def generated_futarized(target: Path) -> bool:
    if target.parent != FUT or target.name not in FUT_PARTS:
        return False
    manifest = json.loads((FUT / "PUBLICATION_MANIFEST.json").read_text(encoding="utf-8"))
    meta = manifest["source_members"][target.name]
    payload = "".join((FUT / "source-carriage" / part).read_text(encoding="ascii")
                      for part in FUT_PARTS[target.name])
    body = gzip.decompress(base64.b64decode(payload))
    assert len(body) == meta["bytes"], f"generated FUTARIZED size mismatch: {target.name}"
    assert hashlib.sha256(body).hexdigest() == meta["sha256"], (
        f"generated FUTARIZED SHA mismatch: {target.name}"
    )
    return True


def resolve_reference(page: Path, raw: str) -> tuple[bool, str]:
    value = raw.strip()
    if not value or value.startswith(("#", "//")):
        return True, "fragment_or_protocol_relative"
    u = urlsplit(value)
    if u.scheme in {"http", "https", "data", "mailto", "tel", "javascript", "blob"}:
        return True, "external_or_nonfile"
    if u.scheme:
        return True, "other_scheme"
    if not u.path:
        return True, "query_only"
    url_path = unquote(u.path)
    local_page = page.relative_to(ROOT).as_posix()

    # Vite's development entry resolves from the package root, not site root.
    if (local_page == "apps-tools-games/jm-portable-body/kicshift-v0.1/index.html"
            and url_path == "/src/main.tsx"):
        target = page.parent / "src/main.tsx"
        return (target.is_file(), "vite_source:" + target.relative_to(ROOT).as_posix())

    # These root-relative links are served by the independent public MCP Worker,
    # whose deployment host has /privacy/ and /support/ as root routes.
    if (local_page.startswith("navigator/mcp-public-v1/")
            and url_path in {"/privacy/", "/support/"}):
        target = ROOT / "navigator/mcp-public-v1" / url_path.lstrip("/") / "index.html"
        return (target.is_file(), "worker_route:" + target.relative_to(ROOT).as_posix())

    target = (ROOT / url_path.lstrip("/") if url_path.startswith("/")
              else page.parent / url_path).resolve()
    if not file_inside_root(target):
        return False, "path_escaped_repository:" + url_path
    if url_path.endswith("/"):
        target = target / "index.html"
    elif target.is_dir():
        target = target / "index.html"
    if target.is_file():
        return True, "source_present"
    if generated_futarized(target):
        return True, "generated_source_recovered_sha_pass"
    return False, "missing:" + target.relative_to(ROOT).as_posix()


def inherited_source_context(page: Path, element: str, reference: str) -> tuple[bool, str]:
    """Recover a real original source link without claiming archive delivery."""
    key = page.relative_to(ROOT).as_posix()
    origin = HISTORICAL_ORIGINS.get(key)
    if not origin:
        return False, "not_registered"
    receipt_path = page.parent / "PATCH_RECEIPT_v1_1.json"
    if not receipt_path.is_file():
        return False, "missing_receipt"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
    if (receipt.get("descendant") != key
            or receipt.get("source") != origin
            or receipt.get("sourceClass") != "CURRENT_REPO_REAL_BODY_FALLBACK"
            or receipt.get("parentMutated") is not False
            or not receipt.get("descendantSha256")
            or hashlib.sha256(page.read_bytes()).hexdigest() != receipt["descendantSha256"]):
        return False, "unproved_receipt_or_changed_descendant"
    donor = ROOT / origin
    if not donor.is_file():
        return False, "missing_recorded_donor"
    historical_body = page.read_text(encoding="utf-8")
    donor_body = donor.read_text(encoding="utf-8")
    historical_parser, donor_parser = RouteParser(), RouteParser()
    historical_parser.feed(historical_body)
    donor_parser.feed(donor_body)
    def references(body: str, parsed: RouteParser) -> list[tuple[str, str]]:
        return parsed.refs + [("serviceworker_register", m.group(1))
                              for m in SW_PATTERN.finditer(body)]
    archived = references(historical_body, historical_parser)
    original = references(donor_body, donor_parser)
    if archived != original or (element, reference) not in original:
        return False, "source_reference_sequence_not_equal"
    resolved, reason = resolve_reference(donor, reference)
    if not resolved:
        return False, "donor_reference_unresolved:" + reason
    return True, origin


def main() -> int:
    pages = sorted(page for page in ROOT.rglob("*.html") if ".git" not in page.parts)
    missing: list[dict[str, str]] = []
    carrier_holds: list[dict[str, str]] = []
    origin_recovered: list[dict[str, str]] = []
    kinds: dict[str, int] = {}
    total = 0
    recovered = set()
    for page in pages:
        text = page.read_text(encoding="utf-8")
        parser = RouteParser()
        parser.feed(text)
        refs = [(kind, ref) for kind, ref in parser.refs]
        refs.extend(("serviceworker_register", m.group(1)) for m in SW_PATTERN.finditer(text))
        for kind, ref in refs:
            total += 1
            try:
                valid, reason = resolve_reference(page, ref)
            except Exception as exc:
                valid, reason = False, "recover_failure:" + str(exc)
            if not valid:
                origin_ok, origin = inherited_source_context(page, kind, ref)
                if origin_ok:
                    origin_recovered.append({
                        "page": page.relative_to(ROOT).as_posix(),
                        "element": kind, "reference": ref,
                        "archive_relative_status": reason,
                        "recorded_origin": origin,
                        "evidence": "DONOR_LINK_ONLY__ARCHIVE_STANDALONE_NOT_PROVED"
                    })
                    valid, reason = True, "historical_origin_recovered:" + origin
            kinds[reason.split(":")[0]] = kinds.get(reason.split(":")[0], 0) + 1
            if reason == "generated_source_recovered_sha_pass":
                recovered.add(ref)
            if not valid:
                issue = {"page": page.relative_to(ROOT).as_posix(),
                         "element": kind, "reference": ref, "reason": reason}
                (missing if page.name == "index.html" else carrier_holds).append(issue)

    # Explicitly prove BOTH generated FUTARIZED bodies, including a target
    # not currently reached by a particular HTML page.
    for target in FUT_PARTS:
        try:
            assert generated_futarized(FUT / target)
            recovered.add(target)
        except Exception as exc:
            missing.append({"page": "FUTARIZED_SOURCE_CARRIAGE",
                            "element": "reconstruction", "reference": target,
                            "reason": str(exc)})
    active_pages = sum(page.name == "index.html" for page in pages)
    print(f"ESTATE SOURCE ROUTE GUARD: {len(pages)} HTML pages ({active_pages} strict index entry pages); {total} literal HTML/SW references")
    print("RECOVERY: " + ", ".join(sorted(recovered)))
    print("KINDS: " + json.dumps(kinds, sort_keys=True))
    # Historical, non-entry HTML is an inherited source carrier until proved
    # self-contained. Missing companions must remain visible but cannot
    # sentence a preserved ancestor to deletion or pretend it was deployed.
    try:
        source_head = subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except (OSError, subprocess.CalledProcessError):
        source_head = "UNAVAILABLE_NON_GIT_CHECKOUT"
    report = {"schema": "jm.estate-source-route-holds/0.1",
              "source_tree_head": source_head,
              "non_entry_unique_missing_targets": len(
                  {(item["page"], item["reason"]) for item in carrier_holds}
              ),
              "boundary": "source-only; not public deployment or device proof",
              "strict_active_entry_missing": missing,
              "non_entry_carrier_holds": carrier_holds,
              "historical_origin_resolutions": origin_recovered,
              "verified_futarized_targets": sorted(recovered),
              "scanned_html": len(pages), "active_index_pages": active_pages,
              "literal_references": total}
    out = ROOT / "audit-output" / "JM_ESTATE_SOURCE_ROUTE_HOLDS_v0_1.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"RECOVERED_SOURCE_CONTEXT: {len(origin_recovered)} historical references with verified ancestry, byte integrity and matching original link sequence; archive delivery remains unproved")
    print(f"HOLD: {len(carrier_holds)} unresolved references in non-entry source carriers, emitted at {out.relative_to(ROOT)}")
    groups: dict[str, int] = {}
    for item in carrier_holds:
        groups[item["page"]] = groups.get(item["page"], 0) + 1
    for name, count in sorted(groups.items(), key=lambda x: (-x[1], x[0])):
        print(f"  CARRIER HOLD {count:2d} {name}")
    if missing:
        print("FAIL: unresolved ACTIVE index entry source/route evidence:")
        for item in missing:
            print(json.dumps(item, sort_keys=True))
        return 1
    print("PASS — every ACTIVE index-page source route accounted for; non-entry descendants stay HOLD, not DEAD; no deployment/device proof claimed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
