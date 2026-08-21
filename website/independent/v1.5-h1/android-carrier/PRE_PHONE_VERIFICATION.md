# JMISJUSTME Living Estate v1.5 H1 — pre-phone verification

Status: `ASSISTANT_SIDE_PASS__PHYSICAL_DEVICE_CONTACT_OPEN`

## Frozen identities

- Exact H1 HTDOCS package: `9df5439dcec6e4aa1ddad8e835a6d12fe97f460d35d42984046fcbbd1c48a0bc`
- Frozen root `index.html`: `28983ccf02a3c7bb50107a8a059bc0ccd0eda0b1356ef93d48ba8203bbb418f1`
- Public website body mutated: no

## Carrier checks

- Recovery donor and package identity preserved.
- Exact ZIP hash is checked before extraction.
- Extraction is staged in private storage and blocks canonical path escape.
- Entry-count and total-unpacked-size limits are enforced.
- Existing installed body is preserved until the verified staging body can be promoted.
- Import and extraction run off the Android UI thread.
- Frozen root-index identity is checked after extraction and again before every local launch.
- Local content is served only at `https://jm.local/`; file/content access is disabled.
- Unsupported external URL schemes are blocked; ordinary web, mail, and telephone links leave through Android.
- Private imported body is excluded from Android backup.
- Physical install/open/import/touch/relaunch/offline contact remains open. No physical Ding is claimed.

`Recover before rebuild` · `Mesh != merge` · `No Ding no claim`

