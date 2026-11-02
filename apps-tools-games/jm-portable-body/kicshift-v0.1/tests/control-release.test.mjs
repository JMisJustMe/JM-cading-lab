import test from "node:test";
import assert from "node:assert/strict";
import { game, input, releaseControls, resetRun } from "../src/game/world.ts";

const held = {
  moveX: 0.8, moveY: -0.6, aimX: 0.7, aimZ: -0.9,
  aiming: true, kicDown: true, prevKic: true,
  dash: true, guard: true, shift: true,
};

function expectReleased() {
  for (const key of ["moveX", "moveY", "aimX", "aimZ"])
    assert.equal(input[key], 0, key + " stayed active");
  for (const key of ["aiming", "kicDown", "prevKic", "dash", "guard", "shift"])
    assert.equal(input[key], false, key + " stayed active");
}

test("KICSHIFT clears held movement, aim and actions without firing", () => {
  Object.assign(input, held);
  releaseControls();
  expectReleased();
});

test("KICSHIFT new run starts without inherited aiming", () => {
  Object.assign(input, held);
  game.phase = "over";
  game.paused = true;
  resetRun();
  expectReleased();
  assert.equal(game.phase, "playing");
  assert.equal(game.paused, false);
});

test("KICSHIFT repeated control release and reset remain safe", () => {
  Object.assign(input, held);
  releaseControls();
  releaseControls();
  resetRun();
  resetRun();
  expectReleased();
});
