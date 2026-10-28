# JM Phone Commander — CP09 bounded physical-host proof

**Date:** 2026-10-28 (UTC)  
**Proof class:** `HOST_CONTACT` for **Termux + private GitHub Issue mailbox**, not blanket Android permissions or a completed Android APK.  
**Authority:** Evidence of the original JM sovereign runtime carried through a thin Android/Termux adapter; `HOST ≠ BODY ≠ OWNER`.  
**Parent standard:** `agent-runtime/host-adapters/JM_HOST_ADAPTER_CONFORMANCE_STANDARD_v1_0.md`.

## Recovered evidence — actual owner phone, not CI simulation

The owner operated Termux on the Samsung phone. Normal ChatGPT opened authorised command issues in the already-existing **private** `JMisJustMe/JM-ai-studio-surface` repository. The phone fetched each issue, returned a bounded receipt as the authenticated owner, and closed it. Receipts were independently read back from GitHub, not inferred from screenshots or synthetic tests.

| Private issue | Physical consequence | Bounded state |
| --- | --- | --- |
| [#1](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/1) | `status`: Android, Python 3.13.13, Termux detected; device executor used the original JM repo | PASS |
| [#2](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/2) | `route`: sovereign core exited 0; 12 selected of Current-64 coding identities (52 not selected); output truncated at 12k, not a claim of executing 12 separate apps | PASS |
| [#3](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/3) | `git-status`: exit 0, clean tracked state, actual source branch identified | PASS |
| [#4](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/4) | `read-file`: untruncated existing core README exactly matched GitHub source, SHA-256 `2629bab7d09182c86bea9adc1a346a4685003a259a4d5917718db261639ef9bd` | PASS |
| [#5](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/5) | `read-file .git/config`: refused with `HOLD: PROTECTED_PATH` | PASS (negative security case) |
| [#6](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/6) | Phone README original SHA-256 captured: `fdd88244694ae0c5f7fedb1dbc33519350d296036adc1c955fc502d40976f31c` | PASS |
| [#7](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/7) | Owner-authorised, hash-checked file edit. New SHA/readback: `14d8ac60599a1a82667f42c6f84469407173038673310b647b8e4810abc469e5`. Backup *path* returned | PASS (edit) |
| [#8](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/8) | Owner-authorised exact restoration; old SHA to original SHA; readback matched | PASS (restore) |
| [#9](https://github.com/JMisJustMe/JM-ai-studio-surface/issues/9) | Owner-invoked `~/jmphone` launcher, protected source re-read, original byte-for-byte text and SHA exact match with #6; issue closed. Second mailbox poll returned no queued events | PASS (launcher & repeat contact) |

**Critical distinctions:** `#9` establishes repeatable invocation without manually reconstructing `ROOT` or `SCRIPT`; it does **not** certify Android reboot startup, sleep/wake survivability, a genuinely fresh Termux process after force-stop, or continuously running unattended service. `#7` and `#8` show reported backup paths, **not independent backup-file-content inspection**. The phone working-tree README and the newer GitHub branch README were not byte-identical during CP07; the reversibly edited phone file was restored to the *phone's own* original SHA, without overwriting newer GitHub source.

## Off-device tests (separate from physical proof)

- `JM Phone Commander — bounded host adapter conformance`: green GitHub Actions; deterministic fixture tests, syntax, source checks and opt-in launcher invocation.
- `JM Host Adapter Conformance`: green; no sovereign core replacement.
- `JM Sovereign Agent Android + Codex Adapters`: green build and repository-function proof; NOT actual Android APK install or a live Codex-host command.
- Original GitHub source, private mailbox and persistent Library snapshot are distinct carriers, not interchangeable source authorities.

## What is closed versus still open

**FLAZ complete at bounded scope:** physically demonstrated manual status, routing, Git inspection, source reading, guarded source edit and exact revert, protected-path refusal, private mailbox receipts, and simple manually invoked `~/jmphone` command.

**Separate device/host gates (not part of this bounded closure):** audit contents of phone backup files; harden GitHub CLI credentials stored in Termux app-private plaintext; opt-in Termux:Boot setup and actual Android reboot test; power/battery survival of a polling daemon; OS-backed token-store availability; exact independent Codex and Work invocation tests; any deployed cross-service propagation. Do not silently enable autorun or claim constant reachability.

**Security:** Only the fixed private owner mailbox is accepted; allowlisted commands only; no arbitrary remote shell; source edits require a local short-lived owner grant, an expected SHA, an existing allowed file and a confirmation string. No credentials, device filesystem secrets or private issue bodies may be copied into the public coding repository.

**Law:** CHANGE THE PLUG, NOT THE BODY. NO DING, NO CLAIM. A bounded phone PASS never crowns a different host.
