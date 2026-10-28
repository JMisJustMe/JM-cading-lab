# JM Phone Commander v0.1 — Termux host-adapter descendant

**Authority:** HOST ADAPTER, not a new JM sovereign body. Inherits root `AGENTS.md`, `agent-runtime/JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json`, and `agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md`.

**Keeper:** CHANGE THE PLUG, NOT THE BODY. Source identity ≠ adapter ≠ carrier ≠ owner device. No Ding No Claim.

This adds an Android/Termux execution route while the laptop is off. It does **not** replace Desktop Commander or claim a remote agent can connect to arbitrary Termux shells. It reuses the existing JM runtime, GitHub connector, Termux already proven on the owner's Samsung, and a private GitHub issue mailbox.

## Phone setup (existing Termux) — recover actual path first

**Observed on Samsung, 28 October 2026:** Python 3.13.13 and Git 2.54 were already installed; `gh` 2.95 was installed successfully. The earlier assumed `~/JM_WORKSPACE/JM-cading-lab` directory did **not** exist; the 20 October phone runtime instead ran from `~/downloads`. A working on-phone repository checkout path was never verified. Never assume a chat source path is present on the Android device.

Run the following **only after Termux returns to a `~ $` shell prompt**. Do not paste subsequent commands while `pkg install` is still executing: installation processes may consume shell input.

```bash
set -e
ROOT="$HOME/JM_WORKSPACE/JM-cading-lab"
if [ ! -f "$ROOT/agent-runtime/jm_agent_runtime.py" ]; then
  FOUND="$(find "$HOME" -maxdepth 7 -type f -path '*/agent-runtime/jm_agent_runtime.py' -print -quit 2>/dev/null || true)"
  if [ -n "$FOUND" ]; then ROOT="${FOUND%/agent-runtime/jm_agent_runtime.py}"; fi
fi
if [ ! -f "$ROOT/agent-runtime/jm_agent_runtime.py" ]; then
  if [ -e "$ROOT" ]; then
    echo "HOLD: existing destination is not a verified JM repository; left untouched"
    exit 1
  fi
  mkdir -p "$HOME/JM_WORKSPACE"
  git clone --depth 1 --branch feat/jm-phone-commander-v0-1-20261028 https://github.com/JMisJustMe/JM-cading-lab.git "$ROOT"
fi
SCRIPT="$ROOT/agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py"
if [ ! -f "$SCRIPT" ]; then
  git -C "$ROOT" fetch origin feat/jm-phone-commander-v0-1-20261028
  git -C "$ROOT" show origin/feat/jm-phone-commander-v0-1-20261028:agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py > "$HOME/jm_phone_commander.py"
  SCRIPT="$HOME/jm_phone_commander.py"
fi
python "$SCRIPT" --workspace "$ROOT" status
if ! gh auth status >/dev/null 2>&1; then gh auth login; fi
python "$SCRIPT" --workspace "$ROOT" mailbox
```

This searches for an existing JM runtime tree first, preserves all existing local projects/downloads, and only shallow-clones the repo if no compatible checkout is found. No source changes, Git pushes, owner edit grants or arbitrary shell actions are performed by the status-only mailbox test. The test issue is `JMisJustMe/JM-ai-studio-surface#1`, created by the connected owner's GitHub account. Successful physical execution must create a returned receipt in that private issue and close it; an open issue with no comment is still HOLD.

Once the real checkout path is known, use that path in all subsequent Termux commands. `JM_WORKSPACE` can be set to an existing working tree to avoid future path assumptions. Never overwrite a local working tree. When this PR is merged, inspect local changes before using `git pull --ff-only`.

## Commands (execute the exact existing JM core, not a copied agent)

Set a convenient alias in Termux:

```bash
alias jmphone='python "$HOME/JM_WORKSPACE/JM-cading-lab/agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py"'
jmphone status
jmphone route "coding runtime"
jmphone git-status
jmphone read-file agent-runtime/README.md
```

