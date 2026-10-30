# JM M001 — CP34.1 Storage & Library MCP contact

**Identity:** Additive, local-only MCP stdio host adapter to existing JM M001 Storage Steward. It is not a new Library, Source Ledger, Owner Vault, or external data store. CP13/CP31 remain independent retirement-review gates; this adapter has no deletion operation.

## Scope

- storage_contact_status: report local root configuration without exposing private paths.
- custody_compare: read exactly one file from each of two separately mounted local snapshot roots and compare size, SHA-256, optional JSON validity, expected SHA-256, and Dropbox 4 MiB block content_hash.
- MCP 2025-06-18 stdio JSON-RPC: initialize, tools/list, tools/call and ping.
- Never sends file bytes, private paths, bearer credentials or secrets to a remote host. Never writes to source or recovery locations. Maximum file size: 16 MiB per side.

## Owner-host use

Start the existing JM source file JM_M001_STORAGE_LIBRARY_MCP_CP34.py from the storage-admission directory using Python 3.11+ with flags --library-root /authorised/library-snapshot and --recovery-root /authorised/cold-snapshot. These are separate local directories recovered through separately authorised provider routes. Send newline-delimited JSON-RPC over stdin. For custody_compare, provide library_file and recovery_file relative filenames. For JSON specify format=json. Optional expected_sha256 and recovery_dropbox_content_hash supply additional digest checks.

## Truth boundary

Nothing scans the whole Library; the host chooses exact file paths. Both roots are operator-supplied host assertions, NOT authenticated provider provenance. EXACT_BYTES_MATCH proves identical local bytes, NOT full provider restoration, native ChatGPT Library ID recovery, current-head authority, quota savings, runtime playability or public MCP deployment. FORMAT_HOLD includes saved ServerBusy XML and invalid JSON. Mismatches, missing files and invalid digests remain HOLD. All responses prohibit retirement, claim zero native mutations and claim zero quota savings.

## Tests

Run: python3 agent-runtime/host-adapters/storage-admission/JM_M001_STORAGE_LIBRARY_MCP_CP34_TESTS.py

The new GitHub Actions workflow verifies synthetic fixtures and a real local subprocess JSON-RPC exchange. No private JM originals are embedded in the public repository or test fixtures.

Remaining separately held: actual owner-configured host mounts, private source-vs-offsite byte contact through this adapter, secure client registration, provider-origin authentication, independent restore/reentry, true storage-meter measurement, CP30 original native-ID Restore and any production deployment. No automatic retirement, persistent data copies or new storage provider.
