# JM APP//COMMONS CP03 — independent native + strict portable app

**Ancestor:** CP02.1 SHA-256-checked, protected. **Owner contact:** CP01 web visual contact preserved, CP03 owner-device HOLD.

## What is new
1. Add `parseStrictJSON` and `receiveCapsuleJSON` to the *portable JM core*: rejects duplicate JSON object keys, floats, exponential numbers, integer overflow and malformed JSON before any custody decision. Plain `JSON.parse` loses duplicate-key evidence.
2. Same strict boundary for pasted/document-file import and local stdio MCP frame parsing. No silent authority escalation or outgoing network transport.
3. **Separate native Android app** — ID `com.jmisjustme.appcommons`. Uses the recovered **exact original** Fold `JMOriginalStructures.java` and CP02.1 `JMAppCommonsCapsule.java` as independent organs, with its own local editor, offline inspector/diff, guarded saved snapshot and owner-approved JSON document import/export. No privileged bridge or provider account.
4. Android native builds and generic emulator runs are gated by GitHub Actions, in a **draft pull request**; original Fold app, Branch CP01 and all existing MCP services remain unchanged.

## Proof classes
- Core and local browser tests prove browser mechanism and controlled adapter behavior, **not** genuine disk persistence under content:// or physical Samsung acceptance.
- Java tool tests establish actual Java parser execution, **not** Android app compilation.
- Android Gradle + emulator jobs separately establish native carrier and native generic touch consequences only when they actually report success.
- APK is test-only with disposable debug signing; no claims of Android update signing compatibility.
- No MCP remote deploy or ChatGPT/Gemini provider host call is claimed.

## Entry points
- `JM_APP_COMMONS_CP03.html` — quick HTML check
- `mcp-stdio.mjs` — 6 local tools
- `android/` — independent Android Activity and unchanged organs
- `android/tools/smoke_android.py` — actual emulator touch test
- `test-strict-cp03.mjs` — strict JSON corpus

No merge, install, deployment or legacy data migration performed automatically.
