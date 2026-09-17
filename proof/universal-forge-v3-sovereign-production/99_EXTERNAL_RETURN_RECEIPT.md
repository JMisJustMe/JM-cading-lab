# JM Universal Forge v3.0.0 — Sovereign Production External Return Receipt

**Status:** `PASS_WITH_EXTERNAL_GATES_OPEN`  
**Package:** `com.jm.androidforge.selfhost` · version `3.0.0` · code `300`  
**Official lane:** API 36 · Build Tools 36.0.0 · AGP 8.13.2 · Gradle 8.13 · bundletool 1.18.3

## Returned crown proof

The exact owner-held v3 source body was compiled offline using the independently exported official build room from this branch.

- Source tests: **44/44 PASS**
- JM toolchain doctor: **7/7 PASS**
- Executable body profiles: **53/53 PASS**
- Body expectations: **89/89 PASS**
- Java deprecation probe: **0 warnings**
- Android release lint: **0 issues**
- Exact clean official build: **93/93 tasks executed, PASS**
- Debug APK: **PASS**
- Release APK: **PASS**
- Genuine signed AAB: **PASS**
- bundletool validation: **PASS**
- AAB-derived universal APK: **PASS**
- Source mutation during official build: **none**
- Laptop/phone surface wall: **PASS**, 53/53 runtime, zero page errors, zero overflow on both

## Exact output hashes

| Artifact | SHA-256 |
|---|---|
| Primary standalone HTML | `e10b8613feb255713ab6f95b3b3db432c9bdf28151d6cb298d74b31353884751` |
| Update-continuous v3 APK | `7cbe06f6e41d0370e00ba535f2b16ba34586371a4f92a2729b2d9a8befbc9c1a` |
| Genuine proof AAB | `76d2710df4e50e28f01bbb4e60436429379ea729fb77d3a3b6ad29212c426560` |
| AAB-derived universal APK | `e0d75c876c16fcfe6e44c407ee273f3439b5432ece66104aa2059e6b3cc1216e` |
| Private Owner Zionfolder | `52eeb546a8183abfb6bb860a48dc5f6577f4cb6da79a80fbd850507912dadb92` |
| Public-Safe Zionfolder | `c6e9fc321e766e57e2dc1d53f799e516346e647107bbd173f3d8cdf7d4378c83` |
| Full official build room | `3035650225d83827c1bb8cb0dadad9f5d1ea3d8dd2b9a8c01a16988e38b78082` |

## Certificate correction

The first v3 offline APK used an unrelated certificate and could not upgrade the v2 Self-Host lineage. It was revoked.

The current private v3 APK and private offline maintenance route now preserve the exact v2 certificate:

`5d91d85a105237ed2d4ac874d49cc5e26ccb4d6b8ab94b05809f199af24ac42f`

The public-safe factory contains no private key and intentionally returns `HOLD` rather than signing the existing package under an unrelated certificate.

## Exposure and identity boundary

The AAB proof used a temporary 4096-bit proof identity. The signed binaries and certificate receipt remain, but the temporary private key was destroyed after verification. It is not the owner's production/upload identity.

No maintenance key or owner private factory is committed to this public branch.

## External gates still open

- Physical owner-device installation and launch: **HOLD**
- Lived runtime permission contact: **HOLD**
- Owner production key: **HOLD until owner-created**
- Play Console submission, review and acceptance: **HOLD**

> Build, package, source-integrity and dual-surface Ding: PASS. Physical-device and store Dings remain with JM and the external systems that actually perform them.
