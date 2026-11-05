# JM Universal Fractal Capsules · CP02 interoperable carrier

**Addition** to JM UFC CP01 and existing JM Coding Estate / LLM / Cross-Client Capsule / host-adapter infrastructure. CP01 `JMUFC01\n` Scrypt/ZIP remains unchanged; CP02 `JMUFCW02\n` browser carrier adds full original-byte portability on Android/browser/Windows. A new carrier is a distinct transport of the same schema, not a new claimant to the source body's identity.

## Two working interfaces

- `jm_ufc.py`: unchanged original CP01 Scrypt/ZIP Python CLI, up to 256 MiB bounded.
- `jm_ufc_web.py`: new WebCrypto-compatible Python CLI, up to 16 MiB. AES-256-GCM and PBKDF2-HMAC-SHA256 250,000 iterations, independent salt and nonce, authenticated associated data `JM-UFC-WEB02-AES256GCM`.
- `web/index.html`: standalone HTML/JS studio. No backend or third-party libraries. It can preserve the byte content of chat text and multiple uploaded media/doc/source files, record parent relationships, make/download fully encrypted `.jmufc` plus separate receipt, verify/decrypt a shared archive, navigate its ancestry, and download exact original files. On supporting mobile browsers it can invoke the native share sheet.
- `jm_ufc_custody.py`: additive opt-in copy-and-verify runner for **already encrypted** `.jmufc` and their independent sidecar receipts to a mounted custody directory. It never moves/deletes/replaces originals. It does not require or read decryption passwords.

## Use (real owners: do not use demonstration passphrases)

1. Load `web/index.html` through localhost or HTTPS, including from an Android/desktop browser. For HTTPS ensure you trust the host serving this static file. Browser WebCrypto requires a secure context. Browser app storage keeps only optional owner UUID and next-number if you press *Remember this ID*. Passwords never persist.
2. Create a private passphrase with at least 12 characters, supply conversation notes and original files, **Create encrypted capsule**. Save `.jmufc` and its separately downloaded `.receipt.json`, store the passphrase securely, and verify with a receiving client.
3. Or use Python: `python jm_ufc_web.py export --spec example.spec.json --archive original.jmufc` then `python jm_ufc_web.py verify --archive original.jmufc --receipt original.jmufc.receipt.json` then `python jm_ufc_web.py import --archive original.jmufc --receipt original.jmufc.receipt.json --dest restored-unique`. Set the `JM_UFC_PASSPHRASE` environment variable for CLI. Both Python and browser can read each other's CP02 encrypted files.
4. For custody, create a dedicated outbox and a **mounted** Google Drive/OneDrive destination. Execute `python jm_ufc_custody.py --inbox /absolute/only-encrypted-outbox --destination /absolute/mounted-cloud/ufc` (Windows paths supported). Run through an existing scheduler if desired after independent target testing. It verifies ciphertext SHA-256 and readback; it does **not** verify the passphrase or prove the provider has finished its cloud upload.

## Clipboard and privacy

The browser offers an encrypted `JMUFC-TRANSFER/2:` text/plain fallback, and attempts a richer clipboard MIME type where allowed. Compatible recipients can paste it. Ordinary messaging apps may strip rich MIME content, so the original encrypted `.jmufc` file is the source of truth. Clipboard carries encrypted bytes only. The 750 KiB clipboard ceiling is stricter than the 16 MiB file limit. "Invisible manifest" is not guaranteed for arbitrary third-party apps.

## Identity and ancestry

Local owner UUID, personal #N, capsule UUID, per-item UUID, SHA-256 and parent edges. Browser may begin with personal #1; it does not solve account-wide concurrency or verified author identity. Parent references are declared historical relationships, not digital signatures. Physical cross-owner sharing requires human consent and still needs signed trusted identity/permissions for claims beyond checksum integrity.

## Verification boundaries

- Python CP01 + CP02 + custody automated suite: inspect real test results for the current commit.
- Browser validation must be contacted on a real browser with file export/import. Android viewport emulation does not qualify as real Fold8 contact.
- No API-level ChatGPT/Gemini automatic conversation extraction, no AI vendor-controlled clipboard ingestion, no auto consent, no background provider Drive/email sync, and no cross-owner signed identity until separately implemented and tested.
- Never merge protected PRs, modify primary JM LLM model source, or publish private source files as a side effect.
