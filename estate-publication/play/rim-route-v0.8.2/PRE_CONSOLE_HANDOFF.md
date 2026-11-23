# JM Rim Route v0.8.2 — Pre-Console handoff

## Recovered authority
- Exact game body: `JM Rim Route — Portrait Basketball v0.8.2 · Live Dribble + Ball Contact`
- Source bytes: `334728`
- Source SHA-256: `86d30d56ce9a1e54d1d0eb981fb7a2cf4ee6d125fccaa77cbd8478d555246a63`
- Estate state at recovery: stage-ready / mounted / public + private lineage.

## Android release descendant
- Candidate package: `com.jmisjustme.rimroute`
- minSdk: 26
- targetSdk / compileSdk: 36
- version: 0.8.2 (82)
- carrier: offline local WebView; exact HTML body is recovered from the existing Games&Beyond payload and SHA-verified before every CI build.
- Internet permission: absent.
- third-party SDKs: none in source project.
- local policy body: included.

## Build route
GitHub Actions run 35818261765 PASS: lint, JVM tests, exact-source recovery/hash verification, API-36 compile, debug APK, unsigned owner-signable AAB, separate proof-signed AAB, bundle validation, AAB-derived universal APK, no-INTERNET check and SHA-256 receipts all passed.

## Deliberately open
- real Android install/open/touch Ding;
- genuine screenshots from the built APK;
- permanent owner upload key / Play App Signing (the unsigned release AAB is already prepared for this step);
- Play Console account/payment/identity;
- public privacy-policy hosting/support address;
- target audience, territories and price;
- closed testing and production review.

No open item above invalidates the source or API-36 prep. It marks the exact points where owner/device/Google contact must occur.

## Proven build outputs
- Unsigned ready AAB: SHA-256 `dcffcc3cab611ef9bc97b4aca47677c2f8250bfc62d5659784075eddccbd88e2`
- AAB-derived universal proof APK: SHA-256 `7fecc7d10a3447af5ac419c0ff7494653f373a7c46cddbf3280acdf9bb80e627`
- Proof-signed AAB: SHA-256 `ee61871316722303cb3794b3cbcea80f06bba45d1282d6a40a21f9f6b50008c2` — proof only; do not upload to Play.
