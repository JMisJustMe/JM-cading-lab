# JM GONG CP07 — full-chain public receipt concordance

**Parent:** GONG v1.0 CP06 First Complete Edition, publicly merged into `JMisJustMe/JM-cading-lab` main on 2026-10-27.  **Author:** JM / Theodore Benjamin Scott.  **State:** additive security/correctness hardening, not a replacement for CP03–CP06 and not a separate product front door.

`gong_chain_guard_cp07.js` checks the existing public CP03 source advisory, CP04 evidence-scope request, CP05 family-candidate plan and CP06 local parse-check report **together**. It rejects mismatched commit references, detached hashes, changed paths, risks, file kinds, routed check obligations, counts and forged flags claiming private/device authority. Its final checksum is deterministic and **not a digital signature**.

CLI: `node tools/gong/gong_chain_guard_cp07.js --cp03 cp03.json --cp04 cp04.json --cp05 cp05.json --cp06 cp06.json --json result.json`.

Test: `node --test tools/gong/tests/gong_chain_guard_cp07.test.js`. The suite uses a temporary real Git repository for original/descendant source changes and negative alterations of each stage.

No protected Fold screenshots or private evidence registry go into public GitHub. The path hint is not sovereign identity. No new Fold physical PASS, no release/merge approval, and no automatic test of game functionality are asserted. The separate private JM Estate CP07 child performs **complete multi-risk enumeration** on actual recovered sovereign source files. Parent code remains intact.

**Acceptance hold:** dedicated CP06 GitHub Actions workflow remains uninstalled and a new physical Fold check is required only when genuinely new device-sensitive behaviour remains unresolved. See issue #536. This CP07 PR does not bypass that workflow restriction or modify existing mandatory gates.