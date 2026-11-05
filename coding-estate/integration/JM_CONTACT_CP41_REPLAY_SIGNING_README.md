# JM CP41 — Original Contact Lab replay-backed signing

**Purpose:** Recover-before-rebuild evidence for the exact protected Contact Lab v0.1. An exported TraceBox JSON file is **re-executed from its actual intent journal inside the hash-pinned original code**, including all receipts, material changes, recovery, 128×5 lattice and final position. Only a matching re-execution can be signed.

This is **not** a new GameCore, not a fresh physics implementation, and not a claim that browser clicks were physical Fold8 touches.

## Authority and source

Original HTML SHA-256: `ed72ec0880af89925ab78fe0de125f47613217a3758d9a744dd08420e00c3310`. Protected original remains unchanged in Library and in the existing CP40 laptop recovery ZIP.

Reuse the existing [public CP39 game](https://jmisjustme.github.io/JM-cading-lab/coding-estate/integration/JM32_1DA_CONTACT_NATIVE_GAMECORE_CP39.html) and its **Export receipts JSON** button. Do not claim that a fabricated client-side receipt is authenticated until this verifier has reconstructed every state and recorded event from the original intent inputs.

## Execute on GroundZeroJM Windows

From a clean checkout of this repo, set paths to the original Lab (within the already-recovered CP40 archive), a real export downloaded from the game's UI, and the local owner's proof folder.

```powershell
$Script = "coding-estate/integration/contact-replay-proof.node.mjs"
$Lab = "C:\path\to\original\JM32_1DA_CONTACT_ENGINE_LAB_v0_1.html"
$Trace = "C:\path\to\JM32_1DA_TraceBox_0004.json"
$Custody = Join-Path $env:LOCALAPPDATA "JM\ContactEvidence"
node $Script inspect $Lab $Trace
node $Script sign $Lab $Trace $Custody "C:\path\to\verified-attestation.json"
node $Script verify-chain $Custody
node $Script verify-signature $Lab $Trace "C:\path\to\verified-attestation.json" (Join-Path $Custody "JM_CONTACT_ED25519_PUBLIC.pem")
node coding-estate/integration/contact-replay-proof.test.mjs $Lab
```

`sign` fails closed if it cannot independently replay the original output. It requires Windows DPAPI to protect the Ed25519 private key with the local Windows account. The private key is only stored encrypted at `%LOCALAPPDATA%\JM\ContactEvidence\JM_CONTACT_ED25519_PRIVATE.dpapi`; never commit or send it anywhere. The separate public key file can be shared to allow verification.

One host state file `JM_CONTACT_PROOF_CHAIN.json` contains the signatures and the hash-linked ordered chain. Re-running `verify-chain` in a fresh process proves continuity of the stored chain and signatures. It does **not** prevent a privileged local actor from deleting the tail without an independent external checkpoint of the last head; the chain's head needs a separately trusted anchor for that threat model.

## Test result (3 November 2026)

**33/33 PASS** on GroundZeroJM Windows: genuine four-action original Lab transcript, independently reconstructed movement, pressure, fracture/recovery fields and coordinates; modified event, outcome, pressure, tiles, lattice, sequence, QA, replay and intents rejected; original source hash guard; real Ed25519 signing, cross-process signature validation, Windows DPAPI encrypted private key, two-record persistent chain, modified signature and chain rejection. Test fixture is synthetic: it does not establish live owner's physical gestures.

Inherited CP40 evidence: native GameCore integration **130/130**, published browser **30/30**, existing native baseline **23/23**, Lab internal QA **16/16**. Do not add unrelated proofs or transfer a test outcome to a different body.

## Holds, device and trust rules

- **Physical Fold8 proof:** still needs a user-device browser interaction and resulting exported real TraceBox JSON. ADB had no connected devices or discoverable services when inspected. Phone Commander proves previous physical Termux contact, **not** this game on the Fold8.
- **Trust scope:** the verifier proves an export is a deterministic and exact outcome of the original physics code. It cannot attest human input, timing of a browser session, or original source provenance before host capture; a malicious party can generate a legitimate *synthetic* trace from valid intents.
- **Key custody:** DPAPI ties future signing ability to the current Windows user/security context. Do not publish the private key. The existing public GitHub repository is the code home; the current local custody state is an evidence role, not a new canonical engine.
- **External anti-rollback anchor:** if required against a privileged owner-device adversary, separately anchor the chain head to an independently retained timestamp/log. Do not label the local-only chain globally tamper-proof.
