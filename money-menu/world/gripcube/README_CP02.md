# JM BUSINESS WORLD — CP02 GripCube × GripRail / Owner Feedback Return

**Date:** 27 October 2026
**Source owner:** JM / JMISJUSTME
**Status:** CP02 candidate — local Chromium QA PASS; physical CP02 Fold / public deployment / payment all OPEN.

## Contact source
Owner supplied a real Samsung Fold screenshot of the **JM Money Menu Public Contact Carrier v1.2**, showing large above-the-fold intro/vertical travel at 19:06. **That screenshot proves the older v1.2 carrier opens on owner Fold. It does NOT prove the CP01 or CP02 version on that phone.**

## Recovery / no regressions
- Source authority: JM Money Menu v1.1 (242 exact governed routes; 1,210/1,210 ID/title/house/state/price field comparisons PASS)
- Parent public handoff: Money Menu v1.2 (enquiry → brief → scope receipt; visitor controlled; not a paid order)
- Immediate parent: Business World CP01 (11 houses and eight typed commercial offers, preserved unchanged)
- Actual capability donors: `ecostate-gripcube-v5.js` (grip / rotate / six semantic lenses / projection grammar) and JM GripRail v6 (sideways repeated cards / touch, keyboard and arrow inclusion). This is an adapted descendant, not a claim that the entire originals were pasted verbatim or merged.
- Original published `/money-menu/index.html`, CP01 parent, Opportunity Front Door and offer register remain untouched.

## CP02 executable additions
- Six navigable views: Start, Houses, Offers, Routes, Model, Proof; rendered 3D GripCube with tap, pointer drag/swipe, arrow-key rotation and direct dock access.
- Viewport-height content stage so the root page need not scroll past a large intro; content itself remains available as depth within the active view.
- 11 house tiles: two-row sideways GripRail; houses open the *original* governed catalogue filter.
- Eight offer cards: single-row horizontal swipe; exact commercial readiness and hold boundaries retained.
- 242 routes still searchable and shortlistable; dynamically grouped into house-specific horizontal rails; each has prev/next controls and keyboard arrows; rich description/source/limits use disclosure expansion rather than tall forced cards.
- Original five front-window routes remain behind a collapsed, accessible drawer; enquiry retains full fields now horizontally navigable on mobile; receipt, copy, JSON, text, share, email controls retained; original toolbar remains in Tools menu.
- Mobile, tablet and desktop working UI; reduced-motion CSS.

## Reproducible QA
- `qa_cp02.py`: 66/66 checks on 390×844 Fold-sized, 768×1024 tablet, 1440×900 laptop using Chromium `set_content` (page height within +1px of viewport, body overflow hidden, 0 page errors, 0 unexpected network requests).
- `test_controls.py`: 6/6 control checks for cube tap, keyboard turn, pointer drag, expanding preserved route boundary and fixed root scroll.
- 1,210/1,210 exact field identities on 242 governed routes.
- `CP02_*_HOME.png`, `CP02_*_ROUTES.png`: browser render evidence only. `OWNER_FOLD_V12_CONTACT_2026-10-27.jpg`: real owner screenshot of **v1.2 only**.
- Chromium direct local `file://` opening was blocked by environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`). Test via browser content injection succeeded; **this is NOT a real local-file open or physical device claim**.

## Live proof boundary
**No live checkout, incorporation, completed sale, real Stripe payment or fulfilment proved.** Every commercial offer retains its open gates and customer-facing disclaimers. No payment endpoint was added. Public deploy and CP02 owner Fold acceptance still require independent receipts.

## Preservation and handoff
This is a separate single-file HTML descendant, not a replacement for the existing public carrier; package keeps test/provenance carriers and source layout modules. No automatic merge, production deployment or modification of protected parents.