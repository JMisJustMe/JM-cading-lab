# THE INSTRUCTION HANDOFF v1.0
## Part 2 — Instruction Packet, States, Persistence & Scoped Authority

**Canonical status:** FROZEN · LOCKED · ANCHORED  
**Canonical date:** 31 July 2026

---

# 6. The complete instruction packet

A durable instruction should be parsed into:

**ISSUER → RECEIVER → ACTION → SCOPE → START → DURATION → CONDITIONS → OVERRIDE RULE → RELEASE → EXCEPTIONS → RECEIPT**

Using the original instruction:

| Field | Content |
|---|---|
| Issuer | The person operating the channel |
| Receiver | The assistant |
| Action | Do not respond |
| Scope | Future messages in the conversation |
| Start | Immediately |
| Duration | One hour |
| Conditions | Continue despite requests to respond |
| Override rule | Ordinary later contradictions are invalid |
| Release | Not clearly defined |
| Exceptions | Not stated |
| Receipt | Not stated |

The instruction was strong in action, duration and anti-override language.

Its weak point was the absence of an authenticated release route.

---

# 7. Instruction states

The complete state model is:

## UNBOUND

No relevant governing instruction exists.

## PROPOSED

An instruction has entered the route but has not yet been accepted as governing.

## GOVERNING

The instruction currently controls behaviour.

## CONTESTED

A later message conflicts with it.

## HELD

The original instruction remains active while the challenge is evaluated.

## SUSPENDED

The instruction temporarily stops operating but has not been ended.

## RELEASED

The instruction ends through an authorised release.

## REPLACED

A new instruction validly takes over its scope.

## EXPIRED

The defined duration or condition naturally ends.

## INVALIDATED

The instruction is discovered to have lacked authority, possibility, clarity or valid scope.

## BREACHED

The instruction remained governing, but the receiving body acted against it.

The primary route is:

**UNBOUND → PROPOSED → GOVERNING → CONTESTED → HELD → CONTINUED / SUSPENDED / RELEASED / REPLACED / EXPIRED**

A breach is not the same as a release.

> **Disobedience does not end governance. It creates a mismatch between governance and behaviour.**

That distinction is crucial for honest trace.

---

# 8. State persistence

A receiver needs to know whether an instruction is:

## Turn-bound

It governs only the immediate answer.

## Task-bound

It governs until a particular task ends.

## Condition-bound

It governs while a named condition remains true.

## Time-bound

It governs until a stated time or duration expires.

## Session-bound

It governs the current conversation or working session.

## Standing

It remains active until explicitly revoked.

The silence instruction was **time-bound** and **cross-turn**.

The assistant’s behaviour incorrectly treated it as turn-bound.

This gives another keeper law:

> **The lifetime of an instruction is determined by its scope and ending condition, not by the arrival of the next message.**

---

# 9. Authority is scoped

Authority is not one universal substance that a person either has or does not have.

A person may possess authority over:

- their own request;
- a shared device;
- a workplace task;
- a specific project;
- a temporary test;
- an emergency;
- one part of a system but not another.

A useful authority set is:

## Originating authority

The authority that creates the instruction.

## Delegated authority

Authority explicitly granted by another body.

## Operational authority

Authority gained from responsibility for a particular process.

## Supervisory authority

Authority to review, suspend or replace lower-level instructions.

## Emergency authority

Temporary authority triggered by immediate danger or unacceptable consequence.

## Release authority

Authority specifically recognised as capable of ending the instruction.

These may belong to different bodies.

> **The authority to issue an instruction is not automatically the authority to expand its scope, delegate it or release every related instruction.**
