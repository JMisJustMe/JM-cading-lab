# JM Android Forge v1.4 — Laptop Workshop

**Authority:** Theodore Benjamin Scott / JM / JMISJUSTME  
**Roles:** Konengineer · Co-developer · Kodifier

## Purpose

This body moves building responsibility onto the laptop. Android remains a tester, player, run device and companion carrier; it is not forced to remain the entire workshop.

## Windows first

From a local copy of `JM-cading-lab`, double-click:

```text
apps/jm-android-forge/OPEN_JM_ANDROID_FORGE.cmd
```

That starts a local-only PowerShell workshop at:

```text
http://127.0.0.1:3232/apps/jm-android-forge/
```

It does not install Node, Gradle, Java, Android SDK, packages or engines.

## Laptop workshop capabilities

- full-width three-pane project workshop;
- direct laptop-folder opening and writing where the browser supports the File System Access API;
- drag-and-drop and ordinary file-import fallback;
- HTML, CSS, JavaScript, JSON, Markdown, text and SVG editing;
- live preview with relative CSS and JavaScript inlined for the preview body;
- keyboard routes:
  - `Ctrl+S` — save;
  - `Ctrl+Enter` — run preview;
  - `Ctrl+Shift+B` — request APK build;
- portable `.jmforge.json` project export;
- direct-open single HTML export;
- source-state receipt export;
- local build console and tool-status panel;
- one-click local APK route when an existing JDK and Android SDK build-tools are detected.

## APK route

The local builder does not use Node or Gradle. It uses installed Android SDK and JDK tools directly:

```text
HTML PROJECT
→ JAVAC
→ D8
→ AAPT2
→ ZIPALIGN
→ APKSIGNER
→ APK
→ SHA-256 RECEIPT
```

Tool:

```text
tools/Build-JMAndroidForgeApk.ps1
```

The builder:

- requires a root `index.html`;
- applies a 32 MiB default project ceiling;
- stages temporary build files outside the repository;
- writes completed APKs and receipts to `JM_ESTATE_WORKBENCH/70_ANDROID_FORGE_BUILDS` when that workshop exists;
- otherwise uses `Documents/JM_ANDROID_FORGE_BUILDS`;
- creates or reuses one local debug signing key under the output folder;
- verifies the APK signature;
- does not install the APK onto a device;
- does not publish or deploy it;
- does not claim a Ding from construction alone.

## Browser-only fallback

The public or direct-open HTML body remains useful without the local bridge:

- edit imported text project files;
- run the live preview;
- export one direct-open HTML;
- export a portable project bundle;
- export a source-state receipt.

It cannot overwrite arbitrary laptop files or invoke the APK builder from a hosted page. That is a browser security boundary, not missing JM intent.

## Linux and macOS companion launchers

`open-jm-android-forge.sh` calls the same PowerShell bridge through `pwsh` when PowerShell Core is already present. It does not install PowerShell or Android tools.

## Claim boundary

```text
WORKSHOP LOADED ≠ APK BUILT
APK BUILT ≠ APK INSTALLED
APK INSTALLED ≠ RUNTIME QA PASSED
DEPLOYED PAGE ≠ DING
```

The laptop becomes the workshop. Mobile twins remain companion carriers. Source identity and receipts remain separate from delivery claims.
