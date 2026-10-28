# JM CP05 — actual hosted Cloud Contact encrypted recovery contact

**Development scope only. No merge, deployment, production-secret access or running-host changes.**

CP05 extends the existing JM Cloud Contact CP03 local supervisor and CP04 owner-held AES-256-GCM cold backup; it does **not** create a second server or modify an existing sovereign JM body. Donors remain separate and unchanged. Source promotion gates on stacked PRs #560, #564 and #567 remain open.

## Correct source provenance

The frozen JM Cloud Contact v0.5.0 source in CP03 is a valid ancestor but **not the recorded currently hosted software descendant**. CP05 selects the actual public repository `JMisJustMe/jm-cloud-contact-server-first-cloud`, commit `0921217d95285bcb21cda7a995d02f7ec0725810`, containing `JM_CLOUD_CONTACT_SERVER_v0_5_1_HOSTED_DESCENDANT.mjs` and its game, mesh, market and zezu profile imports. The GitHub workflow checks out **that exact commit** and checks its Git SHA before running. This is a *pinned known hosted source*, not a claim about the latest live deployed instance at the time of reading.

## Direct proof program

`agent-runtime/host-adapters/jm-operated-host/hosted-recovery-v051.mjs`:

1. Verifies the expected hosted v0.5.1 source package and required profile files are present; CI separately verifies exact commit.
2. Starts the actual existing server unchanged through `JMNodeSupervisor` with randomly generated local credentials and disposable private state paths; checks HTTP `/ready` reports `0.5.1-hosted` and profile/signing readiness.
3. Creates a real disposable `/v5/spaces` server space; captures signed receipt hash, signing key ID, public signature and state/signing-byte digests.
4. Stops the server, then invokes the existing **CP04** `createColdBackup` (no backup during live writes). Performs decrypt/verify/readback and checks the encrypted carrier does not contain raw state identifiers or private-key headers.
5. Rejects the wrong encryption key and a tampered authentication tag without creating a restore target.
6. Deletes only disposable original test state after confirmed shutdown; decrypts the backup into a different state directory.
7. Cold-starts the actual unchanged server against that restored directory, checking readiness and the **exact same space, receipt hash, signed signature, key ID and state/key digests**.
8. Cleans up the entire private temporary test directory. No credentials, state payloads or signing keys are copied to GitHub or the evidence artifact.

Run in a trusted Node 22+ environment with the exact hosted donor source checked out and its published package dependencies installed:

```bash
node agent-runtime/host-adapters/jm-operated-host/hosted-recovery-v051.mjs /path/to/verified/hosted-repo /private/new-cp05-proof.json
```

The GitHub workflow runs both the existing CP04 synthetic-state tests and this real-server recovery, and uploads the bounded JSON result only after success. **CI passing is not an independent long-term host**: GitHub's runner is temporary infrastructure for proofs, not JM-managed production.

## Critical explicit limits

- CP04 presently encrypts **only Cloud Contact root `state.json` and its receipt-signing key**. The hosted v0.5.1 server contains **independent game, market, mesh and zezu state**. CP05 does not cover them; no `whole-server` or full Estate restore claim is allowed until every state carrier is inventoried, captured, and restored with recipient-specific evidence.
- The server secret and admin credentials are intentionally outside CP04 ciphertext; the tests keep them in RAM. A real operator must preserve and rotate these through separate protected custody. Cloud data restoration without the correct server secret can break credential/receipt validity.
- The real server's startup fallback to `.bak` or fresh initial state on corruption is not remediated here. A production restore requires a separate fail-closed corruption gate and a custody-backed master key.
- No owner-operated server hardware, off-site backup service, independently stored backup, actual browser/Fold contact, public TLS, provider cutover, real live payments, streaming WebRTC or production migration is proved.
- Pinned `pg` dependency is installed on disposable GitHub CI from the donor `package.json` (lockfile not present). Reproducible locked transitive dependencies and software supply-chain attestations remain open.

## Next mechanism after a passing CI contact

**CP06** should make one stopped, authenticated snapshot of **all** distinct hosted v0.5.1 server state carriers (root, game, mesh, market, zezu and any independent secrets), verify encryption/restore on a second filesystem, and test all recipient APIs. Only then move toward separately controlled machine hosting, public HTTPS and live failure recovery. Never retire existing services merely because local proof passes.
