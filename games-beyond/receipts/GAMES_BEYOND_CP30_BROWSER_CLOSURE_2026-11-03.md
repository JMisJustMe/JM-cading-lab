# Games&Beyond — CP30 Browser Closure
Date: 2026-11-03
Project: Existing JM Games House (`games-beyond/`)

## Authority and custody
- Existing public House registry: 22 built-in exact bodies, full target 24 after private local JMStudios pair import. The latter remain intentionally non-public.
- Exact compressed payload hashes independently rechecked (compressed and uncompressed SHA-256 matched `payload-manifest.json`).
- No embedded game source, body identity, game rules, payload manifest or source hash changed.
- The wider whole-Estate games catalogue is a separate scope and must not be counted as 22 mounted games.

## CP30 root cause and surgical repair
- Reproduced a 150 px iframe viewport in Chrome. `.bodyDialog` contains header, summary, iframe but specified only two grid tracks; the summary consumed the 1fr row and the iframe defaulted to a 150 px auto row.
- Fix: `grid-template-rows:auto auto minmax(0,1fr)`; keep a zero minimum height for correct shrinking.
- Chromium measurements after the change: 1280×720 desktop iframe 575.8 px; 390×844 portrait iframe 628.4 px; 844×390 landscape iframe 251.0 px. Western Sniper drawing-stage heights: 465.5, 476.1, 197.5 px respectively.
- With the repaired shared viewport, House Siege retains its drawn game scene; Western Sniper is no longer squashed to 96 px; cardBORED's real hand/canvases are rendered in their original documents.

## Recovered original artwork
- Original file: `TBOYS_REFERENCE_CONTACT_SHEET.jpg`, from the existing `JM_GAMES_ANDROID_APK_HTML_v0_9_WINDOWS_SAFE/.../extra/tboys_zion/TBOYS_ZIONFOLDER_UPDATED_v0_1/` Android carrier.
- Source asset measured 459,542 bytes and SHA-256 `b57ff0cd3c0048f1b5b0b10b541769bc913cf6063e7085e1959d3104d3ce7e2f`.
- Public delivery asset installed at the exact pre-existing GameCore link: `games-beyond/assets/TBOYS_REFERENCE_CONTACT_SHEET.jpg`.
- This is an existing original re-used as a delivery role, not regenerated graphics or a replacement for the saved source.

## Accessibility repair and boundary
- The original static audit reproduced 5 A / 15 B / 2 C. C bodies: FOURFOLD Arena (3 unnamed images, zoom restriction) and JM GameCore (3 unnamed canvases, reduced-motion rule, zoom restriction).
- The House's **opening copy only** now removes restrictive zoom viewport directives and assigns alternative text to previously unnamed images, including a meaningful label for the restored T-Boys reference sheet.
- Existing canvas names and runtime reduced-motion help are retained. The source audit still honestly reports its original grades; runtime adaptations are not a WCAG certification or changes to the original bytes.

## Executed browser evidence and boundary
- Targeted CP30 browser tests: 4/4 PASS in desktop Chrome, including responsive viewport, visible card hand, loaded original reference image and accessibility opening-copy checks.
- Existing House Playwright suite includes identity integrity, protected JMStudios import boundaries, edit/undo/export/proof/receipts, viewport and UI routes.
- Existing House suite + CP30 targeted suite: **40/40 PASS** in mobile-Chrome emulation and desktop Chrome.
- Extra exhaustive door and direct-link checks: **4/4 PASS** across mobile and desktop; all 22 of 22 built-in rooms independently opened in each browser profile, and `?jm-play=crewbound-arena` launched without a second click. Unknown private IDs visibly HOLD.
- Distinct executed checks across the two runs: **44 PASS / 0 FAIL**. These are browser checks, not 44 separate games.
- No physical Samsung Fold8 touch acceptance, native Android APK build, or owner-side private 24/24 import claimed by these browser tests.
- Browser acceptance does not mean all 22 game rule sets were individually played to completion.

## Keeper law
Recover before rebuild. Preserve the original source. Improve the common contact layer. Inherit proven evidence, retest only the changed contact surface. No Ding, no claim.
