# T-Boys Character + WebGL Art Floor v1.0

**State:** HARD VISUAL GATE

## Required visual body

The first four fighters must read as professional stylised characters at phone scale:

- full 3D or convincing 2.5D bodies;
- distinct head, torso, arms, hands, legs and feet;
- recognisable silhouette before colour or name;
- team-linked material language without uniform cloning;
- tool/weapon/power anatomy integrated into the body;
- idle, locomotion, guard, quick, heavy, skill, hit, stagger, knockdown, recovery, assist, tag and KO animation states;
- directional facing and readable vulnerability;
- portrait and world-body correspondence.

Flat initials, polygon badges and simple procedural dolls may be used only in debug views.

## First-four character direction

### Aero — Bluefin clean-line launcher

A fast fin/wing silhouette, compact athletic body, cyan-white armour, directional forearm fins and jet-line movement. Reads as precision and acceleration.

### Nova — Bluefin arc utility

A curved orbital silhouette, violet/cyan energy rings, asymmetrical route tools and controlled floating parts. Reads as trick angle and spatial control.

### Raze — Crimson pressure striker

A forward-jagged silhouette, crimson gearblade language, aggressive shoulders and cutting route effects. Reads as speed, threat and pressure.

### Grit — Crimson obstacle tank

A broad foundry silhouette, orange/iron armour, heavy forearms and grounded industrial weight. Reads as guard break, space claim and durability.

## Rendering floor

- WebGL scene with actual depth, lighting and shadows.
- Toon/PBR hybrid materials with controlled metallic and emissive accents.
- Isometric or tactical perspective camera that keeps silhouettes readable.
- Contact shadows and grounded feet.
- Strong impact lighting, hit-stop, directional particles and camera impulse.
- Arena materials and props at the same visual language as fighters.
- Character bodies remain the visual priority over HUD chrome.

## Asset pipeline

1. Approve character concept sheet and material language.
2. Build/obtain clean source models.
3. Rig and animate.
4. Export GLB/glTF 2.0.
5. Normalize scale, pivots, orientation and naming.
6. Add explicit collision proxies.
7. Optimize geometry and textures with glTF Transform.
8. Use Meshopt/Draco and KTX2/BasisU where runtime testing supports them.
9. Validate mobile load, memory, animation and shadow budgets.

## Game Studio UI budget

- One compact combat HUD cluster.
- One small contextual partner/resource cluster.
- No permanent full-width bottom command dashboard.
- No more than roughly one quarter of the mobile viewport covered by persistent HUD.
- Action prompts appear at contact and fade when no longer needed.

## Gate

No new playable is presented as a professional T-Boys version until screenshots show:

- character quality at the accepted 2.5D/near-3D floor;
- direct-touch combat visible in the arena;
- playfield dominance over HUD;
- readable action, defence, hit and partner states.
