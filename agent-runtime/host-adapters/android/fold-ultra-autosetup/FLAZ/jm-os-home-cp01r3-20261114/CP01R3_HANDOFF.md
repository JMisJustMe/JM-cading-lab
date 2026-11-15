# JM OS HOME CP01R3 — bounded BIAT / FLAZ / YARR

Date: 2026-11-14 (Europe/London). Source: JM-cading-lab / jm/fold-ultra-v14-widget-integration-20261114.
Existing JM Fold Ultra source and separate Widget v1/v2/v3 packages are preserved. This is a separate, opt-in Android HOME QA activity, **not** a new independent firmware, AOSP build, replacement of Samsung HOME, or product release.

## Build receipt
- Package: `com.jmisjustme.foldultra.jmoshomeqa`
- Version: `1.4.0-JM-OS-HOME-CP01R3` (versionCode 20)
- Signed QA APK: `JM_OS_HOME_CP01R3_QA.apk`
- SHA-256: `07b6cd2ad05bfadc2890a3e10cdf1c7954256630d469d2ed5b087e200ae03ab9`
- Android API 36 SDK; build resource/link/javac/d8/zipalign/signature/badging/permissions checks PASS.
- No additional Android permissions; existing JM production signer not used; private QA debug key retained on GroundZeroJM.
- Candidate APK installed successfully over Wi-Fi ADB on physical Fold8 `SM-F976B`.
- Original main manifest and production package untouched. Original Home Lab and v2/v3 widgets remained installed.

## Runtime scope (ADB; owner not touching screen)
- Native JM OS Home activity launched on the actual Fold8.
- Native screen observed with original Home Lab entrance, app browser, Android widget picker and HOME settings door.
- Dedicated JM widget picker presented six **distinct** providers: v1/v2/v3 × Compact/Expanded.
- Selecting the v3 Compact provider reached Android's **Allow access to widget content?** system permission screen, naming JM OS Home Candidate and JM Fold Ultra. Back/Cancel, not Create, was used: **no widget binding permission granted**.
- Samsung `com.sec.android.app.launcher` remained the default HOME before and after.
- Read-only device-source smoke: 15/15 PASS; original Home Lab scope tests: 6/6 PASS; Widget v3 source validation PASS.
- Note: separate UIAutomator all-in-one regression runs were timing-sensitive/inconsistent (some dumps captured another foreground view). They are not counted as full PASS. Direct bounded ADB UI observations and the system permission prompt are independently recorded here.

## Unfinished gates
- **Owner acceptance:** the owner still needs to launch JM OS Home Candidate, approve/deny widget placement on-device, test interactive widget controls, then decide whether to select it as default Home.
- Full refresh/persistence of approved widget bindings remains unverified; physical finger/hinge/orientation regression and external CI remain OPEN.
- AOSP firmware, kernel/bootloader changes, root and flashing were never attempted.
- No cloud push, branch merge, app-store publication, original overwrite, or default HOME change.

## Custody
Source: `app/src/jmOsHomeQa/` and additive `jmOsHomeQa` build type in `app/build.gradle`.
Local rebuild tool: `tools/_jm_os_home_cp01_build.py` (the CP01R3 output is immutable; increment version/output path for new work).
Read-only future gate: `tools/test_jm_os_home_cp01r3_installed.py`.
This candidate inherits Fold Ultra and does not supersede the separate widget bodies. Keep one source authority; do not silently merge or crown.

Execution provenance: the CP01R3 additions were implemented through ChatGPT's authorised tool access on GroundZeroJM from JM's direction and recovered original sources. They do not retrospectively change the origin of JM's creations or certify estate-wide authorship.
