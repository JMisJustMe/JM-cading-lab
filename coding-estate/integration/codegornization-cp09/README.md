# JM SLINGFALL — CP09 Living Rivals | Native gameplay push

**Prospective route committed before CP09 executable development.** Exact protected parent: native owner-played CP8.2 Godot source `be28ef216342af148f8659b8aee3ccd90e49afb3` (reviewed in draft PR #450). No original/CP02/CP03/CP08 code is rewritten.

## Player-first delta
- **Living rivals, not static spawn orders:** red rivals in SECTOR can respond to newly changed battle pressure after landing, while preserving the protected CP8.2 spawn→landing target repair.
- **Distinct combat consequences:** Bulwark rally/brace protects allies during a fight; Dart actively undermines weakly guarded capture control, with nearby blue defenders capable of stopping sabotage; Warden visibly heals a wounded red ally. All bounded by cooldowns.
- **Readable personalities:** native role-specific world markings/effects and an actual tactical event feed.
- **Screen cleanliness:** FORM/PAIR/BRAID native control rails only in active gameplay, not over the victory/menu/pause/bunker overlays.
- **No mode regressions:** SECTOR-only special abilities; CONVOY and BEACON retain inherited native ownership. Existing classic fling/player actions, rewards, saving, multi-pointer cancellation and APK route preserved.

## Test and authority
Native Godot v4.5.2 headless tests must verify all three role consequences, defense counterplay, cooldown/idempotence, post-landing routes, dynamic reroutes, and clean victory UI. Parent CP8 17 checks, CP03 21 input checks, CP02 22, original 104, recovery/director suite must continue passing. Android ARM64 export/signature/16 KB ELF alignment through isolated GitHub CI. Owner Fold launch and fun/feel acceptance remain separate.

**Build nothing on main**. This is the distinct CP09 child, not a new compiler/engine or a generic MCP platform. The owner wants to actually play their games, not just refine infrastructure. NO DING, NO CLAIM.
