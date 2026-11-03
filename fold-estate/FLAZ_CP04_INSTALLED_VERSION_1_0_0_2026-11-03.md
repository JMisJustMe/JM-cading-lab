# JM Fold Ultra CP04 — installed version acceptance evidence
Date: 2026-11-03
Status: INSTALLED VERSION DING; EXACT APK AND SIGNING HOLD

## Owner-device evidence
Samsung Android App info screenshot on Fold8 Ultra explicitly displays Version 1.0.0, 'App downloaded from My Files', Storage 703 KB, and Open button. Therefore installed JM Fold Ultra app version 1.0.0 is confirmed by Android Settings. This does not establish which original APK was used or the signing identity.

## Read-only recovered source comparison
Direct Termux inspection of three existing original APK binary AndroidManifest.xml files:
- JM_FOLD_ULTRA_COMPLETE_PRELAUNCH_v0_2_DEBUG.apk: package string com.jmisjustme.foldultra present; version string 1.0.0 absent.
- JM_FOLD_ULTRA_REENTRY_v0_9_DEBUG.apk: package string present; version string 1.0.0 absent.
- JM_FOLD_ULTRA_CP05_VERIFIED.apk: package string present; version string 1.0.0 present. This is strongest recovered installed-source candidate, NOT definitive byte or signing parity.

## Remaining gates
- Extract signing certificates from original APK and CP03 GitHub artifact; compare signing lineage.
- No uninstall, install, replacement, app data reset, merge or duplication authorized.
- CP03 draft PR #708 retains original app source and passing CI evidence; physical Fold acceptance still HOLD.
