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
