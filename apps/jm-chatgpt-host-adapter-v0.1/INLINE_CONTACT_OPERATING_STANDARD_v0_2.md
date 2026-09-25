# JM Inline Contact — Operating Standard v0.2

Status: **MANAGED BETA TOOL**  
Date anchored: **2026-08-21**  
Known-good proof ancestor: `jm-chatgpt-host-adapter-v0.1` / adapter v0.1.2  
Development branch: `jm-inline-contact-v0.2-managed-beta`

## What is now proved

JM Inline Contact is no longer only an infrastructure probe. A deliberate ChatGPT-hosted inline body has been rendered inside the conversation surface and has responded to direct pointer/touch contact with visible state changes. The decisive proof lane is frozen separately in Zionfolder as `JM_Inline_Contact_Third_Ding_v1_0_FREEZE_2026-08-21`.

This establishes the usable route:

`JM body -> ChatGPT host adapter -> MCP Apps resource -> in-chat body -> contact -> readable state -> visible consequence -> trace`

## Tool classification

**Workable now:** yes, as a developer-mode / connected-MCP interactive host tool.

**Not yet claimed:** universal production availability, identical behavior on every ChatGPT client, or unrestricted arbitrary-body execution.

## Stable lane versus development lane

### Stable / frozen
- Adapter v0.1.2 remains the known-good proof body.
- Do not mutate the frozen proof body to add features.
- Do not lower the Third Ding success criterion.
- Do not replace inline contact with a file, image, static card, or external preview and call it success.

### Development
- All maximisation work starts from branch `jm-inline-contact-v0.2-managed-beta`.
- Any change must preserve a rollback path to v0.1.2.
- New bodies mount through the host adapter; the host does not become source authority.

## Required invariants

1. **Contact truth:** user input must produce readable state and visible consequence.
2. **Host truth:** in-chat render and standalone/file render are different delivery classes.
3. **Source identity:** existing JM bodies remain authoritative through host changes.
4. **No fake Ding:** server-call success alone is never sufficient evidence of inline contact.
5. **Recovery first:** reuse JM Visual Interaction Runtime, GameCore, PLAYFORM, GlyphPlay, GameForge, GlyphForge, JM32-1DA, OneBody ABI and playable IR before inventing replacements.
6. **Evidence preservation:** decisive recordings and stills are retained unchanged; interpretation is kept separate from raw evidence.
7. **Client variance is observable, not guessed:** blank paint, delayed paint, missing text, or visibility recovery are logged as host/client phenomena unless mechanism is actually proved.

## Invocation contract

Current public safe probe tool:

`render-jm-inline-probe`

Current public endpoint:

`https://inline-contact.jm-inline-contact-probe.pages.dev/mcp`

Current probe law:

`TOUCH -> READABLE STATE -> CONSEQUENCE -> TRACE`

## Promotion gates

A v0.2 body may be promoted only when:

- MCP transport tests pass;
- resource discovery passes;
- resource read passes;
- render tool call passes;
- actual in-chat interaction is manually re-proved on at least one desktop/web surface;
- mobile behavior is checked separately;
- no regression converts the result into file delivery or static presentation;
- evidence receipt is captured.

## Rollback

If a development change breaks inline interaction, immediately return to adapter v0.1.2 and test the known-good probe before diagnosing the new body.

## Immediate mission

The proof probe has done its job. The v0.2 lane exists to turn Inline Contact into a repeatable JM delivery instrument: mount real playable descendants, harden cross-client rendering, expose clear capability/status reporting, retain truthful receipts, and prepare the public/submission route without sacrificing source identity.