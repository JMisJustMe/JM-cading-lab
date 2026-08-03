# Crown32 Android v1.3 — Cross-Operating-System Reproducibility

## Status

DRAFT · ACTIVE ENGINEERING · NO v1.3 DING YET

## Frozen base

- branch: `agent/crown32-android-cross-runner-repro-v1-2`
- head: `fb0301eb5056bd2c2dfafcd0c785bc17d1430b4b`
- status: Android Ubuntu cross-runner reproducibility v1.2 frozen, locked and anchored

## v1.3 target

Each sovereign Android body must be independently constructed on:

- Ubuntu 24.04 / Linux;
- macOS 14 / Darwin.

The paired proof requires:

- exact unsigned APK byte identity across operating systems;
- exact source and unsigned-APK inventory identity;
- equivalent normalized signed payloads under separate ephemeral certificates;
- exact package, launcher, SDK, identity, permission and exported-component surface;
- Android v2-or-newer signature proof on both operating systems;
- two genuinely different operating-system families;
- matching logical Gradle, Java and Android tool versions;
- platform-specific executable hashes recorded separately rather than falsely equated;
- no key transfer between operating systems;
- no private key in any artifact.

## Gate order

1. v1.2 lineage lock and adapter contracts;
2. Cading independent Linux build;
3. Cading independent macOS build;
4. Cading cross-OS pair comparison;
5. twenty shard jobs: ten shards × two operating systems;
6. 100-body cross-OS federation seal;
7. independent artifact verification;
8. Freeze → Lock → Anchor only after the full Ding.

## Honest boundary

This increment does not claim Windows reproducibility, exact same-key signed bytes across operating systems, production signing-key custody, Play Store publication or physical-device proof.

**No Ding, no claim.**
