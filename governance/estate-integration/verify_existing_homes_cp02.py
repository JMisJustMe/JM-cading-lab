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


def verify_apps_original_tools_cp02():
    """CP02 verify five original public workbench contacts; original 45-room inventory untouched."""
    from re import DOTALL, findall
    html = Path("apps/index.html").read_text(encoding="utf-8")
    marker = '<section class="flagship" id="jmOriginalToolsCP02"'
    require(html.count(marker) == 1, "Exact original tool section absent or duplicated")
    section = html.split(marker, 1)[1].split("</section>", 1)[0]
    expected = [
        ("openbox", "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/openbox/", "Open original editor"),
        ("workshop", "https://jmisjustme-estate.pages.dev/coding-estate/workshop/", "Enter original workshop"),
        ("everybody", "https://jmisjustme-estate.pages.dev/coding-estate/everybody/", "Open existing workbench"),
        ("visualang", "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/visualang.html", "Open original Visualang"),
        ("jm-py-proof", "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/jm-py-proof.html", "View original JM.PY proof"),
    ]
    found = findall(
        r'<div class="jm-original-tool" data-jm-tool-id="([^"]+)"><strong>.*?</strong>'
        r'<span>.*?</span><a href="([^"]+)">([^<]+)</a></div>', section, flags=DOTALL
    )
    require(found == expected, "Exact public app/tool destination, order or role changed")
    require(len({row[0] for row in found}) == 5, "Duplicate original tool identity")
    require("45 non-game app records" in section and
            "not a live editor" in section and
            "Protected owner applications remain private" in section and
            "physical Fold8 finger acceptance" in section,
            "45-row, source-role, owner-privacy or device acceptance boundary lost")
    require('const APP_STAT_COUNTS={"room_count":45,"full_plus_preserved":29,"routed":12,"source_needed":0,"preparation":2};' in html,
            "Original 45-room Apps catalogue status counts drifted")
    require(html.count('id="workrooms"') == 1 and html.count('id="grid"') == 1 and
            html.count("const APP_SOURCE_CONTACTS=") == 1,
            "Original Apps House cards, four workrooms or edit-source contact authority replaced")
    require("#jmOriginalToolsCP02 .jm-original-tool a{display:flex" in html and
            "min-height:48px" in html and "overflow-wrap:anywhere" in html,
            "Fold-first 48px contact buttons lost")
    original_paths = [
        "website/jm-website-001/openbox/index.html",
        "coding-estate/workshop/index.html",
        "coding-estate/everybody/index.html",
        "website/jm-website-001/visualang.html",
        "website/jm-website-001/jm-py-proof.html",
    ]
    require(all(Path(path).is_file() for path in original_paths),
            "A linked exact original tool source is no longer present")
    require('jm-agi-lab-runtime-console-v1/' not in section and
            "private owner payload" not in section and
            "example.com" not in section,
            "Protected owner source, unrelated console or placeholder introduced into CP02 links")
    print("CP02 APPS DIRECT ORIGINAL TOOLS — 5/5 exact sourced public links PASS; unchanged 45 rooms and four workrooms")

