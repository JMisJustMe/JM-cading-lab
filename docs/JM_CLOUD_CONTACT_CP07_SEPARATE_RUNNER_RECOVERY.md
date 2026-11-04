# JM ECOSTATE CP07 — independently started recovery of genuine v0.5.1 hosted service

**Development proof, not a live host, independent owner infrastructure, owner-controlled backup custody or production migration. Do not auto-merge or deploy.**

## Preserved source identities

- JM original Cloud Contact v0.5.1 hosted repository remains `JMisJustMe/jm-cloud-contact-server-first-cloud`; exact source commit `0921217d95285bcb21cda7a995d02f7ec0725810` is checked in both GitHub jobs. That source is **not rewritten**.
- JM CP02 supervisor, CP04 backup, CP05 genuine local server recontact, and CP06 authenticated whole-file AES-256-GCM backup/restore remain the original separate organs. This CP07 is an additive transport/contact adapter, not a replacement server or second front door.
- Distinct recipients: Cloud Contact space, Game Live, Service Mesh / RouteVault, Market Lab file fallback, Zezu history-return, original ECDSA receipt-signing identity. Their persisted state files remain independent, with original filenames and hashes preserved.

## Exact two-runner sequence

The draft GitHub workflow `.github/workflows/jm-cloud-contact-cp07-separate-runner-recovery.yml` has two **separate hosted runner jobs**:

1. `source` executes on `ubuntu-24.04`, checks out the pinned original v0.5.1 source and the CP07 additive adapter from the PR branch, runs six adverse transport checks and CP06's five encryption/inventory tests. It starts the genuine server under JM supervision, creates a real disposable Cloud Contact space, registers a synthetic Game player and Mesh authuser, creates and saves a workspace, reads Zezu canonical history and Market's file-fallback route and verifies the original P-256 signing identity.
2. `source` **stops the real process**, inventories every file-backed organ and its signing identity, creates and verifies a genuine CP06 whole-file encrypted backup, and destroys its temporary state. GitHub's temporary artifact storage receives **only the encrypted synthetic state and a public reference containing state hashes/ids — not plaintext private keys, tokens or bearer credentials**.
3. `restore` executes on a separate `ubuntu-22.04` runner with a fresh checkout at the identical donor commit and newly installed dependencies. It downloads the relay artifact, validates the exact carrier and public reference, restores the original files byte-for-byte into a new private directory, and boots the original v0.5.1 server through the same JM supervisor.
4. On the fresh process it verifies genuine `/ready`, the Cloud Contact receipt hash, public key identity and ECDSA signature, native authenticated Game and Mesh recipient reads, Zezu carrier readback and Market file-fallback readback. It emits a bounded public-safe recovery receipt. Restored runtime state is removed after the check.

These two jobs have independent ephemeral filesystems. Their test custody is **GitHub-hosted temporary**. They do not establish that the user's laptop, another owner-controlled device, a leased VM, or an off-site permanent storage account has actually been provisioned or operated.

## Critical explicit synthetic-key boundary

This CI fixture intentionally uses a **deterministic, publicly derivable test encryption key and deterministic test server secret** so each separate runner can recover WITHOUT transferring a real secret between jobs. Thus **the ciphertext does not provide confidentiality against anyone who can read this public test code and artifact**. Only disposable synthetic data is allowed; NEVER upload owner data, production secrets, customer data or any real private signing identity through this test route. The encrypted carrier is a functional transport/recovery interoperability test, not secret-storage security proof.

Real operational recovery needs owner-generated encryption keys and server credentials held independently from the data and never hardcoded in source, plus authenticated separate storage / access controls, a documented key-loss and revocation policy, repeated restore drills and a live owner-controlled second host. A public CI fixture cannot fulfill those gates.

## Non-transferable hold list

- Market's optional PostgreSQL data and its snapshots/witnesses are **not** included by the CP06 file-only carrier. External database mode is refused rather than silently suppressed for a supposed full recovery. A real database snapshot with source/version/WAL consistency and restore proof remains open.
- GitHub Actions artifacts expire. Their availability is not owner-managed off-site durability, an independent cloud storage service, or an audited long-term backup policy.
- Deployment controls in the pre-existing Estate production workflows were not adjusted, production was not contacted, and no PR is merged. Real public HTTPS, stable user-facing endpoints, billing/Stripe, owner Fold/laptop/browser contact and any real traffic cutover remain unpassed.
- Original server profile startup can still fall back on malformed data; adding a separate preflight corruption guard before a live restore remains necessary.
- The hosted source dependency `pg` remains sourced via the donor's published `package.json` without a pinned lockfile in this proof; supply-chain reproducibility still needs separate hardening.

## Reentry

From the existing PR source, pinned donor Git checkout and `pg` installed, producer and consumer CLI forms are:

```bash
node agent-runtime/host-adapters/jm-operated-host/cross-runner-recovery-v051.mjs produce /exact/donor/repository /private/new-artifact-dir /private/new-producer-proof.json
node agent-runtime/host-adapters/jm-operated-host/cross-runner-recovery-v051.mjs recover /exact/donor/repository /downloaded/artifact-dir /private/new-consumer-proof.json
```

**Never use these public-fixture commands for private owner data.** They exist to prove the portability/interaction mechanism, and the implementation declares the public key-custody boundary in every result. The next real gate is operator-owned encrypted backup and separate-machine readback with independent secret custody; not merely repeating the same two CI jobs.

**DING** is earned only after the genuine two-job run passes on the exact reviewed commit and a non-secret receipt is fetched from that workflow. **COLD DING, DONG and GONG** must retain their separate evidence, routing and durability scopes.
