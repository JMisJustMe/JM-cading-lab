# JM FOLD ULTRA v0.5 — USB CONTACT BRIDGE

**Status:** Development descendant of v0.4, with v0.1–v0.4 preserved in Git history; not a new parallel JM system. Samsung settings and personal files remain untouched.

## Wholebody carried forward

- Five-stage native prelaunch opening, compact SOURCE and expanded WORKFIELD layouts, and owner-selected MAKE/PLAY/RESEARCH/RECOVERY routes.
- Galaxy AI discovery/handoff without impersonating Samsung's privileged APIs.
- Android text-only Share into JM (explicit approval), JM root note, JSON import/export (schemas v0.1–v0.5), owner test marks, and device-preflight diagnostics.
- Independent control for the app's own settings. No launcher takeover, remote server, dangerous Android permission, or silent system modification.

## Newly functional: USB contact (developer mode only)

**Two complementary bodies:** a native `UsbBridge.java` (phone side) and standalone Python 3 `tools/jm_fold_usb_bridge.py` (trusted laptop side). Phone must be connected over USB with owner-approved ADB debugging, and JM installed as a **debuggable APK** so `adb run-as` works.

- `status`: check trusted ADB contact, model/API and package, without changing settings.
- `profile MAKE|PLAYTEST|RESEARCH|RECOVERY`: stream a bounded request to JM private app storage, open JM, and ask the owner to **APPLY or REJECT**. Only JM focus/session preferences can change.
- `restore FILE`: validate JM configuration schema, stage app-private data, and ask owner approval on the phone; save a rollback snapshot before approved import.
- `receipt`: retrieve exact phone-side PENDING, ACCEPTED, REJECTED, HOLD or INVALID decision. A staged command is not a Ding.
- Inside JM **USB CONTACT**, tap `Prepare USB recovery snapshot` to explicitly create the JSON file; from laptop `backup FILE` retrieves it (no overwrite, owner-only mode where supported), with SHA-256.
- Inside JM **USB CONTACT**, `Recover previous approved restore` swaps app-local configuration back after an explicit owner prompt.
- Every request is claimed once; there is no auto-apply, network listener, background file watcher or unrestricted ADB script runner.

## Typical safe workstation use

Download official Android platform-tools on your laptop, connect your Fold by USB, and approve the phone's USB-debugging trust dialog **only for your own laptop**. Locate `tools/jm_fold_usb_bridge.py`.

```bash
python3 jm_fold_usb_bridge.py status
python3 jm_fold_usb_bridge.py profile PLAYTEST
# Approve or reject on the phone
python3 jm_fold_usb_bridge.py receipt
```

To preserve existing JM settings, in the phone's USB CONTACT view choose **Prepare USB recovery snapshot**, then:

```bash
python3 jm_fold_usb_bridge.py backup ./JM_FOLD_BACKUP.json
# Restore only when intended — still requires phone-side approval:
python3 jm_fold_usb_bridge.py restore ./JM_FOLD_BACKUP.json
```

If more than one authorised device is connected, pass `--serial DEVICE_ID`. Refuse untrusted/lost devices. Backups include private JM note text; protect the local file. The diagnostic receipt by contrast hashes the note without exposing its text.

## Boundaries and recovery law

- ADB USB debugging is a powerful **owner-granted developer capability independent of JM**. Debuggable apps allow trusted ADB clients to inspect their private files; use your own laptop, protect the backup and revoke ADB trust when finished.
- Debug APKs from independent CI runs may use different signing identities: direct updates are not guaranteed. Export app configuration before uninstalling a previous test build. Do not delete originals before recovery proof.
- No background root access, device administrator, Samsung Home screen automation, private Galaxy AI access, Oppo migration or automatic multiwindow creation.
- Current USB bridge applies JM app settings only. Samsung system settings must remain the user's chosen values.
- Physical Fold USB use and folded/unfolded transition remain OPEN until tested by the owner.

## Verification gates

1. Python source-contract scan and mock bridge tests pass.
2. Android SDK 36 compilation, package/version, signature, ZIP integrity and permission audit pass.
3. Generic Android emulator narrow/wide/reopen plus staging an **unapproved** request and verifying app records PENDING. This is not Samsung One UI or owner DING.
4. Owner device contact and visual review separately required.

Source: the existing JM Fold Ultra draft PR #371 on GitHub, recovering JM32-1DA and JM Phone↔Laptop Contact Runner lineage.
