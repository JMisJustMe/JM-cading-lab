# Crown32 Android v1.4 — Linux-Windows Reproducibility

## Status

DRAFT · ACTIVE ENGINEERING · NO v1.4 DING YET

## Frozen base

- branch: `agent/crown32-android-cross-os-repro-v1-3`
- head: `9b4a2a8252f697d958b4b61ce1c68b40d73620fc`
- status: Android Linux-macOS reproducibility v1.3 frozen, locked and anchored

## v1.4 target

Each sovereign Android body must be independently constructed on:

- Ubuntu 24.04 / Linux;
- Windows Server 2022 / Windows.

The paired proof requires:

- exact unsigned APK byte identity across operating systems;
- exact source and unsigned-APK inventory identity;
- equivalent normalized signed payloads under separate ephemeral certificates;
- exact package, launcher, SDK, identity, permission and exported-component surface;
- Android v2-or-newer signature proof on both operating systems;
- two genuinely different operating-system families;
- matching logical Gradle, Java and Android tool versions;
- platform-specific executable hashes recorded separately rather than falsely equated;
- Windows-native batch-command and path handling;
- no key transfer between operating systems;
- no private key in any artifact.

## Gate order

1. v1.3 lineage lock and Windows adapter contracts;
2. Cading independent Linux build;
3. Cading independent Windows build;
4. Cading Linux-Windows pair comparison;
5. twenty shard jobs: ten shards × two operating systems;
6. 100-body Linux-Windows federation seal;
7. independent artifact verification;
8. Freeze → Lock → Anchor only after the full Ding.

## Honest boundary

This increment does not claim exact same-key signed bytes across operating systems, production signing-key custody, Play Store publication or physical-device proof.

**No Ding, no claim.**
