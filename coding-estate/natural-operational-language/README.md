# JM Natural Operational Language — Bounce Spine v0.1

**Standing:** WORKING / BUILDING / NOT CROWNED  
**Base:** `agent/everybody-full-stack-parity-v0-1` at the frozen 100-body current-constructible foundation  
**Front-door law:** natural language first; machinery underneath when needed.

## Purpose

This body returns the ordinary-language operational route to the front of the JM coding estate without deleting the compiler/runtime/kernel work that grew underneath it.

The working route is:

```text
MEANING
→ WORD / SIGNAL
→ MARK / FORM / CONTACT
→ CONTEXT
→ OPERATIONAL MEANING
→ ACTION / RELATION
→ STATE / CONSEQUENCE
→ TRACE
→ RECOVERY / REUSE
```

The creator should be able to **act → see → alter → reuse**. Parser/IR/runtime detail remains inspectable but is not the price of entry.

## What v0.1 actually implements

`bounce-spine.mjs` provides:

- ordinary readable words becoming operational when deliberately marked;
- semicolon designation such as `;open;` and `;and;`;
- punctuation-pressure/modulation forms `!`, `?`, `~`, `.lock`, `→`;
- explicit separation between recovered/current-native semantics, local trial roles and unbound words;
- **no semantic guessing** for an unknown marked word: it becomes operationally designated but remains unbound until a role is authorised;
- `;and;` as an identity-preserving relation with `merge: false`;
- reversible state changes and reusable/alterable plans;
- contact/context target resolution;
- optional FlowTalk bridge using the already-built sovereign FlowTalk implementation;
- RECORP pressure forms delegated to the already-built sovereign RECORP implementation;
- optional federation envelopes that request contact with another body without pretending the contact already happened;
- before/after digests, trace and receipts.

## Evidence boundaries

### Recovered/current-native route used directly

- FlowTalk is imported from `sovereign-ten/direct/language-native.mjs`.
- RECORP is imported from `sovereign-batch-four/direct/bridge-native.mjs`.
- native trace/digest machinery is imported from the existing sovereign runtime core.

### Working relation

`and` is carried as a **recovered-lineage working semantic**:

> bring admitted sides into one accountable relation without silently erasing either side.

It does **not** claim merge, agreement, equality or unchanged state.

### Local proof roles

`open`, `close`, `move` and `hold` are intentionally labelled `local-trial-role`. They exist to prove the operational-language mechanics. Their presence does not retroactively claim those exact roles were historically frozen JM language.

### Unknown words

A marked unknown word is not rejected as plain text and is not assigned invented semantics. The mark changes its standing to operational; the runtime returns `unbound-operational-word` until the owner or an authorised body supplies a role.

## Examples

```text
;open; door
```

Readable word, deliberate operational designation, visible state change.

```text
;open; door ;and; ;close; window
```

Both sides execute and remain separately attributable inside an `and` relation.

```text
;open?; door
```

Inspect the proposed operation without changing the door.

```text
;move(to=kitchen); chair
```

Payload stays readable while supplying operational context.

```text
RECORP! shards
```

Delegates to the existing RECORP body rather than rebuilding RECORP inside the Bounce Spine.

```text
;RECORP; shards
```

The semicolon marks RECORP as operationally designated, but because no RECORP pressure form was supplied the runtime does not invent one.

```text
;glimmer; room
```

`glimmer` receives operational standing but no action is guessed.

## Run the proof

```bash
node coding-estate/natural-operational-language/test-bounce-spine.mjs
```

The test body checks marking, unbound-word custody, `and` composition, non-mutating inspection, native RECORP delegation, undo/reuse, FlowTalk bridging, federation-envelope boundaries and plain-language preservation.

## Next build gates

1. owner word contact across a larger set of ordinary words;
2. stronger context/contact resolution for rooms, game entities and live estate bodies;
3. multi-operator composition beyond the first `and` route;
4. direct creator/gamer visual room;
5. authorised operator-role editing rather than hard-coded local trials;
6. real federation contact into the mounted 100-body router;
7. optional OneBody lowering only where it adds value;
8. conventional-language target adapters underneath, not in front.

## Keeper law

> Keep the pea usable. Keep the galaxy real.

This body is the pea/front door. The existing sovereign compiler/runtime/kernel/federation estate remains the galaxy underneath it.
