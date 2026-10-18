# JM FOLD ULTRA · v0.4 PREFLIGHT WHOLEBODY

**Working status:** Native Android source descendant of v0.3; v0.1–v0.3 remain in Git history. Run build for exact committed SHA before claiming carrier pass. No phone data reset or launcher takeover.

## Wholebody carry-forward
- Five-stage first opening (arrival, priorities, paired screen views, Samsung/native route discovery, owner entry).
- Four native sections: ROOT, GALAXY, ROUTES, CONTROL.
- Eight Samsung capability guides/handoffs with owner-asserted and reversible exploration marks.
- Four JM session recipes (MAKE, PLAYTEST, RESEARCH, RECOVERY): each changes **JM-only** routing preferences then asks before opening its first external route. No fake multiwindow app pair.
- Real Android `ACTION_SEND` / `text/plain` share-target receiving from other apps; **review and explicit approval** before appending 2500-character-max text/link to JM root note. Does not read clipboard, messages or arbitrary user files.
- One-tap preflight uses Android APIs to produce an **actual** bounded JSON receipt, including API/package, manifest permission inventory, immediate local save/read, current available width, visible app launch targets, supported shortcut request, and separately recorded human test assertions.
- Preflight JSON uses SHA-256 of root note rather than plaintext, includes device model and scoped evidence/status counts, and **always reports physical Fold contact OPEN** until owner tests.
- Owner tests (compact, expanded, reopen) are explicit marks, never sensor-proven physical validation.
- Config export JSON v0.4 includes note, JM priority, owner marks, session and native category. Explicit import confirmation and schema range v0.1–v0.4, imported marks only for relevant versions.

## Native safeguards
No `INTERNET` or other Android permissions. External web routes use system browser. `ACTION_SEND` uses normal Android sharesheet; shared text is discarded if declined and is not logged/networked. Android Settings/Gallery/Camera open only when user taps. App-only preferences saved to its private storage.

**Known boundaries:** No silent One UI edits, Samsung Now Nudge feed, proprietary AI control, hidden hinge sensor, external backup access, autonomous Oppo transfer, DeX automation, launcher replacements or automatic app-pair creation.

## Proof gates
1. Static contracts and Android build must pass CI; APK file hash, version, package, permissions and signature verified.
2. Optional generic Android emulator smoke if available: inspect first-run UI at compact/expanded configurations, capture screenshot, cold-start; this is not evidence for real Samsung fold behavior.
3. Physical owner Fold proof remains separately OPEN; debug signing key rotation across CI runs may prevent direct in-place upgrades, even if package name matches. Keep previous APKs and data; back up JM JSON before intentionally uninstalling/upgrading.
4. Do not claim installation or owner contact from a GitHub build receipt.

## Owner-device journey (later, with approval)
Open prelaunch → choose quick route → discover Galaxy tools → run PREFLIGHT → read local receipt → compare cover and inner view → externally share a test link into JM and approve → export configuration and diagnostic receipts → close/reopen and manually record what actually survived → check one real Samsung app handoff.

**Primary source:** GitHub PR #371. JM32-1DA, Phone↔Laptop Contact Runner, Developer Playground ancestor lineage retained.
