# Games&Beyond v0.6 — Whole-Estate Catalogue × Advanced Generation Routes

**Build status:** SOURCE COMMITTED / LOCAL RUNTIME QA PASSED / PUBLIC PAGES PROPAGATION REQUIRES DEVICE CONTACT

## Outcome

The existing Games&Beyond v0.5 House remains the protected base. Its exact 21 built-in bodies, 23-body full-import route, body opening, editing, recovery, exports, receipts and accessibility wrapper were not replaced.

v0.6 adds a runtime-mounted whole-estate catalogue to the same public front door.

## Added production organs

- CATALOGUE navigation room
- whole-estate hero and governing crown
- 52 catalogued bodies across 8 shelves
- side-by-side Created / Regeneration and Potential / Generation lanes
- separate Machinery / System-Proof lane
- searchable game/world/engine/route/source register
- shelf filters
- body passports
- exact mounted-body opening where a public body exists
- passport copy with safe text-download fallback
- full catalogue JSON export
- mobile and desktop layouts
- PWA manifest identity updated to v0.6
- service-worker bridge preserving the original index/payload while mounting the v0.6 extension

## Eight shelves

1. Exact mounted games
2. Active production routes
3. Formed games awaiting advanced software
4. Larger worlds and game families
5. Named bodies needing source consolidation
6. Mechanic loops and proof bodies
7. Engines and advanced generators
8. Governance and custody bodies

## Governing distinctions preserved

- Crewbound Arena is not COMBOUND.
- T-Boys Core Clash is not the whole T-Boys universe.
- Humanimals contains multiple sovereign games.
- Phone-Realms is not Phoney Dudes.
- Engines, loops and governance bodies are not counted as games.
- Completion, public mounting and coding provenance remain separate axes.

## Advanced engine gate

- Existing proven game → advanced regeneration
- Formed game concept → first advanced generation
- Mechanic needing stronger facilities → advanced system proof

Unity and Unreal remain advanced hosts/generators. JM-native bodies remain the authoring authority.

## Delivery architecture

The v0.6 catalogue is installed through ordered service-worker modules:

1. catalogue styling
2. five compressed catalogue-data shards
3. two compressed runtime shards
4. runtime loader

The service worker uses the cache revision:

`games-beyond-v0-6-whole-estate-r2`

This protects the large exact-body payload and avoids rewriting the existing v0.5 index/app body.

## QA receipt

### Integrity

- Catalogue entries: **52**
- Shelves: **8**
- Catalogue decompression SHA-256: `5220619fc3732411f08d058b1a0a19d03296b3f56fab4b34c336376add249d71`
- Runtime decompression SHA-256: `9b4e24a593503b2ab3fcc155c2062a75a569350b8797b6e7578d5d2d8d0f743f`
- Runtime shards decompress exactly to the tested source: **PASS**
- JavaScript syntax checks: **PASS**

### Desktop runtime

- v0.6 title mounted: **PASS**
- 52 catalogue cards: **PASS**
- 8 shelf sections: **PASS**
- 6 navigation controls including CATALOGUE: **PASS**
- mounted-games filter returns 11 exact game bodies: **PASS**
- mounted-body route opens the correct ID: **PASS**
- Beast Ring search: **PASS**
- console/page errors: **0**

### Mobile runtime

- viewport width: **390 px**
- horizontal overflow: **0 px**
- 52 catalogue cards present: **PASS**
- 6 navigation controls present: **PASS**
- console/page errors: **0**

### Fallback contact

Clipboard API deliberately unavailable:

- `COPY PASSPORT` fallback downloaded `beast-ring-wrestleform-passport.txt`: **PASS**
- dead-button/error result: **NONE**

## Public-contact boundary

The GitHub source and activation service worker are committed. This environment blocked direct browser navigation to the public Pages URL, so final CDN/service-worker activation must be touched on the user's real device. A first visit may briefly show the preserved previous body while the new service worker installs; the activation route then reloads the same address under v0.6.

## Keeper

> Preserve the House. Extend its knowledge. Let the catalogue govern real production decisions.
