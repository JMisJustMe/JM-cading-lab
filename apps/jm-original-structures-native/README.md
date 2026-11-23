# JM Original Structures — Native Android Carrier CP08 (candidate)

First-party offline package `me.jmisjustme.originalstructures` is a SEPARATE Android app ID from JM Fold Ultra. It does not replace or migrate any installed application. The sole embedded app body is the exact CP07.3 protected HTML (SHA-256 `9404f44492bad6c0c6ca25b7b6b86927a9ffc43a22565a1fa2dd99dc5c05e522`).

The local native layer uses Android WebViewAssetLoader stable HTTPS-like asset origin, Android app-private AtomicFile with SHA-256 roundtrip, an owner-selectable Restore, Verify and portable JSON Export via Android Storage Access Framework. No INTERNET permission. It does NOT execute external MCP bodies or arbitrary user-provided code; independent browser Web Worker retains its CP07.3 claim ceiling.

Experimental constraints: running Web Worker and IndexedDB on physical Samsung Fold are NOT independently proven yet; sign/release compatibility is NOT established. Android debug build must not be installed over prior JM Fold Ultra app. Native recovery is per this app ID and uses safe user approval for divergent states; JSON import/export is separate from app binary. Debug signing is test-only.

Local Gradle entrypoint: `gradle --no-daemon :app:assembleDebug`.