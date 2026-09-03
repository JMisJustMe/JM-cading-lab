# JM Estate Contact Organ — Source Intake v1.2.3

Drop exact source authorities into this staging lane. The v1.2.3A intake gate matches them against `governance/contact-organ/source_seat_manifest_v1_2_3.json`.

Route:

`EXACT SOURCE -> FILENAME/HASH/BYTE GATE -> SOURCE CARRIAGE -> CLEAN DESCENDANT -> RECEIPT`

Rules:
- Frozen parents are never edited.
- Known SHA-256 authority must match exactly.
- Known byte length must match exactly.
- Unknown-hash heads fail closed by default.
- Native Android packages never enter the generic HTML patch path.
- Device Continuity can be supplied either as its exact v1.1.7 HTML or as the exact current JM HTML Body Dock carrier; the latter is deterministically extracted and SHA-gated.
- A source seat/materialisation is not an APK install or physical Ding.

Keeper: **NO DING, NO CLAIM.**
