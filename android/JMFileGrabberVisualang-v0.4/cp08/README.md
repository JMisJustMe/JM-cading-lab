# JM File Grabber × Visualang — Native CP08 Security & Recovery Forward Candidate

**Parent:** exact, independently protected v0.4 Magic Return source ZIP, Java SHA-256 `a2c4d0cc0c39b9fb691ba2bccc3c3585e9be04caaa66ad336a3372382a898dd6`.

**Scope:** A real Java native-side descendant, not HTML pretending to be a native app. The package keeps the Android app ID, original Visualang HTML, native SAF multi-file and folder-tree acquisition, X-Form/TraceBox, and existing private-vault metadata. Native Java is changed by the builder script; the protected v0.4 ZIP remains unchanged.

Changes:
- WebView accepts only the packaged `https://jm.app/index.html` top-level document and verified SHA-addressed `https://jm.vault/body/{sha}` payloads. Unknown requests are denied, never allowed to fall through to network while `JMNative` is exposed.
- Native exact-byte restore SHA-checks every claimed file, holds missing/corrupt/tampered records without deleting owner evidence, and signals verified results separately from holds.
- Receipts are public metadata only (no persisted content-provider URI); distinguish ledger totals from verified byte counts.
- Incoming temp file cleaned on any copy failure; same-digest stored assets are reused rather than copied twice when already in the committed index; successful copy readback is SHA-verified; long new filenames are bounded.
- Original app package ID retained, versionCode incremented 4→5. **APK update compatibility/signature continuity is not assumed.**

## Reproduce source and tests

1. `python build_cp08.py` after the parent ZIP is materialised to the path in the script.
2. `javac -d classes cp08_native_source/app/src/main/java/com/jmisjustme/filegrabbervisualang/NativeVaultTruth.java NativeVaultTruthTest.java`
3. `java -cp classes NativeVaultTruthTest` (34/34 PASS in this run).
4. `python qa_native_cp08_browser.py` (4/4 inherited browser fallback load/layout PASS in this run).
5. Android build: `gradle :app:assembleDebug` in a provisioned Android SDK/Gradle environment **not available in current local container**. Android compile/install, owner Fold SAF/restart and INTERTAP native receiver proof remain **HOLD** until performed.

## Security boundaries

- `JavascriptInterface` is exposed to frames by Android's WebView APIs; these origin restrictions materially reduce reachability but are **not a formal security audit**. Do not load untrusted HTML within this privileged WebView.
- The native HTML payload remains unchanged and does not incorporate the CP06/CP07 browser bridge; native handoff to other apps is not yet proven.
- This CP08 source is an **additive forward candidate** and does not replace protected v0.4 or close owner-device Ding.