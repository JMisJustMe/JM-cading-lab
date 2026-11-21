# JM Universal Fractal Capsules — CP01 (working pilot)

**Additive to JM's existing sovereign-agent runtime / Coding Estate / TraceBox mechanisms.** It does **not** replace JM LLM, AI Studio, Build Mesh, Navigator, existing conversations, GitHub canonical branches, or custody systems. Sources are read-only; export creates a new encrypted archive and receipt; import writes only to a new location.

## What this pilot actually implements

- Permanent random UUID per owner, capsule and item; **each owner may separately use personal #1** without collision.
- Byte-for-byte file preservation for conversations, images, apps, documents, theory notes and any binary media under the bounded pilot limit (256 MiB per capsule); one SHA-256-addressed copy for duplicated identical bytes.
- Ordered item metadata plus local ancestry edges and optional `previous_capsule_id` for branch ancestry. Root SHA-256 binds the canonical manifest, including the content hashes. For a revision, create a **new** capsule ID and record the prior ID, never overwrite an ancestor.
- AES-256-GCM authenticated archive encrypted with password-derived Scrypt key; a separate small public receipt carrying archive hash and root hash. No provider lock-in.
- Verify, import and reconstruct original relative paths and exact source bytes after authenticated decryption and hash verification. Import prevents overwrite and rejects traversal, duplicate paths, ancestry cycles and undeclared payloads.

## Run (Python 3.11+)

Install `python -m pip install -r requirements.txt`. The included `example.jmufc` is **public synthetic data** using only the public demonstration passphrase `PUBLIC DEMONSTRATION ONLY 2026 - NEVER USE FOR PRIVATE DATA`. That passphrase is not suitable for actual owner archives. Put your private passphrase in environment variable `JM_UFC_PASSPHRASE` (not in GitHub, files, logs or CLI arguments). Use a strong unique passphrase and an independent password-recovery route.

```sh
python jm_ufc.py export --spec example.spec.json --archive first.jmufc
python jm_ufc.py verify --archive first.jmufc --receipt first.jmufc.receipt.json
python jm_ufc.py import --archive first.jmufc --receipt first.jmufc.receipt.json --dest restored-first
```

Specification is ordinary JSON:

```json
{
  "owner_id": "1fa98306-badf-496c-9a8e-1a31f1955a15",
  "personal_number": 1,
  "creation_kind": "conversation",
  "items": [
    {"id": "af9162c8-1010-457b-a18e-f306778e3a33", "kind": "conversation", "source": "example/chat.json", "path": "chat/chat.json", "parents": [], "position": 0, "metadata": {"title": "Example chat"}},
    {"id": "8638b151-9d3b-45b7-a0f0-6bd7aa4e79b8", "kind": "image", "source": "example/image.png", "path": "media/image.png", "parents": ["af9162c8-1010-457b-a18e-f306778e3a33"], "position": 1, "metadata": {"message_index": 1, "attachment_index": 0}},
    {"id": "a7f93d20-f306-43b2-a32b-c9c76264168d", "kind": "document", "source": "example/derived.docx", "path": "docs/derived.docx", "parents": ["af9162c8-1010-457b-a18e-f306778e3a33"], "position": 2, "metadata": {"source_message_index": 1}}
  ]
}
```

Use **actual conversation JSON** recording attachment references in message order; the `path`, `position`, `parents` and `metadata` fields preserve an external index, but this pilot does not automatically parse proprietary ChatGPT, Gemini or AI Studio formats. Local UUIDs and cross-capsule relationships are *declared provenance*, not signed ownership evidence.

## Three independent layers

1. **Receipt**: tiny unencrypted file; archive SHA-256, manifest root SHA-256, personal number, pseudonymous owner fingerprint. Useful for independent email receipt custody; not itself a signature or proof of who authored it.
2. **Expandable map**: authenticated `capsule.json` inside encrypted package; order, kind, owner UUID, local ancestry, paths, per-file content hashes. Can be navigated without reading every source body after decryption.
3. **Full encrypted original**: `.jmufc` carries all actual bytes. Without this archive and passphrase (or another full verified copy), the receipt/map cannot recreate originals.

The root is an integrity tree *index*, not a recursive self-reconstructing file compression method. Cross-owner sharing needs explicit consent; UUID identity is not login/authentication. Save a trusted receipt externally if verification against a substituted archive matters.

## Precise CP01 limitations

This is a portable **CLI pilot**, not yet a live JM LLM/AI Studio UI adapter, clipboard rich-data transfer, phone APK, Google Drive/email sync, automatic numbering service, append-only signed custody ledger, provider export parser, federated permission system or operational backup service. Encryption uses a whole-archive in-memory buffer and a conservative 256 MiB cap; do not import untrusted files as executable code. The sidecar receipt itself does not authenticate authorship. Tests prove the synthetic examples only, not real user data or any Fold8 contact.

Run `python -m unittest discover -s tests -v` for receiver-specific local consequences. Promote or integrate only after reviewing results and real target contact. **NO DING, NO CLAIM.**
