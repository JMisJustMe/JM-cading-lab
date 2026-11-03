# JM Fold Ultra CP04 — Signing certificate comparison
Date: 2026-11-03
Status: HISTORICAL SIGNING MISMATCH PROVEN / INSTALLED CERTIFICATE HOLD

## Evidence
Original APKs read directly via Fold8 Ultra Termux, APK v2 signing block certificate DER SHA-256:
- PRELAUNCH_v0_2_DEBUG.apk: b3935c1c52f60132570158d0dca9beb7909cf80fb18a28a4b45fb33318adfd95
- REENTRY_v0_9_DEBUG.apk: 86cfa0699a1c894d36a79bc0585cda2644bfbd7a9d997e8712aaa8721ef57202
- CP05_VERIFIED.apk: 27759c49f405eda1b4b0150dac73375a0b686388cd14cfb0ad557f72a4b8e98f

Latest CP03 artifact retrieved using GitHub CLI from successful run 41570489199 to GroundZeroJM temporary inspection folder (no rebuild). Bundled SIGNATURE.txt reports v2 verified true, certificate SHA-256 bbb67d3d936bc48b6eee497cf2b237f25b4438cde3b8504813860ba6bc8e2700, Android Debug RSA 2048, one signer. BADGING.txt package com.jmisjustme.foldultra, versionCode 10, versionName 1.0.0.

All four certificates differ. The new CP03 artifact is NOT directly signature-compatible with any of these three historical APKs as an ordinary same-package update. Installed app Version 1.0.0 owner-confirmed, but installed signing certificate has not been extracted, so cannot conclusively identify installed APK. Do not claim definitive installed-vs-new mismatch until installed certificate read.

## Gate
Recover installed signer via owner-authorized Android package information or original signing keystore; compare and if compatible rebuild only changed code with original signing identity (never share private key). Do not uninstall, clear data, overwrite, or install candidate. PR #708 remains draft/unmerged.
