"""Bounded Chromium regression for Q1 summary MutationObserver settling."""
import argparse
import asyncio
import json
from pathlib import Path
from playwright.async_api import async_playwright

async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=Path(__file__).resolve().parents[1] / "theory/chat-graft-v3.js")
    parser.add_argument("--channel", default=None)
    args = parser.parse_args()
    source = args.source.read_text(encoding="utf-8")
    fixed = source[source.index("function updateSummary()"):source.index("function appendGraft(")]
    broken = fixed.replace("if (summary.textContent !== summaryText) summary.textContent = summaryText;", "summary.textContent = summaryText;").replace("if (note.textContent !== noteText) note.textContent = noteText;", "note.textContent = noteText;")
    assert broken != fixed, "Expected idempotent Q1 guards in original source"
    results = {}
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True, channel=args.channel)
        for label, func in [("before", broken), ("after", fixed)]:
            page = await browser.new_page()
            await page.set_content('<div class="results-head"></div>')
            results[label] = await page.evaluate("""async (func) => {
                const grafts = new Map([['source', {}]]), EXPECTED_V1_QUARANTINED = 94;
                eval(func);
                let callbacks = 0, capped = false;
                const observer = new MutationObserver(() => {
                    if (++callbacks >= 100) { capped = true; observer.disconnect(); return; }
                    updateSummary();
                });
                observer.observe(document.documentElement, {childList: true, subtree: true});
                updateSummary();
                await new Promise(resolve => setTimeout(resolve, 100));
                observer.disconnect();
                return {callbacks, capped, summary: document.querySelector('.chat-graft-summary').textContent,
                    noteCount: document.querySelectorAll('[data-q1-v3-note]').length};
            }""", func)
            await page.close()
        await browser.close()
    assert results["before"]["capped"]
    assert not results["after"]["capped"] and results["after"]["callbacks"] <= 2
    assert results["before"]["summary"] == results["after"]["summary"]
    assert results["after"]["noteCount"] == 1
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    asyncio.run(main())
