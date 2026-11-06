# JM Work Mode CP02 · Chat-independent local web controller

This is an **additive browser entrance** to the existing CP01 manual controller inside the JM Fold Ultra Home Lab source. It is not a new sovereign JM creation, not an always-on ChatGPT agent, and not a public website.

## What it actually does

Open **JM_WORK_MODE_WEB.cmd** from the Home Lab directory on GroundZeroJM. It runs `tools/jm_work_mode_web.py`, listens on **127.0.0.1:8766 only**, and opens the device browser to `http://127.0.0.1:8766/`. `ACTIVATE NOW` starts the four already-allowlisted offline code/test checks; `STOP AFTER CURRENT JOB` stops the queue between checks. Local receipts and status remain available without ChatGPT or this conversation.

The original `tools/jm_work_mode.py` remains the execution donor. Its source, phone screen settings, power plan and identities are not changed. Windows must be powered and connected to the local checkout. The laptop is free to lock its display; if it enters sleep, work will be suspended by Windows.

## Safety and boundaries

- Local-only web service: fails closed if asked to bind on any interface other than 127.0.0.1.
- A fresh per-launch CSRF secret protects activation/stop forms; each POST must have the exact same localhost Origin and Host. Cross-site or remote requests are rejected. No API keys are embedded in HTML or source.
- No internet-exposed listener, LAN pairing, cloud authentication, work publication, device unlock, package install, source merges, arbitrary shell commands, or secrets exported.
- Status is displayed directly from `%LOCALAPPDATA%\JM_ECOSTATE\JM_WORK_MODE_CP01\state.json`; job outcomes and SHA-256 output digests from `runs.jsonl`.
- The browser is a **real functional control surface**, but only on GroundZeroJM until an authorised secure phone tunnel is verified. A public bookmark to a page that simply opens ChatGPT would *not* meet the owner’s goal.
- A trusted ADB reverse tunnel could allow a connected Fold8/OPPO to use the laptop loopback dashboard without a public port; that requires a separate consented, physical device verification. Do not enable insecure 0.0.0.0 LAN binding as a shortcut.
- The four current checks are smoke tests, **not an hour of autonomous coding/reasoning**. Later job types require their own authorisation and live proof. Work and Automations are independent execution offices, not silently controlled by this prototype.

## Verified local fixture

- CP01 original queue: 5/5 tests PASS.
- CP02 web: 7/7 HTTP security and integration tests PASS, including a *real* detached queue reaching PASS and receipts on a temporary fixture repository.
- Source syntax PASS; no GroundZeroJM physical launch or Fold8/OPPO tap claimed.

## Handoff

Keep this beside the original Home Lab draft PR, append rather than replace. Configure a verified original `JM-cading-lab` checkout, test a real GroundZeroJM launch and status, and only then arrange an optional phone shortcut through an authenticated tunnel. Do not merge or publish without owner approval.