def verify_more_original_doors_cp01():
    """CP01 additive access-only contacts: originals remain in their existing Games House."""
    from re import DOTALL, findall
    html = Path("access/index.html").read_text(encoding="utf-8")
    marker = '<section id="jmMoreOriginalDoors"'
    require(html.count(marker) == 1, "Extra original doors section missing or duplicated")
    section = html.split(marker, 1)[1].split("</section>", 1)[0]
    base = "https://jmisjustme-estate.pages.dev/games-beyond/"
    expected = [
        ("glyphplay", base + "?jm-play=glyphplay", "Open mounted GlyphPlay"),
        ("game-native-core", base + "?jm-play=game-native-core", "Open mounted core"),
        ("gamecore", base + "?jm-play=gamecore", "Open mounted GameCore"),
        ("aiming-run", base + "bodies/aiming-run-v0-1a.html", "Open original proof"),
        ("drag-aim", base + "bodies/drag-aim-loop-kernel-v0-9-9.html", "Open original loop"),
        ("playform", base + "bodies/playform-v0-1.html", "Open original framework"),
        ("routeos", base + "routeos/runtime/", "Open existing console"),
    ]
    pattern = (r'<div class="row" data-jm-more-id="([^"]+)"><div>.*?</div>'
               r'<div class="doorlinks"><a class="btn" href="([^"]+)">([^<]+)</a></div></div>')
    actual = findall(pattern, section, flags=DOTALL)
    require(actual == expected, "Original supplemental doors, order or destinations drifted")
    require(len(set(item[0] for item in actual)) == 7, "Duplicate supplementary original seat")
    require("data-jm-use-entry=" not in section and "data-jm-launch=" not in section and
            "data-jm-pin-id=" not in section, "Protected CP08 quick-launch or pin contract modified")
    manifest = json.loads(Path("games-beyond/payload-manifest.json").read_text(encoding="utf-8"))
    registry = json.loads(Path("games-beyond/registry.json").read_text(encoding="utf-8"))
    mounted = {row["id"] for row in registry["registered_bodies"] if row.get("mounted") is True}
    for game_id in ("glyphplay", "game-native-core", "gamecore"):
        require(game_id in mounted and game_id in manifest["bodyIdsBuiltIn"],
                "New pointer is not mounted by the existing Games House: " + game_id)
    catalogue = Path("games-beyond/all-games.html").read_text(encoding="utf-8")
    for game_id in ("glyphplay", "game-native-core", "gamecore"):
        require('?jm-play=' + game_id in catalogue, "Original Games catalogue entry missing: " + game_id)
    source_paths = (
        "games-beyond/bodies/aiming-run-v0-1a.html",
        "games-beyond/bodies/drag-aim-loop-kernel-v0-9-9.html",
        "games-beyond/bodies/playform-v0-1.html",
        "games-beyond/routeos/runtime/index.html",
    )
    require(all(Path(p).is_file() for p in source_paths),
            "Standalone historical source or RouteOS runtime path no longer exists")
    require("not a new game release" in section and "not a new game release" in section.lower() and
            "not new software releases" in section and "physical Fold8 finger-touch acceptance" in section and
            "No private JMStudios body" in section, "Source, release, privacy or owner acceptance boundary lost")
    require(".doorlinks .btn{display:inline-flex" in html and "min-height:44px" in html and
            "@media(max-width:850px){.grid" in html, "Inherited phone touch/row layout contract lost")
    print("CP01 EXTRA ORIGINAL DOORS — 7/7 source-backed pointers PASS; 12 inherited CP08 doors unchanged")

def verify_direct_use_cp08():
    """CP08: link only to existing public-mounted exact game/creator bodies."""
    from re import findall
    html = Path("access/index.html").read_text(encoding="utf-8")
    marker = '<section id="jmUseNow"'
    require(html.count(marker) == 1, "Direct-use section missing or repeated")
    section = html.split(marker, 1)[1].split("</section>", 1)[0]
    manifest = json.loads(Path("games-beyond/payload-manifest.json").read_text(encoding="utf-8"))
    exact_ids = manifest["bodyIdsBuiltIn"]
    names = [
        "tboys-core-clash",
        "fourfold-arena",
        "rim-route",
        "fight-clash",
        "futarized",
        "crewbound-arena",
        "house-siege",
        "western-sniper",
        "dead-reckon",
        "cardbored",
        "gameforge",
        "glyphforge",
    ]
    found = findall(r'data-jm-use-entry="([^"]+)"', section)
    require(found == names, "Direct-use game ID order or entry count drift")
    require(len(exact_ids) == len(set(exact_ids)), "Games House manifest ID collision")
    require(all(item in exact_ids for item in names), "Not all direct-use game entries are publicly mounted")
    base = "https://jmisjustme-estate.pages.dev/games-beyond/"
    for item in names:
        require(section.count('data-jm-use-entry="' + item + '"') == 1, "Repeated mounted original: " + item)
        play = 'data-jm-launch="play" href="' + base + '?jm-play=' + item + '"'
        edit = 'data-jm-launch="edit" href="' + base + '?jm-edit=' + item + '"'
        require(section.count(play) == 1 and section.count(edit) == 1,
                "Direct play or existing editor contact changed for " + item)
    contacts = {
        "openbox": "https://jmisjustme.github.io/JM-cading-lab/website/jm-website-001/openbox/",
        "workshop": "https://jmisjustme-estate.pages.dev/coding-estate/workshop/",
        "agi-console": "https://jmisjustme-estate.pages.dev/apps/jm-agi-lab-runtime-console-v1/",
        "music": "https://jmisjustme-estate.pages.dev/lyrics/",
        "ftr-issue01": "https://jmisjustme-estate.pages.dev/visual-story/ftr-the-massive-push/issue-01/",
    }
    require(findall(r'data-jm-use-contact="([^"]+)"', section) == list(contacts),
            "Independent public creator/reader contact list changed")
    for key,url in contacts.items():
        require(section.count('data-jm-use-contact="' + key + '"') == 1 and
                ('href="' + url + '"') in section, "Original source contact changed: " + key)
    require("jmstudios-source-rebegin" not in section and
            "jmstudios-actual-crown" not in section and
            "example.com/download" not in section, "Unproven or private body quick-launched")
    require("physical Fold8 acceptance" in section and "not mounted publicly" in section,
            "Device/private mount boundary disappeared")
    require("#jmUseNow .use-actions a{display:inline-flex" in html and "min-height:44px" in html,
            "Fold touch button threshold disappeared")
    print("CP13 DIRECT USE PASS — 12/12 manifest-mounted bodies · 24 exact play/edit pointers · 5/5 independent public rooms · no private JMStudios body or fake download")


