# JM FOLD ULTRA · PROJECT CONTACT v0.6 — prelaunch development

**Source route:** JM32-1DA → native Fold prelaunch v0.1–v0.5 → Project Contact v0.6. Existing source ancestors and draft PR #371 stay preserved.

## What is newly functional

The companion APK now includes an immediately accessible **JM Project Shelf** with categories GAMES, MUSIC, BUILD and ESTATE. Its source names existing JM bodies; a link is not fabricated when a verified publish location has not been recovered. Seed references include JM Ecostate, JM Games House, source repository, FIVE//FLIP, TIDELESS REBELS, SLOTBORN ACTION, JM Beatmaker, JM Lyric Home and JM BuildCAD.

On phone: select the active project, launch its bound public HTTPS URL, edit a route, or register an additional project reference; unbound entries show a truthful HOLD. The ROOT opening has a one-tap control for the current project. The shelf is app-local metadata only: it does not copy, install, unzip, discover, delete or relocate JM files.

On trusted laptop (ADB + debuggable APK only): the existing `tools/jm_fold_usb_bridge.py` can stage `project-select` and `project-bind` requests. **Android presents APPLY/REJECT before changing any JM setting.** Project routing and the catalogue are included in owner-approved configuration snapshots and rollback.

```sh
python3 jm_fold_usb_bridge.py status
python3 jm_fold_usb_bridge.py project-select five-flip
python3 jm_fold_usb_bridge.py receipt
python3 jm_fold_usb_bridge.py project-bind jm-beatmaker --title "JM Beatmaker" --family MUSIC --url "https://YOUR-TRUSTED-PUBLISHED-LOCATION"
```

The last command is only an example; no particular Beatmaker URL is being asserted or installed. Project URL binding requires public HTTPS, no credentials, no nonstandard port, no fragment or private/localhost endpoint. Do not approve unexpected links. A published project can still be unavailable on the network: the shelf checks URL format, not remote reachability.

## Wholebody inherited

- Arrival → priority → paired-screen preview → Galaxy capability contact → owner entry
- Compact SOURCE and expanded WORKFIELD based on available Android width (not measured hinge position)
- Native Samsung capability directory, gallery/camera/system handoffs, and existing JM web routes
- Share-to-JM explicit approval, root note, app-level preflight and diagnostic export
- Four app-local JM session recipes and USB workstation requests with phone-side approval
- Configuration JSON 0.6 with earlier v0.1–0.5 migrations, local project references and owner marks
- No root, Accessibility service, device administrator, internet permission, silent One UI modification or launcher replacement

## Proof gates

- Python source contract and desktop mock unit tests
- Android Gradle SDK 36, package identity, version 0.6.0, debug signing, no requested Android permissions, ZIP integrity, SHA-256
- Generic Android emulator narrow/wide/reopen + `project-select five-flip` staged over ADB and recorded as PENDING (not accepted)
- Actual Samsung Fold device, layout, share, project link handoff, backups and owner touch: **OPEN**

**Debug APK caution:** CI signing identities may vary across jobs. In-place upgrades can fail even with identical package names. Export recovery data first; do not uninstall or wipe previous test builds without a verified rescue copy. ADB trusted-computer access is broad and must be granted only to a laptop you control.

Do not confuse source/CI PASS with owner-device DING. Recover before rebuild; keep one authoritative JM project body per project.
