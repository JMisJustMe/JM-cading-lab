# JM Owner Vault v0.1 — Durable Owner Room Graft

**Status:** STAGED / FAIL-CLOSED / NOT YET LIVE / NOT DINGED  
**Parent:** JMISJUSTME — The Owned Web Estate  
**Existing public door:** `jmisjustme-estate.pages.dev`  
**Storage graft:** Cloudflare R2 through a Pages Function

## What this is

The Web Estate is already live and already has a governed permanent-HTML repository intake pipeline. The actual missing organ is narrower: the root Owner Room currently keeps notes, favourites, recent routes and mounted HTML in browser-local storage.

Owner Vault v0.1 adds a **private durable copy** behind that existing local-first room. It does not replace GitHub, Wisebase, BodyMesh, the Estate registries, the permanent body pipeline, or the local working shelf.

> Local is the working shelf. R2 is the private durable vault. GitHub remains the deliberate public/versioned promotion rail.

## Non-negotiable boundary

Nothing uploads automatically.

The client bridge adds an explicit **Sync local shelf to vault** control. Until the owner presses that control, the existing local behaviour is unchanged. A private R2 object is not a public-publication claim.

## What v0.1 stores

- Owner notes.
- Favourites.
- Recent routes.
- Standalone HTML bytes explicitly selected/mounted locally and then explicitly synced.
- A private body index containing name, file name, byte count, SHA-256 and upload time.
- Optional metadata/state snapshots that reference the body index without duplicating HTML bytes.

Byte-identical HTML is deduplicated by SHA-256.

## Security model

The API is fail-closed unless **both** are present in the Cloudflare Pages production environment:

1. R2 binding: `JM_OWNER_VAULT`
2. encrypted Pages secret: `JM_OWNER_VAULT_KEY`

The public source never contains the owner key. The owner enters it when unlocking the Owner Room; the browser keeps it in `sessionStorage`, so closing the session removes it. Private API responses are `no-store`, and the Estate service worker is patched to bypass `/api/owner/` completely.

This is the bounded v0.1 owner gate. Cloudflare Access can later replace the session-key gate while preserving the same R2 contract.

## Cloudflare mounting steps after the PR is approved

The code can safely merge before the storage binding exists: the API returns a fail-closed `503` and the ordinary local Owner Room keeps working.

To turn the durable vault on:

1. In Cloudflare R2, create a private bucket such as `jm-estate-owner-vault`.
2. In the `jmisjustme-estate` Pages project, add an R2 binding named exactly `JM_OWNER_VAULT` pointing at that bucket.
3. In Pages **Variables and Secrets**, add an encrypted secret named exactly `JM_OWNER_VAULT_KEY` with a long unique owner key.
4. Redeploy the authoritative Estate workflow.
5. Open **Owner → JM Owner Vault**, choose **Unlock this session**, then press **Sync local shelf to vault**.
6. Verify remote body count and preview/download one private copy before making any completion claim.

## Existing permanent-body route remains authoritative for publication

The repository already includes `tools/Promote-JMHtmlBody.ps1` and acceptance tests for byte-preserved HTML promotion. Owner Vault does not bypass that route.

A useful private body can move:

**local working copy → explicit R2 durable copy → deliberate permanent repository promotion → reviewed commit → Cloudflare public proof → receipt / Ding**

The stages are distinct on purpose.

## Files introduced

- `estate-owner-vault.js` — isolated source for the Owner Room UI bridge.
- `functions/api/owner/vault.js` — same-origin private Pages Function.
- `registry/owner-vault-contract-v0.1.json` — boundary/contract.
- `tools/apply-owner-vault-v0.1.py` — idempotent graft into already-deployed crown files.
- `tools/test-owner-vault-v0.1.mjs` — fail-closed/storage contract tests.
- `.github/workflows/test-owner-vault-v0-1.yml` — branch acceptance and bounded graft workflow.

## Graft edits

The existing authoritative deployment already publishes `estate-app.js` and `sw.js`, so the apply tool deliberately leaves the root HTML and deployment workflows untouched.

It changes only:

- `estate-app.js` — appends the isolated Owner Vault bridge behind explicit begin/end markers. This makes the current Owner Room surface the durable-storage controls without creating another public shell.
- `sw.js` — bumps the Estate shell cache and refuses to intercept/cache `/api/owner/` traffic.

No existing body is merged, renamed, deleted or re-authored. The deployment rail remains the same rail.

## Acceptance result boundary

The v0.1 contract test proves the fail-closed API, owner-state persistence contract, HTML storage, SHA-256 duplicate avoidance, private download, metadata snapshot and deletion using a fake R2 implementation. The crown graft separately proves that the bridge lands in the existing app and private API traffic bypasses the service worker.

That is code/build proof, not live-storage proof.

## Claim boundary

Until an authenticated live write/read/delete proof succeeds against the bound private R2 bucket, the correct state is:

**CODED / TESTED / GRAFTED / STORAGE NOT YET PROVED LIVE.**

No Ding, no claim.
