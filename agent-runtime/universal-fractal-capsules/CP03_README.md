# JM Universal Fractal Capsules · CP03 independent identity and signed receipts

**Additive descendant; CP01 and CP02 files and encrypted formats unchanged.** It reuses `jm_ufc.py` and `jm_ufc_web.py` to verify original archive bytes **before** signing. It introduces a separate owner-vault and personal numbering component, not a new AI model or replacement Estate front door.

## What is implemented (33/33 tests in local CP01–CP03 suite)

- An owner-specific Ed25519 signing key encrypted locally with AES-256-GCM and a separately supplied Scrypt-derived secret. The plaintext key is neither stored in the package nor printed to terminal.
- Public key identity record (owner UUID + public Ed25519 key + SHA-256 fingerprint).
- Optional self-contained Ed25519 signature over the independently verified `.jmufc` ciphertext SHA-256, original unsigned receipt SHA-256, capsule root, owner identity, creation number and capsule ID.
- Offline verification without archive passwords; **trusted owner** is reported only if a separately pinned original public-key file matches exactly. Unpinned self-signed key material has valid mathematics, not authenticated human identity.
- Independent per-owner sequential numbering in a local registry; two different owner UUIDs can each start at #1. Idempotent per creation UUID. Exclusive lock, no overwriting historical ledger values, and fail-closed on corrupt/foreign ledgers.
- Signature verification rejects changed archive bytes, changed receipts, changed signed payload, wrong public key, wrong signer and wrong key passphrases. Original CP01 and CP02 ciphertext remain byte-for-byte unchanged.

## Usage

Python 3.11+, dependency `cryptography>=42,<47` (same package already required by CP01/CP02).

**Real-owner secrecy:** set `JM_UFC_KEY_PASSPHRASE` to a **strong, unique private key vault secret** (minimum 16 characters) and `JM_UFC_PASSPHRASE` independently to the **archive's** secret. Never commit either to GitHub, copy them into a chat, pass them on the command line or assume they can be recovered from the public record. The vault and its decryption secret must both survive in separate private recovery custody.

```sh
# Create a brand-new owner identity; do not use for an owner with existing
# source identity until their original UUID/numbering history is reconciled.
python jm_ufc_authority.py init-owner --vault /private/owner-key.vault.json --public /public/owner-key.json

# Assign a newly accepted creation its personal number, unique per owner.
python jm_ufc_authority.py reserve-number --registry /private/owner-ledgers \
  --public /public/owner-key.json --creation-id YOUR_ORIGINAL_CREATION_UUID

# Sign an ALREADY VERIFIED encrypted original and its original sidecar receipt.
python jm_ufc_authority.py sign --archive original.jmufc \
  --receipt original.jmufc.receipt.json --vault /private/owner-key.vault.json \
  --out original.signed.json

# Verify the signed archive with NO SECRET, and an independently trusted key.
python jm_ufc_authority.py verify-signature --archive original.jmufc \
  --receipt original.jmufc.receipt.json --signed original.signed.json \
  --trusted-public /trusted/owner-key.json
```

A new owner begins at personal #1. **Historical ECOSTATE original identities must be audited before adopting a new ledger as authoritative**; do not reset someone's established numbering simply because this component defaults to #1. The signature file is an optional additional proof carrier and does not alter the original `.jmufc` or its receipt.

## Trust and sharing boundaries

- A **valid signature** proves that the holder of a particular private signing key signed this exact encrypted archive and original receipt. It does **not** prove human authorship or possession of the original idea; separate provenance evidence is needed.
- **Pinned public key match** proves continuity relative to the independently trusted key. It is not a verified government or family identity unless a responsible owner establishes that binding.
- A signed receipt does **not** give the recipient decryption rights, access to files, an upload route or family-wide consent. Never confuse an identity claim with sharing authorisation.
- The per-owner numbering registry is locally protected against accidental duplicate allocation and raced writes, not a distributed multi-device authority or a signed immutable global ledger. Recover/migrate existing owner history before adopting it on a second device.
- No production keys, personal information, source histories or actual family files are included in the example tests. No provider accounts or email automation are configured.
- No Fold8 physical save/re-entry, native APK, live production merge or ChatGPT/Gemini automatic private-chat extraction is claimed by this module. Existing CP02 storage scheduler/custody remains independently scoped.

**Build laws:** SOURCE BEFORE CROWN · CONTACT BEFORE CROWN · ONE KEEPER PER DISTINCT CREATION · NO DING, NO CLAIM.
