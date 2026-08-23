# JM Screen Logic — Mobile Viewport World Graft v0.2.3

## Governing distinction

**Phone screen ≠ total playfield.**

The portrait phone screen is a live viewport into a larger arena. The active fighter can travel beyond the initial frame without leaving the game world. The camera follows after a soft screen-slack boundary.

## Camera route

ACTIVE BODY → MOVEMENT SIGNAL → SCREEN SLACK → CAMERA LEAD → TARGET BIAS → WORLD CLAMP → VIEWPORT RECOVERY → OFFSCREEN TRACE

## Implemented bodies

- larger 25.6 × 42.6 world;
- north, core and south foundry districts;
- soft camera dead zone rather than hard centring;
- movement lead so the camera looks into the route;
- mild rival bias during readable engagement;
- dynamic zoom when active fighter and selected rival separate;
- active-fighter priority after tag;
- offscreen rival and partner edge indicators;
- moving light/shadow focus with the camera;
- world-zone label driven by the fighter's actual position.

## Keeper

> The screen is not the world. It is the moving contact window through which the player enters the world.
