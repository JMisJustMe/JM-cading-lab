# JM FOLD ULTRA v0.7 — Native Configuration & Automation

**Lineage:** v0.1–v0.6 remain recoverable in GitHub. This is the same Android companion, not a rebuilt launcher, new project clone, or new operating system. Existing home-screen layouts and owner data remain untouched.

## One action, real internal state change
Four explicit owner-approved JM setup plans:

| Plan | Priority | Active JM reference | Galaxy guide | Compact | Expanded |
| --- | --- | --- | --- | --- | --- |
| MAKE | CREATE | JM Ecostate | CREATE | QUICK | COMFORT |
| PLAYTEST | PLAY | JM Games House | WORK | QUICK | QUICK |
| RESEARCH | EVERYDAY | JM Source Spine | ASSIST | COMFORT | COMFORT |
| RECOVERY | CREATE | JM Source Spine | WORK | COMFORT | COMFORT |

Previews identify every changed property and do not suppress the current note or the other project references. Plans use one app-local SharedPreferences commit after writing a recoverable configuration snapshot. They *do not* edit Android launcher pages, Samsung Modes & Routines, DeX, system settings or other apps.

The phone has its own SETUP PLANS surface available from ROOT and CONTROL and an optional plan choice during the existing five-stage prelaunch. The physical available width selects the compact or expanded JM layout; its QUICK and COMFORT settings now actually change card spacing and touch-control height. The available-width rule is not hinge-sensor proof. Either density can also be changed individually from the setup room.

**External Samsung/Android settings**: the same room can launch Android Display Settings or general Settings via standard native intents, under the owner's touch. This is a *handoff*, not unauthorised automation of those settings.

## Laptop work
`tools/jm_fold_usb_bridge.py` continues owner-authorised ADB contact, backups, project select/bind and restore, and adds:

```sh
python3 jm_fold_usb_bridge.py plan MAKE
python3 jm_fold_usb_bridge.py plan PLAYTEST
python3 jm_fold_usb_bridge.py receipt
```

The computer only stages the named plan; Android shows its full preview with APPLY/REJECT and writes the resulting receipt. A staged request is **PENDING**, never a silent success. The bridge verifies staging byte-for-byte. Only short, nonsensitive plan/selection metadata may use its encoded fallback; root note contents and restore data cannot use that route.

## Recovery, compatibility, limits
- Local plan undo uses a complete pre-plan `JM.FoldUltraSetup/0.7` snapshot, not scattered preference reversals.
- USB owner-approved restores and Android Document imports/export include project shelf, active project, compact/expanded preferences and last setup plan. Imports accept previous configuration schemas and validate new inputs before applying.
- Debug signed carrier + authorised trusted computer required for ADB run-as. No INTERNET, file access, Device Admin, Accessibility or dangerous Android permission requested by JM.
- No Galaxy AI private APIs, Samsung auto-app-pairs, device migration, system-wide launcher rearrangement or unattended scheduled actions.
- V0.1–v0.6 Git ancestors preserved. Different GitHub CI build signing identities can prevent seamless APK updates; export a previous JM configuration before uninstall/reinstall of any debug APK.

## Measured test gates
1. Source contracts and Python offline bridge tests.
2. Android Gradle SDK 36 build, version/package identity, signing, SHA-256, ZIP integrity and zero-permission audit.
3. Generic Android emulator narrow/wide/cold reopen and owner-unapproved `plan PLAYTEST` staging recorded as **PENDING**. This is not a physical Fold DING.
4. Actual Samsung folded/unfolded visual acceptance, user permissions, external tool behavior and successful owner approval: **OPEN until tested**.

Owner device remains unchanged by GitHub build, testing and artifact packaging. Source of this body remains draft PR #371.
