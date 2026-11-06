# CREWBOUND CP02 — single-file owner quick checks
- The two HTML files are **delivery-role builds only**, not canonical source. Generated deterministically from sibling `index.html` / `cast.html` and `roster.js`, `cast.js`, `art.js` and `sim.js`.
- All JavaScript is embedded; **no network, CDN or additional files are required**. These two files link to each other by relative filename when saved together.
- This meets the user's preference for direct HTML quick-checks on Samsung Fold8. Download the .html file from GitHub raw and open with a browser or Samsung Internet. This owner-facing content://downloads route is separate from GitHub Pages deployment.
- Original CREWBOUND v0.5 and COMBOUND are untouched. Never promote this export to source authority.
- Source and donor hashes are recorded in the HTML head provenance comment. Every embedded script was checked with native Node syntax validation.
- Real device finger-tap and Fold posture remain owner-observed tests, not presumed PASS by build syntax.
