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

**Founding v0.1 historical policy:** Byte-identical HTML was deduplicated by SHA-256. This proved insufficient to preserve separately intended uses and is superseded by the CP04 protected-use correction below.

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

## CP04 protected-use correction — 28 October 2026

The original policy collapsed differently intended copies when their HTML bytes matched. The current source correction preserves the difference between **content identity** and **use/body identity**.

- The existing local mounted-body ID is forwarded as `sourceInstanceId` on explicit owner sync. A repeat upload of that **same ID and SHA-256** returns the already-held record without creating another.
- Different mounted IDs remain distinct private records even when bytes, filename and title are identical. Exact-byte sameness alone is never retirement authority.
- If the same mounted ID is edited, the changed bytes create a new private version with a `previousVersionId` link. The earlier version remains available until explicitly targeted for deletion.
- A legacy client without a stable ID is preserved as a new use rather than guessed to be redundant. On reaching the 2,000-record index limit, new writes are refused without dropping an older record.
- The marked Owner Room graft now updates from its existing source safely without resetting newer service-worker versions or creating another public shell.

**Proof status:** Source code and synthetic private-storage contract QA are required. The historical Owner Vault authenticated state-roundtrip receipt remains separate; it does not prove this CP04 policy on the current production backend. A live public-safe API policy marker and authenticated owner write/reload readback are distinct rollout gates. No secret or owner file is included in this document.

## CP05 — Private source editing inside the existing Owner Room (28 October 2026)

CP05 adds **EDIT SOURCE** beside the existing private Vault Preview, Download and Remove controls. A source textarea opens only after the existing owner-key authentication. Clicking **Save private revision & verify readback** submits the new HTML to the same private Vault API and creates a **new protected body/version**; it does not overwrite or retire the ancestor.

The server requires the selected body ID and its expected SHA-256. A stale base version, mismatched hash, non-HTML input or full index fails closed. After saving, the client re-fetches the new private HTML and verifies both its exact content and SHA-256 before showing a successful private-save message. Every separately intended body retains its independent identity. The source editor does not publish an app or modify GitHub/deployed source automatically.

**Proof boundary:** CI tests the private API against a synthetic R2 store, checks the mirrored existing Owner Room source, and production workflow checks a public-safe policy marker. Actual owner-key authenticated production write/reload/readback on a real device is a separate gate. No private key or owner document is placed in public source.

## FLAZ CP05–CP06 · bounded closure 28 October 2026

The existing source and deployment receipts close private editing and direct Owner Room contact at **source, test, and public-safe deployed-code** scope. CP05 mainline source commit `1d432648cc171285c649b4d29372855658683910`; CP06 `18a57bb92b64d63f70d2be51bf23db84382a92f7`. The durable Owner Vault readiness receipt verified at `2026-10-28T16:09:35.733270+00:00` confirms both the live API policy and deployed Owner Room editor-source markers. The existing synthetic-R2 tests and phone/desktop browser journeys passed. **Real authenticated owner production writes, physical-device restoration and Estate-wide independent editing remain separately unpassed.**

## CP07 · local preservation and private-to-device recovery

An actual data-loss route was identified in the original local mounting code: when `localStorage.setItem` failed, its catch block cleared the entire in-memory mounted shelf and removed the storage key. The 12-item `.slice(0,12)` could also silently evict older bodies.

CP07 corrects this *inside the existing Estate*:

- Local HTML imports commit through one atomic storage call, then update in-memory state. On quota, existing mounted content remains unchanged.
- At 12 bodies, importing or restoring refuses without evicting the oldest. Existing removals use the same atomic/rollback discipline.
- The original Owner Vault offers **RESTORE TO DEVICE** for each private HTML version. The owner signs in through the existing private session; HTML bytes are fetched privately and SHA-256 checked against that exact version before entering the current local mounted shelf.
- Every restored local copy carries its private version ID, source identity, ancestor ID and SHA-256. Repeat restoration is idempotent. Ordinary local-shelf Sync skips already-restored Vault copies so a readback cannot accidentally create another private body or revert the current head.
- The browser reloads the original Estate after a committed local restore, demonstrating durable device storage instead of an in-memory-only display.

**Proof boundary:** synthetic authenticated browser tests, source mirroring and existing deployment rail are the scope of the CP07 implementation; a real owner device/vault-key roundtrip is a separate next proof gate. No key is stored in code and no private user document is copied by this source change.


## CP08 — Authenticated owner-session contact harness (28 October 2026)

The original Owner Room adds **Prove private save → reload → recovery**. This only operates after the owner explicitly presses the button and authenticates with the already-supported owner-session key **inside the Estate**, never through ChatGPT.

