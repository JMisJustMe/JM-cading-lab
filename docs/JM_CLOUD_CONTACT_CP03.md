# JM-operated host CP03 — genuine recovered Cloud Contact contact

CP03 adds a reusable local contact harness under the existing JM-operated host adapter. It launches the **unchanged recovered JM CLOUD CONTACT SERVER v0.5.0 Profile Mounts body** through the hardened CP02 supervisor. It creates no replacement server, storefront, deployment service or new owner-facing door.

## Recovered authority and lineage

- Parent host source: `dd8abf50a05d777df2384ad6aaa957b2208c677e` in PR #560. Source promotion remains open because deployment workflow controls require unavailable authenticated access; the approved CP02 head is not changed by this work.
- Recovered successor package: `JM_CLOUD_CONTACT_SERVER_v0_5_GITHUB_SUCCESSOR_CANDIDATE_v0_1.zip`, SHA-256 `3eb0e0629ffbf1de184582b89d90d236827bfc204fd40e6d38109ed7921c651c`.
- Its 11-file manifest is pinned by SHA-256 `cad827d910b03fdfbaabe6abfecfecf57d1ca48fa61beedcef3f1d0e5be02e37`.
- Server source SHA-256: `25d44a24a7d9addf8793f0e4394bb569066b19e181e67aefc20cac5cd618db4d`. It matches the separately recovered standalone source byte for byte.
- The successor package identifies this as preserved frozen v0.5 source and includes its original profile assets, contract and 27-check integration QA. The historical v0.4.2 public-launch source remains preserved in its own repository.
- This recovery establishes exact v0.5.0 source provenance. It does **not** establish that v0.5.0 supersedes the separately recorded hosted v0.5.1 descendant. Latest hosted source reconciliation remains open.
- Build Mesh operation: `JMOP-8d301c75323e5c28762d7c00`.

## Run the existing body through its JM plug

Obtain the exact recovered package through the owner's source custody. Extract it without changing its contents. No dependency installation is required: the server, inherited QA and harness use Node built-ins only (Node 20+; observed local runtime Node v24.22.1/Linux).

```bash
node agent-runtime/host-adapters/jm-operated-host/cloud-contact-contact.mjs /absolute/path/to/recovered-package /absolute/path/to/new-evidence.json
```

The optional evidence file must not already exist. The source package is verified before launch and after the run. The harness copies the verified bytes into private disposable runtime directories, uses random test-only admin/server credentials, sets explicit loopback hosting and origins, then cleans up credentials, signing keys and runtime state on exit. The recovered source is never edited. No production credentials, external services or owner data are required.

## Direct observations

`JM_CLOUD_CONTACT_CP03_LOCAL_PROOF_20261028.json` records seven passing contact groups:

1. All 11 pinned source-package members match.
2. Actual `/health` and qualified `/ready` pass for v0.5.0, one original mounted profile and a signing identity.
3. The original inherited integration QA passes 27/27: authenticated space/member/event/command/signal APIs, capability denials, event deduplication, cold rejoin rotation, HMAC/ECDSA receipt verification, original control/runner asset serving and v3/v4 compatibility.
4. SIGKILL of the genuine server triggers the CP02 supervisor's bounded restart; exact private space state, receipt hash, signing key identity and persisted JSON digest survive.
5. A new supervisor cold-starts the same private state and returns the same snapshot.
6. A quiesced copy of data plus signing key is restored into a distinct directory and returns the same snapshot.
7. Recovered source bytes remain unchanged.

The receipt contains code digests and check names/results. Raw credentials, private signing keys, temporary filesystem paths and private space payloads are not exported. The 24 CP02 Node regression groups and existing nine-adapter conformance/Node–Python parity checks also pass.

## Claim boundary and remaining work

**Local genuine workload execution is proved. Remote platform independence is open.** The inherited QA uses synthetic SDP and software-reported Phone/Laptop traces; its labels do not prove physical devices or an actual WebRTC connection. TURN is unconfigured. No profile page is executed in a real browser during this contact.

The restore test is a stopped, local filesystem copy within one machine. It is not an automated encrypted backup service, independently durable custody, off-site disaster recovery or evidence that corrupt live state fails closed. The original server's corruption/fallback and signing-key error paths require further hardening before production migration. Preserve signing identity as well as data and provision stable server secrets through owner-controlled custody before real recovery.

No remote machine, public TLS, domain routing, Render shutdown/failure, live payments, production deployment, owner-device acceptance or latest hosted v0.5.1 parity is claimed. The CP02 trust and unauthenticated-readiness limits still apply. CP03 remains a development descendant until source promotion and its own release gates are earned.
