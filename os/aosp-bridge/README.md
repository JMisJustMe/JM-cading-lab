# JM AOSP Bridge v0.1

**Project:** JM Android-derived OS  
**State:** real-contact bridge implemented; full AOSP compile/boot is **not yet claimed**.

## What this body does

This bridge routes the next Android-derived OS contact through recovered JM bodies instead of treating AOSP as a detached foreign build:

```text
AOSP source upstream
  -> OS_CODING service/permission route
  -> OneBody IR
  -> TheoC contract
  -> official AOSP Repo/Soong build carrier
  -> Cuttlefish boot contact
  -> JM receipt evaluation
  -> DING only if returned evidence passes
```

The bridge deliberately preserves **MESH != MERGE**:

- JM owns/governs the route, contracts, meaning, preflight, proof and claim boundary.
- AOSP remains the declared open-source platform upstream.
- Repo/Soong/Ninja/AOSP prebuilts remain declared upstream tooling in this stage.
- Linux/Cuttlefish/KVM/Node remain host carriers at this stage.
- No claim of external-toolchain independence is made.

## Current AOSP contact

The route follows the current public AOSP setup:

- manifest alias: `android-latest-release`
- manifest URL: `https://android.googlesource.com/platform/manifest`
- Cuttlefish target: `aosp_cf_x86_64_only_phone-aosp_current-userdebug`
- build: `m`
- boot return: `launch_cvd --daemon` + `sys.boot_completed=1`

The bridge records the currently observed release family as `android17-release`, but uses the stable `android-latest-release` alias for execution.

## Hard host gate

The full source/build route is intentionally blocked unless the contacted host meets the current AOSP baseline encoded by this bridge:

- Linux x86_64
- >= 400 GB free disk
- >= 64 GB RAM
- glibc >= 2.17
- Repo >= 2.4
- Node available for the current JS-native JM control body

If the gate fails, **no real AOSP build commands are emitted or executed** by the runner.

## Proof locally

```bash
node os/aosp-bridge/selftest.mjs
```

This proves bridge logic only. It does not compile AOSP.

## Real host preflight

```bash
node os/aosp-bridge/run-jm-aosp-contact.mjs
```

This detects the contacted host, writes a preflight receipt and, only on a passing host, emits:

```text
jm-aosp-receipts/jm-aosp-real-contact.generated.sh
```

## Start the heavy real contact

On a deliberately chosen capable Linux host:

```bash
node os/aosp-bridge/run-jm-aosp-contact.mjs --execute
```

That route performs Repo init/sync, pins the manifest, sources `build/envsetup.sh`, selects the current Cuttlefish phone target, runs `m`, locates built images, launches Cuttlefish, waits for ADB boot completion and captures the build fingerprint.

**NO DING, NO CLAIM:** a generated script, a successful sync, or even a completed build command is not automatically the final boot Ding. The returned evidence must be passed into `evaluateAospContactReceipt()`.

## Claim ceiling

Even a successful bounded AOSP build + Cuttlefish boot does **not** prove:

- real-phone hardware support;
- production release readiness;
- CTS compatibility;
- driver breadth;
- production signing;
- independence from AOSP;
- independence from Linux/KVM/Cuttlefish;
- complete native compiler/self-host sovereignty.

Those remain later contacts.
