# JM Phone Commander v0.1 — Termux host-adapter descendant

**Authority:** HOST ADAPTER, not a new JM sovereign body. Inherits root `AGENTS.md`, `agent-runtime/JM_SOVEREIGN_AGENT_RUNTIME_CONTRACT_v0_1.json`, and `agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md`.

**Keeper:** CHANGE THE PLUG, NOT THE BODY. Source identity ≠ adapter ≠ carrier ≠ owner device. No Ding No Claim.

This adds an Android/Termux execution route while the laptop is off. It does **not** replace Desktop Commander or claim a remote agent can connect to arbitrary Termux shells. It reuses the existing JM runtime, GitHub connector, Termux already proven on the owner's Samsung, and a private GitHub issue mailbox.

## Phone setup (existing Termux)

Use the same `~/JM_WORKSPACE/JM-cading-lab` directory you already established. Never overwrite it. In Termux:

```bash
pkg install -y python git gh
mkdir -p "$HOME/JM_WORKSPACE"
# If JM-cading-lab does not already exist:
git clone --depth 1 https://github.com/JMisJustMe/JM-cading-lab.git "$HOME/JM_WORKSPACE/JM-cading-lab"
# If it already exists, leave the working tree untouched.
python "$HOME/JM_WORKSPACE/JM-cading-lab/agent-runtime/host-adapters/android/phone-commander/jm_phone_commander.py" status
```

When the PR is merged, update an existing *clean* checkout with `git pull --ff-only`. If a local working tree contains edits, do not overwrite them; inspect differences first. For an immediate trial before merge, take the files from the PR branch or the standalone bundle.

If you already have `gh auth login` working, **reuse it**; otherwise run `gh auth login` interactively in Termux. Never paste a GitHub token into ChatGPT, an issue, source code, or a commit. The mailbox only works with a token allowed to read/write issues in the pre-existing **private** `JMisJustMe/JM-ai-studio-surface` repo. `GH_TOKEN`/`JM_PHONE_GH_TOKEN` are supported as session-only alternatives (no plaintext token files). With `gh`, authorise the account locally on your phone.

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

- `python -m unittest discover -s agent-runtime/host-adapters/android/phone-commander -p 'test_phone_commander.py' -v` — **28 local fixture tests passed on 28 Oct 2026**. Run again on the repository/CI.
- No existing file overwritten, ancestor or agent core replaced, host-adapter registry promoted, or Desktop Commander configuration changed.
- `JM Phone Commander v0.1`: **FUNCTION (local fixture) proof only**. Phone physical device command, mailbox round trip, private issue receipt, owner-device write, reboot persistence and Codex separate-host contact remain **OPEN** until independently exercised.
- Normal-chat access to GitHub and JM Build Mesh was directly observed on 28 Oct 2026; not a blanket plugin/access persistence guarantee.
- If this descendant becomes verified, donate only reusable host-adapter/permission/continuity patterns to the JM Blueprint Plant; test each recipient separately.