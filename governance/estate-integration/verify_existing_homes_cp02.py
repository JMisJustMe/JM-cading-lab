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
EXPECTED_CONNECTED = {
    "jm-coding-workshop": "https://jmisjustme-estate.pages.dev/coding-estate/workshop/",
    "wix-living-estate": "https://jayemmlyrikz6.wixsite.com/jmisjustme-living-es",
}
EXPECTED_PUBLIC_DEPARTMENT = {
    "api-hub": "https://jmisjustme-estate.pages.dev/api-hub/",
    "ko-co-visual": "https://jmisjustme-estate.pages.dev/api-hub/visual/",
    "author-home": "https://jmisjustme-estate.pages.dev/author/",
    "coding-everybody": "https://jmisjustme-estate.pages.dev/coding-estate/everybody/",
    "money-menu": "https://jmisjustme-estate.pages.dev/money-menu/",
}
def require(cond, message):
    if not cond:
        raise AssertionError(message)

def verify_original_body_contacts():
    """CP05: confirm source-qualified contact doors and private/original role boundaries."""
    from re import findall
    html = Path("access/index.html").read_text(encoding="utf-8")
    marker = '<section id="jmOriginalBodyContacts"'
    require(html.count(marker) == 1, "Missing or repeated original-body contact section")
    section = html.split(marker, 1)[1].split("</section>", 1)[0]
    source_audit = "https://github.com/JMisJustMe/JM-cading-lab/blob/main/governance/JM_APPS_TOOLS_CODING_CP17_ROUTE_AUDIT_2026-11-03.md"
    expected = [
        ("https://github.com/JMisJustMe/JM-cading-lab/blob/main/bodymesh/00_OPEN_FIRST.md", "Read BodyMesh source guide"),
        ("https://github.com/JMisJustMe/JM-cading-lab/blob/main/onegame/v0.3/00_OPEN_FIRST.md", "Read OneGame entry"),
        ("../coding-estate/everybody/", "Open public coding workbench"),
        (source_audit, "Read Zionfolder custody audit"),
        (source_audit, "Read Librarian CP37 audit"),
    ]
    contacts = findall(r'<a class="btn" href="([^"]+)">([^<]+)</a>', section)
    require(contacts == expected and section.count('<div class="row">') == 5,
            "Source-qualified original-body contacts changed or acquired unreviewed routes")
    require(all(contacts[i][0] != contacts[j][0] or i == j or {i,j} == {3,4}
                for i in range(5) for j in range(i + 1, 5)),
            "Unexpected shared link between independent bodies")
    repo_prefix = "https://github.com/JMisJustMe/JM-cading-lab/blob/main/"
    for url, _ in contacts:
        if url.startswith(repo_prefix):
            relative = url[len(repo_prefix):]
            require(".." not in Path(relative).parts and Path(relative).is_file(),
                    "Public source contact missing or escaped the repository: " + relative)
        else:
            require(url == "../coding-estate/everybody/" and
                    Path("coding-estate/everybody/index.html").is_file(),
                    "Public coding-workbench contact missing")
    for marker in ("source record is not an installed app", "private owner html",
                   "this link does not launch it", "not the private application",
                   "does not imply public application deployment"):
        require(marker in section.lower(), "Contact/proof boundary lost: " + marker)
    require("libfile_" not in section and "file:/// " not in section and "data:text/html" not in section,
            "Private payload or local file reference leaked into public body contacts")


