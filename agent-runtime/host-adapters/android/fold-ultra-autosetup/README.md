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


## JM FOLD ULTRA v1.0 — LIVING DEVICE CONTACT (24 October 2026)

**Inherited authority:** v0.9 / draft #371 → Living Home native guarded return draft #406 →
Bixby deep-link / shortcuts draft #442 → v1.0 additive descendant (this branch).
No replacement app; unchanged application ID com.jmisjustme.foldultra.
Android carrier versionCode 10 / versionName 1.0.0, original v0.9 export schema retained
for compatibility. Device rollout and Samsung physical tests remain HOLD.

### One JM application, separate organs
- **Command Deck**: Android launcher shortcuts JM Galaxy / JM Projects /
  JM Continue / JM Capture, backed by exact, navigation-only
  jmfoldultra://open/{galaxy,projects,continue,capture} deep links.
  A public caller is NOT authenticated as Bixby. Initial owner setup is mandatory.
- **Creation Houses**: preserve GAMES, MUSIC, BUILD (presented as CODING),
  ESTATE (presented as INFRA), and add COMICS, CARTOONS, BOOKS. Unbound
  bodies stay references rather than invented project URLs; user binds verified routes.
- **Fold Workfields**: inherit SetupPlan's MAKE / PLAYTEST / RESEARCH /
  RECOVERY and distinct compact/expanded density, rather than inventing a second
  preset engine.
- **Living Contact**: bounded local 48-entry event/owner-assertion ledger with
  export; physical_verified is always false in automatic records. It is NOT
  proof of Samsung caller identity, Galaxy AI integration or model execution.
- **Creative Intake**: owner-approved Android Share/picker for PNG, JPEG, WebP,
  PDF or plain text (<=2 MiB, at most 12 copies), copied to private JM files with
  SHA-256. Owner can export an original after integrity verification or explicitly
  delete the local copy. No background scanning or provider API access. Source
  files remain LOCAL ONLY and are NOT in JSON configuration exports.
- **Custody**: existing UsbBridge configuration now carries an optional
  independently validated jm_extensions snapshot: pending Living Home CP07
  return, applied/replay fingerprint history, contact ledger and intake metadata.
  The same SharedPreferences commit as SessionDeck / Return Points stages the
  imported extension fields. Legacy backups without jm_extensions do not
  falsely claim to restore these newer bodies and leave current extension fields
  untouched. External original media bytes never move with JSON.

### Source authority / safety / physical gate
- No extra Android permissions; document access only through explicit Android
  grants. Bixby can launch the existing app on the owner's Samsung (Contact 001,
  owner report). Bixby internal tab voice discovery and the v1.0 APK on Fold are
  **NOT TESTED** until separately observed by the owner.
- No local ML Kit / Gemini Nano invocation and no Bixby Automation Studio
  capsule are included in this v1.0 candidate. They are separate experimental
  providers, not phantom native features or replacements.
- Do not uninstall or clear the v0.9 app to install a debug-signed v1.0 APK.
  Verify signing certificate compatibility, preserve app-private sessions, then
  test physical cold/warm shortcut, Share and Return Point operations.
- Native unit/source checks, signed APK compilation, generic emulator regression,
  negative, replay and source-drift tests gate promotion. Syntax PASS is not
  runtime PASS. Generic Android is not a physical Samsung Fold Ding.

**Recover → inherit → improve → test → compare → Ding → promote → preserve.**


## JM Companion Doors CP01 — optional external-app launch (26 October 2026)

**Additive descendant of protected v1.0 PR #445**; keeps the same native package,
versionCode, configuration schema, permission list, ProjectShelf, Intake, Contact,
Return Point and Living Home CP07 approval gate. Contact 003 PR #447 is a separate
Bixby/navigation branch and is **not** silently merged or overwritten here.

- Open ROOT → **JM COMPANIONS** for eight owner-tapped HTTPS doors: JM Estate,
  GitHub, ChatGPT, Gemini, Google Drive, Gmail, Dropbox, Microsoft Copilot.
- Each destination has a fixed ID and exact HTTPS host. Before leaving the app,
  the owner explicitly approves the handoff; Android may use the website or an
  installed app. No automatic launch on reopening, no arbitrary incoming intent,
  no password/token transfer, no provider API access and no modified APK.
- The JM entry is first-party; every other destination is explicitly labelled
  **EXTERNAL**. Provider branding/identities remain their own. The existing
  Android Share intake remains opt-in and unchanged.
- A source-level Python test checks the allowlist, confirmation, inherited
  entry points and zero-permission manifest. Native compile and generic emulator
  checks must complete separately; real Samsung Fold contact remains HOLD.
- This is a usable navigation integration and a future connector mounting point,
  **not proof of authenticated GitHub Apps, Google OAuth, OpenAI API, file
  synchronisation or end-to-end service workflows.**
- Do not install/upgrade over existing owner's APK without verified signing
  compatibility. No uninstall, wipe, automatic promotion or permission change.


## JM Companion Return CP02 — source/receipt/cooperative contact (26 October 2026)

