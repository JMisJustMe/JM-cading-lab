# JM APP//COMMONS CP03 — Native Android recipient

A *separate Android application*, not an update to JM Fold Ultra.

- Package ID `com.jmisjustme.appcommons` (never `com.jmisjustme.foldultra`).
- Authoritative original `JMOriginalStructures.java` is inherited **byte-for-byte** from recovered Fold Ultra CP01; protected origin is unchanged.
- `JMAppCommonsCapsule.java` inherited unchanged from tested CP02.1; SHA-256 asserted by verifier.
- Actual native editor, inspect/diff, owner-reviewed saved snapshot, owner-selected Storage Access Framework JSON import/export, guarded readback and cold restart.
- Imports adopt **only the independent app's UNSAVED draft** after digest verification, preview and explicit consent. Native saved snapshot, other apps' project data and the imported object's metadata remain unmodified.
- Exports write full source only after separate owner consent and explicit destination selection; never use a broad storage permission or send credentials.
- Invalid stored state is held, not overwritten. Owner may explicitly reset the *separate* app's store.
- Static repo/Gradle verification is not Android runtime proof. CI native assemble + emulator smoke must PASS before an Android Ding; physical Samsung Fold remains open regardless.
- Android APK debug signer/installation is TEST-ONLY; do not overwrite or merge a protected owner app.

Compile: `cd app-commons-cp03/android && gradle --no-daemon :app:assembleDebug`

Receipts scoped separately: JVM source, Android compilation/APK, generic emulator, physical device.
