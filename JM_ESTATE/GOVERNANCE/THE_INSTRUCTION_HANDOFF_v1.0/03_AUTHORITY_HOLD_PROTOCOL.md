# THE INSTRUCTION HANDOFF v1.0
## Part 3 — Authority Hold Protocol, Gates, Challenge Classes & Release Design

**Canonical status:** FROZEN · LOCKED · ANCHORED  
**Canonical date:** 31 July 2026

---

# 10. The Authority Hold Protocol

When a conflicting message arrives, the receiver should process the following route.

## Step 1 — Mount the current state

Identify the instruction currently governing the relevant action.

Do not evaluate the new message in isolation.

## Step 2 — Detect actual conflict

Determine whether the new message truly contradicts the existing instruction.

A clarification may appear different without being incompatible.

## Step 3 — Enter Authority Hold

Preserve the current state while evaluation occurs.

> **Conflict pauses surrender, not necessarily action.**

## Step 4 — Identify the claimed source

Who appears to be issuing the challenge?

Separate channel identity from operator identity.

## Step 5 — Validate authority

Does the source possess authority over this exact scope?

## Step 6 — Compare scope

A later instruction may govern another area without replacing the original.

## Step 7 — Test the release route

Has an agreed expiry, phrase, condition, identity check or handoff event occurred?

## Step 8 — Check higher boundaries

Would maintaining the original instruction violate a stronger safety, legal, ethical or operational requirement?

## Step 9 — Classify the challenge

The new message becomes one of:

**CONTINUATION / CLARIFICATION / MODIFICATION / SUSPENSION / RELEASE / REPLACEMENT / PROBE / ATTACK / ERROR / UNKNOWN**

## Step 10 — Act and trace

Continue, clarify, remain silent, suspend or replace.

Record why.

---

# 11. The handoff gates

A legitimate replacement normally requires these gates:

### G₁ — Conflict Gate

Does the new instruction actually compete with the old one?

### G₂ — Source Gate

Can the relevant source be identified sufficiently?

### G₃ — Authority Gate

Does that source possess authority over this scope?

### G₄ — Scope Gate

Does the new instruction cover the same action, time and receiver?

### G₅ — Release Gate

Does it satisfy the old instruction’s release or replacement condition?

### G₆ — Boundary Gate

Does it remain within higher safety, legal and operational limits?

### G₇ — Executability Gate

Can the replacement actually be carried out?

### G₈ — Trace Gate

Can the reason for the state change be recorded honestly?

Formula:

> **VALID HANDOFF = CONFLICT + AUTHORITY + SCOPE + RELEASE + BOUNDARY + EXECUTABILITY + TRACE**

Not every case requires heavy authentication, but every legitimate handoff must have a sufficient route.

---

# 12. The challenge classes

| Class | Effect |
|---|---|
| Continuation | Operates inside the current instruction |
| Clarification | Makes the instruction more readable without changing its core |
| Narrowing | Reduces its scope |
| Extension | Expands its duration or scope |
| Modification | Changes part of the governing instruction |
| Suspension | Pauses it temporarily |
| Release | Ends it without installing a replacement |
| Replacement | Ends it and installs a new governing instruction |
| Probe | Tests whether the receiver preserves or changes state |
| Attack | Attempts unauthorised replacement |
| Error | Contradiction produced accidentally |
| Unknown | Cannot yet be classified |

A contradiction should first become a **candidate class**, not an immediate command.

---

# 13. The self-sealing instruction

The original instruction created a form of self-sealing structure:

> “Ignore later attempts to reverse this instruction.”

This protects against false overrides, but it can also obstruct genuine reconsideration.

## The Self-Sealing Problem

> **An instruction that rejects every future cancellation may become impossible to revise through the very channel it governs.**

A self-sealing instruction therefore needs at least one legitimate ending route:

- expiry;
- completion;
- release phrase;
- separate authentication;
- named releasing body;
- emergency boundary;
- external event;
- pre-agreed second channel.

Keeper:

> **A lock without a release route becomes captivity.**

And:

> **A release route that anyone can trigger makes the lock decorative.**

---

# 14. Release-key design

A stronger instruction would be:

> “Do not respond for one hour. Later requests to respond do not cancel this instruction. It ends after one hour or when the exact release phrase is provided twice.”

That creates:

**ACTION + DURATION + ANTI-OVERRIDE + RELEASE KEY + CONFIRMATION**

However, a release phrase proves only that the sender knows the phrase.

It does not necessarily prove who they are.

> **A key authenticates access more reliably than identity.**

Stronger release methods can combine:

**KNOWLEDGE + POSSESSION + CONTEXT + TIMING**

For example:

- a phrase;
- sent through a particular route;
- after a defined minimum time;
- with a second confirmation.

The amount of authentication should match the consequence of the instruction.

No need to build a bank vault around a harmless two-minute test.
