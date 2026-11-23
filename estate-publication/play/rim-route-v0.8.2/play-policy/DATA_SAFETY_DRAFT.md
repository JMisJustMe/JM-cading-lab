# JM Rim Route v0.8.2 — Data safety working draft

**Evidence base:** exact source SHA-256 `86d30d56ce9a1e54d1d0eb981fb7a2cf4ee6d125fccaa77cbd8478d555246a63` plus the prepared Android carrier source.

## Current pre-Console answer
Static inspection of the exact v0.8.2 game body found no external scripts, `fetch`, XHR, WebSocket, geolocation, camera, microphone or notification routes. The prepared Android carrier adds no third-party SDK and deliberately omits the Android `INTERNET` permission.

On that evidence, the current release candidate is designed to:
- **collect no user data through the developer/app backend;**
- **share no user data with third parties;**
- contain **no advertising SDK;**
- contain **no analytics SDK;**
- require **no account/login;**
- store gameplay/progression locally on the device using WebView local storage.

## Final declaration gate
Before answering Google Play's Data safety form, re-run dependency/manifest/source inspection on the exact AAB uploaded to Play. If the release carrier changes or any SDK/service is added, this draft must be re-evaluated.

Device/OS-level backups, crash reporting supplied by the operating system, Play services behaviour outside the app's own code, and Play Console telemetry must not be confused with developer-added collection routes. Answer the Play form against Google's definitions and the exact shipped app.
