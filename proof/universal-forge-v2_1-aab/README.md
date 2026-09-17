# JM Universal Forge v2.1 — Native & Store Proof Lane

This branch proves the official Android build lane that the offline forge cannot honestly simulate:

- compileSdk / targetSdk 36;
- AGP 8.13.2 with Gradle 8.13;
- explicit Android runtime-permission bridge for camera, microphone, location and notifications;
- release-signed `.aab` built by the Android Gradle Plugin;
- `bundletool validate`;
- universal APK derived from the AAB and independently verified;
- no owner private key committed.

The workflow creates an ephemeral proof key. It proves the binary route, not the user's permanent production identity or Play acceptance.
