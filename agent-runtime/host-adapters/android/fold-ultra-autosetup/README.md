# JM FOLD ULTRA v0.9 — Workspace Recovery & Cross-Device Re-entry

**Lineage:** Native Fold prelaunch v0.1–v0.8 → explicit Return Point v0.9. One continuing app and source branch; earlier bodies remain recoverable from Git history. The real Fold and your existing phone layout are untouched.

## New native feature: named Return Point
- Every JM shelf project can have one **explicitly owner-captured Return Point** derived from a SAVED checkpoint (IDEA / BUILD / TEST / POLISH, working note, next action, source revision).
- From ROOT choose **CONTINUE / Current JM Return Point**. The app also retains its last JM room on normal lifecycle pause/resume, without starting other programs.
- A Return Point never silently captures unsaved drafts. Checkpoint the project before capture; unsaved drafts remain in the local working session.
- **RETURN** creates a new monotonically higher session revision with the older point's contents; the former *current* saved checkpoint atomically becomes the next Return Point. No rewinding of revisions, no deletion or modification of game/lyrics/Beatmaker project files.
- The owner sees the source revision and resulting revision before approving. Conflicting revisions refuse changes.
- This is a one-slot per-project reversible swap, NOT an unlimited historical version archive or a substitute for external backups.

## Trusted laptop re-entry (USB ADB debug build only)
```sh
python3 jm_fold_usb_bridge.py reentry-capture jm-games-house --expected-revision 1
python3 jm_fold_usb_bridge.py receipt
python3 jm_fold_usb_bridge.py reentry-return jm-games-house --expected-revision 2 --point-revision 1
python3 jm_fold_usb_bridge.py receipt
```
Both calls **stage PENDING** and require an explicit APPLY/REJECT dialog on the phone. A stale expected current revision or captured-point revision is refused on the phone, including a re-check immediately before committing. For offline inspection of an owner-prepared full snapshot:

```sh
python3 jm_fold_usb_bridge.py reentry-show ./JM_FOLD_BACKUP.json jm-games-house
```

This offline command displays private note text locally on the trusted laptop. The backup includes your other JM notes and projects: store and share it carefully.

## Recovery and carrier continuity
- New `JM.FoldUltraSetup/0.9` JSON includes `project_shelf`, `session_deck`, `return_points`, current project, focus, root note, both screen densities and native owner marks.
- Owner-approved USB snapshots, Android Documents export/import and local rollback carry Return Points. The upper bound is 512 KiB; oversized inputs are rejected without intentionally deleting any existing body.
- Earlier v0.8 snapshots restore their sessions while resetting unrepresented Return Points, rather than pretending earlier snapshots carried recovery history they never contained.
- No files imported from Dropbox, Google Drive or Oppo automatically. No background sync or Samsung system changes. No requested Android permissions.

## Proof contract and open gates
1. Source/manifest and offline laptop unit tests: revision bounds, orphan/duplicate marks, schema v0.8→0.9, snapshot format and no silent application.
2. Android version 0.9.0 debug APK, signature, package, SHA-256, ZIP integrity and zero requested permissions.
3. Generic Android emulator: narrow/wide startup, cold reopen, owner-simulated PLAYTEST plan and session checkpoint; capture rev1, save different rev2, RETURN as rev3, verify former rev2 saved as the new Return Point.
4. **Actual Samsung Fold owner-device contact remains OPEN**. Generic emulator cannot prove hinge integration, Samsung Galaxy AI permission reachability, true physical touch continuity or real owner acceptance.

Retain one source authority. Recover before rebuild. No Ding, no claim. Draft PR #371.


## Living Home CP07 cloud-return intake — native integration candidate (22 Oct 2026)
- The existing native Android app now offers **LIVING HOME / Import cloud return** from ROOT using Android's system JSON document picker, plus **Review pending return** on later re-entry.
- This imports the *original* `JM.LivingHome.CP07.CloudReturn/1.0` ledger emitted by the existing CP07–CP09 Living Home family. No duplicate cloud transport, credential copy, embedded HTML replacement or new app permission is required.
- Only a `RETURN_RECEIVED_UNVERIFIED` record whose mission/challenge match its original outgoing `JM.LivingHome.CloudMission/1.0` request AND whose project matches the selected Fold shelf project can be staged. The result remains explicitly untrusted external text; the import does not assert server authentication or real AI work.
- An owner sees the project, mission, expected local revision and bounded result before **approving** a new native session revision. If the project changed, there is a newer checkpoint, a draft remains unsaved, the return was previously applied, or the note exceeds bounds, the operation refuses without intentional session mutation.
- A successful approval atomically adds a new `SessionDeck` checkpoint, stores a replay marker, and clears the pending item. **Existing `ReentryEngine` Return Points and older source files remain untouched.**
- Scope: authenticated server-to-browser contact remains with Living Home and the existing server. Native Fold Ultra currently consumes owner-selected portable receipts only. Live Android network transport, credential-managed background sync, device-to-device reception and physical Samsung confirmation remain HOLD. The pending/replay journal is local private app storage; the v0.9 configuration export is unchanged and is not a complete archive of these new metadata fields.
- Source descendant: `jm/fold-ultra-living-home-return-20261022` based on unchanged PR #371 head `c33ccfe740943dd134122220a1e3755c49c3ec05`. Do not merge or change main without separate review.

