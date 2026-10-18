# JM FOLD ULTRA v0.8 — Project Session Continuity

**Lineage:** This is the same native app, preserving Git ancestors v0.1–v0.7, and the established JM Project Shelf. No duplicated games, lyric bodies or music programs; those remain separate authoritative artifacts.

## Native paired-screen session
Every registered JM project can retain one current checkpoint: a working note (max 4,000 characters), a stage (IDEA / BUILD / TEST / POLISH), a next-contact instruction (max 220 characters), updated time and monotonic revision.

- **RESUME PROJECT** on JM's main surface opens that project's one native session, regardless of compact/expanded width.
- Draft note, next action and stage persist locally as the user types/selects; deliberate **CHECKPOINT** advances revision and clears the draft for that project only.
- Project-specific notes do not replace the general JM root note and do not edit the project files themselves.
- The project identity comes from the recovered JM shelf; unbound published URLs do not stop the local session from existing.
- Local configuration exports, USB owner-prepared backups and owner-approved restores carry the full session collection and active project ID. Imported v0.8 session data is validated and stale drafts cleared before display.
- The owner can launch the project's existing public route separately, without claiming the external program's internal progress was captured.

## Laptop ↔ Fold contact
A trusted, ADB-authorised laptop with official platform-tools and **debuggable JM APK** can inspect an owner-prepared configuration export:

```sh
python3 jm_fold_usb_bridge.py session-show JM_FOLD_BACKUP.json jm-games-house
```

It can propose a checkpoint without embedding private notes in command arguments:

```sh
python3 jm_fold_usb_bridge.py session-update jm-games-house \
  --expected-revision 0 --phase TEST --note-file ./my_jm_notes.txt \
  --next "Resume match"
python3 jm_fold_usb_bridge.py receipt
```

That request is staged as PENDING. The Android app displays the complete proposed text, selected project, stage and expected revision and requires **APPLY/REJECT**. An older revision is rejected; the phone re-checks revision at commit, preventing an overwrite when state changed while the dialog was open. Only a committed change can produce an ACCEPTED receipt. Staged private notes are never placed in the ADB shell-command fallback used for short, nonsensitive requests.

## Wholebody inherited
- Owner-first, five-stage opening; same JM root across compact SOURCE and expanded WORKFIELD
- Galaxy capability discovery and native Android Settings, Gallery/Camera handoffs
- One-body project reference shelf, registered games/music/build/estate bodies
- USB owner-approval contact, preflight, JSON recovery, four JM setup plans, independent layout densities
- Zero requested Android permissions, no network server, no device rooting, no silent launcher/One UI manipulation

## Proof gates
1. Static prelaunch contracts, offline Python unit tests for note bounds, orphan sessions, stale revisions and private-note transport.
2. Android APK signed/package/zero-permission evidence.
3. Generic Android emulator narrow and wide launch, reopen, staged PLAYTEST plan, simulated owner APPLY state checks, followed by staged session update, simulated owner APPLY and persisted session revision/content checks.
4. **Physical Samsung Fold owner contact remains OPEN.** Generic emulator simulation neither proves hinge transitions nor any Samsung Galaxy AI integration.

## Privacy and safety
Snapshots contain working notes in plaintext. Export only through explicit owner commands, protect laptop copies and remove stale development backups deliberately after recovery testing. ADB gives a trusted laptop powers beyond JM; keep debugging disabled outside development. No Oppo migration or unapproved destructive operations.

Source: JM-cading-lab draft PR #371. Recovery before rebuild. ONE BODY → ONE HOT authority → verified off-site recovery.
