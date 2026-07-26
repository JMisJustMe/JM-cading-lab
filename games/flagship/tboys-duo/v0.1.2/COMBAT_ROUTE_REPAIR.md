# T-Boys: Clash Corps — Duo Circuit v0.1.2

## Owner BUGG source

Owner phone play exposed two gameplay defects in v0.1.1:

1. The attacking character could receive damage and die after its own committed attack.
2. ASSIST could appear to home toward or be redirected by its own teammate.

The handoff also failed to make the single HTML the unmistakable primary delivery.

## Root causes

- Attacker/defender identity was selected from post-collision speed. Impulse and rebound could therefore turn the committed attacker into the damage recipient.
- The same pair could repeat damage during overlap/jitter inside one action.
- Scheduled ASSIST trusted a target id without validating that it belonged to a living rival.
- Same-team physical collision could redirect an assist through the active ally.

## v0.1.2 laws

- Ordinary damage ownership stays with the live-turn team.
- Generic collision cannot cause hidden recoil, self-damage or sacrifice. Those require explicit named mechanics, warning and trace.
- One attacker may damage one defender once per committed action; repeated overlap is contact-only unless a named multi-hit route permits more.
- Ordinary damage is capped at 38. Break Window damage is capped at 58.
- ASSIST validates a living rival and rejects allied, dead or missing requested targets.
- ASSIST bends around an obstructing ally and receives a brief friendly-pass window.
- The single HTML is the primary owner handoff; the Zionfolder is backup custody.

## QA

- TypeScript compile: PASS
- JavaScript syntax: PASS
- Headless combat simulation: 20/20
- Static source and route audit: 26/26
- Owner phone retest: pending

## Boundary

v0.1.2 is repaired but not owner-phone Dinged until Theodore confirms the corrected damage and assist behaviour in contact.
