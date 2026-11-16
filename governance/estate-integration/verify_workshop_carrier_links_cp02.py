#!/usr/bin/env python3
"""CP02 original JM.WEB workshop source-to-carrier route guard; offline/read-only.

A released browser HTML carrier may route to locally mounted original components
while preserved .jmw source names historic external addresses. Verify this
transformation without mutating either source or declaring equivalence of bodies.
"""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import re
import sys

AUTHORED = {
    "Open OPENBOX - Code In, App Out": "https://jmisjustme.rf.gd/openbox/",
    "Open the original JM Coding Estate": "https://jmisjustme.rf.gd/coding-estate.html",
    "Launch OPENBOX editor": "https://jmisjustme.rf.gd/openbox/",
    "Launch original coding room": "https://jmisjustme.rf.gd/coding-estate.html",
    "Explore existing JM Coding Estate": "https://jmisjustme.rf.gd/coding-estate.html",
}
MOUNTED = {
    "Open OPENBOX - Code In, App Out": "./openbox/",
    "Open the original JM Coding Estate": "./coding-estate.html",
    "Launch OPENBOX editor": "./openbox/",
    "Launch original coding room": "./coding-estate.html",
    "Explore existing JM Coding Estate": "./coding-estate.html",
}
LOCAL_FILES = ("coding-estate/workshop/openbox/index.html", "coding-estate/workshop/coding-estate.html")

class HTMLLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = []
        self.active = None
    def handle_starttag(self, tag, attrs):
        if tag == "a":
            self.active = [dict(attrs).get("href", ""), ""]
    def handle_data(self, data):
        if self.active is not None:
            self.active[1] += data
    def handle_endtag(self, tag):
        if tag == "a" and self.active is not None:
            self.links.append((self.active[1].strip(), self.active[0]))
            self.active = None

def check(source, compiled, originals_exist):
    authored = re.findall(r'^LINK "([^"]+)" "([^"]+)"\s*$', source, re.MULTILINE)
    authored_map = {k: v for k, v in authored}
    assert all(sum(1 for label, _ in authored if label == k) == 1 for k in AUTHORED), "Protected JM.WEB labels duplicated"
    assert all(authored_map.get(k) == v for k, v in AUTHORED.items()), "Original authored destination drift"
    parser = HTMLLinks()
    parser.feed(compiled)
    compiled_map = {k: v for k, v in parser.links}
    assert all(sum(1 for label, _ in parser.links if label == k) == 1 for k in MOUNTED), "Protected compiled labels duplicated"
    assert all(compiled_map.get(k) == v for k, v in MOUNTED.items()), "Compiled relative door drift"
    assert all(k in authored_map for k in MOUNTED), "Compiled link without authored JM.WEB identity"
    assert all(originals_exist), "Mounted original public files missing"
    assert "https://jmisjustme.rf.gd/openbox/" not in compiled, "Old OPENBOX route reintroduced"
    assert "https://jmisjustme.rf.gd/coding-estate.html" not in compiled, "Old coding route reintroduced"
    return {"authored_link_count": len(authored), "compiled_link_count": len(parser.links),
            "protected_mappings": len(MOUNTED), "mounted_files": len(LOCAL_FILES),
            "scope": "STATIC SOURCE + COMPILED LINK CONTRACT ONLY",
            "authority": "NO CURRENT-HEAD / NO FOLD8 TOUCH / NO DEPLOYMENT"}

def fixture():
    authored = "\n".join(f'LINK "{k}" "{v}"' for k, v in AUTHORED.items())
    compiled = "<html><body>" + "".join(f'<a href="{v}">{k}</a>' for k, v in MOUNTED.items()) + "</body></html>"
    checks = [
        lambda: check(authored, compiled, [True, True]),
        lambda: rejects(lambda: check(authored, compiled.replace("./openbox/", "https://jmisjustme.rf.gd/openbox/"), [True, True])),
        lambda: rejects(lambda: check(authored, compiled.replace("./coding-estate.html", "/missing"), [True, True])),
        lambda: rejects(lambda: check(authored.replace("https://jmisjustme.rf.gd/openbox/", "https://example.invalid/"), compiled, [True, True])),
        lambda: rejects(lambda: check(authored, compiled, [False, True])),
        lambda: rejects(lambda: check(authored, compiled + '<a href="/duplicate">Launch original coding room</a>', [True, True])),
    ]
    for i, test in enumerate(checks, start=1):
        test()
        print("FIXTURE", i, "PASS")
    print("6/6 offline route-contract fixtures PASS; no source modifications")

def rejects(callback):
    try:
        callback()
    except AssertionError:
        return
    raise AssertionError("Broken fixture was incorrectly accepted")

def main():
    p = argparse.ArgumentParser()
    p.add_argument("--fixture", action="store_true")
    p.add_argument("--root", type=Path, help="Existing repository root, never modified")
    p.add_argument("--source", type=Path, help="Original JM.WEB source for bounded local test")
    p.add_argument("--compiled", type=Path, help="Published carrier for bounded local test")
    p.add_argument("--assume-local-files", action="store_true", help="Allow temporary public source pair fixture")
    args = p.parse_args()
    if args.fixture:
        fixture()
        return
    if args.root:
        source = args.root / "coding-estate/workshop/source/workshop.jmw"
        compiled = args.root / "coding-estate/workshop/index.html"
        files = [(args.root / f).is_file() for f in LOCAL_FILES]
    elif args.source and args.compiled:
        source, compiled = args.source, args.compiled
        files = [args.assume_local_files] * len(LOCAL_FILES)
    else:
        p.error("Pass --fixture, --root, or both --source and --compiled")
    result = check(source.read_text(encoding="utf-8"), compiled.read_text(encoding="utf-8"), files)
    print("STATIC WORKSHOP ROUTE CONTRACT PASS:", result)

if __name__ == "__main__":
    main()