Optional localhost API (not exposed on Wi-Fi or the Internet):

```bash
jmphone serve --port 8765
# Token is stored at ~/.config/jm-phone-commander/local-token with file permission 0600.
# Local authorised clients only: Bearer <local-token> and no Origin header.
```

Optional **private mailbox**, which allows an authorised GitHub issue created from ChatGPT Work, normal chats, or Codex to be picked up *when the phone is running*:

```bash
jmphone mailbox                 # one-shot
jmphone mailbox --loop          # polls every 90 seconds while running
```

A mailbox request is an issue in private `JMisJustMe/JM-ai-studio-surface` with:

- Title beginning exactly `JM PHONE COMMAND: `
- Created by `JMisJustMe`
- Body containing **only** a JSON object using `JM.PhoneCommand/0.1` and an allowlisted command.

Example issue body:

```json
{"schema":"JM.PhoneCommand/0.1","command":"status","args":{}}
```

On the phone, a private, at-most-once ledger is written **before execution**. After execution, it comments a bounded receipt and closes the issue. If the phone crashes between claim and recording a result, it returns `CRASH_BEFORE_RESULT_RECORDED_NO_REPLAY` instead of silently re-running an edit. A crash between writing the GitHub comment and updating the local ledger may produce a second comment, but never a second executed command. Review receipts in the private GitHub repo. This is a GitHub-authorised command mailbox, not a perpetual connection or access bypass.

### Owner-editable file route

`read-file` reads a UTF-8 file under the existing JM repo; it never reads outside it or any hidden/protected path. Editing is **source-hash checked, existing-file only**, atomically backed up in local state and verified after the write. No arbitrary shell commands. Before source edits, the device owner grants a short-lived edit window *locally*:

```bash
jmphone grant-edits 30
```

A remote edit issue must include `confirmation: OWNER_APPROVED_CODE_EDIT`, the existing relative `path`, exact `expected_sha256` of its original bytes, and base64 UTF-8 `new_text_b64`. Repeated edits using a stale SHA return `CONFLICT_SOURCE_HASH_CHANGED`. This does not automatically `git commit`, push, merge, deploy, or overwrite outside the allowed workspace. Scripts and source changes are **not** executed as part of edits.

## Boot, Android constraints, battery

`Termux:Boot` can start programs after reboot, but is optional, requires the add-on signed compatibly with Termux, and must be launched once by the phone owner. The bundled `start-jm-phone-mailbox.termux-boot.example` is opt-in and does **not** call `termux-wake-lock` by default, respecting battery life. Android background process limits can still stop the mailbox; a loop running now is not a permanent availability guarantee. Use manual `mailbox` for reliable on-demand execution. Termux documentation: https://github.com/termux/termux-app and https://github.com/termux/termux-boot.

## Evidence and no-regression checklist

- `python -m unittest discover -s agent-runtime/host-adapters/android/phone-commander -p 'test_phone_commander.py' -v` — **30 off-device fixture tests passed in GitHub Actions run #40771978217 on 28 Oct 2026**. Run again on the repository/CI.
- No existing file overwritten, ancestor or agent core replaced, host-adapter registry promoted, or Desktop Commander configuration changed.
- `JM Phone Commander v0.1`: **HOST_CONTACT demonstrated on physical Samsung/Termux** for status, existing core route, git-status, file-read, protected-path refusal, owner-granted hash-checked edit and exact restore. Independently read-backed private receipts #1–#8. Separate Android reboot/auto polling/backup-content/Codex host gates remain **OPEN**.
- Normal-chat access to GitHub and JM Build Mesh was directly observed on 28 Oct 2026; not a blanket plugin/access persistence guarantee.
- If this descendant becomes verified, donate only reusable host-adapter/permission/continuity patterns to the JM Blueprint Plant; test each recipient separately.
## ARCHIVED CP02 snapshot (historical, superseded by live owner proof)

> This CP02 snapshot recorded an earlier time when live phone access was OPEN. Its statements below are historical, **not the present proof state**. See CP08 below.

