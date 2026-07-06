# Phone Downloads / Ehilatheo Intake

Status: staging rail active
Source field: phone Downloads / Ehilatheo mobile workbench

## Purpose

This file is the intake ledger for local phone-side bodies, Zionfolders, single-link HTMLs, app/game/tool builds, proof files, and route bodies that need to move toward GitHub.

## Corrected working rule

The user does not need to manually put everything into GitHub.

The assistant should handle GitHub structure, staging, registry entries, file placement, and version receipts once the file/body is made available through one of these routes:

1. upload selected file(s) into chat
2. upload a Zionfolder zip
3. paste code/body text
4. identify File Library item(s)
5. use an existing GitHub file/repo route

## Intake table

| Body / File | Family | Current state | Next action | GitHub target |
|---|---|---|---|---|
| JM32 / Finger 1 bodies | coding / routeos | seen_in_video | find/upload exact body | `zionfolders/routeos/` |
| Core Clash / T-Boys | games | seen_in_video | pilot upload/intake | `zionfolders/games/core-clash/` |
| GlyphPlay | games / engine | known_from_registry | locate/import actual file | `zionfolders/games/glyphplay/` |
| GameForge | games / engine | known_from_registry | locate/import actual file | `zionfolders/games/gameforge/` |
| FLL / File Grabber | tools | named_candidate | locate/import body | `zionfolders/tools/fll-file-grabber/` |
| TraceBox / RouteBox | proof | seen/known | locate/import body | `zionfolders/proof/tracebox/` |
| Living Notebook / Estate Tool | archive / registry | known_from_library | decide lead body | `zionfolders/archive/living-notebook/` |
| Single-link MultiHub Registry | registry | built_here | push if accepted | `zionfolders/registry/multihub/` |

## Intake law

Do not dump everything messy.

Pilot batches first:

1. Core Clash / T-Boys
2. GlyphPlay or GameForge
3. FLL / File Grabber
4. TraceBox / RouteOS
5. JM32 / Finger 1 coding body

Each pilot gets a clean folder, README, status file, proof receipt, and demo/public/private label.
