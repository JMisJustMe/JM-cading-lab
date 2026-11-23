#!/usr/bin/env python3
"""RUKQUSS CP05 browser regression: run the existing Worker candidate locally.

No deployment, DNS change, remote writes, account login or device interaction.
Uses a localhost server backed by test_worker_graft_cp03.cjs and checks the
original seven districts plus the four distinct external experience doors.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

SIZES = (
    (320, 720, "compact-folded"),
    (360, 800, "small-phone"),
    (390, 844, "phone"),
    (768, 1024, "unfolded-portrait"),
    (840, 360, "Fold-landscape"),
    (1280, 900, "laptop"),
)
SEARCHES = {
    "beatmaker": ("Create",),
    "websites": ("Build",),
    "jobs": ("Work",),
    "game apps": ("Build", "Play"),
    "theory, games": ("Play", "Think"),
    "no-such-invention": (),
}


def require(ok: bool, reason: str) -> None:
    if not ok:
        raise AssertionError("RUKQUSS CP05 HOLD: " + reason)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker", type=Path, required=True, help="Local exact Worker candidate; never deployed")
    parser.add_argument("--runtime-test", type=Path, required=True, help="Existing Worker VM test")
    parser.add_argument("--edge", type=Path, default=None, help="Path to local Edge; uses Playwright Chromium if omitted")
    parser.add_argument("--node", default="node", help="Local Node executable")
    parser.add_argument("--axe-js", type=Path, default=None,
                        help="Optional local audited axe-core JavaScript for read-only WCAG checks")
    args = parser.parse_args()
    from playwright.sync_api import sync_playwright

    axe_script = args.axe_js.read_text(encoding="utf-8") if args.axe_js else None
    worker_bytes = args.worker.read_bytes()
    require(b"JM_RUKQUSS_ROUTE_CP01" in worker_bytes, "wrong Worker carrier")
    server = subprocess.Popen(
        [args.node, str(args.runtime_test), str(args.worker), "--serve"],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
    )
    try:
        port = None
        for _ in range(200):
            line = server.stdout.readline()
            if not line:
                break
            if line.startswith("CP03_SERVER_READY "):
                port = int(line.split()[-1])
                break
        require(port is not None, "Node local Worker server did not start")
        url = f"http://127.0.0.1:{port}/"
        report = []
        with sync_playwright() as pw:
            options = {"headless": True}
            if args.edge is not None:
                options["executable_path"] = str(args.edge)
            browser = pw.chromium.launch(**options)
            try:
                for width, height, name in SIZES:
                    page = browser.new_page(viewport={"width": width, "height": height})
                    errors = []
                    page.on("pageerror", lambda exc: errors.append(str(exc)))
                    try:
                        response = page.goto(url, wait_until="load", timeout=20000)
                        require(response is not None and response.status == 200, f"{name} HTTP")
                        require(page.locator("#grid .district").count() == 7, f"{name} original districts")
                        require(page.locator("#live .experience-card").count() == 4, f"{name} independent experience cards")
                        contact = page.locator("#live .experience-card:nth-child(4) .experience-cta-row a")
                        require(contact.count() == 2, f"{name} customer-controlled two-door enquiry")
                        require(contact.nth(0).get_attribute("href") ==
                            "https://jmisjustme-estate.pages.dev/money-menu/launch/#offers",
                            f"{name} offers link")
                        require(contact.nth(1).get_attribute("href") ==
                            "https://jmisjustme-estate.pages.dev/money-menu/launch/#enquiry",
                            f"{name} enquiry form link")
                        for action in contact.all():
                            require(action.bounding_box()["height"] >= 44, f"{name} contact touch target")
                        if axe_script:
                            page.add_script_tag(content=axe_script)
                            a11y = page.evaluate("""async () => {
                                const result=await axe.run(document, {
                                    runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']}
                                });
                                return result.violations.map(item=>({
                                    id:item.id, impact:item.impact, nodes:item.nodes.length
                                }));
                            }""")
                            require(not a11y, f"{name} axe-core violations: {a11y}")
                        require(page.locator(".hero .action.primary").get_attribute("href") == "#live", f"{name} primary hero action")
                        require(page.locator("#live").evaluate("(e)=>!!(e.compareDocumentPosition(document.querySelector('#doors')) & Node.DOCUMENT_POSITION_FOLLOWING)"), f"{name} working experiences precede directory")
                        icon = page.locator('link[rel="icon"]')
                        require(icon.count() == 1 and icon.get_attribute("href").startswith("data:image/svg+xml,"), f"{name} embedded favicon")
                        require(page.locator('meta[property="og:title"]').count() == 1, f"{name} social preview metadata")
                        page.locator(".hero .action.primary").click()
                        require(page.url.endswith("#live"), f"{name} hero experience navigation")
                        require(page.locator("[data-quick-query]").count() == 6, f"{name} search shortcuts")
                        require(page.locator("#clearFind").is_disabled(), f"{name} initial clear")
                        require(not page.evaluate("document.documentElement.scrollWidth > innerWidth"), f"{name} baseline overflow")
                        for query, expected in SEARCHES.items():
                            page.locator("#find").fill(query)
                            found = page.locator("#grid .district:visible h3").all_text_contents()
                            require(sorted(found) == sorted(expected), f"{name} query {query!r}: {found}")
                            require(page.locator("#empty").is_visible() == (len(expected) == 0), f"{name} empty-results status")
                        page.locator("#clearFind").click()
                        require(page.locator("#find").input_value() == "", f"{name} Clear action")
                        require(page.locator("#grid .district:visible").count() == 7, f"{name} clear restores districts")
                        require(page.locator("#find").evaluate("(e)=>e===document.activeElement"), f"{name} clear restores focus")
                        games = page.locator("[data-quick-query=games]")
                        games.click()
                        require(games.get_attribute("aria-pressed") == "true", f"{name} pressed state")
                        require(page.locator("#grid .district:visible h3").all_text_contents() == ["Play"], f"{name} Games shortcut")
                        games.click()
                        require(page.locator("#grid .district:visible").count() == 7, f"{name} shortcut toggle")
                        require(page.locator("[data-quick-query][aria-pressed=true]").count() == 0, f"{name} shortcut unpressed")
                        page.locator("[data-quick-query=music]").click()
                        require(page.locator("#grid .district:visible h3").all_text_contents() == ["Create"], f"{name} Music shortcut")
                        page.locator("#find").fill("website")
                        require(page.locator("[data-quick-query][aria-pressed=true]").count() == 0, f"{name} manual query clears pressed")
                        page.locator("#find").press("Escape")
                        require(page.locator("#find").input_value() == "", f"{name} Escape clears")
                        require(page.locator("#grid .district:visible").count() == 7, f"{name} Escape restores all")
                        for button in page.locator("[data-quick-query]").all():
                            require(button.bounding_box()["height"] >= 44, f"{name} shortcut target below 44px")
                        for anchor in page.locator(".topnav a").all():
                            require(anchor.bounding_box()["height"] >= 44, f"{name} nav target below 44px")
                        page.emulate_media(reduced_motion="reduce")
                        require(page.evaluate("getComputedStyle(document.documentElement).scrollBehavior") == "auto", f"{name} reduced motion")
                        page.evaluate("document.documentElement.style.fontSize='200%'")
                        actual = page.evaluate("document.documentElement.scrollWidth")
                        require(actual <= width, f"{name} 200% text overflow {actual}/{width}")
                        require(not errors, f"{name} browser JS errors: {errors}")
                        report.append({"size": f"{width}x{height}", "label": name, "checks": "PASS", "overflow_at_200_percent": False, "page_errors": len(errors)})
                    finally:
                        page.close()
            finally:
                browser.close()
        print(json.dumps({
            "schema": "JM.RUKQUSS.PolishBrowser.CP05/1",
            "scope": "LOCAL_WORKER_LOOPBACK_HEADLESS_ONLY_NO_DEPLOY_NO_PHYSICAL_DEVICE",
            "worker_sha256": hashlib.sha256(worker_bytes).hexdigest(),
            "viewports_passed": len(report),
            "multi_topic_examples_per_viewport": len(SEARCHES),
            "checks": "PASS",
            "axe_scanned_viewports": len(report) if axe_script else 0,
            "results": report,
        }, sort_keys=True))
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    main()