## CP02 owner-device contact checkpoint — no new root, no duplicated issue

**Source authority:** existing PR #577 is DRAFT, not merged or deployed. The existing private mailbox has a single read-only owner-issued test at `JMisJustMe/JM-ai-studio-surface#1`; **do not create another test command**. Phone/device and independent Work/Codex proof are still OPEN.

For an **unmerged** branch test on Termux without changing or overwriting the original JM checkout, use a distinct worktree:

```bash
pkg install -y python git gh
cd "$HOME/JM_WORKSPACE/JM-cading-lab" || exit 1
git fetch origin feat/jm-phone-commander-v0-1-20261028
git worktree add --detach "$HOME/JM_WORKSPACE/JM-phone-commander-probe" FETCH_HEAD
python "$HOME/JM_WORKSPACE/JM-phone-commander-probe/agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py" --workspace "$HOME/JM_WORKSPACE/JM-phone-commander-probe" status
```

If the probe worktree already exists, **do not overwrite it**. Reuse or inspect its checked-out revision first. If the original checkout doesn't exist, preserve the existing workspace and follow the normal first-clone instructions above. Do not merge or use `git reset --hard` to prepare a probe.

After a successful phone-local status and a locally authorised `gh auth login` (if needed), run the queued read-only mailbox test once:

```bash
python "$HOME/JM_WORKSPACE/JM-phone-commander-probe/agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py" --workspace "$HOME/JM_WORKSPACE/JM-phone-commander-probe" mailbox
```

Inspect the **private** issue #1's bounded receipt. Do not publish tokens, local files, or private issue contents. A GitHub comment/closure without verified phone execution is not physical proof. The owner must separately approve each edit grant, and a read-only status success never authorises file editing.

### Per-surface independent continuation acceptance

| Gate | Receipt required | Current proof |
| --- | --- | --- |
| Normal ChatGPT | Direct GitHub + native Build Mesh response in ordinary chat | Observed 28 Oct 2026 (separate from host proof) |
| Off-device source | Immutable Git commit, GitHub readback, actual CI test output | 30/30 PASS at `befc52ad987cceb8c19d7f754befe3652bccfda3`, run #40771978217 |
| Physical owner phone | Local Termux `status` reports actual device platform and workspace | OPEN |
| Private mailbox | Existing issue #1 is picked up by owner's phone; receipt, close, independent readback | OPEN |
| ChatGPT Work | Independently invoke authorised read-only GitHub/Build Mesh and verify same source commit | OPEN |
| Codex | Independently invoke authorised adapter or exact protected source and verify same commit | OPEN |
| Owner edits | Locally granted, hash-matched test edit → backup → readback → reload; no stale-hash bypass | OPEN |
| Recovery | Owner-controlled restart or reboot with custody preserved, no duplicate command execution | OPEN |
| Production propagation | Owner-approved release, deployed readback, drift check | OPEN |

No gate is promoted from a different environment's PASS; connector availability does not equate to OAuth, device control, persistent shared auth, or deployment. The private mailbox is opt-in and works only when the phone is running. Reusable JM BLUEPRINT PLANT adapters are **dependent on separately tested descendant-specific permission and host routes**.

## CP08 — actual Samsung contact and re-entry (current)

**Physical scope with independently recovered private GitHub receipts:** #1 status; #2 12/64 JM runtime routing; #3 Git clean tracked checkout; #4 exact source UTF-8 and SHA-256; #5 protected path HOLD; #6 phone README fingerprint; #7 owner-authorised temporary source edit with backup path and hash readback; #8 exact reverse edit and matching original SHA. Original phone README SHA-256 restored: `fdd88244694ae0c5f7fedb1dbc33519350d296036adc1c955fc502d40976f31c`. This is not blanket command authority.

**Simplify future Termux entry:** the new `jmphone-reenter.sh` is a *thin host launcher*, not a new command service or a replacement for the sovereign agent. It discovers an existing JM tree, runs the existing Python commander and accepts the same bounded command arguments. It never creates a checkout or reads private GitHub credentials by itself.