def verify_wix_door_pairs():
    """CP06: source-qualified Wix presentation -> original JM House pointers only."""
    from re import DOTALL, findall
    html = Path("access/index.html").read_text(encoding="utf-8")
    marker = '<section id="jmWixDoors"'
    require(html.count(marker) == 1, "Wix original-door section missing or repeated")
    section = html.split(marker, 1)[1].split("</section>", 1)[0]
    wix = "https://jayemmlyrikz6.wixsite.com/jmisjustme-living-es/"
    expected = [
        ("games", wix + "games-beyond", "https://jmisjustme-estate.pages.dev/games-beyond/"),
        ("theory", wix + "theory-library", "https://jmisjustme-estate.pages.dev/theory/"),
        ("coding", wix + "cading-coding", "https://jmisjustme-estate.pages.dev/coding-estate/everybody/"),
        ("apps", wix + "apps-tools", "https://jmisjustme-estate.pages.dev/apps/"),
        ("lyrics", wix + "lyrics-music", "https://jmisjustme-estate.pages.dev/lyrics/"),
        ("author", wix + "author-profile", "https://jmisjustme-estate.pages.dev/author/"),
        ("providings", wix + "inquiry-services-page", "https://jmisjustme-estate.pages.dev/money-menu/"),
        ("books", wix + "books-pubs", "https://jmisjustme-estate.pages.dev/books/"),
        ("library", wix + "living-library", "https://jmisjustme-estate.pages.dev/navigator/estate-integration/"),
    ]
    pattern = (r'<article class="row" data-jm-wix-door="([^"]+)">.*?'
               r'<a class="btn" href="([^"]+)" target="_blank" rel="noopener noreferrer">Open Wix room</a>'
               r'<a class="btn primary" href="([^"]+)">Open original JM house</a>'
               r'</div></article>')
    actual = findall(pattern, section, flags=DOTALL)
    require(actual == expected, "Wix pairs changed, original rooms replaced or unsupported link introduced")
    require(section.count('data-jm-wix-door=') == 9, "Wix connection count drift")
    require(all(url.startswith("https://jmisjustme-estate.pages.dev/") for _,_,url in expected),
            "Original JM authority URL is not the verified canonical public origin")
    require("example.com/download" not in section, "Placeholder downloads exposed as real originals")
    require("remain unchanged until separately repaired in the Wix editor" in section,
            "Wix editing boundary missing")
    require(".doorlinks .btn{display:inline-flex" in html and "min-height:44px" in html,
            "Fold touch target style missing")
    print("CP06 WIX THE DOORS — 9/9 sourced navigation pairs PASS; placeholders marked HOLD; original authority unchanged")


def main():
    d=json.loads(REG.read_text(encoding="utf-8"))
    routes=d["routes"]
    by_id={r["id"]:r for r in routes}
    require(d["schema"]=="JM.Estate.PublicNervousSystem/1", "Existing bridge schema changed")
    require(d["canonical_root"]==EXPECTED_ORIGINAL["estate"], "Canonical Estate route changed")
    require(d["version"]=="v1.1-live-proven", "Inherited live proof version was rewritten")
    require(len(routes)==25 and len(by_id)==len(routes), "Missing/duplicated route identities")
    require(set(by_id)==set(EXPECTED_ORIGINAL)|set(EXPECTED_NEW)|set(EXPECTED_CONNECTED)|set(EXPECTED_PUBLIC_DEPARTMENT), "Unexpected source or route")
    for key,url in {**EXPECTED_ORIGINAL,**EXPECTED_NEW,**EXPECTED_CONNECTED,**EXPECTED_PUBLIC_DEPARTMENT}.items():
        row=by_id[key]
        require(row.get("url")==url, "Route identity drift: "+key)
        require(row.get("role") and row.get("name"), "Route lacks purpose: "+key)
        parsed=urlparse(url)
        require(parsed.scheme=="https" and parsed.hostname, "Non-HTTPS external route: "+key)
    for key in EXPECTED_NEW:
        require("HTTP200" in by_id[key]["state"], "Bounded live source evidence missing: "+key)
        require("PRIVATE" not in by_id[key]["url"], "Private route leaked: "+key)
    require("GZJM_CHROME_HEADLESS_390X844_HTTP200_TITLE_IDENTITY_VERIFIED" in by_id["jm-coding-workshop"]["state"], "Workshop source proof boundary lost")
    require("PUBLISHED_WIX_ACCOUNT_AND_GZJM_CHROME_HEADLESS_390X844_HTTP200_TITLE_IDENTITY_VERIFIED" in by_id["wix-living-estate"]["state"], "Wix account proof boundary lost")
    for key in EXPECTED_PUBLIC_DEPARTMENT:
        require("GZJM_CHROME_HEADLESS_390X844_HTTP200_TITLE_IDENTITY_NO_OVERFLOW" in by_id[key]["state"], "Public department browser evidence missing: "+key)
    require("INDEPENDENT" in by_id["wix-living-estate"]["role"], "Wix separate sovereign home lost")
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
    require(set(a["added_route_ids"])==set(EXPECTED_NEW)|set(EXPECTED_CONNECTED)|set(EXPECTED_PUBLIC_DEPARTMENT), "Inconsistent source addendum")
    require(any("generic 843-byte" in h for h in a["nonblocking_holds"]), "InfinityFree unverified access not preserved")
    require(len(a["resolved_holds"])==2, "New Chrome proof resolution not recorded")
    require(any("Five other account-listed Wix sites" in h for h in a["nonblocking_holds"]), "Wix drafts must not be represented as public live routes")
    verify_original_body_contacts()
    verify_wix_door_pairs()
    print("JM EXISTING HOMES CP02 PASS — 10 unchanged originals + 8 earlier HTTP pointers + 2 original Workshop/Wix + 5 Chrome-verified department routes; private-source boundary PASS")
if __name__=="__main__":
    main()
