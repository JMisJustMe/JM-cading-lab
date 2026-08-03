# Crown32 Android v1.2 — Cross-Runner Reproducibility

## Status

DRAFT · ACTIVE ENGINEERING · NO v1.2 DING YET

## Frozen base

- branch: `agent/crown32-android-release-assurance-v1-1`
- head: `84e3a37545085f7f8751ec1e9b3e966f52db4307`
- status: Android release assurance v1.1 frozen, locked and anchored

## v1.2 target

Each sovereign Android body must be independently constructed on:

- Ubuntu 24.04;
- Ubuntu 22.04.

The paired proof requires:

- exact unsigned APK byte identity across runners;
- exact source and unsigned-APK inventory identity;
- equivalent normalized signed payloads under separate ephemeral certificates;
- exact package, launcher, SDK, identity, permission and exported-component surface;
- Android v2-or-newer signature proof on both runners;
- two distinct operating-system identities;
- pinned normalized Gradle, JDK and Android tool identities;
- no key transfer between runners;
- no private key in any artifact.

## Gate order

1. regression and negative-gate contracts;
2. Cading independent build on both runners;
3. Cading cross-runner pair comparison;
4. twenty shard jobs: ten shards × two runners;
5. 100-body cross-runner federation seal;
6. independent artifact verification;
7. Freeze → Lock → Anchor only after the full Ding.

## Honest boundary

This increment does not claim exact same-key signed bytes across runners, non-Linux operating systems, production signing-key custody, Play Store publication or physical-device proof.

**No Ding, no claim.**
