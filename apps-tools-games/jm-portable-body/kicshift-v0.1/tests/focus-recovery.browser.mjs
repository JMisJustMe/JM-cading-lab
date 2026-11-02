import assert from "node:assert/strict";
import { chromium } from "playwright";

// Browser proof uses the original Vite + React KICSHIFT carrier. The input module
// comes from the same source identity, never a fake implementation.
const browser = await chromium.launch({
  headless: true,
  args: ["--enable-webgl", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"],
});
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on("pageerror", error => errors.push(error.message));
const read = () => page.evaluate(async () => {
  const { input } = await import("/src/game/world.ts");
  return { ...input };
});
const clear = value =>
  value.moveX === 0 && value.moveY === 0 &&
  value.aimX === 0 && value.aimZ === 0 &&
  !value.aiming && !value.kicDown && !value.prevKic &&
  !value.dash && !value.guard && !value.shift;

try {
  await page.goto("http://127.0.0.1:4179/", { waitUntil: "domcontentloaded" });
  await page.locator('[aria-label="Move"]').waitFor({ state: "visible", timeout: 30000 });

  // Real DOM keyboard handlers should set existing gameplay input.
  await page.keyboard.down("w");
  await page.keyboard.down("j");
  let state = await read();
  assert.equal(state.moveY, -1, "physical key-down failed to reach the existing movement handler");
  assert.equal(state.kicDown, true, "physical key-down failed to reach the existing KIC handler");

  // A browser app switch can lose key-up; event must release without firing KIC.
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  state = await read();
  assert.ok(clear(state), "blur retained controls or left an inherited shot");
  await page.keyboard.up("w");
  await page.keyboard.up("j");

  // Real Chromium mobile touch sequence: hold joystick, interrupt without
  // touchEnd, send a late move, then start a fresh touch on the same joystick.
  const joystick = page.locator('[aria-label="Move"]');
  const bounds = await joystick.boundingBox();
  assert.ok(bounds, "the original mobile joystick is missing");
  const x0 = bounds.x + bounds.width / 2;
  const y0 = bounds.y + bounds.height / 2;
  const cdp = await page.context().newCDPSession(page);
  const point = (id, x, y) => ({ id, x, y, radiusX: 2, radiusY: 2, force: 1 });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [point(13, x0, y0)],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [point(13, x0 + 40, y0 - 30)],
  });
  state = await read();
  assert.ok(state.moveX > 0.4 && state.moveY < -0.3,
    "mobile touch move did not reach the existing joystick input");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  assert.ok(clear(await read()), "touch-owned movement survived app blur");
  const neutralKnob = await joystick.locator("div").last().getAttribute("style");
  assert.match(neutralKnob || "", /\\+ 0px/,
    "joystick visual knob was not returned to the centre");
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [point(13, x0 + 52, y0 - 40)],
  });
  assert.ok(clear(await read()), "late move revived an interrupted pointer");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart", touchPoints: [point(14, x0, y0)],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove", touchPoints: [point(14, x0 - 37, y0 + 25)],
  });
  state = await read();
  assert.ok(state.moveX < -0.3 && state.moveY > 0.2,
    "fresh touch could not claim the joystick after interrupted ownership");
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert.ok(clear(await read()), "touch end did not release the joystick");

  // Hidden-tab route independently clears held game inputs and aiming.
  await page.evaluate(async () => {
    const { input } = await import("/src/game/world.ts");
    Object.assign(input, {
      moveX: 0.4, moveY: -0.8,
      aimX: 0.7, aimZ: -0.3, aiming: true,
      kicDown: true, prevKic: true,
      dash: true, guard: true, shift: true,
    });
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  assert.ok(clear(await read()), "hidden-tab route retained held gameplay input");
  assert.deepEqual(errors, [], "runtime errors while testing original controls");
  console.log("JM_KICSHIFT_FOCUS_CONTACT_PASS mobile Chromium keydown -> blur -> release; hidden -> release");
} finally {
  await browser.close();
}
