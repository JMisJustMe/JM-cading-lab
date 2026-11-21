# JM Book-to-Skill donor — current v0.2 contact face

**Purpose:** make the existing JM repository's authority & host-adapter stack discoverable as an optional portable Agent Skills face for Codex/Copilot/other compatible hosts, without a competing engine. This package is designed for an isolated branch and draft PR.

**Known existing authorities:** `AGENTS.md`, governance standards, Current-64 routing, sovereign agent runtime, universal host adapter tester. All remain in place and are **referenced**, not recopied.

**Original donor:** https://github.com/virgiliojr94/book-to-skill (format workflow ideas only, no code reuse).

**Public/privacy boundary:** does not upload original JM Library documents, credentials or private receipts. Only GitHub-public governance paths and new adapter text.

**Tests:** `python3 .agents/skills/jm-ecostate-route/tests/verify_skill.py`, existing JM universal conformance command, and manual agent probes A/B/C. CI checks static contract + existing local reference runtime, **not** autonomous Codex/Copilot discovery or owner-device consequence.

**Expected proof:** commit/PR readback can earn carrier-transport scope. Agent skill use remains HELD until host-specific trace; don't merge until reviewed.

## v0.3 maximal execution descendant (same branch; no new JM brain)

The project-local skill now provides `jm_skill_gate.py`, a **read-only contact face for the pre-existing JM sovereign Python and Node runtimes**. It verifies the same routing core, exact source digests, Current-64 12/52 accounting, and refuses to elevate a route candidate into current-head authority. Its deterministic receipt is **HELD** for valid routing or **BUGG** for drift, never a self-certified product Ding.

The additive CI checks the actual repository, runs an isolated adversarial Python test suite, calls both JM runtimes twice (known and unknown domain), rejects invented unknown-domain routes, invokes the existing universal host-adapter tester, and uploads machine-readable receipts as a GitHub Actions artifact. The same source-body precedence and protected ancestors remain unchanged. **Host discovery by an actual Codex/Copilot model, target-state change and owner-device contact are still OPEN.** See `SKILL.md`, `CONTACT_CONTRACT_v0_3.json` and `.github/workflows/jm-agent-skill-donor-contact-v02.yml`.

## v0.5 — maximum independently proved source-to-query route

This PR is an additive knowledge-carrier integration, NOT a new agent, automatic learning system, live recorder or learned attention model. The earlier v0.4 source intake remains intact.

New organs in the existing project-local JM Agent Skill:
- jm_knowledge_assurance.py independently recompiles the candidate from original UTF-8 source bytes in a fresh temporary directory, checking source hashes, metadata, exact candidate file inventory, content parity, optional externally supplied manifest anchor, and separately bounded JM route receipts.
- jm_knowledge_query.py handles a different question about previously indexed source material, but only after independent replay passes. It returns untrusted quoted evidence with source hashes, line/time metadata and lexical scores. An unknown query yields no invented answer.
- New adversarial tests reject altered originals, forged candidate hashes, changed query/results, source replacement, symlink/path escapes, and false success/authority claims.
- AGENT_HOST_CONTACT_PROTOCOL_v0_5.md describes four tests for a real external AI agent session. They are prepared but NOT represented as executed.

### Privacy and proof boundary

A candidate's evidence index contains source excerpts and line records: if inputs are private, the candidate is also private. Never upload private candidate outputs, transcripts or original library documents to public GitHub. CI uses synthetic fixtures only and now returns metadata-only receipts, not selected quotations or source indices.
An external manifest hash is a comparator, NOT a cryptographic signature, owner authorization or authenticated timestamp. The runtime gates remain read-only; human review and recipient-specific proof stay separate.
Passing source replay and repeated lexical retrieval does NOT prove Q/K/V neural attention, real Plaud recording, automated speech transcription, independent model compliance, current-head authority or an owner-device Ding.

### Re-entry
Checkout the unmerged draft branch, preserve exact originals, run the existing GitHub Actions validation and inspect its returned receipt before further promotion. Missing originals must fail rather than fabricate recollection. Known-good main and existing JM control bodies remain untouched.

**Keep HELD until real host-discovery tests and separate owner-authorized promotion. NO DING, NO CLAIM.**
