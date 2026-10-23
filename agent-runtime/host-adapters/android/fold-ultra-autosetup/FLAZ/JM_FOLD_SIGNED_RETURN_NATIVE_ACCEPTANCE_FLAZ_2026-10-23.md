# JM Fold Ultra × Living Home — Signed Native Return FLAZ
**Date:** 23 October 2026 UK  
**Owner:** JM / JMISJUSTME / JM32  
**Authority:** Original Fold Ultra native PR #371 → CP07-native return PR #406 → additive signed-verification draft PR #412. No sources replaced or merged.

## Exact proven commit and tests
- Native signed child branch: `jm/fold-signed-return-acceptance-20261023`.
- **Last tested source SHA:** `c47c3806b3c2390b8f181b72128de84afabdef1d`.
- GitHub Actions **run 39979795206** completed SUCCESS, both `native-carrier` and `Generic Android emulator — not a Fold DING` SUCCESS. Six other GitHub workflows on the same source SHA also SUCCESS: **7/7**.
- Actual native emulator log: `JM v0.9 OWNER-UI BLACKBOX PASS`; `JM v0.9 NEGATIVE PASS`; `JM Living Home -> native PASS: approved revision 4, Return Point preserved, replay/tamper/source rejected, cold restart persisted.`; then `JM NATIVE SIGNED RETURN PASS: owner pin + ECDSA + signed checkpoint revision 5 + tamper/replay/restart.`
- Emulator key was freshly generated QA only (private key never written); the received portable bundle was **synthetic**, not a hosted Render delivery or Gemini/OpenAI result. Key ID varies on each test.
- Prior failure trace: Android JSON canonical quote/forward-slash difference caused safe refusal; repaired by native JS-compatible quote canonicalization. A later hosted Pixel Launcher ANR interrupted old owner setup navigation; UI test now permits one **bounded, visible stage-verified retry** and still requires the real READY screen. Neither failed run was called PASS.

## New native mechanism
- `SignedReturnVerifier.java` independently validates `JM.LivingHome.NativeSignedReturnBundle/1`: bounded existing CP07 ledger + matched project/source ID/mission challenge/result, original v0.5 signed return signal receipt, exact SHA-256 canonical payload, public EC P-256 JWK fingerprint and actual ECDSA-P256-SHA256-P1363 signature.
- User MUST separately approve/pin the intended server public key ID through the existing Fold UI; the imported proof cannot set its own trust. The PIN is locally stored, not copied into credentials, project note or cloud transport.
- Original unsigned CP07 return still imports as **UNVERIFIED** (preserved), and signed one is displayed as **SERVER-SIGNED CONTACT — external task UNVERIFIED**. The imported result is untrusted task text regardless of its signed transport.
- Approval appends a NEW revisioned native `SessionDeck` checkpoint and replay fingerprint; original `ReentryEngine` Return Point, prior project history and local drafts are preserved. Signature mismatch, wrong key pin, different source, stale/replayed return or tampered payload FAIL CLOSED.

## Matching existing server authority
- Cloud Contact v0.5.1 parent signed-signal draft PR #67 and portable-bundle child draft PR #68. Portable-bundle code SHA `1683568346dfa92f9ee6fd62f0e8f73b6766bef4`; server CI run **39977590925** SUCCESS: 27/27 new local-process HTTP checks plus full pre-existing v0.5 test suite.
- Server-side portable bundle FLAZ: `contact/FLAZ_JM_LIVING_HOME_PORTABLE_SIGNED_RETURN_2026-10-23.md` on PR #68.
- Existing Render v05 remained UNCHANGED. Public `/receipt-key` previously returned ECDSA key ID `9953910a7979c8cd2f394721`; owner should independently recheck current /receipt-key before pinning. No permanent trust is gained from an unverified downloaded JSON.

## Remaining proof gates
1. Production signed-signal route is only in draft PR #67, **not deployed**. Reviewed authorised deployment and separately approved stable signing key are OPEN.
2. Real hosted space is still unproven/last seen **zero enrolled**; owner-held admin credential never used. No live hosted two-member send/return or full device sync claim.
3. The actual owner Samsung Fold and physical phone ↔ laptop are **not tested**; user explicitly deferred device acceptance. Debug signing and upgrade data preservation must be checked before any install. 
4. Actual signed server return → owner-device native revision remains HOLD. The emulator used a self-contained local synthetic ECDSA fixture, not a real remote result.
5. Dropbox/Drive authenticated retrieval, Gmail/Outlook round trips, GitHub production contact and true Gemini↔OpenAI work remain separate authorised integrations; receipt does not prove provider work.
6. Base native PR #371, descendant #406 and signed child #412 remain drafts; no merge/main change/deployment/installer replacement.

## Return point
- Native draft PR #412: https://github.com/JMisJustMe/JM-cading-lab/pull/412
- Native exact tested CI: https://github.com/JMisJustMe/JM-cading-lab/actions/runs/39979795206
- Existing native parent: https://github.com/JMisJustMe/JM-cading-lab/pull/406
- Cloud signed-signal draft #67: https://github.com/JMisJustMe/jm-cloud-contact-server-first-cloud/pull/67
- Cloud portable-bundle draft #68: https://github.com/JMisJustMe/jm-cloud-contact-server-first-cloud/pull/68

**SOURCE → SIGNAL → CONTACT FIELD → ROUTE PRESSURE → STATE CHANGE → DING → TRACE → RECOVERY → OUTPUT.**
**No Ding, no claim. Contact before crown. Recover before rebuild. Integration ≠ replacement.**
**FLAZ — FROZEN · LOCKED · ANCHORED in existing native source House.**
This FLAZ document is committed after code SHA c47c3806. It does NOT imply physical device or production server Ding, a new released APK, nor residency in Library/Dropbox.