**Additive descendant of Companion Doors CP01 draft PR #488; independent from
the Bixby Contact 003 branch, original v0.9 owner build and v1.0 ancestor.**
No new Android permissions, app ID, version or private content transfer.

- Owner-confirmed external ACTION_VIEW requests use the already-established
  `JMContactV1` 48-entry bounded evidence ledger. A receipt records
  `COMPANION_<DOOR>` / `ANDROID_VIEW_DISPATCH` **after** Android
  accepts a launch request. It says provider work/results **UNVERIFIED** and
  `physical_verified=false`; it is not an OAuth/API/session success claim.
- After an app is opened, JM's companion room is eligible for ordinary
  `onPause`/cold-reopen continuation, including tab 12, without auto-launching
  the provider. No external-app data is monitored or pulled automatically.
- The owner can enter the *existing* native creative-intake room for opt-in
  Android Share reception, or the existing Living Contact room to review/export
  receipts. Neither original subsystem is forked or replaced.
- New generic Android emulator probes must check actual touch entry, dialog
  cancel, owner-approved ACTION_VIEW, bounded receipt, unchanged project and
  Return Point data, cold return to same JM room, and source-intake navigation.
- A successful Android intent dispatch means only an OS-level request was
  accepted; provider launch rendering, account sign-in, API access, actual
  external edits, physical Samsung Fold/Bixby recognition, and owner acceptance
  remain **HOLD** until separate authenticated/device proof.
- Exact installed Samsung APK signing compatibility remains unknown. Do not
  install, uninstall, reset, force update, or promote production from CI.


## JM Companion Share CP03 — owner-approved two-way source path (26 October 2026)

**Additive descendant of CP02, not a new app or duplicated SessionDeck.**
Reuses the existing local saved project/session checkpoint from `ProjectShelf`
and `SessionDeck`. Refuses revision 0, empty saved work, unsaved drafts,
oversized outbound text (>5000 characters), changed project or revision.

- The owner taps **Share saved JM checkpoint** from JM COMPANIONS, sees an
  explicit complete text preview and privacy warning, and can CANCEL without
  leaving JM. A separate **Choose recipient** approval invokes the *Android
  Sharesheet*; the owner, not JM, chooses the recipient app and account.
- No background sending, silent email, account impersonation, new permission,
  provider token or read of an external app.
- Saved share requests are distinguished from actual delivery using the
  inherited bounded `JMContactV1` receipt: `COMPANION_SHARE` /
  `ANDROID_SHARE_REQUEST`, physical_verified=false, recipient unverified.
  Receipts never contain private note text.
- Generic Android emulator gate must exercise preview, CANCEL with no receipt,
  owner Sharesheet request with bounded receipt, unchanged project/recovery
  state, and cold reopen. Opening a chooser is not proof of receiver selection,
  successful email/post/upload, physical Samsung execution or provider API.
- Existing inbound Android Share → JM Intake remains independently owner
  approved. Together the two routes form a bounded *user-mediated* content
  roundtrip; no automatic provider synchronization or two-way API claim.
- Never install over the current owner APK until actual signing compatibility
  and preservation of owner data are established.


## JM Fold Ultra Companion Work Loop CP04 — owner-directed Share → JM Project

**Source lineage:** protected CP01/CP02/CP03 FLAZ in JM Estate Library,
CP03 frozen source `42a5193770cb3e84ac466990b26c4ffae955ce64`.
This is a NEW additive branch, NOT a modification of the frozen carrier,
not a Samsung release and not a replacement for existing JM bodies.

- Original Android ACTION_SEND/text/plain inbox now explicitly offers:
  **Discard**, **Add to JM Root** (original operation), or
  **Draft in JM project** (new). Its source is visibly UNVERIFIED.
- The draft option reuses **ProjectShelf** and **SessionDeck.draft**, not
  `SessionDeck.commit`. It appends a bounded provenance-labelled source
  to the selected project's local UNSAVED working note, preserving prior
  draft text. It refuses >2,500-char inbound material, >4,000-char result,
  an absent selected project, changed checkpoint revision, selected project
  or concurrent note/next-action/phase drafts.
- The owner sees source excerpt, selected project and version before
  choosing. Successful receipt opens the existing Session room; the owner
  must independently review and SAVE a checkpoint later. Inbound
  Livng Home CP07 typed JSON still uses its original guarded receipt
  route and is not reinterpreted as a free-form note.
- New exact-head native source + Android emulator test covers Share
  dialog rendering, real owner touch to accept draft, no checkpoint/root
  write, cold reopen without duplicate intake, oversize rejection.
- The generic full-body emulator audit additionally checks monotonic
  saved onboarding stages and visible headings, compensating for scroll
  offsets and bounded Pixel Launcher obstructions via actual touch only.
  This does not fabricate a device Ding or conceal a failed full run.
- A second independent Android emulator job isolates CP04 intake from
  the inherited longer return-point regression; both scopes are
  reported distinctly. CI success is not physical Samsung acceptance,
  provider OAuth/API execution or proof of delivery.
- Zero new Android permissions; app ID/version stay unchanged. No
  install, uninstall, update, wipe or promotion without owner's actual
  installed signing-certificate compatibility and data preservation.