def verify_quick_return_cp09():
    """Pin only known public originals; read existing Games House history, don't fork it."""
    from re import findall
    html = Path("access/index.html").read_text(encoding="utf-8")
    require(html.count('<section id="jmQuickReturn"') == 1, "Quick Return section missing or repeated")
    require(html.count('<script id="jmQuickReturnScript">') == 1, "Owner-local Quick Return script missing or repeated")
    section = html.split('<section id="jmQuickReturn"', 1)[1].split("</section>", 1)[0]
    require("Recently opened in Games &amp; Beyond" in section and "My pinned doors" in section,
            "Source-exact owner utility headings changed")
    require('id="jmRecentGameDoors"' in section and 'id="jmPinnedDoorList"' in section,
            "Recents or pins presentation lost")
    pins = findall(r'<button class="jm-pin-btn"[^>]*data-jm-pin-id="([^"]+)"', html)
    expected = [
        "game:tboys-core-clash", "game:fourfold-arena", "game:rim-route",
        "game:fight-clash", "game:futarized",
        "game:crewbound-arena", "game:house-siege", "game:western-sniper",
        "game:dead-reckon", "game:cardbored",
        "game:gameforge", "game:glyphforge",
        "room:openbox", "room:workshop", "room:agi-console", "room:music", "room:ftr-issue01",
    ]
    require(pins == expected, "Original Quick Return pin identities changed")
    require(len(pins) == len(set(pins)), "Duplicate pin identity")
    script = html.split('<script id="jmQuickReturnScript">', 1)[1].split("</script>", 1)[0]
    require("RECENT_KEY='jm-gb-recent-v05'" in script,
            "Quick Return no longer reuses the original Games House recent key")
    require("PIN_KEY='jm-access-owner-pins-v1'" in script,
            "Local pin store identity changed")
    require("localStorage.setItem(RECENT_KEY" not in script and
            "localStorage.removeItem(RECENT_KEY" not in script,
            "Quick Return unexpectedly writes/erases original Games House history")
    require("localStorage.setItem(PIN_KEY,JSON.stringify(pins))" in script,
            "Pin state no longer local owner-managed IDs")
    require("cards.has(x)" in script and "encodeURIComponent(id)" in script,
            "Unknown stored pin/recent route not restricted to known public originals")
    require("response=await fetch('../games-beyond/registry.json'" in script,
            "Recent game names no longer come from current Games House authority")
    require("['jmisjustme-estate.pages.dev','jmisjustme.github.io']" in script,
            "Pin destination origin whitelist unexpectedly modified")
    require("min-height:44px" in html and "#jmQuickReturn .jm-return-grid" in html,
            "Fold phone touch and layout repair dropped")
    print("CP13 QUICK RETURN — 17/17 known pin doors, inherited Games House recents, local-only owner pins, source boundary PASS")


def verify_original_pwa_cp10():
    """CP10: existing original web-app identity, one additional Continue shortcut."""
    html = Path("access/index.html").read_text(encoding="utf-8")
    root = Path("index.html").read_text(encoding="utf-8")
    sw = Path("sw.js").read_text(encoding="utf-8")
    manifest = json.loads(Path("manifest.webmanifest").read_text(encoding="utf-8"))
    require(html.count('<link rel="manifest" href="../manifest.webmanifest">') == 1,
            "Access Mesh lacks its original Estate PWA identity or duplicates it")
    require(html.count('<link rel="icon" href="../icon.svg" type="image/svg+xml">') == 1,
            "Access Mesh icon no longer links original source")
    require(html.count('id="jmExistingAppInstall"') == 1 and
            'id="jmExistingAppInstall" class="btn primary" href="../#estate"' in html,
            "Install route no longer opens existing root Estate installer")
    require("serviceWorker.register" not in html,
            "New Access Mesh registration duplicates original root service-worker ownership")
    require('<link rel="manifest" href="./manifest.webmanifest">' in root,
            "Existing original root manifest lost")
    require("navigator.serviceWorker.register('./sw.js')" in Path("estate-app.js").read_text(encoding="utf-8"),
            "Original root installer/runtime owner lost")
    require("'./access/index.html'" in sw and "'./manifest.webmanifest'" in sw,
            "Original root service-worker offline carrier no longer includes PWA/Access")
    require(manifest["name"] == "JMISJUSTME — The Owned Web Estate" and
            manifest["short_name"] == "JM Estate" and
            manifest["start_url"] == "./#estate" and
            manifest["scope"] == "./" and
            manifest["display"] == "standalone",
            "Existing PWA identity/start/scope was replaced")
    expected = [
        ("Games & Beyond", "./games-beyond/"),
        ("Coding Estate", "./coding-estate/everybody/"),
        ("Owner Room", "./#owner"),
        ("Continue in JM ECOSTATE", "./access/#jmQuickReturn"),
    ]
    require([(x["name"], x["url"]) for x in manifest["shortcuts"]] == expected,
            "Three inherited PWA shortcuts overwritten or fourth Continue route changed")
    require(all(x["icons"][0]["src"] == "./icon.svg" for x in manifest["shortcuts"]),
            "Existing icon replaced with redundant payload")
    require("Same original app and source." in html and
            "#jmExistingAppInstall{display:inline-flex" in html and "min-height:48px" in html,
            "Owner-facing one-app truth or Fold tap target missing")
    print("CP10 ORIGINAL PWA PASS — original identity/scope/root install preserved + Continue shortcut + Access Mesh manifest / 48px tap link; no second app")

