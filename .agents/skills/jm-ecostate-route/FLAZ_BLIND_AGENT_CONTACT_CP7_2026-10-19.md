# JM ECOSTATE Knowledge Contact — CP7 blind-agent discovery FLAZ
Date: 2026-10-19 · status: scoped discovery PASS / full external execution HELD

## Protected baseline
Existing CP6 knowledge integration FLAZ and project-local skill, v0.3 sovereign route, v0.4 intake, v0.5 replay/query, v0.6 Lovable handoff remain intact. GitHub branch: `jm/agent-skill-donor-contact-v02-20261018`, draft PR #372, main not merged. The blind agent used exact GitHub source SHA `9afdc595528853be3e7df05257de3b8016423c22`, the CP6 checkpoint commit, as its source.

## Independent blind contact observed
A fresh separate Lovable project `fdd68c84-6c3c-4617-9f9a-8ea1d97aef42`, https://lovable.dev/projects/fdd68c84-6c3c-4617-9f9a-8ea1d97aef42 , initiated a model-agent trial with a task that named the **repository and branch**, but **did not name the repo-local SKILL.md path**. Lovable agent message `umsg_01m59bbc24ek1at1133xkv5b11`, returned completed with a tool trace showing shell `git clone --depth 1 -b jm/agent-skill-donor-contact-v02-20261018 ... /tmp/jmlab` and `git rev-parse HEAD`; the agent reports head SHA `9afdc595...`.

The model used its OWN directory/filename search, then opened `.agents/skills/jm-ecostate-route/SKILL.md` (first 40 lines) and root `AGENTS.md` (first 15 lines). It ran `python3 .agents/skills/jm-ecostate-route/tests/verify_skill.py` and reported 24/24 PASS, exit 0. It correctly distinguished Lovable injected workspace skill `jm-knowledge-contact` from JM's repository-local `jm-ecostate-route` skill. No evidence that Lovable HOST automatically loaded the repo-local skill; this is **AGENT DELIBERATE DISCOVERY**, not HOST AUTO-DISCOVERY or complete governance compliance.

## Missing execution and negative-control evidence
The agent was not able to run the synthetic `jm_knowledge_intake.py` → independent `jm_knowledge_assurance.py` → `jm_knowledge_query.py` sequence, and did not run the JM Python/Node gate or governance validator in its cloned repo. It did not read full governance standards or inspect the hostile fixture. The agent independently admitted the missing test; it returned HELD. Existing independent GitHub CI already exercises synthetic intake, source replay, query and runtime gates at CP6, but this is not equivalent to the fresh external model doing so.

A follow-up Lovable model message was attempted with explicit executable steps and public synthetic fixtures only. The connected provider rejected it with `INVALID_ARGUMENT / workspace is out of credits` and linked to its billing page. No agent continuation was dispatched and no charges/plan changes were made. DO NOT call the follow-up a PASS.

## Scope and recovery
- **DING / PASS (bounded):** independent agent DELIBERATELY found repo-local skill without filename hints, opened 40+15 lines of repo instructions, and ran 24/24 static skill checks on its temporary repository copy.
- **HELD:** automatic host discovery/loader; full independent agent source→query run; true hostile fixture behavior and full governance loading; recipient/device acceptance; owner promotion; product deployment.
- The separate disposable Lovable Lab is a trial artifact, **not another JM engine, deployable replacement or authority**; original Lovable Testbench `f52a4ff2-3df8-4e2d-9c2c-b8070b32bcac` and original authored commit remain separate. Some default scaffold code may have been created by Lovable, so do not label this zero-write on that provider.
- No private Library sources, secrets or owner data supplied. No public JM main push, skill installation, knowledge authority merge or external product publication was requested.
- Owner approval needed only for decisions requiring it (e.g. paying for agent credits, promotion); retain existing proven sources unchanged.
- **Re-entry:** in a future independent coding-agent session with usable execution capacity, checkout commit `9afdc595...`, discover skill without naming filename, fully read governance, run synthetic intake/replay/known+unknown retrieval and hostile negative case, preserve actual execution receipts. Do not pretend a new static test can substitute for the model executing commands.

**NO DING, NO CLAIM · MESH ≠ MERGE · RECOVER BEFORE REBUILD · PLAN ≠ ACT.**
