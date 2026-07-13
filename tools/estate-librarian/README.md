# JM Estate Librarian v0.4.1

**Handheld Professionalisation Pass**

A surface-layer continuation of the Android-proven **JM Estate Librarian v0.4**. The v0.4 engine and proof boundary remain frozen; v0.4.1 keeps the same read-only analysis body while replacing the phone-first experience around it.

## Primary handheld route

**Scan → Review → Archive**

- **Scan:** permissioned files or Android folder-tree intake with visible native scan progress.
- **Review:** portrait-native file cards, explicit recommendations and human-controlled decisions.
- **Archive:** destination gate, ready/blocked states, archive manifest and removal-readiness receipt.
- **Advanced Evidence:** the full technical register, hashes, version families and safe jobs remain one layer deeper.

## Professionalisation additions

- Clean first screen with three obvious jobs.
- Mobile file cards instead of forcing the wide register into the primary route.
- Side-scroll/fixed bottom navigation on handhelds.
- Visible busy, empty, success, warning and blocked states.
- Live Android scan-progress bridge.
- Android save-success/save-failure feedback.
- Android Back returns to Home before leaving the app.
- Branded Android/PWA icon and upgraded application identity.
- v0.4 checkpoints remain import-compatible.

## Safety boundary

The Librarian reads only files the operator selects. It does **not** delete, move, rename, merge, overwrite or silently crown source files. A machine suggestion never becomes a human decision by itself.

## Routes

- `OPEN_FIRST_JM_ESTATE_LIBRARIAN_v0_4_1.html` — direct-open standalone body.
- `web/index.html` — served/PWA route.
- `android/` — Android Studio / Gradle project.
- `.github/workflows/build-apk.yml` — standalone GitHub Actions APK builder.
- `receipts/` — functional, visual, publication and Android proof receipts.

## Proof state

- Handheld/desktop web functional QA: **PASS**.
- Mobile containment at 390 × 844: **PASS**.
- Demo duplicate/version families: **PASS**.
- Human decision cards and Archive readiness route: **PASS**.
- Console/page errors: **0**.
- APK compilation: **PENDING GitHub Actions build**.
- Physical Android v0.4.1 Ding: **PENDING user-device proof**.

The parent v0.4 already owns the first physical Android installation/runtime proof. v0.4.1 must earn its own device Ding after compilation.
