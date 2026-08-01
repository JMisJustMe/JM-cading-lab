# JM FTR Participation Engine v9.0 — Governing Specification Bundle

---

## `CLAIM_BOUNDARY.md`

# Claim Boundary

- DIGITAL TWIN: software and statistics proof only.
- POINTER / FINGER: participant-software contact proof only.
- REPLAY: recorded sensor intake proof only.
- LIVE SERIAL: live device-stream evidence; not automatically a physical mechanism proof.
- PHYSICAL CANDIDATE: requires eligible repeated live trials, safety, chain integrity, owner confirmation and operator declaration.
- DING: not self-awarded by this package. The owner preserves and reviews the real mechanism and evidence.

---

## `FIELD_KIT_README_v1_1.md`

# AMA-Pro / GEO Field Kit v1.1

## Minimal first physical lane

1. Use an FSR, pressure transducer, flex sensor, load cell amplifier, capacitive contact, microphone envelope, or another reviewed sensor.
2. Connect the sensor to a microcontroller analogue or digital input.
3. Flash one of the included JSONL firmware starters.
4. Open the Participation Engine through `http://localhost` or another secure context.
5. In **BRIDGE**, select **LIVE SERIAL**, connect at 115200 baud, and confirm raw packets move.
6. In **FIELD**, record a stable device ID, sensor family, unit and sample rate.
7. Capture REST and STRONG calibration values.
8. Run at least three complete trials: baseline → contact → threshold → action → output → recovery.
9. Verify the receipt chain and export the Field Trial Pack.
10. Review the physical mechanism and evidence before awarding a Ding.

## Packet example

```json
{"seq":42,"t":2050,"device_id":"AMA-PRO-FSR-01","primary":712,"secondary":0,"output":844,"unit":"adc"}
```

## Electrical boundary

Use low-voltage development boards and sensors within their rated voltage/current. Do not connect mains, unknown power supplies, medical electrodes, or unreviewed high-current loads. The included firmware is a data bridge starter, not a safety-certified controller.

---

## `MAXIMUM_FIELD_PROTOCOL.md`

# Maximum Field Protocol v2.0

1. Identify the real device and sensor family.
2. Record transport and sample rate.
3. Calibrate resting and strong raw values.
4. Arm fail-closed safety.
5. Confirm packet schema, sequence and heartbeat.
6. Run the required number of complete trials.
7. Each trial must pass baseline stability, threshold, lawful action, output, recovery, packet-gap, drift and raw-safety gates.
8. Verify the SHA-256 receipt chain.
9. Review aggregate pass rate and peak coefficient of variation.
10. Only eligible live serial trials count toward physical readiness.
11. Owner confirmation and operator declaration are mandatory.
12. Preserve the real mechanism and exported pack with the candidate receipt.

A browser replay cannot prove a material mechanism. A live stream alone cannot prove a complete route. The physical candidate is an aggregate, owner-reviewed evidence state.

---

## `PARTICIPANT_CONGREGATION_PROTOCOL_v3_0.md`

# Participant Congregation Protocol v3.0

- Give every participant a stable ID before the trial begins.
- Preserve participant identity in every receipt.
- Share route definitions and field conditions without merging participant records.
- Record failures as evidence; do not delete them to improve the pass rate.
- Verify the receipt chain after any new trial set.
- Use aggregate pass rate only alongside individual receipts.
- A multi-participant software suite is not a physical field Ding.

---

## `GEO_AMA_PRO_CODING_HOUSE_SPEC_v3_0.md`

# GEO / AMA-Pro Coding House Specification v3.0

## Purpose

The Participation Engine operates route bodies. The Coding House creates those bodies without rebuilding RouteOS or flattening distinct offices.

## Compilation route

```text
NAME + OFFICE + CONTACT + CARRIER
→ THRESHOLD + LAWFUL ACTION
→ RETURNED OUTPUT + RECOVERY
→ CONTINUITY LAW
→ JM ROUTE DSL
→ PARTICIPATION ROUTE BODY JSON
```

## Required route stages

1. `CONTACT`
2. `STATE`
3. `THRESHOLD`
4. `ACTION`
5. `OUTPUT`
6. `RECOVERY`
7. `CONTINUITY`

A body is invalid when it lacks a lawful action, output, recovery route or continuity law. The output target cannot be below the permission threshold.

## Binding law

A compiled route body may bind to a device profile, but the binding must preserve:

- route-body identity;
- device and sensor identity;
- calibration range;
- source classification;
- packet channels;
- action token;
- claim boundary.

`digital_twin`, `replay`, `pointer`, `microphone` and `serial` remain separate classifications.

## Congregation law

Participants may share a route and field. Their identity, measurements and receipts do not merge. A shared result never erases which participant produced which trace.

## Installation law

Compiled bodies install into BodyRegistry as sovereign route bodies. RouteOS remains the operating floor. Coding House source remains attributable to the body.

## Physical boundary

Compilation, simulation, packet replay and installation prove software behaviour. A physical GEO claim requires a real mechanism, eligible live evidence, owner review and the existing maximum-system safety gates.

---

## `FIVEFOLD_BEYOND_MAXIMUM_SPEC_v9_0.md`

# JM FTR Participation Engine v9.0 — Fivefold Beyond Maximum

**Authority:** Theodore Benjamin Scott / JM / JMISJUSTME  
**Canonical body:** `OPEN_FIRST.html`

## Escalation law

The package does not duplicate the 200 KB runtime six times. One canonical body carries six governed escalation receipts:

1. v4 — Sovereign Field Orchestra (maximum)
2. v5 — Adaptive Route Intelligence (beyond I)
3. v6 — Offline Estate Mesh (beyond II)
4. v7 — Formal Proof Lab (beyond III)
5. v8 — Participation Mission Composer (beyond IV)
6. v9 — Sovereign Continuity Estate (beyond V)

## Fivefold crown gate

The software crown requires all six stage receipts, a valid merged ledger, a five-property 512-case sweep, a composed mission pass, and an exact destructive continuity restore. It never converts synthetic or recorded evidence into a physical Ding.

## Claim boundary

This package can prove software orchestration, guarded adaptation, deterministic reconciliation, model-property tests, mission simulation and state restoration. A real connected sensor/material mechanism and field operator evidence remain required for a physical GEO / AMA-Pro claim.
