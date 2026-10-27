# JM Unique Bodies CP09 — real offline cold custody (isolated)

This is an **additive CLI** for the original CP07/CP08 SQLite Atlas. It
preserves the existing Atlas, Fold portal, original JS donors, native
ContactBand/GlyphBody source and network authentication unchanged.

## Real CLI route

Run from `services/jm-unique-bodies-cp08` on a host where this
directory and the original source modules exist. No separate dependency
beyond Python 3.11+ and Node 20+ for genuine donor execution tests.

```sh
python3 cp09_custody.py backup /local/private/current-atlas.sqlite3 /offline/OWNER_CP09_ATLAS.zip
python3 cp09_custody.py verify /offline/OWNER_CP09_ATLAS.zip
# After source loss, recover to a NEW independent file. Never overwrite an existing owner database.
python3 cp09_custody.py restore /offline/OWNER_CP09_ATLAS.zip /local/private/recovered-atlas.sqlite3
```

- The backup uses SQLite's native online backup API, so WAL-backed
  databases and live writing processes are not backed up by copying
  half-completed filesystem pages.
- The capsule contains a complete standalone `atlas.sqlite3` and exact
  SHA-256 manifest. Every operation checks SQLite `integrity_check` and the
  *existing* CP07 receipts, event records, recipient states and hash-chain.
- Archive layout, file size, exact SHA and original committed contact counts
  are checked. Forged/tampered/oversized/foreign ZIP contents fail closed.
- Restore creates a **new** destination atomically and refuses to overwrite
  any existing file, including a sovereign unrelated SQLite database.
- Original reference copies remain independent even with identical bytes.
- The archive contains full potentially **private** Atlas records in plaintext.
  It is mode 0600 on compatible POSIX filesystems; owner must protect,
  encrypt for transit and retain separately. Never upload it to public
  GitHub, paste it into chats or treat it as an impersonal cache.

## Strict deployment / user-authority boundary

This provides a **working local, portable offline custody and independent
restore path**, not an automated remote backup. A Render Free container
using `/tmp` cannot preserve this capsule across restarts by merely
creating it on that same container. The archive must actually leave the
ephemeral host for separately authorised durable owner-controlled storage.

There is **no new HTTP endpoint**, no wider MCP tool grant, no cross-app
database mount, no tokens or credentials handled by the CLI, no mutation
of a live Render service and no claim of automatic cloud restoration.

The existing JM Market Survivor PostgreSQL service is a separate sovereign
recipient and is not commandeered as CP08's database.

## Hard proof requirement

Run `python3 -m unittest -v test_cp09_custody`. It executes original
source-derived native CP07 contact, atomic SQLite commits, actual backup,
source deletion, independent cold restoration, idempotent replay, new
events after restore, tamper rejection, original-source integrity refusal,
purpose-bearing no-overwrite cases and CLI subprocess evidence.

**Crown only:** CP09 local archive/restore. Actual durable third-party custody,
remote CP08 backup transport, Render redeploy survival and physical Fold
contact are separate unresolved gates. NO DING NO CLAIM.
