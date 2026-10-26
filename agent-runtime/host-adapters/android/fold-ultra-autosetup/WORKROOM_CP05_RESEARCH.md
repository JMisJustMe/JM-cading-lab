# JM Fold Ultra CP05 — researched capabilities → actual implementation

26 October 2026. Operation JMOP-04189f14c73463c8f27b6002.
Protected source: CP04 `c55e4a4058fb5963883055657671d5ede2ab244c`, PR #497. CP05 is an additive native activity inside the original Android application, not a replacement launcher. Original ProjectShelf and SessionDeck execute in this receiver. The other Current-64 coding identities were considered as a capability field; no execution/integration claim is made merely for their names. JM LLM Core, RouteOS, CadenVM and Build Mesh retain independent authorities.

## Research and decisions

| Available mechanism | Primary reference | CP05 consequence |
|---|---|---|
| Android Storage Access Framework | https://developer.android.com/training/data-storage/shared/documents-files | Real UTF-8 document import and export through the user's chosen provider. Export compares written bytes with readback. No broad storage permission. |
| SQLite transactions | https://developer.android.com/training/data-storage/sqlite | JM-owned project-bound document store, draft persistence, saved revisions, bounded history and recovery. This is document versioning, not Git. |
| Android WebView | https://developer.android.com/develop/ui/views/layout/webapps/webview | Local reading preview and explicit executable HTML preview. No native JS bridge, local-file/content access, DOM storage or network. Script execution is optional and untrusted scripts can still hang a renderer. |
| Android TextToSpeech | https://developer.android.com/reference/android/speech/tts/TextToSpeech | Queue chosen document only to an engine-reported installed offline voice; stop on pause; shutdown on destroy. Actual audible voice remains device-dependent. |
| Standard MIME email draft | https://www.rfc-editor.org/rfc/rfc5322 and https://www.rfc-editor.org/rfc/rfc2045 | Local `.eml` composition with UTF-8 base64 body and header-injection rejection. No SMTP sending or account access. |
| Google LiteRT-LM | https://ai.google.dev/edge/litert-lm/android | Relevant next model runtime candidate. Kotlin/native dependencies, exact model licence, format, download/storage and actual Fold performance must be resolved before claiming inference. Not implemented by CP05. |
| ML Kit text recognition | https://developers.google.com/ml-kit/vision/text-recognition/v2/android | Relevant OCR candidate, with bundled and downloaded-model routes. Model/library footprint and receiver/permission requirements must be reconciled before native integration. Not implemented by CP05. |
| Git repositories | https://git-scm.com/docs/git | Actual Git objects, index, refs, transport and authentication are a separate capability. CP05 revision history is not called Git or GitHub integration. |

Android framework capabilities are used through their published interfaces. No proprietary app source or user accounts were copied. The native Workroom UI, document logic, project relation, bounded text tools and workflow are JM-first-party code in this descendant.

## Actual working surface

ROOT → **JM WORKROOM / Write · Code · Files**. Existing session also has a Workroom button.

- Create notes, Markdown, HTML, JSON, JavaScript source and local MIME message drafts.
- Edit up to 262,144 UTF-16 characters; draft updates debounce for 350 ms and flush on navigation/pause. Visible status distinguishes pending save from a persisted draft.
- Documents have an original ProjectShelf project ID. Cross-document name/content search is local and literal.
- Save a numbered revision atomically; recover history as a draft, preserving monotonically increasing committed revision numbers. Up to 32 revisions within 1,048,576 retained source characters per document; 128 documents. Files are in app-private SQLite, not implicitly in the older setup JSON backup. Export valuable documents explicitly.
- Import UTF-8 text up to 1 MiB of bytes / 262,144 characters. Invalid encoding, NULs and oversized source refuse. Original provider file remains independent.
- Export a chosen document using ACTION_CREATE_DOCUMENT, close the writer, then compare exact UTF-8 bytes on readback. A refused/unreadable provider is not labelled verified.
- Format JSON objects/arrays, compare draft vs saved line positions, literal replace with preview and one tool-edit undo, word/line/codepoint counts, SHA-256 of text bytes.
- Reading preview escapes code. Executable preview requires an explicit Run touch; raw JavaScript files are source text unless placed in an HTML script body.
- Read-aloud selects a voice reported offline for the current language; no microphone or Internet permission.
- Compose a local `.eml`; no sending. Export it for use in a mail application when desired.
- Bring the current inherited SessionDeck draft into a new Workroom document. Explicitly append a bounded document to an existing SessionDeck draft with project/revision/prior-note comparison at approval. Committed sessions and Return Points are not overwritten.

## Proof and boundaries

34 inherited offline checks and the full inherited prelaunch contract passed on local host. The new actual-Java portable checks require a JDK and run in native CI (local JRE has no javac). An independent real-Android lane creates an explicit fresh-emulator `ready=true` test fixture; this is not evidence of onboarding success. It uses actual UI controls for document creation, typing, save, format, history/recovery and SessionDeck transport, and inspects native SQLite post-state. Narrow/wide and cold process recovery are separate assertions. The original full-body and CP04 Share lanes remain intact.

Await exact-head completed CI for compilation, APK/signature/permissions and Android outcomes. File picker lifecycle, audible speech and physical Samsung Fold acceptance require their own contact; do not infer them from source or compile. No local LLM/OCR inference, authenticated provider API, live mail delivery, Git repository operation or whole-Estate integration is claimed.

No merge, installed owner-app update, uninstall, reset, public deployment or canonical current-pointer promotion is performed. Existing ephemeral debug signatures are not evidence of compatibility with the owner's installed APK.