## JM × Bixby — GALAXY navigation-only contact candidate (24 October 2026)

Inherits the tested native Fold Ultra v0.9 / Living Home return branch. This small addition
does **not** add another app, alter the Samsung launcher, request permissions, enable
Galaxy AI private APIs, rewrite saved sessions, or bypass owner approvals.

- Exact external Android route: `jmfoldultra://open/galaxy`.
- When JM initial setup is complete, a matching Android `ACTION_VIEW` request opens
  the existing **GALAXY** tab (compact or unfolded layout) on either a cold launch or
  `onNewIntent` warm delivery.
- Before setup is complete the existing prelaunch remains visible; no automatic setup
  occurs. Unknown URLs are refused rather than interpreted as arbitrary commands.
- This is a **public navigation entry point**, not an authenticated control channel.
  Future session-changing commands must stay behind existing owner approval and
  revision checks. The original Android Share/CP07 guarded return route is unchanged.
- Generic emulator smoke now attempts implicit VIEW resolution, verifies text rendered
  on the actual GALAXY native screen twice, and checks that protected storage is
  unchanged. Source-contract unit tests check the allowlist/manifest structure.

Developer test after building/installing a **compatible signed build**:

```sh
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'jmfoldultra://open/galaxy'
```

A spoken “Bixby, open JM Fold Ultra” has already worked on the owner's device;
a request to navigate *inside* it did not. This update makes a technical route
available to Android. **It does not prove that Bixby interprets the internal-tab
command.** Test via a compatible Samsung Routine/shortcut independently.

Do not uninstall an earlier app merely to install a new debug-signed build:
signature mismatch and private-session data may be at risk. Preserve the
original source and user data; no promotion without physical device acceptance.

### Android launcher shortcut (same app, no new authority)
- The existing JM app declares a static **JM Galaxy** shortcut pointing to the same
  allowlisted `jmfoldultra://open/galaxy` destination. On a supported launcher,
  long-press the JM Fold Ultra icon, then tap the shortcut; optionally pin it.
- Android standard launcher behaviour can make the shortcut discoverable to some
  assistants. **No Bixby discovery or voice-invocation compatibility is claimed.**
- Voice-facing integration is staged as: Android URI verified → launcher shortcut
  verified → Samsung One UI shortcut visibility → Bixby voice/Routines acceptance.
- Does not affect app sessions, private data, or the Samsung home-screen layout
  unless the owner intentionally pins a shortcut.


## JM Fold Ultra × Bixby — Contact 003 multi-room source candidate (24 October 2026)

Inherits immutable-intent Contact 002 at source commit `f7f4af81ad80055e5c32fd3ba1757329b114eefa`,
draft PR #442. This is a **separate source branch**, not an update to the
owner-installed Android app, not native Bixby command-registration, and not
permission to replace existing sessions or the prior FLAZ.

### Exact URI interface (navigation only)
- `jmfoldultra://open/root` → existing JM ROOT dashboard.
- `jmfoldultra://open/galaxy` → existing GALAXY capability explorer.
- `jmfoldultra://open/projects` → existing ProjectShelf, saved filter.
- `jmfoldultra://open/games` → existing ProjectShelf temporarily showing GAMES.
- `jmfoldultra://open/music` → existing ProjectShelf temporarily showing MUSIC.
- `jmfoldultra://open/sessions` → existing SessionDeck room.
- `jmfoldultra://open/recovery` → existing ReentryEngine Return Point room.

Input is an exact URL, matched only for Android ACTION_VIEW and canonical
`jmfoldultra://open/` values. Query strings, fragments, encoded paths and
unknown routes are HOLD; no source-text execution. Setup remains mandatory.

The public navigation handler does not select projects, commit checkpoints,
set permissions, import cloud returns, open external apps or persist a new
project category. The Games/Music category override is **transient UI state**,
not a change to ProjectShelf or SharedPreferences.

