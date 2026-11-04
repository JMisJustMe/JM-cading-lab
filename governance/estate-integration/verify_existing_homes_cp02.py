#!/usr/bin/env python3
"""CP02 additive public-safe existing-homes route validation. No deploy or source copy."""
from pathlib import Path
from urllib.parse import urlparse
import json

REG = Path("navigator/estate-integration/public-registry.json")
EXPECTED_ORIGINAL = {
    "estate": "https://jmisjustme-estate.pages.dev/",
    "navigator": "https://jmisjustme-estate.pages.dev/navigator/",
    "apps": "https://jmisjustme-estate.pages.dev/apps/",
    "theory": "https://jmisjustme-estate.pages.dev/theory/",
    "lyrics": "https://jmisjustme-estate.pages.dev/lyrics/",
    "recovery": "https://jmisjustme-estate.pages.dev/recovery/",
    "ailatheo": "https://jmisjustme-estate.pages.dev/ailatheo/",
    "career": "https://jmisjustme-estate.pages.dev/career/",
    "freestanding-website": "https://jmisjustme.xo.je/",
    "github-source": "https://github.com/JMisJustMe/JM-cading-lab",
}
EXPECTED_NEW = {
    "access-mesh": "https://jmisjustme-estate.pages.dev/access/",
    "games-beyond": "https://jmisjustme-estate.pages.dev/games-beyond/",
    "books": "https://jmisjustme-estate.pages.dev/books/",
    "visual-story": "https://jmisjustme-estate.pages.dev/visual-story/",
    "market-lab": "https://jmisjustme-estate.pages.dev/market-lab/",
    "rukquss": "https://rukquss.com/",
    "jm-website-001": "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/",
    "jm-openbox": "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/openbox/",
}
def require(cond, message):
    if not cond:
        raise AssertionError(message)

def main():
    d=json.loads(REG.read_text(encoding="utf-8"))
    routes=d["routes"]
    by_id={r["id"]:r for r in routes}
    require(d["schema"]=="JM.Estate.PublicNervousSystem/1", "Existing bridge schema changed")
    require(d["canonical_root"]==EXPECTED_ORIGINAL["estate"], "Canonical Estate route changed")
    require(d["version"]=="v1.1-live-proven", "Inherited live proof version was rewritten")
    require(len(routes)==18 and len(by_id)==len(routes), "Missing/duplicated route identities")
    require(set(by_id)==set(EXPECTED_ORIGINAL)|set(EXPECTED_NEW), "Unexpected source or route")
    for key,url in {**EXPECTED_ORIGINAL,**EXPECTED_NEW}.items():
        row=by_id[key]
        require(row.get("url")==url, "Route identity drift: "+key)
        require(row.get("role") and row.get("name"), "Route lacks purpose: "+key)
        parsed=urlparse(url)
        require(parsed.scheme=="https" and parsed.hostname, "Non-HTTPS external route: "+key)
    for key in EXPECTED_NEW:
        require("HTTP200" in by_id[key]["state"], "Bounded live source evidence missing: "+key)
        require("PRIVATE" not in by_id[key]["url"], "Private route leaked: "+key)
    require("INDEPENDENT" in by_id["rukquss"]["role"], "RUKQUSS business sovereignty lost")
    require("INDEPENDENT" in by_id["jm-website-001"]["role"], "JM.WEB sovereignty lost")
    require("NOT_MERGED" in by_id["jm-openbox"]["role"], "OPENBOX original sovereignty lost")
    for key in ("books","visual-story"):
        require("NOT_PRIVATE" in by_id[key]["role"] or "PUBLIC_PROJECTION" in by_id[key]["role"], "Private creative source misrepresented")
    p=d["privacy_boundary"]
    require(p["contains_private_owner_data"] is False and p["contains_owner_write_endpoint"] is False and p["contains_mutable_owner_state"] is False, "Original privacy boundary broken")
    a=d["candidate_route_addendum"]
    require(a["schema"]=="JM.Estate.ExistingHomesRouteAddendum/1", "Unscoped source addendum")
    require(a.get("parent_live_proof_version")==d["version"], "Candidate addendum cannot replace proved parent")
    require(a["new_files_published"]==0 and a["original_body_replacements"]==0, "Unexpected publication or replacement")
    require(a["private_owner_source_exposed"] is False, "Private source exposure")
    require(set(a["added_route_ids"])==set(EXPECTED_NEW), "Inconsistent source addendum")
    require(any("generic 843-byte" in h for h in a["nonblocking_holds"]), "InfinityFree unverified access not preserved")
    print("JM EXISTING HOMES CP02 PASS — 10 unchanged original routes + 8 grounded add-on pointers; private-source boundary PASS")
if __name__=="__main__":
    main()