def verify_original_service_worker_cp11():
    """CP11: repaired original service worker stays one source, not another PWA."""
    sw = Path("sw.js").read_text(encoding="utf-8")
    core = sw.split("const CORE=[", 1)[1].split("];", 1)[0]
    malformed = chr(92) + "n"
    require(malformed not in core,
            "Original PWA service-worker CORE list contains literal backslash-n syntax error")
    require(sw.count("const CORE=[") == 1 and
            sw.count("self.addEventListener('install'") == 1 and
            sw.count("self.addEventListener('activate'") == 1 and
            sw.count("self.addEventListener('fetch'") == 1,
            "Original single-worker lifecycle or authority changed")
    require("'./access/index.html',\n  './career/',\n  './career/index.html'," in sw,
            "Two malformed original source transitions were not byte-locally repaired")
    require("event.respondWith(fresh(event.request))" in sw,
            "Original network-first / cached recovery handler changed")
    require("if (!publicCacheRequest(event.request)) return;" in sw,
            "Protected original API bypass must remain enforced by the stronger CP12 public-cache gate")
    print("CP11 SW ORIGINAL PASS — exactly repaired syntax transitions, lifecycle and protected fetch scope unchanged")


def verify_pwa_cache_boundary_cp12():
    """CP12: same original worker caches public content only; never API/private responses."""
    sw = Path("sw.js").read_text(encoding="utf-8")
    require("const CACHE='jm-web-estate-v1.4.13-ailatheo-entitlement-boundary'" in sw,
            "Existing PWA cache identity changed")
    require(sw.count("function publicCacheRequest(request){") == 1 and
            sw.count("function safeCacheResponse(response,request){") == 1,
            "Public cache guard missing or duplicated")
    expected = [
        "request.headers.has('Authorization')",
        "url.origin !== self.location.origin",
        "path === '/api' || path.startsWith('/api/')",
        "path === '/owner' || path.startsWith('/owner/')",
        "path === '/author/authuser.html'",
        "response.headers.get('Cache-Control')",
        "function explicitOfflineCore(request){",
        "if(url.origin !== self.location.origin || url.search) return false;",
        "CORE.some(relative => new URL(relative,self.registration.scope).pathname === url.pathname)",
        r"if(/(?:^|[,\s])private",
        r"if(/(?:^|[,\s])no-store",
        "if(/(?:^|[,",
        "return explicitOfflineCore(request);",
        "safeCacheResponse(response,request)",
        "if (!publicCacheRequest(event.request)) return;",
        "if (!publicCacheRequest(request) || !safeCacheResponse(response,request))",
        "await cache.delete(request)",
    ]
    for clause in expected:
        require(clause in sw, "Original PWA cache privacy boundary absent: " + clause)
    require("event.respondWith(fresh(event.request))" in sw and
            "const cached = await caches.match(request,{ignoreSearch:true})" in sw,
            "Public offline recovery path unexpectedly removed")
    require("if(response && response.ok)" in sw and
            "return response;\n    }\n    const cached = await caches.match" in sw,
            "Live 200 responses must return fresh even when private or no-store")
    print("CP12 SAFE CACHE GATE PASS — original worker, all-API exclusion, private reject, explicit public CORE no-store offline allowance")


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
    verify_direct_use_cp08()
    verify_more_original_doors_cp01()
    verify_apps_original_tools_cp02()
    verify_quick_return_cp09()
    verify_original_pwa_cp10()
    verify_original_service_worker_cp11()
    verify_pwa_cache_boundary_cp12()
    print("JM EXISTING HOMES CP02 PASS — 10 unchanged originals + 8 earlier HTTP pointers + 2 original Workshop/Wix + 5 Chrome-verified department routes; private-source boundary PASS")
if __name__=="__main__":
    main()
