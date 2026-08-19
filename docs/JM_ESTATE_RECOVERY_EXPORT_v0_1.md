# JM Estate Recovery Export v0.1

**Purpose:** prove that the current working Estate can be reconstructed without relying on one phone, one laptop, one chat session, or one browser cache.

## Recovery model

The Estate does not need one giant self-duplicating archive. Its current authority is deliberately split across two owned durable lanes:

1. **Governed source and history — Git / GitHub**
   - repository: `JMisJustMe/JM-cading-lab`
   - current source can be exported as a ZIP from committed `HEAD`
   - full Git refs/history can be exported as a portable `.bundle`
   - Cloudflare public deployment can be rebuilt from this governed source

2. **Private owner state and private durable copies — Cloudflare R2**
   - bucket: `jm-estate-owner-vault`
   - Pages binding: `JM_OWNER_VAULT`
   - owner secret variable: `JM_OWNER_VAULT_KEY`
   - secret value is never placed in source, manifests or recovery exports
   - authenticated owner-state write and restore are already separately proven

These lanes are connected for recovery but are not merged into one public archive.

## Build a portable source/history export

Repository tool:

```text
tools/Build-JMEstateRecoveryExport.ps1
```

Example on Windows:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\Build-JMEstateRecoveryExport.ps1 `
  -OutputDirectory "$HOME\Downloads\JM-Estate-Recovery"
```

It creates three files for the exact committed `HEAD`:

```text
JM_ESTATE_RECOVERY_<commit>-source.zip
JM_ESTATE_RECOVERY_<commit>-history.bundle
JM_ESTATE_RECOVERY_<commit>-manifest.json
```

### Source ZIP

A clean, portable snapshot of all files tracked at the source commit. It does not include `.git`, uncommitted edits, browser state, owner passphrases or private R2 objects.

### Git bundle

A portable Git bundle containing repository refs/history. It is verified with `git bundle verify` and can be cloned on another machine.

Example recovery:

```powershell
git clone .\JM_ESTATE_RECOVERY_<commit>-history.bundle JM-cading-lab
```

### Manifest

Records the exact source commit, archive hashes, file count, required Estate paths, Cloudflare binding names and the private-owner recovery contract. It does not record the owner secret value.

## Private owner recovery

If a device is lost but the Cloudflare account/bucket remains:

1. open the live Estate;
2. go to **Owner → JM Owner Vault**;
3. unlock with the owner-held passphrase;
4. choose **Restore owner state**.

If the Pages project itself ever needs rebuilding, deploy the governed repository source and preserve/recreate these account-side bindings:

```text
R2 bucket: jm-estate-owner-vault
Binding:   JM_OWNER_VAULT
Secret:    JM_OWNER_VAULT_KEY  (owner-held value; never stored in Git)
```

The live Owner Vault readiness and owner write/clear/restore roundtrip have separate receipts in `registry/`.

## What this proves

A current Estate recovery does not depend on ChatGPT remembering the work or one device retaining local storage:

```text
GIT/GITHUB SOURCE + HISTORY
        +
PRIVATE R2 OWNER STATE
        ↓
REDEPLOY / REOPEN ESTATE
        ↓
RESTORE OWNER STATE
```

## Boundary

This is an **operational current-Estate recovery route**, not a claim that every historical private ZIP, deleted chat, external-drive file or old version has been recovered. Historical held items remain held under the physical census and do not silently become present because the current Estate is recoverable.

No Ding is implied by this document alone; the CI recovery proof must pass.