If the current Termux session still has `$ROOT` from successful tests, install the launcher one time (this **does not** update the tracked JM files):

```sh
git -C "$ROOT" fetch origin feat/jm-phone-commander-v0-1-20261028
git -C "$ROOT" show origin/feat/jm-phone-commander-v0-1-20261028:agent-runtime/host-adapters/android/phone-commander/jmphone-reenter.sh > "$HOME/jmphone.new"
sh -n "$HOME/jmphone.new"
if [ -e "$HOME/jmphone" ]; then
  echo "HOLD: existing ~/jmphone found; compare before replacing"
else
  mv "$HOME/jmphone.new" "$HOME/jmphone"
  chmod 700 "$HOME/jmphone"
fi
```

In a **fresh** Termux session thereafter, use `sh "$HOME/jmphone" status` or `sh "$HOME/jmphone" mailbox`; no previous `$ROOT` or `$SCRIPT` variables required. For manual foreground polling use `sh "$HOME/jmphone" mailbox --loop` only when desired and stop with Ctrl+C. It does **not** guarantee background longevity; Android may suspend or kill Termux. A new-session physical proof must be separately observed before marking that gate PASS.

**Security:** GitHub CLI on Termux warned that its authorised token is stored in plaintext, inside Termux's app-private configuration. Do not paste or commit it. Owner may inspect filesystem permissions locally (`ls -ld ~/.config/gh; ls -l ~/.config/gh/hosts.yml`), and should not enable unattended boot until acceptable credential storage, privacy and battery behaviour are reviewed. Setting mode 0600 limits file reads by other Unix users but is **not encryption**.

**Outstanding gates:** independent post-restoration readback; exact backup-content verification; fresh-session launcher; restart/reboot state continuity; explicit owner-approved optional Termux:Boot; encrypted/OS-backed credentials if available; exact Codex and external platform routes. Do not promote those without real receipts.

## CP10 — owner-free source closure, phone offline

The user deliberately shut down Termux after verifying private issue #9. **No background process is currently being claimed.** The only permissible off-device completion is repository review, additive CI, source-controlled host conformance and optional deployment tooling; no phone configuration can be edited from GitHub while its runner is stopped. The latest verified manual route is `sh ~/jmphone status` and `sh ~/jmphone mailbox`. The latter checks an authenticated private owner mailbox only when actively run.

**Repository merge policy:** merge source/CI under JM non-regression only when all required checks pass; merging does not update the copy already installed on Samsung. To take a new revision, the owner must choose a local Git fetch/pull when the device is powered and authorised. No hidden auto-update or source overwrite is performed.

**Credential review (owner-only):** `gh auth login` on Termux reported credentials saved in plaintext. The GitHub account can review/revoke that phone's CLI authentication independently. Until the device's stored credential has acceptable permissions and short-lived/scoped access, do **not** install the opt-in Boot template or start a perpetual mailbox loop. `chmod 600` may limit ordinary Unix-user access but does *not* encrypt token content, and these instructions do not imply a system-keystore was installed. No token is ever to be sent to chat or committed to source.

**Boot template:** `start-jm-phone-mailbox.termux-boot.example` now invokes the proven existing launcher, uses `umask 077` for state/log files, and deliberately avoids a wake lock. It is inert source until the owner explicitly installs Termux:Boot and opts in. Background battery survival and real restart after a force stop/reboot remain OPEN.

**Proof distinction:** `JM_PHONE_COMMANDER_CP09_OWNER_PROOF.md` is the durable host-contact evidence. The independent Android APK remains TRANSPORT. Codex CI is only a repository function check; exact Codex host access and platform-wide plugin permanence are separate acceptance gates. The earned abstraction may seed JM BLUEPRINT PLANT only as a **capability- and permission-gated parent pattern** (bounded commands, authority separation, private receipts, hash-safe editing, re-entry). No other platform receives Phone Commander permissions automatically.