1. It creates a random, uniquely named *temporary test body* (not an owner's real creation). A local checkpoint is saved **before** any private write. If a network acknowledgement is lost, the test looks up the original unique private source ID; it **never replays** a potentially committed write.
2. It checks the exact temporary HTML bytes and SHA-256 through the authenticated private API. A real page reload then independently fetches and checks the exact content again.
3. After both checks, the existing delete route removes only the precisely identified CP08 temporary body. The owner-key session, temporary identity, name, file name and hash gates prevent unrelated JM creations being deleted. The returned private index must show the temporary record gone.
4. Only then does the browser record **PASS**, in a private on-device receipt with no owner key or personal content. The owner can export a stand-alone JSON proof. Interrupted tests remain **HOLD**, with a recoverable checkpoint, and are not silently restarted as a new test.

The repository and live workflow can prove *the harness is coded, browser-tested and deployed*, but **cannot honestly claim the owner has used their own authenticated session**. Synthetic browser tests are intentionally labelled synthetic; no live key is invented, fetched, displayed, or transported into a CI job. On-device owner proof is a distinct explicit-contact DING, and separate from independent editing of all Estate bodies and from testing another physical device.


## CP09 custody convergence — source candidate, 28 October 2026

Recovered the original Owner Vault and two prior unmerged strengthening candidates. On the current-main repair branch the existing API refuses a pre-existing malformed, unreadable or structurally invalid private body index or owner state with generic no-store HTTP 503 `PRIVATE_CUSTODY_HOLD` rather than mistaking it for an empty shelf. A genuinely absent first-run record still boots. Owner-state PUT checks the stored state first. Upload, revision, deletion, read and snapshot refuse a corrupt index without discarding existing private metadata. No automatic recovery, deletion or source publication occurs on HOLD.

The same candidate inherits CP06's independent re-read of HTML body bytes, SHA-256 and full intended body index. These checks detect missing/altered write acknowledgements; they do **not** prove transactional multi-writer atomicity, durable rollback after partial failures, or physically independent offsite restore. Concurrent writes remain a separate architecture HOLD.

The in-memory Fake-R2 regression court uses synthetic data only. CI success is **not** authenticated real-owner private-source editing, Cloudflare production propagation, physical device acceptance or independent owner recovery. Keep all these gates open until separately proved. See issue #591 and draft PR for branch audit evidence.

## CP12 — Source-safe deletion and exact snapshot custody (28 October 2026)

This is an additive hardening of the **existing** Owner Vault, not a replacement backend or an automatic production release.

- Deletion first checks that the targeted private HTML matches its recorded byte count and SHA-256, then updates **and independently verifies** the full body index, **then** deletes the source object and independently checks that deletion took effect. If index persistence fails, the source object is not deleted. If deletion fails after index commit, an **orphaned private object remains for manual recovery**, and the API refuses a success claim; it does not overwrite a possibly concurrently updated index to roll back.
- Snapshots now use a UUID alongside their timestamp so rapid repeated snapshots cannot overwrite each other. A snapshot acknowledgement requires an independent **exact-byte** JSON readback. Missing, dropped, unreadable or altered snapshot writes return `SNAPSHOT_READBACK_MISMATCH`.
- The existing Fake-R2 regression suite injects failed index writes, corrupted source bytes, silent deletion failures, duplicate-timestamp snapshots, dropped snapshot writes and altered snapshot bytes. The tests use synthetic source only.

**Boundaries:** Snapshots contain owner-state and body-index metadata, **not the HTML body bytes**; they are not complete offsite backups. An interrupted delete after a verified index commit can leave an unindexed R2 object. Concurrent writers remain unprotected by a transaction/lock, and physical-device, authenticated live-R2, independently recovered cold restore and production propagation remain **HOLD**. The branch is draft/unmerged. No private source, key or owner payload is included in this public repository.

## CP13 — Referenced ancestor preservation (28 October 2026)

The existing private DELETE route now refuses to remove an indexed HTML source when any retained revision's `previousVersionId` still points to it. The API returns HTTP 409 `BODY_ANCESTOR_STILL_REFERENCED` **before changing the index or deleting source bytes**. The owner can explicitly remove a leaf revision first, then an unreferenced ancestor, retaining the previous permitted deletion route. This is not a new body, registry, vault or source migration.

The existing Fake-R2 suite includes a source → revision chain: attempted ancestor deletion must preserve exact index and both stored HTML objects, both remain independently downloadable, then deliberate leaf-first deletion succeeds. This is **synthetic regression only** until CI and real authenticated storage tests independently confirm the result.

**Boundary:** This is direct-child referential integrity, not full offsite backup, cryptographic authorship, cross-provider cold restoration or multiwriter atomicity. Private owner data, credentials, production deployment and native originals are untouched; the PR remains draft and unmerged.

## CP14 — Duplicate body-ID custody ambiguity gate (28 October 2026)

The existing Owner Vault index must contain unique nonempty body IDs. A JSON record with two entries carrying the same ID previously passed shallow shape validation, making source lookup ambiguous and allowing a DELETE to remove both index entries while deleting only one source object. CP14 now fails closed with private HTTP 503 `PRIVATE_CUSTODY_HOLD` before any index-dependent GET, upload, snapshot or DELETE proceeds. No automatic deduplication, source deletion or identity collapse occurs. The original index bytes remain available for deliberate owner recovery.

The inherited synthetic Fake-R2 regression injects a duplicate ID, checks all five affected API routes, proves both original HTML and corrupt index remain byte-identical, then restores the exact healthy index and verifies source download and explicit deletion still work. This is a **candidate draft**: actual CI, authenticated R2, physical device, independent cold restore, concurrent-writer atomicity and production propagation are separate gates. This safeguard does not retrospectively repair a previously damaged index or authorise native Library retirement.


## CP16 — owner-state stale-editor protection (draft candidate, 28 October 2026)
The existing private Owner Room reads a SHA-256 state-revision token with its authenticated manifest and includes it on explicit state sync. A stale token fails with `409 OWNER_STATE_HEAD_CHANGED` without overwriting remote notes, favourites or recent routes. A missing verified baseline fails locally before sync. Successful writes return the new revision; a reload refreshes the token. The server retains compatibility with legacy clients that do not send the optional token; their sequential stale writes are NOT protected by this client precondition. CP15 conditional R2 writes still protect simultaneous same-version commits. Tokens are comparison receipts, never authentication; the owner key remains required. This is source/CI proof only, not live R2, owner-device or deployment acceptance.

## CP17 — malformed integrity metadata custody HOLD (draft candidate, 28 October 2026)

An explicitly present but malformed SHA-256 in an indexed body previously bypassed the digest comparison and could return source as `unverified-legacy`. CP17 makes such index metadata fail closed with `503 PRIVATE_CUSTODY_HOLD` rather than silently downgrading a formerly verified body. Malformed stored byte counts, source-instance types and ancestor-reference types are likewise refused before index-dependent reads or writes. The existing index and HTML bytes are not modified on HOLD. Legitimate missing legacy metadata remains compatible; this does **not** cryptographically verify historical hashless sources.

The existing Fake-R2 court tests malformed metadata against manifest, download, upload, snapshot and delete, checks unchanged corrupt-index and source bytes, then restores the exact healthy index and verifies SHA-256 download. The inherited 2,000-body capacity fixture now uses syntactically valid synthetic hashes. No private source, owner credentials or native Library IDs are changed. Draft/unmerged source and synthetic tests are not authenticated R2, physical-device, full offsite restore or production propagation proof.


## CP18 — revision ancestry custody coherence (draft, 28 October 2026)

An existing private source's metadata must preserve its own complete ordered
revision lineage, not merely contain a correctly typed `previousVersionId`.
The same original Owner Vault API now rejects a body index whose revision
points to a missing ancestor, points to itself or a newer record, or crosses
into another separately intended source/purpose. The original `vault-{id}`
legacy-version inheritance remains explicitly supported. **No repair or
reordering is attempted on corrupted custody**: it returns the existing
private `503 PRIVATE_CUSTODY_HOLD`, retaining the exact source bytes and
index for verified owner recovery.

The inherited Fake-R2 test court manufactures four malformed-ancestry cases,
checks five index-dependent operations for each, proves no original body
or corrupt index was changed on HOLD, then restores the exact healthy index,
re-reads verified HTML and successfully creates the next valid revision.
Distinct intended uses with identical source bytes stay distinct.

This is a **bounded synthetic source-integrity change**, not independently
verified cold backup, real R2 acceptance, actual device editing or deployed
propagation. It remains on the existing CP09/CP15/CP16/CP17 draft branch;
never merge/delete/retire origins solely on synthetic CI. The metadata-only
snapshot is still *not* an independent backup of HTML source bytes.


## CP19 — owner-triggered portable exact-source lineage export (draft, 28 October 2026)

This extends the **original private Vault and Owner Room**, not another backup server.
A new owner-authenticated `GET ?mode=export-lineage&body=<existing-uuid>`
offers a `JM.OwnerVault/0.1.LineageExport` JSON file containing the selected
private HTML source and each original ancestral revision, with unchanged
per-version metadata, original IDs, source-instance identities, SHA-256 and
UTF-8 byte counts. The original Owner Room adds an **EXPORT LINEAGE**
button beside each existing private HTML revision; it independently validates
the returned hashes and ancestry before offering a local browser download.
The same action is kept in the established bundled Owner Room script.

Safety boundaries: owner key required; read-only; no R2 backup copies or
duplicate purpose; maximum 16 versions and 32 MiB of original source bytes
per selected lineage, preflighted before source reads; legacy unverified
digests refused as exact recovery; hash/byte mismatches refused; R2 index
changed during export rejected as a concurrent conflict; no mutation of the
original private index, source bytes or prior ancestors. Other distinct
sources, even with identical HTML, are not silently exported or merged.

**What this does and does not prove:** the JSON is owner-editable and contains
actual source bytes needed for offline reconstruction, unlike the older
metadata-only snapshots. A click offers a download; browser permission,
the presence of the saved file on owner storage, cold re-open, independent
hash verification of the saved bytes, offsite custody, private source import,
live authenticated R2, physical-device use and public deployed propagation
are **distinct HOLD gates**. Nothing is called an independent backup solely
because the API returned HTTP 200 or a synthetic test runner passed. Neither
this branch nor a user's existing live owner data is mutated by CI tests.


## CP20 — independently verified offline source recovery (draft, 28 October 2026)

The original CP19 packet can be saved and carried outside this host. The
**standalone, no-network, no-secret, no-R2** recipient is
`tools/owner-vault-lineage-recover.mjs`. This is a reader of the ORIGINAL JM
Owner Vault's source-complete export, not a new cloud vault, account or
backup service. Requires Node.js 22+ (standard library only).

From a local copy of the utility and an owner-saved JSON packet:

```sh
node owner-vault-lineage-recover.mjs --input JM_Vault_Lineage_<body-id>.json --verify-only
node owner-vault-lineage-recover.mjs --input JM_Vault_Lineage_<body-id>.json --output-dir ./fresh-owner-recovery
```

The command verifies each UTF-8 original HTML SHA-256, length, unique native
UUID, complete newest-to-oldest chain, original source-instance lineage and
total byte count. It refuses tampered/missing ancestors, cross-purpose
lineage, invalid filenames/IDs, symlink packet, overbounded body counts/sizes
and existing output destinations. An explicit **new** output directory
receives named `<original-id>.html` files (up to 16, 32 MiB total) and
`recovery-manifest.json`, preserving the identity, original body metadata,
individual editable source files and SHA-256 packet custody receipt. The
program does not contact ChatGPT, the browser or the Vault, create other R2
objects, delete originals, overwrite any existing folder, import into a
live host or claim a public deployment.

The existing `tools/test-owner-vault-v0.1.mjs` CI test copies ONLY the
standalone utility and original exported JSON into a separate temporary
directory, invokes the actual Node CLI to reconstruct three exact original
versions, proves a distinct same-byte purpose was not merged, and uses
adversarially malformed saved packets and an existing destination to prove
fail-closed behaviour. Generated synthetic test files are disposed after
testing; user artifacts are never accessed by the CI fixtures.

**Honest boundary:** GitHub CI proves synthetic independent-file recovery
using the saved packet format, not owner physical-device use, actual downloaded
packet custody, private Cloudflare R2 data, independent offsite backup,
human acceptance or production release. The packet SHA-256 is an
integrity receipt, **not cryptographic authorship or a signer guarantee**;
an adversary who can replace both packet contents and their checksums
would need a separate authenticated anchor to be detected. Keep any real
export private: it contains the complete owner's source HTML.
The source candidate remains **DRAFT / UNMERGED**; live owner/device/prod
gates stay HOLD.

Governed by same-PR prospective Build Route Manifest
`registry/build-routes/JM_OWNER_VAULT_CP20_OFFLINE_RECOVERY_BUILD_ROUTE_MANIFEST_v0.1.json`
after native entry gate identified this new executable path.


## CP21 — independent cold-reload integrity audit (draft, 29 October 2026)

The same CP20 standalone, offline utility now supports **read-only auditing of
a previously recovered directory in a fresh process**. This closes a specific
verification gap: CP20 proved bytes at initial write, but its existing
`--verify-only` checked only the saved export packet, not the HTML and
manifest remaining on disk after a later restart or accidental modification.

```sh
node owner-vault-lineage-recover.mjs --input JM_Vault_Lineage_<body-id>.json --audit-dir ./fresh-owner-recovery
```

CP21 reopens the saved packet, checks its SHA/ancestry, independently lists the
recovery directory, rejects missing/extra/symlinked files, checks the exact
manifest identity and original-version metadata, then compares every recovered
HTML byte against its packet content and original SHA-256. It **never repairs
or overwrites edited files**, never writes to the original R2 Vault, and
does not treat a deliberately edited original as unchanged: owner edits should
be preserved as separately named descendants, not silently declared exact
originals. The test court performs a new-process audit after restore, then
adversarially modifies source, manifest, inventory and directory type to prove
failure without changing R2 or deleting the owner recovery.

A successful audit is **local disk readback against the supplied packet**, not
an independently authenticated packet origin, owner-device test, cloud custody,
offsite backup, production merge or deployment propagation. A malicious party
able to replace both packet and files could evade this unanchored comparison;
preserve the separately recorded packet SHA in trusted custody. CP21 remains
a draft candidate until actual owner-device and production gates are met.


## CP22 — non-destructive interrupted offline recovery (draft, 29 October 2026)

The original CP20/CP21 offline recovery recipient previously used a recursive
`fs.rm(destination)` if an error occurred after creating the recovery folder.
That could destroy already recovered source bytes or unrelated owner files
placed in the new folder before a late write failure. **CP22 removes this
destructive failure cleanup.** The same existing recipient records the
directory identity it created, then only removes that directory with
nonrecursive `rmdir` if it is still the same directory and completely empty.
If original HTML, a partial manifest, an unexpected file or a replacement
directory remains, it is **preserved for owner inspection**. This is a HOLD,
not a successful recovery, and the original R2 Vault is untouched.

The inherited synthetic regression checks preserved partial HTML, an empty
failed directory, a redirected symlink destination and a replaced real
directory. The recovery remains deliberately fail-closed and never deletes
pre-existing destinations. This addresses the offline cleanup data-loss
hazard, not an absolute filesystem-race guarantee; a concurrent hostile
actor controlling the parent directory can still race pathname operations.
Actual owner-device editing, real saved packet recovery, authenticated R2,
independent offsite custody and deployment propagation remain HOLD.


## CP23 — reject redirected ancestors during offline recovery and audit (draft, 29 October 2026)

The existing CP20–CP22 recovery utility checked only the immediate parent of a
new output directory and the final audit directory. A normal directory reached
through a **symlink in an earlier path component** could therefore be accepted:
a recovery could write outside the owner's intended physical path, and a
read-only cold audit could report success through that redirected path.

CP23 adds a component-by-component `lstat` refusal to the **same** offline
recipient before creating a recovery directory and before accepting a cold
audit. The existing packet verification, exact-source ancestry, immutable
originals, distinct intended uses, no-overwrite output and CP22 non-destructive
cleanup remain intact. Adversarial CI tests use an intermediate symlink to
attempt both recovery and audit, require explicit HOLD, verify that no output
was created through the link, and preserve a positive normal-path audit.

**Bounded proof:** This is a preflight protection against already-present
symlink ancestors, not an atomic directory-handle guarantee against concurrent
path replacement. Real owner-device recovery, independently authenticated
packet custody, R2 writeback, production deployment and propagation remain
HOLD. No private source or owner data is included in the synthetic tests.


## CP24 — exact offline recovery receipt integrity (29 October 2026)

The existing CP20/CP21 independent recovery CLI now uses **one deterministic manifest contract** for writing, immediate independent disk readback and later cold audit. Previously, restore acknowledged success after checking only packet SHA and ancestor count in its saved manifest; audit checked a few fields but could accept an altered custody boundary or an injected claim that offsite recovery/deployment had been verified. CP24 requires exact manifest bytes on initial readback and exact canonical receipt text on later audit. An altered boundary, extra field, changed formatting or forged status is **HOLD**, never a completion claim.

The original source HTML, immutable ancestry, separately intended uses, owner-selected destination, and CP22 non-destructive partial-recovery protections remain unchanged. Two new adversarial cold-audit tests exercise a forged offsite/deployment boundary and an injected owner-device success flag; a restored authentic manifest must pass again. This is **local offline integrity**, not packet origin authentication, physical-device recovery, race-proof filesystem custody, real R2, external cloud writeback, or production deployment. The existing draft PR stays unmerged pending CI and owner contact.


## CP25 — crash-durability acknowledgement gate (29 October 2026)

The same existing offline lineage recovery utility previously acknowledged exact
HTML and manifest readback without calling fsync. A power loss or OS crash
could therefore lose newly written source bytes, the manifest, or directory
entries despite a successful return. CP25 uses exclusive private-mode file
handles and explicitly syncs **each original HTML file and the manifest**
before closing. After exact readback, it synchronises the recovery directory
and its parent (the new directory entry), checks directory identity, and
acknowledges recovery only if all these operations succeed.

A failed or unsupported file/directory sync yields **HOLD_NO_RECOVERY**,
not a claim of durable custody. CP22's nonrecursive cleanup still preserves
any partial original bytes for owner-guided investigation. The existing
synthetic test court checks write/sync/close ordering, private exclusive
creation, refused file and directory sync failures, and non-directory
refusal. Actual offline recovery also exercises the new fsync path in CI.

**Boundaries:** Filesystem fsync is an OS durability request, not proof of
physical power-loss survival or a separate-device cold restore. Concurrent
hostile pathname replacement is not fully eliminated; packet authenticity,
offsite custody, owner-device edit/reload, authenticated R2 persistence,
private source migration and deployment propagation remain HOLD. This is
an unmerged draft candidate, not a deployed release.

## CP26 — opened-file identity gate for offline source reads (29 October 2026)

The existing offline recipient previously used path-based `lstat`/`readdir`
preflight followed by a separate `readFile(path)`. A final file component
replaced with a symlink between those operations could redirect a source
read outside the intended recovery packet/directory. CP26 strengthens that
same recipient, **not a new Vault or registry**, by opening source and receipt
files with `O_NOFOLLOW | O_NONBLOCK | O_RDONLY`, checking the **opened file
handle** is a regular bounded file, reading from that handle and closing it
on every path. This covers packet ingestion, immediate restore readback and
subsequent independent cold audit; malformed/unavailable no-follow support
fails closed. The existing CP20 ancestry, CP22 non-destructive partial
recovery, CP23 directory preflight, CP24 exact receipt and CP25 fsync gates
remain intact.

The synthetic adversarial regression checks a genuine final-component
symlink, directory and oversized source refusal, required no-follow/nonblock
flags, normal regular-file success and handle close on refusal. This is
**final-component protection**, not an atomic guarantee against hostile
concurrent replacement of ancestor directories, nor authenticated packet
provenance, real R2 restore, owner-device acceptance, offsite custody or
deployment propagation. Keep draft/unmerged until the actual CI and owner
contact gates are proven; preserve all original private sources and Library IDs.

## CP27 — packet input ancestor redirection refusal (29 October 2026)

The original CP20–CP26 offline recipient protected the packet's **final** file
component with `O_NOFOLLOW`, but `--verify-only`, `--output-dir` and
`--audit-dir` could still read a packet through a symlinked **ancestor**
directory. CP27 reuses the existing CP23 component-by-component directory
preflight on the packet input parent **before reading packet bytes** in all
three modes. The original no-follow opened-file check remains in force.

The existing CP20 independent-process test exercises a redirected packet in
all three CLI modes, verifies explicit `LINEAGE_PATH_COMPONENT_UNSAFE` HOLD,
checks that no recovery directory was created, and confirms the normal exact
packet and cold audit still work. This is a bounded pre-existing symlink
protection, **not** a race-proof directory-descriptor guarantee against
concurrent ancestor replacement. The source stays draft/unmerged; real
owner-device recovery, independent packet-origin authentication, private
GitHub migration, authenticated R2 and deployed propagation remain HOLD.
No original owner file or Library identity is deleted, migrated or replaced.


## CP28 — post-stat source growth bounded-memory recovery (29 October 2026)

The existing CP26 opened-file safety gate checked the initial file size but
then called `FileHandle.readFile()`, which can allocate until EOF. A packet or
recovered source appended after the initial `stat` could consume more memory
than the declared cap before the post-read check. CP28 strengthens the same
original offline recovery CLI: incremental opened-handle reads request at most
64 KiB per call and never accept more than `maxBytes` in total. The first
byte over the limit produces `LINEAGE_OPENED_FILE_OVERBOUNDED`; handles close
on success and failure. No original source, identity or role is rewritten.

The CP28 synthetic regression checks exact normal reads, a file growing
after `stat`, zero-byte sources, bounded read requests, absence of
unbounded `readFile` calls and handle closure. Existing CP20 cold recovery,
CP24 exact manifest, CP25 fsync, CP26 no-follow and CP27 input-ancestor
refusal remain enforced. This is a source/CI candidate, **not** an authenticated
owner-device restore, private offsite custody, physical crash proof or
deployment. PR stays DRAFT/UNMERGED; no private source or Library ID retired.


## CP29 — identity-bound no-follow directory durability (29 October 2026)

The existing CP25 offline recovery durability helper opened the recovery and
parent directories with ordinary `'r'` handles after earlier pathname
preflight. A substituted final directory symlink or replaced directory could
therefore be synchronised instead of the original recovery location, even
though subsequent identity checks might refuse final success. CP29 strengthens
that SAME helper: directory fsync opens with `O_RDONLY | O_DIRECTORY |
O_NOFOLLOW`, validates the **opened** directory's device/inode against the
previously captured parent or newly created destination, and refuses before
fsync on mismatch. Unsupported no-follow/directory-open support yields HOLD.

The original CP20–CP28 source, ancestry, bounded source reads, private file
permissions, nonrecursive partial recovery and exact manifests remain in place.
New adversarial tests exercise symlinked directory refusal, rename-and-replace
inode mismatch, unchanged original-directory success, explicit no-follow flags,
and close-without-sync on mismatch. Existing recovery and audit regression
still must pass. This is a draft source/CI safety gate, NOT an atomic guarantee
against hostile concurrent ancestor replacement, a physical crash test,
owner-device edit/reload, offsite restoration, authenticated R2, private-source
GitHub migration or production propagation. No original Library IDs or
purpose-specific carriers are retired.

## CP21 — Original-file continuity for non-HTML creative materials (29 October 2026)

**Original authority:** the existing JM Owner Vault, Owner Room, R2 binding, owner-key protection, source/version identity, and GitHub source/recovery rails. CP21 is an additive capability of those originals; **not another file manager, another backend, another app or another public source publisher**. The next dependency is private custody repair draft PR #601; CP21 lives in its protected child PR #621.

### Exact implemented behaviour

- Private source-file assets have a separate fail-closed `JM.OwnerVault/0.1.AssetIndex` in the existing `JM_OWNER_VAULT` R2 bucket. The stored `.bin` objects contain the **actual original bytes**, not HTML or base64 wrappers. A format's filename/media type is descriptive; the Vault never executes or translates the file.
- The owner explicitly chooses a device-local file in the existing Owner Room. The owner presses SAVE to upload. Nothing is automatically imported from Library, Drive, conversations, Dropbox, GitHub, games or music libraries.
- The owner can read the private asset inventory, download one independently SHA-256 verified file on another authorised device, and intentionally upload a revised version using the exact current asset ID and hash. The original binary ancestor remains immutable.
- Byte-identical material under separately purposeful sourceInstanceIds remains separate. A byte-identical repeat of the **same** identity is idempotent. The original HTML source editor/ledger remains untouched.
- The owner can explicitly remove a leaf file/version; referenced ancestors are protected. Unknown, unreadable, structurally invalid or concurrently changed asset indexes hold rather than invent a blank store or lose current identities.
- A private download always uses `application/octet-stream`, attachment, `no-store`, `nosniff`, and an exact digest. Downloading a file doesn't prove the selected device has an application capable of opening, editing, playing or compiling its native format.

### Known and unproven boundaries

- CP21 initial per-file cap: **12 MiB**. Larger audio, video, native archives, project directories and many games require an explicitly bounded larger/streaming or folder route. Never truncate, silently skip or split away file identity.
- Browser-based editing for HTML remains in its original panel. A saved music file, Word document, DAW project or compiled package is downloaded as its original file, edited in a suitable owner-selected external application, then re-uploaded deliberately as a revision. Universal native editing is **not** claimed.
- The original metadata-only Owner Vault snapshot does **not** include CP21 asset bytes. A successful download isn't an independent offsite backup unless those exact bytes are saved and recovered elsewhere. Full asset-lineage portable backup and cold restore remain separate tasks.
- The original provider R2 binding and owner key must remain accessible. This is **not** automatic sync across all connected AI platforms or user accounts, and no private source is published in the GitHub PR.
- Synthetic original-R2 contract tests and actual Playwright browser journeys at 390 px and 1366 px are distinct from authorised physical phone/laptop use and production R2 proofs. Branch source + CI evidence is not a live deployed owner-Ding.
- Never merge PR #621 into production before the parent custody protections are admitted, the final CI is green, and actual owner-file storage and cross-device roundtrip are separately tested.

### Existing-route use after an authorised deployment

Open the original `https://jmisjustme-estate.pages.dev/#owner`, unlock the existing JM Owner Vault **inside your browser** (never provide the key in chat), choose an original non-HTML file, SAVE, and check the verified private source. On a second device, unlock the **same** original Owner Room, download the exact file and open it in its native tool. After editing, select REVISE FILE for the current head, choose its updated local original and explicitly save. Verify that the predecessor still downloads intact.

**CP21 source DING is bounded to code, Node synthetic exact-byte custody and browser contact if the actual workflows pass.** Physical two-device cross-platform contact, full creative-estate coverage, offsite resilience and external independent native-edit propagation remain HOLD.

## CP22 — Independent cold recovery of non-HTML creative sources (29 October 2026)

**Inherits CP21 and the original CP20 offline reader:** PR #621 remains a protected draft child of original private custody PR #601. This is not a replacement backup service or a new application. Original music, project files, code artefacts, manuscripts or any other byte-format file explicitly stored in the Owner Vault may now be **exported with all its verified ancestors in one bounded JSON packet**. The packet carries **the actual base64-encoded original binary bytes for external transfer**, not merely source metadata; the still-private R2 objects remain native binary.

### Exact route

- The owner unlocks the **existing** Owner Room, chooses one private file/version and presses **EXPORT FULL LINEAGE**. The authenticated `?mode=export-asset-lineage&asset=ID` operation reads but does not modify the original asset index, original R2 source objects, previous versions, HTML files or owner state.
- Preflight before reading bytes: at most **8 versions, 24 MiB total, 12 MiB per original file**; exceeds these limits = explicit HOLD, never an incomplete export presented as complete. The index must remain unchanged during export. All binary originals are SHA-256 and byte-count readback verified.
- The browser verifies the returned packet independently before offering a download. Save it **outside the Estate** to actually possess a recoverable file. Packet is **unencrypted original private source**: keep it owner-private; do not publish or upload to a public repository.
- The **same pre-existing** `tools/owner-vault-lineage-recover.mjs` offline CLI now recognises `JM.OwnerVault/0.1.AssetLineageExport` **and** its previously supported HTML `JM.OwnerVault/0.1.LineageExport` without altering the original format's behaviour.
- From an existing independent machine with Node, run `node owner-vault-lineage-recover.mjs --input saved.json --verify-only`; then `--output-dir new-empty-path`; optionally start a **new process** with `--audit-dir that-new-path`. For asset packets, it reconstructs exact numbered **`UUID.bin` original bytes**, each with its original filename and media type in `recovery-manifest.json`. These filenames intentionally use stable UUIDs to avoid path traversal, collisions and overwritten owner creations; the source is not transcoded.
- The original CLI retains bounded opened-handle reads, no-follow input/path protections, new-directory-only creation, durable file writes, independent readback, receipt integrity, nonrecursive failure cleanup and explicit refusal of corrupt, altered, forged, incomplete or cross-purpose packets. Neither offline recovery nor audit requires the Vault, Internet, an AI app, owner credentials, live website or repository.

### Proof and limitations

- Synthetic private R2 tests deliberately create binary originals and revisions, export a complete independent chain, copy the real original CLI to an isolated folder, restore the exact raw bytes, re-open and audit them in an independent Node process, and refuse tampered sources and partial ancestry.
- The same original Access Mesh Playwright phone/laptop-size journeys additionally click **EXPORT FULL LINEAGE** and inspect the actual downloaded JSON bytes. These tests use synthetic storage, **not** owner personal files or credentials.
- Real owner-device download, lasting offsite possession, independent owner laptop/phone cold reconstruction, native app opening/editing, all-families coverage, large projects and provider-outage resilience are **not** proved by synthetic CI. A bounded test packet copied and audited in CI proves the offline recovery tool functions, not that the user's private source has actually been backed up.
- No new automatic downloads, third-party AI integrations, external storage seats, or owner-content deletions. Nothing merged/deployed until parent custody gates and this child acceptance are passed.

## CP23–CP24 — Durable file-save identity and native-format cold re-entry (29 October 2026)

**CP23 source defect repaired:** in the initial binary upload UI a lost server acknowledgement could cause the next click to generate a NEW sourceInstanceId even when the previous upload had already committed. This produced an accidental second purposeful copy. The original Owner Room now creates and reads back a minimal, local, durable **metadata-only** source checkpoint BEFORE every file POST (source UUID, SHA-256, exact filename and size, and any expected revision head). It contains **no original file bytes, no key, no personal file contents**.

The previously held source identity is reused on exact file retry after HTTP failure or page reload; the existing same-identity/same-bytes R2 policy makes the request idempotent. The new **CHECK HELD SAVE** control makes a read-only private index and exact byte verification contact to clear an already committed save without another POST. Changing the file or selecting a different revision while a pending source is held causes HOLD; a corrupt or unavailable local checkpoint causes HOLD before any remote write. Only verified private current-head source bytes release a checkpoint. No new front door or automatic cloud publication.

The original phone/desktop browser court now tests a commit followed by HTTP 502 acknowledgement loss, actual page reload, refusal to upload different bytes, a read-only held-save recovery, and exact same-identity retry. Neither route creates a second purposeful source.

**CP24 cold native re-entry:** the SAME existing tools/owner-vault-lineage-recover.mjs offline CLI now extracts an original asset version with the identity-bound filename UUID__safe-original-name.ext, rather than a generic UUID.bin. One original file is written per recovered revision. The extension is preserved for direct opening/editing in an actual native audio, document, graphics or code application, while the UUID prevents clashes. Unsafe packet-supplied path separators and control characters are removed; overlong names are bounded without losing a reasonable extension; any existing destination is refused. HTML recovery keeps the historical UUID.html path. All exact-byte checks, directory fsync/readback, offline audit, source preservation and no-overwrite protections are inherited.

**Evidence discipline:** only the final CI success can establish bounded synthetic source and browser proof. Real owner-device R2 contact, independent off-site possession, larger files above 12 MiB, complete project-directory custody and universal external editability remain HOLD. Custody parent PR #601 and child PR #621 stay draft until safely admitted.

## CP25 — Multiple sovereign JM originals in one offline recovery push (29 October 2026)

This strengthens the **original** CP20 native offline recovery utility, not a second file manager, alternative Vault or temporary duplicate. CP25 accepts **2–8 separately exported original-lineage packets**, including a mix of HTML game/app sources and raw binary music, graphic, document or code sources. It preflights all packets and their exact cryptographic ancestry before creating a destination folder. It refuses more than **64 MiB in combined original source bytes**, duplicated revision UUIDs, overlapping purposeful source identities, unexpected filenames or unsupported packet families.

**Usage (existing tool, independent of ChatGPT and the Estate host):**

    node tools/owner-vault-lineage-recover.mjs --input original-game.json --input original-music.json --input original-art.json --verify-only
    node tools/owner-vault-lineage-recover.mjs --input original-game.json --input original-music.json --input original-art.json --output-dir ./my-new-cold-recovery
    node tools/owner-vault-lineage-recover.mjs --input original-game.json --input original-music.json --input original-art.json --audit-dir ./my-new-cold-recovery

The original CLI reconstructs every exact version once into **one newly created, non-overwriting directory** with distinct source UUID identities and native extensions where appropriate. The single recovery manifest includes the independently hash-bound provenance of each selected lineage. The existing fsync, no-follow filesystem inspection, no-overwrite and readback gates remain active. The separate audit process refuses a tampered source, forged receipt, extra file, missing ancestor or changed original.

**Synthetic test admission:** reconstruct three original source lineages together—a revised HTML game, a revised WAV audio original and a separate PSD art original with intentionally equal source bytes to another purposeful use—while preserving all five version identities; prove refusal of corrupted packet, overlapping purpose, extra source, changed file and existing output directory. Test-only fixtures are removed afterward; no real owner body or R2 object is deleted.

**No unearned claims:** CI demonstrates an independently executable software route, not physical recovery from an owner's second device, offsite possession, fully deployed version propagation, universal media editors or storage-retirement authority. Original files above the CP21 12 MiB per-file ceiling, directory-shaped source material and automated all-family sync remain HOLD. CP25 reuses proven sources and does not broaden public access to private file contents.

## CP26 — Larger original files, one sovereign source (29 October 2026)

**Native extension, not replacement.** The existing authenticated JM Owner Vault API and Owner Room now support a second additive upload path for one original file of up to **64 MiB**. Files up to 12 MiB still use their original single-R2-object path unchanged. Larger ones are uploaded as **immutable 2 MiB binary source pieces**, never HTML wrapping or separate creative bodies. One locally checkpointed transfer/uploadId and one purposeful sourceInstanceId bind the pieces to one original file. The original source index records a single completed `chunked-v1` asset with part hashes, total bytes and original filename/type.

**Integrity and continuity.** Each part is SHA-256-verified after an actual R2 write and independent readback; retries using the same uploadId can only succeed for the same original bytes and source identity, not overwrite a part. A completed index entry is admitted only after ALL source parts, original-purpose identity and the full-file SHA-256 are verified, using original ancestor CAS rules and guarded index readback. A dropped acknowledgement retains the local CP23 source checkpoint; reselect the exact same file to resume the identical part keys. Different file, changed revision, missing piece, corrupt part or malformed private index = explicit HOLD. The original UI reconstructs one file on authenticated download and verifies SHA-256 before offering it to the owner; no automatic publication occurs.

**Bigger file is not bigger unsupported claims.** CP22 whole-lineage export remains bounded to **24 MiB aggregate** and eight versions. A completed large file above that boundary is still individually downloadable in exact bytes, but is NOT represented as having a proven portable whole-lineage export or independent cold backup. The original CP20 offline CLI now permits verified larger individual source records only when a valid packet is within its fixed total/packet limits. Real native editor interoperability, directory-shaped project roots, source files over 64 MiB and actual physical-device/offsite recovery remain HOLD.

**Storage discipline.** Uploaded pieces become the original indexed source after finalization, not purpose-specific permanent wrappers. An interrupted pre-finalization transfer can leave unindexed R2 parts; these are protected potential original bytes, not declared retired or automatically removed without a safe owner-authorized reconciliation. Explicit removal of an indexed chunked *leaf* proceeds only after ancestry veto and source verification; each R2 part must be absent on independent readback before removal can be acknowledged. No broad cleanup or deletion permission is inferred.

**Proof court.** Existing Node tests create 13 MiB of actual non-UTF-8 original bytes, upload in seven parts, refuse corrupt parts, missing parts and changed-byte reuse, finalize to one indexed source, exact-download, export a valid bounded single-file lineage, cold-recover it with the ORIGINAL independent CLI and audit its identical native bytes. The existing Access Mesh synthetic phone/laptop browser test deliberately drops the acknowledgement at part four after storing it, reloads, resumes exactly the same upload ID, checks 7 pieces become ONE original source, and validates a native file download. CI completion ≠ deployment or proof of live owner files.

## CP27 — read-only interrupted-part reconciliation and missing-only restart (draft, 29 October 2026)

The original authenticated `functions/api/owner/vault.js`, source-identical Owner Room in `estate-owner-vault.js` / live `estate-app.js`, original synthetic R2 court and phone/laptop browser regression are extended **in place**. There is no second Vault, alternate backend, replacement UI or extra permanent storage carrier.

- **Inspection:** a new owner-authenticated POST action `inspect-asset-parts` takes the same checkpoint-bound 64 MiB/32-piece descriptor. It reads only that upload UUID's known R2 part keys (no private bucket enumeration), hashes every present raw part, validates byte length, exact intended source, original file identity and revision preconditions; reports a bounded `present [{partIndex,sha256}]` and `missing [partIndex]`. It creates, overwrites and deletes **zero** objects or indexes. Corrupt/tampered pieces or a changed revision head cause HOLD, not an invented clean status.
- **Restart:** the existing Owner Room first reads back that status, confirms the local selected original still matches its durable metadata-only checkpoint, verifies that every claimed-present part digest equals that selected local original, sends only missing 2 MiB chunks, then uses the original immutable index finalizer and exact whole-file remote readback. No fresh intended-use or upload UUID after lost acknowledgement.
- **Check held save:** for an unindexed large-file checkpoint, the existing read-only owner action reports how many exact protected pieces remain in R2, without silently clearing the checkpoint or classifying them as an offsite backup. Wrong-file, missing local file or changed head retain the HOLD.
- **Source court:** deliberately exercises unauthenticated denial, an empty upload, invalid revision precondition, verified 3/7 present pieces, 4 missing, read-only no-mutation comparison, hostile wrong source metadata, complete indexed file, and prior CP26 13 MiB cold recovery.
- **Browser court:** synthetic phone and laptop viewports lose the acknowledgement after storing the fourth piece, reload the exact original, preflight read-only status and submit a **total of seven** piece POSTs (four before the interruption, three missing after) rather than resending the four protected existing pieces. The final native original is independently downloaded and compared byte-for-byte. These are browser mocks, **not** a real R2 or owner-device proof.

**Unclosed boundaries:** unindexed/orphan piece lifetime still needs deliberate owner-authorised reconciliation; nothing is automatically garbage-collected. A lineage exceeding the existing **24 MiB / eight revisions** export gate remains non-portable despite a 64 MiB single-file Vault; no false offsite-cold-backup claim. Protected parent PR #601, real provider/private R2 contact, owner-device tests, source-format-specific editability, live deployment and whole-Estate independent access remain HOLD. Do not merge, delete real originals, claim cleared quota or promote above source acceptance without actual CI success at the final SHA.

## CP28 — extended 64 MiB portable native-source lineage (29 October 2026, protected draft)

**Original bodies preserved:** the authenticated JM Owner Vault API, the **same** Owner Room in `estate-owner-vault.js` and exact `estate-app.js` mirror, and the original `tools/owner-vault-lineage-recover.mjs` cold recovery utility. This is NOT a new Vault, service, browser application, backend, automatic uploader, format conversion or independent offsite storage provider.

- The unchanged original `export-asset-lineage` route still offers up to 8 ancestors and **24 MiB total**. There is no unsafe blind expansion of that old single-response path.
- New explicit authenticated `export-asset-extended-plan` preflights the **full contiguous same-purpose ancestor chain**, up to **8 revisions and 64 MiB aggregate**, and returns metadata, exact identity and an index-identity pin. No owner bytes included in the plan. Over-limit full histories refuse, with no partial-backup success.
- New read-only `export-asset-extended-shard` returns a single **8 MiB maximum** piece, bound to the plan, target original revision, source identity and exact index pin. For a 64 MiB chunked original it reads and verifies at most **four existing 2 MiB R2 source pieces** per request, rather than creating a 64 MiB server JSON payload or a second R2 original.
- The original Owner Room adds **EXPORT EXTENDED (64 MiB)** alongside (not instead of) **EXPORT FULL LINEAGE**. It validates each shard's identity, length, SHA-256, canonical base64, contiguous offset and plan pin, reassembles each complete original, checks its exact whole-file SHA-256, validates full ancestry and offers **one portable JSON download**. The browser memory footprint of this assembled JSON is materially larger than the R2 per-request bound: phone/device acceptance remains HOLD until tested physically.
- The unchanged original offline CLI accepts `JM.OwnerVault/0.1.AssetExtendedExport` using `--input saved.json --verify-only`, `--output-dir NEW`, `--audit-dir EXISTING`; each shard and complete native original is independently hashed, identity-bound, and restored into the same UUID-plus-original-extension format. No overwrite of existing destination, no external Vault, and no unverified source promotion.
- Original source test court now constructs **two real synthetic 13 MiB+ revisions**, exceeding the old 24 MiB export total, verifies original legacy HOLD, exports all bounded shards, restores exact full file history in an independently spawned offline Node process, audits the native files, refuses missing/corrupt/cross-purpose packets and proves the R2 objects unchanged.

**Honest acceptance boundary:** 64 MiB **aggregate lineage**, not yet eight independently 64 MiB revisions. More than 64 MiB in one revision chain remains fail-closed for a future segmented multi-download transport. Existing 64 MiB single-file storage is untouched. A phone/browser may refuse or struggle with a ~90 MiB JSON download even when server replies stay bounded. Actual authenticated provider storage, real owner-device/browser downloads, external editing and writeback, offsite custody, protected parent PR #601, release merge and deployed propagation remain HOLD. No original file was deleted. Only declare GitHub PASS after verifying all workflows on the exact final SHA.

## CP28 — recover >24 MiB original creative history without network or chat (29 October 2026)

The original CP26 R2 Vault securely stores up to **64 MiB per original file**, but its prior CP22 single JSON export is intentionally limited to **24 MiB for all versions combined**. CP28 closes that independent-cold-recovery gap **without raising the unsafe single-JSON limit** or creating a second cloud storage authority.

**Original Vault API:** owner-authenticated read-only `GET ?mode=export-asset-catalog&asset=UUID` returns a bounded **8-version complete ancestry** as `JM.OwnerVault/0.1.AssetPartsCatalog` with every original version ID, purpose sourceInstanceId, native name, size, SHA-256, immutable 2 MiB part names and part hashes. Each version can be up to **64 MiB**; maximum 8 versions, 512 MiB across an explicitly selected lineage (and potentially 256 separate files). Existing R2 parts are NOT copied or re-wrapped. Small original-file R2 objects are split *on authenticated read* into 2 MiB pieces. Each `GET ?mode=export-asset-part&asset=UUID&part=N` yields actual source bytes with immutable index/custom metadata checks, exact size, per-part hash, ETag-version conflict checks and owner authentication. None of these GET endpoints writes, deletes or snapshots owner originals.

**Original Owner Room:** `EXPORT COLD PARTS` offers the manifest for deliberate saving, then `DOWNLOAD NEXT VERIFIED PIECE` offers **one** hash-confirmed piece per owner click, retaining exact filename/UUID. It never auto-triggers hundreds of browser downloads, silently syncs files, marks a downloaded piece as successfully saved on disk, or claims that a catalog alone is a backup. Browsers on phones and laptops may ask for download permissions. All pieces and the catalog must be saved into the **same folder**. A corrupted download response causes HOLD without advancing the identity or piece number.

**The original CP20 offline recovery CLI now also accepts:**

    node tools/owner-vault-lineage-recover.mjs --parts-catalog JM_Vault_Cold_Catalog_UUID.json --verify-only
    node tools/owner-vault-lineage-recover.mjs --parts-catalog JM_Vault_Cold_Catalog_UUID.json --output-dir ./new-independent-native-recovery
    node tools/owner-vault-lineage-recover.mjs --parts-catalog JM_Vault_Cold_Catalog_UUID.json --audit-dir ./new-independent-native-recovery

The CLI runs **offline, without the repo, browser, Vault, internet, owner key or AI**, validates complete ancestry and every part before writing anything, SHA-256-checks the full native source, and reconstructs exact-byte `UUID__native-original-name.ext` files with one source identity per ancestor. It writes one durable recovery receipt and refuses existing output directories, missing/tampered parts, cross-purpose ancestry, forged part filenames, unexpected source files, symlinked source folders, or a damaged native output on independent later audit. Part files are purpose-specific **backup custody material** (not extra permanently mounted creations); no R2 part or owner original is deleted by this work.

**Test fixture:** two distinct revisions of one original JM music source, approximately 13 MiB and 14 MiB, whose complete ancestral source history exceeds 24 MiB. The historical CP22 JSON route must return its existing 413 limit; CP28 exports a small read-only catalog + 15 separately authenticated exact parts; an isolated copy of the ORIGINAL offline CLI verifies, restores both complete native revisions, independently audits after process exit and refuses missing/tampered/cross-purpose or changed source. Browser QA tests phone and laptop download behaviour, a refused corrupt piece, and deliberate per-click verified recovery. Tests touch synthetic private R2 only.

**Evidence boundaries:** This is source/automated-test development, not proven physical owner offsite possession, full Estate sync, persistent host deployment, a file manager, or blanket deletion approval. Owner still must collect and independently verify all downloaded parts. Both parent #601 and CP21–CP28 child #621 remain protected drafts, unmerged and unpublished. There is no automatic retirement or hidden duplicate publication.


## CP29 — bounded-memory 69 MiB native cold recovery audit (29 October 2026)

**Recovered before rebuilding:** the original CP28 **catalog + 2 MiB binary pieces** already supports up to eight original revisions of 64 MiB each (a maximum **512 MiB total**, source-bound). It independently verifies, restores and audits exact original file bytes with the same `tools/owner-vault-lineage-recover.mjs`, using `--parts-catalog`. The older CP22 24 MiB and CP28 64 MiB single-JSON routes remain available and unchanged. Do NOT invent another export format, download app or backend.

**Real CP29 change:** CP28 restoration and independent audit previously reloaded a whole recovered native original (up to 64 MiB) into memory *after* writing its verified 2 MiB parts. They now use `verifyColdNativeInPieces`, opening the output once with `O_NOFOLLOW | O_NONBLOCK`, checking opened regular-file identity/size, reading each exact original 2 MiB-or-smaller piece at its explicit offset, comparing its recorded SHA-256, accumulating exact whole-original SHA-256 and checking the opened file's final identity. No full 64 MiB native-file buffer is allocated in final readback or independent audit. No original source content, R2 index, filename or revision identity is modified.

**Source adversarial court:** synthetic offline lineage with two native JM project revisions totalling **69 MiB**, including the final 1 MiB tail piece; the original CLI is copied into a separate working location and must verify, rebuild exact protected native filenames, independently audit, reject corrupted restored bytes, refuse overwrite and refuse a missing source piece **before creating** an incomplete output destination. No owner-private original used and no user-owned bytes deleted; only disposable test fixtures are retired.

**Proof boundary:** 69 MiB exact native source recovery and synthetic 2 MiB bounded audit may be admitted on actual CI results only. The whole 512 MiB aggregate catalog has a defined source bound, not a physical-device or full-bound 512 MiB performance pass. Browser download receipt/physical possession, session reload continuity, private live R2, cross-device editing, deployed propagation, PR #601 custody release and PR #621 promotion remain HOLD. Catalog integrity is unkeyed SHA-256, **not** cryptographic proof of trusted authorship or offsite existence. No universal-access or storage-retirement completion is asserted.

## CP29 — independently recovered native original → protected source revision (29 October 2026)

This is the **return path**, not a new editor or importer. Use the original JM offline recovery CLI (CP20–CP28) to restore your original native file to another device. Open and edit the exact recovered file in your actual music, graphics, document, code or other native application. In the SAME original JM Owner Room, select the offline **recovery-manifest.json** in the new cold-reentry selector and your externally edited native file in the existing ORIGINAL FILE selector, then press **VERIFY RECOVERY AND PREPARE REVISION**.

What this does:
- Treat the local recovery receipt as **untrusted metadata**, not a key or authorization. Validate its exact sovereign original version IDs, sourceInstanceId, complete ancestor chain, bytes, SHA-256 and declared origin schema. Authenticate to the EXISTING private R2 Vault and demand that every original ancestor matches the current source index and that the selected recovery head is STILL the current source head. Independently read and hash the full current private head before preparing the edit.
- Demand actual changed edited source bytes. A stale source head, different-purpose receipt, forged ancestor, incomplete metadata, unconfigured key, pending upload, unchanged original or over-64 MiB edit fails closed before any POST. The browser does **not** claim that reading a receipt proves owner-device independent audit, cryptographic author signature or native application acceptance.
- On success, set ONLY the same original Owner Room revision precondition; **no file bytes upload on PREPARE**. The owner presses the existing **SAVE SELECTED ORIGINAL FILE** to create an explicit NEW original-file revision with protected ancestor; it cannot overwrite the historical source. Cancel continues to work.
- The original file name/type is preserved, even if the cold-restored edited file is named `UUID__Original_Project.ext`. CP23 metadata-only pending checkpoint separately records that local filename and the original Vault filename, retaining the SAME purposeful source and revision precondition through a lost write acknowledgement/reload; verify actual remote head and exact source bytes before releasing it. No duplicate purpose, second cloud authority, automatic sync, publication, deletion or additional permanent source copy.
- Phone and laptop synthetic authenticated browser acceptance tests challenge stale current head, cross-purpose and altered receipt, no-POST preparation, recovered native filename, a committed write with lost HTTP acknowledgement, exact same-file retry after genuine browser reload and exactly ONE new private version. Original CP08, CP21–CP28 and source tests remain required.

**Release boundary:** Source/CI pass is not production deploy, physical device re-entry, owner private R2 confirmation, automatic website propagation, offsite possession, author provenance, universal native editor compatibility or storage retirement. Parent PR #601 and this child #621 remain protected draft until their original owner/provider gates are met.


## CP30 — resumable cold-part export without claiming browser possession (29 October 2026)

**Reused unchanged:** original Owner Vault R2/API, original AssetPartsCatalog, 2 MiB binary part endpoints, CP28 native independent cold CLI and original Owner Room (`estate-owner-vault.js` plus exact `estate-app.js` mirror). No second exporter, backend, auth system, storage copy, or hidden source ingestion.

Previously the segmented owner export session `coldExport` existed only in memory: reloading the phone or laptop page reset the cursor. The browser also could not honestly know which offered files were actually saved. CP30 adds a **strict metadata-only local checkpoint** containing only `schema`, `selected_id`, and SHA-256 of the authenticated complete catalog; **no file bytes, personal content, original filenames, or owner key are stored in localStorage**. A new `RESUME VERIFIED COLD EXPORT` owner action requires explicitly selecting already saved binary pieces using the existing Owner Room. It re-fetches the private catalog under the original owner authentication, refuses changed/stale catalog fingerprints and source identity, individually validates each selected file's exact unique expected name, size and SHA-256 (at most 2 MiB per file), then skips **only genuinely reselected and hash-verified files** when continuing the original `DOWNLOAD NEXT VERIFIED PIECE` path. A fresh click never fabricates downloaded-file possession or marks remote source deletion as safe.

A failed resume, corrupt local piece, duplicate/unexpected filename, absent checkpoint, wrong private source or changed catalog is HOLD; it cannot create a new source identity, call POST, discard existing owner files, or mark independent offsite custody. The separate **CANCEL HELD COLD EXPORT** action removes only the metadata checkpoint (not locally downloaded files or original R2). The owner still saves every offered part and catalog to the same folder and runs the original independent offline `--parts-catalog --verify-only` and `--output-dir`/ `--audit-dir` before any backup or cold-recovery claim.

Source browser court: two synthetic viewports (390px phone and 1366px laptop) export a three-piece native original, save and independently read first part, reload, refuse a locally corrupted part, refuse a semantically valid-shaped changed authenticated catalog, resume from the exact original identity and verify that only missing parts two and three download; no duplicate network part fetch or R2 write. This remains **synthetic browser evidence, not physical owner-device possession**. No real key, owner storage, production merge, source removal or offsite audit was performed. CP30 source/CI acceptance is only earned on final exact GitHub head, with parent #601 and child #621 still protected drafts.


## CP31 — full-run owner-chosen cold-folder export and actual-disk test (29 October 2026)

**Purpose:** remove the requirement for up to **256 separate download clicks** for a complete, already supported **8 × 64 MiB = 512 MiB** native original revision history, without inventing a second JM vault, backend, object store, importer, user identity, or data copy. Reuses the original `JM.OwnerVault/0.1.AssetPartsCatalog`, unchanged authenticated 2 MiB original R2 part responses, existing exact-part integrity SHA-256, original `owner-vault-lineage-recover.mjs --parts-catalog`, and the same original Owner Room/ `estate-app.js` body.

**New owner-initiated path:** `SAVE VERIFIED COLD FOLDER` is an additional action on each real original file version, available only where the browser actually supports the permissioned File System Access API (`showDirectoryPicker`). The owner explicitly chooses the destination directory. No handle, directory path, source bytes, key or file content is persisted to localStorage. On the same original owner-authenticated catalog, this path enforces complete same-purpose ancestry/byte limits, the CP30 held-catalog fingerprint, and predictable UUID-bound source part names. Each part is downloaded at most once if missing, checked against the original server response's exact version/part SHA-256, written into the selected directory, then **opened from the actual folder and SHA-256 verified again**. Existing matching files are verified and reused without re-downloading; an existing different file or catalog causes HOLD, not overwrite. A complete catalog is written/readback-checked only **after** all binary pieces have exact disk readback and the private catalog is re-fetched to reject a changed remote current source. Partial files stay on the owner's device for explicit inspection and recovery, never silently deleted.

The original **EXPORT COLD PARTS**, **DOWNLOAD NEXT VERIFIED PIECE**, and **RESUME VERIFIED COLD EXPORT** remain fully available as the phone/browser fallback. Unsupported browsers receive that direct next step, not a fake success. Browser directory APIs do not provide POSIX atomic `O_EXCL` semantics or immunity to hostile concurrent filesystem modification, so the ordinary check-before-create is **not** claimed to be an atomic no-overwrite guarantee. This path does **not** authenticate a remote source into another JM native app, automatically import/edit, offsite replicate, modify a cloud object, or claim that browser readback equals an independent offline audit.

**Real-output CI acceptance court:** Playwright owner interactions use a *synthetic* owner key and File System Access permission adapter backed by **real temporary CI filesystem files**, rather than relying only on in-memory download events. Two different original native revisions produce five distinct immutable 2 MiB-or-smaller files plus one real JSON catalog; the original independently spawned CLI verifies them without an API, restores exact native UUID-prefixed editable filenames, and performs a distinct cold audit with exact SHA-256 checks. Phone-width and desktop-width fixtures test repeat export without any redundant network GET, corrupted pre-existing local original HOLD, valid-shaped changed catalog HOLD, absence of remote writes, and unsupported-browser fallback. Only isolated temporary test-created files are retired. This is reproducible source/device-emulated CI, **not** a real owner's independent device filesystem proof. Do not claim 512 MiB real end-to-end tested merely because its complete-source schema bound is 512 MiB.

**Protected release:** Parent PR #601 and child PR #621 remain draft/unmerged. Actual owner device, actual private R2/secret bindings, independent offline possession, real native application edit, private revision save-back, public deployment and all other sovereign JM creations remain separate unproven acceptance gates. Nothing is deleted or assumed backed up; no permanent 'usage-only' descendants are created by the implementation.


### CP31 full stated bound — actual isolated disk test (512 MiB, 256 pieces)

CP31 now includes a separate original Node regression that constructs **eight** sovereign original revision IDs of exactly **64 MiB each**, with **256 unique 2 MiB binary source files** and valid contiguous same-purpose ancestry (total **536,870,912 original bytes**). It invokes the original, independently copied JM offline recovery executable to SHA-256 verify all 256 saved files, reconstruct eight complete native project sources on actual CI disk, and audit them from disk in a second invocation. A fabricated ninth revision and a damaged actual final source part must be rejected. Only synthetic temporary fixtures are removed after tests; no Vault sources, owner original bytes or personal credentials are handled.

**Proof discipline:** This is a **full maximum 512 MiB source-CLI bound** test on CI storage, not proof that a real browser, owner laptop, Fold/Oppo, Cloudflare production or external backup provider can transfer/recover 512 MiB. The browser directory test uses five real binary files and the original CLI end-to-end, with a simulated browser directory permission adapter backed by actual temporary CI disk. CI PASS must be verified on exact final commit.


### CP31 real owner-computer Windows contact and portable cold recovery

On 29 October 2026 the already authorised **GroundZeroJM** remote owner device was found **online**, running **Windows with Node.js v24.19.0** and Git. An explicit read-only filesystem compatibility check established that this Node build exposes none of `O_NOFOLLOW`, `O_NONBLOCK`, `O_DIRECTORY`, and rejects opening/fsyncing an existing Windows directory with `EPERM`. Hence the original Linux-only CLI could not have been truthfully claimed to work on the owner's actual laptop.

**Original CLI correction, not replacement:** existing Linux/macOS runtime continues to use its native `O_NOFOLLOW | O_NONBLOCK` guarded file handle and actual opened-directory `fsync` as before. **Windows** now checks every existing directory path component for symlink/reparse-style links, checks an exact file via `lstat` before opening, validates the OPENED handle's `dev/ino` against both pre-open and current path, bounded-reads original bytes and validates the opened handle/path again; `wx` creation and per-file `fsync` remain mandatory. A real Windows directory `fsync` is unavailable through Node: source recovery receipts on Windows explicitly declare `directory_fsync_proven:false`, `atomic_nofollow_proven:false` and a `WINDOWS_FILE_FSYNC_READBACK; DIRECTORY_METADATA_FSYNC_UNAVAILABLE` boundary. This is **not** atomic native Windows reparse-point resistance, filesystem journal power-loss durability, or equivalent to Linux directory syncing; do not upgrade these narrower semantics to universal custody.

**Actual owner-device execution performed:** the original changed CLI was fetched by exact GitHub commit to a newly created unique TEMP folder on authorised GroundZeroJM. A separate synthetic 8-byte native original and SHA-256-bound one-part catalog were created **only inside that temporary folder**. On actual Windows Node the CLI returned `OFFLINE_SEGMENTED_SOURCE_VERIFIED`, recovered the exact `UUID__JM-Original.jmproject` native bytes via `OFFLINE_SEGMENTED_SOURCE_RECOVERED` with both Windows limitations explicitly false, independently audited via `OFFLINE_SEGMENTED_SOURCE_AUDITED`, and correctly refused a corrupted source via `COLD_PART_EXACT_HASH_HOLD`. The process finished with exit code **0** and emitted `JM_CP31_TEMP_FIXTURE_RETIRED`, confirming the synthetic files were removed. No actual JM owner-private Vault bytes, original creator asset, real source editor, cloud secret, real provider R2, other PC, family device or permanent source directory were accessed or modified.

This establishes **real physical owner-computer Windows synthetic cold-recovery execution** of the corrected source, *not* real original-device custody or a real private editor round trip. A repeatable Windows-latest independent CI job is added to the original Owner Vault workflow; its pass status must be verified at exact PR HEAD, separate from the actual owner-device contact proof. Parent PR #601 and child PR #621 remain protected draft/unmerged and may not be silently deployed or retired.
