# JM Fold Ultra CP04 — FLAZ phone-native remote contact
Date: 2026-11-03
Status: CONNECTION DING / APP VERSION HOLD

## Verified
- Existing Desktop Commander Remote connected directly from Fold8 Ultra Termux, Node.js 26.3.1, remote agent 0.3.1.
- Device 'localhost' ID 23836d60-8c42-4bfe-a602-29c4d6d30720 online alongside GroundZeroJM ID 397d444c-e212-4670-878b-c8937ca2f05a.
- Read-only remote command verified Termux home /data/data/com.termux/files/home and Downloads symlink to /storage/emulated/0/Download.
- Narrow find of Downloads filenames matching *fold*.apk, *ultra*.apk, *jm*.apk, maxdepth 3, returned no matches. This does NOT imply app is not installed: Android installed packages are separate from Downloads; original APK downloads may be renamed, moved or deleted.
- JM Fold Ultra CP03 GitHub PR #708, head abec529d26cad97eddccf6db5a38206db6884e6a: native build, registry contracts and generic emulator UI PASS. Draft, unmerged. Physical signing compatibility HOLD.

## Custody / next gate
- Recover installed package metadata via Android's package manager or Settings App info; use read-only checks first, possibly Termux 'cmd package' if permitted, otherwise authorised ADB.
- Never install, uninstall, reset, merge, overwrite, or recreate an APK merely to obtain a link.
- Preserve original app, signing lineage, local data, and both remote device connections. Contact before crown; NO DING, NO CLAIM for physical installation.