### Static shortcuts
Four existing-app static launcher shortcuts are `JM Galaxy`, `JM Games`,
`JM Music` and `JM Return`. Android launchers may display fewer shortcuts
than the XML declares. ROOT, PROJECTS and SESSIONS are still exact deep links,
and the existing main app icon remains the ROOT entry route when entered
normally. No Samsung home layout or default-assistant settings are changed.

### Build/test and owner-device constraints
Android `ACTION_VIEW` can be exercised on a compatible installed build via:
```sh
adb shell am start -W -a android.intent.action.VIEW -c android.intent.category.BROWSABLE -d 'jmfoldultra://open/music'
```
The generic Android CI suite re-runs inherited v0.9, Contact 002, and this
candidate's seven-room real UI checks. Test scripts strictly require an
emulator before simulating any owner UI contact. Do not declare PASS until
workflow results and receipts confirm it.

Samsung/Bixby may not understand a spoken instruction aimed at a static
shortcut or deep link. Real **voice → JM internal room** requires the owner
to verify directly on the Fold after a signature-compatible update, or
through a separately confirmed supported Routine/quick command.

Do not uninstall the earlier JM app to overcome incompatible APK signing,
clear its private data, or promote this descendant over Contact 002 without
source + runtime + owner comparisons. The future v1.0 Quick Capture, live sync,
device AI and full Fold Workfield upgrades remain **proposed**, not built here.


### Read-only physical-device update eligibility gate (Contact 003)

Android only accepts an installed-app update when the app ID matches, signing
certificates match (or Android verifies a valid key-rotation proof), and the
new APK versionCode is no lower. Current Contact 002/003 artifacts use CI
debug keys that may be different from one another and from the APK installed
on the actual Fold. **NEVER uninstall or clear app data to force an upgrade.**

An original owner-controlled signing key may enable a genuine compatible
update **only if that key signed the APK already installed**. Do not create a
different keystore and assume it will replace the current app. If the signing
key is lost, the data-preserving same-package update remains HOLD.

The working Android build now includes the local, read-only Python gate
`tools/jm_fold_upgrade_gate.py`, which tests installed package ID, certificate
digest, version code and permissions. It never installs, uninstalls, resets
Android, changes Bixby, asks for keystore secrets or reads private JM sessions.

#### Owner-authorised trusted laptop procedure

Prerequisites: Android SDK build-tools (apksigner, aapt), platform-tools (adb),
Python 3, owner-authorised USB debugging and USB cable. The script will refuse
ambiguous device lists; you may pass `--serial` if you have multiple devices.
Copy the candidate APK to the laptop and run:

```sh
python3 JM_FOLD_UPGRADE_GATE_READ_ONLY.py --candidate ./JM_FOLD_ULTRA_REENTRY_v0_9_DEBUG.apk --device
```

The script temporarily copies only the **installed app binary** using Android
package-manager/ADB tools, compares signatures locally and deletes its temporary
copy. It makes no installation changes. Output states:
- `PASS_PREINSTALL_READ_ONLY`: certificates, ID, version and no new permissions match the
  *current installed APK*. This is a preflight, **not** a successful install.
- `HOLD`: mismatch, unreadable app/certificate, unavailable SDK/ADB or ambiguous device.
  **Do not uninstall**; recover the original signing authority instead.
- `MATCHES_SUPPLIED_APK_NOT_DEVICE`: offline comparison only, never Samsung proof.

The offline-only comparison option is
`--candidate proposed.apk --baseline-apk earlier.apk`. A pass against a
file is *not* proof that the same file is installed on the phone.

The script writes the APK digest and **public signing certificate fingerprint**
to stdout; these are verification information, not private signing keys.
Never provide a keystore, passphrase, app-private backup or sensitive data
through a chat or commit. A different signing certificate is a legitimate
`HOLD`, not an instruction to reinstall or reset. Android valid signing-key
rotation is not automatically evaluated by this simple checker.

After an owner-verified preflight, preserve/export the existing JM configuration
through its already-approved native export path before any explicit upgrade.
Device installation, Bixby phrase acceptance and project data continuity
require separate proof. Source: https://developer.android.com/google/play/app-updates

#### Bixby speech test after an approved upgrade

On supported Samsung software, Bixby Quick Commands can map a spoken phrase
to a supported action. Samsung documents the discoverability path
Bixby → Discover → More options → Quick commands → add a command, but these
menus are version/region-dependent:
https://www.samsung.com/us/support/answer/ANS10001392/

First touch-test a visible **JM Galaxy / JM Games / JM Music / JM Return** shortcut.
Only then try Bixby phrasing, and note whether it launches that precise
internal screen or only the main app. A successful Android deep link alone does
not imply Samsung/Bixby native deep-link recognition.
