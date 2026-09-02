/**
 * KICSHIFT — Flux Arena
 * Headless game simulation. No React, no Three.js objects: plain numbers only.
 * Rendering layers read these pools every frame and push values onto meshes.
 */

export const ARENA_R = 13.5;
export const RUN_TIME = 90;
export const GATE_R = 2.3;
export const SHARDS_PER_CHARGE = 5;

export const E_CHASER = 0;
export const E_SHOOTER = 1;
export const E_HEAVY = 2;

export const CAP_ENEMY = [10, 7, 4];
export const CAP_PROJ = 48;
export const CAP_SHARD = 16;
export const CAP_PARTICLE = 160;

export type Phase = "playing" | "over";

export interface Enemy {
  alive: boolean;
  type: number;
  x: number;
  z: number;
  vx: number;
  vz: number;
  hp: number;
  maxHp: number;
  yaw: number;
  cd: number;
  tele: number;
  teleMax: number;
  flash: number;
  anim: number;
  spawn: number;
}

export interface Projectile {
  alive: boolean;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  life: number;
  dmg: number;
  r: number;
  friendly: boolean;
  charged: boolean;
}

export interface Shard {
  alive: boolean;
  x: number;
  z: number;
  y: number;
  vx: number;
  vz: number;
  t: number;
}

export interface Particle {
  alive: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  grav: number;
}

export interface Ring {
  alive: boolean;
  x: number;
  z: number;
  t: number;
  dur: number;
  r0: number;
  r1: number;
  color: number;
}

const mk = <T,>(n: number, f: () => T): T[] => Array.from({ length: n }, f);

export const enemies: Enemy[][] = CAP_ENEMY.map((cap, type) =>
  mk(cap, () => ({
    alive: false,
    type,
    x: 0,
    z: 0,
    vx: 0,
    vz: 0,
    hp: 1,
    maxHp: 1,
    yaw: 0,
    cd: 0,
    tele: 0,
    teleMax: 1,
    flash: 0,
    anim: Math.random() * 10,
    spawn: 0,
  })),
);

export const projectiles: Projectile[] = mk(CAP_PROJ, () => ({
  alive: false,
  x: 0,
  z: 0,
  y: 0.9,
  vx: 0,
  vz: 0,
  life: 0,
  dmg: 1,
  r: 0.4,
  friendly: true,
  charged: false,
}));

export const shards: Shard[] = mk(CAP_SHARD, () => ({
  alive: false,
  x: 0,
  z: 0,
  y: 0.7,
  vx: 0,
  vz: 0,
  t: 0,
}));

export const particles: Particle[] = mk(CAP_PARTICLE, () => ({
  alive: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 0,
  maxLife: 1,
  size: 0.2,
  color: 0xffffff,
  grav: 0,
}));

export const rings: Ring[] = mk(10, () => ({
  alive: false,
  x: 0,
  z: 0,
  t: 0,
  dur: 0.5,
  r0: 0,
  r1: 3,
  color: 0xffffff,
}));

export const player = {
  x: 0,
  z: 6,
  vx: 0,
  vz: 0,
  yaw: 0,
  hp: 100,
  maxHp: 100,
  iframe: 0,
  dashCd: 0,
  dashT: 0,
  guardCd: 0,
  guardT: 0,
  guardPerfect: 0,
  guardFx: 0,
  shiftCd: 0,
  shiftFx: 0,
  shiftFromX: 0,
  shiftFromZ: 0,
  kicCd: 0,
  charge: 0,
  charging: false,
  swing: 0,
  hurt: 0,
  step: 0,
  safeX: 0,
  safeZ: 6,
};

export const game = {
  phase: "playing" as Phase,
  paused: false,
  time: RUN_TIME,
  score: 0,
  combo: 0,
  comboTimer: 0,
  bestCombo: 0,
  mult: 1,
  multTimer: 0,
  tier: 1,
  gateCharge: 0,
  gatePower: 0,
  gateUses: 0,
  totalShards: 0,
  kills: 0,
  shake: 0,
  flash: 0,
  arenaBoost: 0,
  hint: 0,
  loreUnlocked: false,
  toast: "",
  toastT: 0,
  spawnTimer: 1.2,
  elapsed: 0,
};

export const input = {
  moveX: 0,
  moveY: 0,
  aimX: 0,
  aimZ: 0,
  aiming: false,
  kicDown: false,
  prevKic: false,
  dash: false,
  guard: false,
  shift: false,
};

export const settings = {
  audio: true,
  reduced: false,
  sensitivity: 1,
  invert: false,
};

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export function spawnParticle(
  x: number,
  y: number,
  z: number,
  vx: number,
  vy: number,
  vz: number,
  life: number,
  size: number,
  color: number,
  grav = -6,
) {
  if (settings.reduced && Math.random() < 0.55) return;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]!;
    if (p.alive) continue;
    p.alive = true;
    p.x = x;
    p.y = y;
    p.z = z;
    p.vx = vx;
    p.vy = vy;
    p.vz = vz;
    p.life = life;
    p.maxLife = life;
    p.size = size;
    p.color = color;
    p.grav = grav;
    return;
  }
}

export function burst(x: number, y: number, z: number, n: number, color: number, spd = 6, size = 0.22) {
  const count = settings.reduced ? Math.ceil(n * 0.5) : n;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const p = Math.random() * 0.9;
    const s = spd * rand(0.4, 1);
    spawnParticle(
      x,
      y,
      z,
      Math.cos(a) * s * (1 - p * 0.5),
      p * s * 0.9 + 1,
      Math.sin(a) * s * (1 - p * 0.5),
      rand(0.28, 0.6),
      size * rand(0.6, 1.3),
      color,
    );
  }
}

export function ring(x: number, z: number, r0: number, r1: number, dur: number, color: number) {
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i]!;
    if (r.alive) continue;
    r.alive = true;
    r.x = x;
    r.z = z;
    r.t = 0;
    r.dur = dur;
    r.r0 = r0;
    r.r1 = r1;
    r.color = color;
    return;
  }
}

function fireProjectile(
  x: number,
  z: number,
  dx: number,
  dz: number,
  speed: number,
  dmg: number,
  r: number,
  friendly: boolean,
  charged = false,
) {
  for (let i = 0; i < projectiles.length; i++) {
    const p = projectiles[i]!;
    if (p.alive) continue;
    p.alive = true;
    p.x = x;
    p.z = z;
    p.y = 0.95;
    p.vx = dx * speed;
    p.vz = dz * speed;
    p.life = friendly ? 0.75 : 2.6;
    p.dmg = dmg;
    p.r = r;
    p.friendly = friendly;
    p.charged = charged;
    return;
  }
}

function dropShard(x: number, z: number) {
  for (let i = 0; i < shards.length; i++) {
    const s = shards[i]!;
    if (s.alive) continue;
    s.alive = true;
    s.x = x;
    s.z = z;
    s.y = 1.1;
    const a = Math.random() * Math.PI * 2;
    s.vx = Math.cos(a) * 2.2;
    s.vz = Math.sin(a) * 2.2;
    s.t = 0;
    return;
  }
}

function addScore(n: number) {
  game.score += Math.round(n * game.mult);
}

function toast(msg: string) {
  game.toast = msg;
  game.toastT = 2.4;
}

export function resetRun() {
  for (const pool of enemies) for (const e of pool) e.alive = false;
  for (const p of projectiles) p.alive = false;
  for (const s of shards) s.alive = false;
  for (const p of particles) p.alive = false;
  for (const r of rings) r.alive = false;

  Object.assign(player, {
    x: 0,
    z: 6,
    vx: 0,
    vz: 0,
    yaw: 0,
    hp: 100,
    iframe: 0,
    dashCd: 0,
    dashT: 0,
    guardCd: 0,
    guardT: 0,
    guardPerfect: 0,
    guardFx: 0,
    shiftCd: 0,
    shiftFx: 0,
    kicCd: 0,
    charge: 0,
    charging: false,
    swing: 0,
    hurt: 0,
    safeX: 0,
    safeZ: 6,
  });

  Object.assign(game, {
    phase: "playing" as Phase,
    paused: false,
    time: RUN_TIME,
    score: 0,
    combo: 0,
    comboTimer: 0,
    bestCombo: 0,
    mult: 1,
    multTimer: 0,
    tier: 1,
    gateCharge: 0,
    gatePower: 0,
    gateUses: 0,
    totalShards: 0,
    kills: 0,
    shake: 0,
    flash: 0,
    arenaBoost: 0,
    hint: 5,
    loreUnlocked: false,
    toast: "",
    toastT: 0,
    spawnTimer: 1.0,
    elapsed: 0,
  });

  input.kicDown = false;
  input.prevKic = false;
  input.dash = input.guard = input.shift = false;
  input.moveX = input.moveY = 0;
}

function aliveCount() {
  let n = 0;
  for (const pool of enemies) for (const e of pool) if (e.alive) n++;
  return n;
}

function spawnEnemy(type: number) {
  const pool = enemies[type]!;
  let slot: Enemy | undefined;
  for (const e of pool) if (!e.alive) { slot = e; break; }
  if (!slot) return;

  let x = 0,
    z = 0;
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = ARENA_R - rand(1.5, 3.5);
    x = Math.cos(a) * r;
    z = Math.sin(a) * r;
    if (Math.hypot(x - player.x, z - player.z) > 6.5) break;
  }
  const hp = type === E_CHASER ? 3 : type === E_SHOOTER ? 2 : 9;
  slot.alive = true;
  slot.x = x;
  slot.z = z;
  slot.vx = slot.vz = 0;
  slot.hp = slot.maxHp = hp + (game.tier - 1);
  slot.cd = rand(0.6, 1.6);
  slot.tele = 0;
  slot.flash = 0;
  slot.spawn = 0;
  slot.yaw = Math.atan2(player.x - x, player.z - z);
  ring(x, z, 0.2, 1.6, 0.45, 0xff5a3c);
  burst(x, 0.6, z, 8, 0xff7a4a, 4, 0.16);
}

function updateSpawns(dt: number) {
  const maxAlive = [6, 9, 12][game.tier - 1]!;
  game.spawnTimer -= dt;
  if (game.spawnTimer > 0 || aliveCount() >= maxAlive) return;

  const interval = [2.3, 1.5, 1.05][game.tier - 1]!;
  game.spawnTimer = interval * rand(0.85, 1.2);

  const weights =
    game.tier === 1 ? [0.75, 0.25, 0] : game.tier === 2 ? [0.5, 0.32, 0.18] : [0.44, 0.3, 0.26];
  const n = game.tier === 3 ? (Math.random() < 0.55 ? 2 : 1) : 1;
  for (let i = 0; i < n; i++) {
    const r = Math.random();
    let acc = 0,
      type = 0;
    for (let t = 0; t < 3; t++) {
      acc += weights[t]!;
      if (r <= acc) { type = t; break; }
    }
    spawnEnemy(type);
  }
}

function damagePlayer(amount: number, fromX: number, fromZ: number) {
  if (player.iframe > 0 || player.dashT > 0 || game.phase !== "playing") return;

  let dmg = amount;
  if (player.guardT > 0) {
    if (player.guardPerfect > 0) {
      player.guardFx = 1;
      game.shake = Math.max(game.shake, 0.5);
      ring(player.x, player.z, 0.5, 3.2, 0.35, 0x7df0ff);
      burst(player.x, 1.0, player.z, 14, 0x9ff6ff, 8, 0.2);
      addScore(60);
      counterBlast();
      player.iframe = 0.35;
      return;
    }
    dmg *= 0.32;
    player.guardFx = 0.6;
  }

  player.hp -= dmg;
  player.iframe = 0.75;
  player.hurt = 1;
  game.flash = Math.min(1, game.flash + 0.7);
  game.shake = Math.max(game.shake, 0.45 + dmg * 0.012);
  game.combo = 0;
  const a = Math.atan2(player.x - fromX, player.z - fromZ);
  player.vx += Math.sin(a) * 9;
  player.vz += Math.cos(a) * 9;
  burst(player.x, 1.0, player.z, 12, 0xff4d4d, 6, 0.2);

  if (player.hp <= 0) {
    player.hp = 0;
    endRun();
  }
}

function counterBlast() {
  for (const pool of enemies)
    for (const e of pool) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < 5) hitEnemy(e, 2.5, (e.x - player.x) / (d || 1), (e.z - player.z) / (d || 1), 12);
    }
}

function hitEnemy(e: Enemy, dmg: number, nx: number, nz: number, knock: number) {
  e.hp -= dmg;
  e.flash = 1;
  const resist = e.type === E_HEAVY ? 0.3 : 1;
  e.vx += nx * knock * resist;
  e.vz += nz * knock * resist;
  burst(e.x, 1.0, e.z, 6, 0xffd08a, 5, 0.16);

  if (e.hp <= 0) {
    e.alive = false;
    game.kills++;
    game.combo++;
    game.comboTimer = 3;
    game.bestCombo = Math.max(game.bestCombo, game.combo);
    addScore((e.type === E_HEAVY ? 220 : e.type === E_SHOOTER ? 120 : 90) * (1 + game.combo * 0.08));
    game.shake = Math.max(game.shake, e.type === E_HEAVY ? 0.55 : 0.25);
    burst(e.x, 1.0, e.z, e.type === E_HEAVY ? 22 : 14, 0xff8a3c, 8, 0.24);
    ring(e.x, e.z, 0.3, e.type === E_HEAVY ? 3.4 : 2, 0.35, 0xffa04a);
    const drops = e.type === E_HEAVY ? 3 : Math.random() < 0.72 ? 1 : 0;
    for (let i = 0; i < drops; i++) dropShard(e.x, e.z);
  }
}

function endRun() {
  game.phase = "over";
  game.shake = 0.9;
  burst(player.x, 1.0, player.z, 26, 0xffb060, 9, 0.28);
}

function nearestEnemy(maxD = 14) {
  let best: Enemy | null = null;
  let bd = maxD;
  for (const pool of enemies)
    for (const e of pool) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x - player.x, e.z - player.z);
      if (d < bd) { bd = d; best = e; }
    }
  return best;
}

function aimVector(): [number, number] {
  if (input.aiming && (input.aimX || input.aimZ)) {
    const l = Math.hypot(input.aimX, input.aimZ) || 1;
    return [input.aimX / l, input.aimZ / l];
  }
  const t = nearestEnemy(13);
  if (t) {
    const dx = t.x - player.x;
    const dz = t.z - player.z;
    const l = Math.hypot(dx, dz) || 1;
    return [dx / l, dz / l];
  }
  return [Math.sin(player.yaw), Math.cos(player.yaw)];
}

function doKic(charged: boolean) {
  const [ax, az] = aimVector();
  player.yaw = Math.atan2(ax, az);
  player.swing = 1;
  player.kicCd = charged ? 0.42 : 0.26;

  if (charged) {
    fireProjectile(player.x + ax, player.z + az, ax, az, 21, 4, 1.0, true, true);
    ring(player.x, player.z, 0.4, 3.0, 0.32, 0xffc46a);
    burst(player.x + ax * 1.2, 1.0, player.z + az * 1.2, 16, 0xffc46a, 7, 0.22);
    game.shake = Math.max(game.shake, 0.4);
    for (const pool of enemies)
      for (const e of pool) {
        if (!e.alive) continue;
        const d = Math.hypot(e.x - player.x, e.z - player.z);
        if (d < 3.2) hitEnemy(e, 2, (e.x - player.x) / (d || 1), (e.z - player.z) / (d || 1), 10);
      }
  } else {
    fireProjectile(player.x + ax * 0.9, player.z + az * 0.9, ax, az, 27, 1.2, 0.5, true);
    burst(player.x + ax * 1.1, 1.0, player.z + az * 1.1, 4, 0xffe3ae, 4, 0.13);
    game.shake = Math.max(game.shake, 0.12);
  }
}

function doDash() {
  if (player.dashCd > 0) return;
  let dx = input.moveX;
  let dz = input.moveY;
  if (!dx && !dz) { dx = Math.sin(player.yaw); dz = Math.cos(player.yaw); }
  const l = Math.hypot(dx, dz) || 1;
  player.vx = (dx / l) * 26;
  player.vz = (dz / l) * 26;
  player.dashT = 0.19;
  player.dashCd = 1.15;
  player.yaw = Math.atan2(dx / l, dz / l);
  burst(player.x, 0.7, player.z, 10, 0x8fe8ff, 4, 0.18);
}

function doGuard() {
  if (player.guardCd > 0) return;
  player.guardT = 0.55;
  player.guardPerfect = 0.2;
  player.guardCd = 1.5;
  ring(player.x, player.z, 0.4, 1.7, 0.3, 0x7df0ff);
}

function doShift() {
  if (player.shiftCd > 0) return;
  const [ax, az] = aimVector();
  let dx = input.moveX;
  let dz = input.moveY;
  if (!dx && !dz) { dx = ax; dz = az; }
  const l = Math.hypot(dx, dz) || 1;
  player.shiftFromX = player.x;
  player.shiftFromZ = player.z;

  const dist = 5.2;
  let nx = player.x + (dx / l) * dist;
  let nz = player.z + (dz / l) * dist;
  const r = Math.hypot(nx, nz);
  if (r > ARENA_R - 0.9) {
    nx = (nx / r) * (ARENA_R - 0.9);
    nz = (nz / r) * (ARENA_R - 0.9);
  }

  for (const pool of enemies)
    for (const e of pool) {
      if (!e.alive) continue;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((e.x - player.x) * (nx - player.x) + (e.z - player.z) * (nz - player.z)) /
            ((nx - player.x) ** 2 + (nz - player.z) ** 2 || 1),
        ),
      );
      const px = player.x + (nx - player.x) * t;
      const pz = player.z + (nz - player.z) * t;
      const d = Math.hypot(e.x - px, e.z - pz);
      if (d < 1.5) hitEnemy(e, 1.5, (e.x - px) / (d || 1), (e.z - pz) / (d || 1), 8);
    }

  for (let i = 0; i < 8; i++) {
    const t = i / 8;
    burst(player.x + (nx - player.x) * t, 0.9, player.z + (nz - player.z) * t, 2, 0xb98cff, 2, 0.16);
  }
  player.x = nx;
  player.z = nz;
  player.vx *= 0.2;
  player.vz *= 0.2;
  player.yaw = Math.atan2(dx / l, dz / l);
  player.shiftFx = 1;
  player.shiftCd = 2.8;
  player.iframe = Math.max(player.iframe, 0.28);
  ring(nx, nz, 0.3, 2.4, 0.32, 0xb98cff);
}

export function step(rawDt: number) {
  const dt = Math.min(rawDt, 0.05);
  if (game.paused) return;

  game.shake = Math.max(0, game.shake - dt * 2.2);
  game.flash = Math.max(0, game.flash - dt * 2.4);
  game.arenaBoost = Math.max(0, game.arenaBoost - dt * 0.6);
  game.toastT = Math.max(0, game.toastT - dt);
  stepParticles(dt);
  stepRings(dt);

  if (game.phase !== "playing") {
    input.prevKic = input.kicDown;
    input.dash = input.guard = input.shift = false;
    return;
  }

  game.elapsed += dt;
  game.hint = Math.max(0, game.hint - dt);
  game.time -= dt;
  if (game.time <= 0) {
    game.time = 0;
    endRun();
  }
  game.tier = game.elapsed > 58 ? 3 : game.elapsed > 28 ? 2 : 1;

  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }
  if (game.multTimer > 0) {
    game.multTimer -= dt;
    if (game.multTimer <= 0) game.mult = 1;
  }
  if (game.gatePower > 0) {
    game.gatePower -= dt;
    if (game.gatePower < 0) game.gatePower = 0;
  }

  stepPlayer(dt);
  updateSpawns(dt);
  stepEnemies(dt);
  stepProjectiles(dt);
  stepShards(dt);
  stepGate();

  input.prevKic = input.kicDown;
  input.dash = input.guard = input.shift = false;
}

function stepPlayer(dt: number) {
  const p = player;
  p.iframe = Math.max(0, p.iframe - dt);
  p.dashCd = Math.max(0, p.dashCd - dt);
  p.guardCd = Math.max(0, p.guardCd - dt);
  p.shiftCd = Math.max(0, p.shiftCd - dt);
  p.kicCd = Math.max(0, p.kicCd - dt);
  p.dashT = Math.max(0, p.dashT - dt);
  p.guardT = Math.max(0, p.guardT - dt);
  p.guardPerfect = Math.max(0, p.guardPerfect - dt);
  p.guardFx = Math.max(0, p.guardFx - dt * 2.2);
  p.shiftFx = Math.max(0, p.shiftFx - dt * 2.6);
  p.swing = Math.max(0, p.swing - dt * 4.5);
  p.hurt = Math.max(0, p.hurt - dt * 2);

  if (input.dash) doDash();
  if (input.guard) doGuard();
  if (input.shift) doShift();

  if (input.kicDown) {
    p.charging = true;
    p.charge = Math.min(1, p.charge + dt / 0.55);
  }
  if (input.prevKic && !input.kicDown) {
    if (p.kicCd <= 0) doKic(p.charge >= 0.6);
    p.charge = 0;
    p.charging = false;
  }
  if (!input.kicDown) {
    p.charging = false;
    p.charge = Math.max(0, p.charge - dt * 2);
  }

  const guardSlow = p.guardT > 0 ? 0.45 : 1;
  const speed = 8.6 * guardSlow;
  let mx = input.moveX;
  let mz = input.moveY;
  const ml = Math.hypot(mx, mz);
  if (ml > 1) { mx /= ml; mz /= ml; }

  if (p.dashT <= 0) {
    const tx = mx * speed;
    const tz = mz * speed;
    const k = 1 - Math.exp(-16 * dt);
    p.vx += (tx - p.vx) * k;
    p.vz += (tz - p.vz) * k;
    if (ml > 0.08) {
      const targetYaw = Math.atan2(mx, mz);
      p.yaw = lerpAngle(p.yaw, targetYaw, 1 - Math.exp(-14 * dt));
    }
  } else {
    p.vx *= Math.exp(-2 * dt);
    p.vz *= Math.exp(-2 * dt);
    if (Math.random() < 0.7) burst(p.x, 0.5, p.z, 1, 0x8fe8ff, 1.2, 0.14);
  }

  p.x += p.vx * dt;
  p.z += p.vz * dt;
  p.step += Math.hypot(p.vx, p.vz) * dt;

  const r = Math.hypot(p.x, p.z);
  const lim = ARENA_R - 0.7;
  if (r > lim) {
    if (r > ARENA_R + 4 || !isFinite(r)) {
      p.x = p.safeX;
      p.z = p.safeZ;
      p.vx = p.vz = 0;
    } else {
      p.x = (p.x / r) * lim;
      p.z = (p.z / r) * lim;
      const radial = (p.vx * p.x + p.vz * p.z) / lim;
      if (radial > 0) {
        p.vx -= (p.x / lim) * radial;
        p.vz -= (p.z / lim) * radial;
      }
    }
  } else {
    p.safeX = p.x;
    p.safeZ = p.z;
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

function stepEnemies(dt: number) {
  for (const pool of enemies)
    for (const e of pool) {
      if (!e.alive) continue;
      e.anim += dt;
      e.flash = Math.max(0, e.flash - dt * 3.5);
      e.spawn = Math.min(1, e.spawn + dt * 3);
      e.cd -= dt;

      const dx = player.x - e.x;
      const dz = player.z - e.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const nx = dx / dist;
      const nz = dz / dist;
      e.yaw = lerpAngle(e.yaw, Math.atan2(nx, nz), 1 - Math.exp(-7 * dt));

      const tierSpd = 1 + (game.tier - 1) * 0.12;
      let ax = 0;
      let az = 0;

      if (e.type === E_CHASER) {
        const spd = 4.5 * tierSpd;
        if (e.tele > 0) {
          e.tele -= dt / e.teleMax;
          if (e.tele <= 0) {
            e.vx = nx * 17;
            e.vz = nz * 17;
            e.cd = 1.5;
          }
        } else if (dist < 5.5 && e.cd <= 0) {
          e.tele = 1;
          e.teleMax = 0.42;
        } else {
          ax = nx * spd * 9;
          az = nz * spd * 9;
        }
      } else if (e.type === E_SHOOTER) {
        const want = 7.5;
        const err = dist - want;
        const spd = 3.4 * tierSpd;
        const strafe = Math.sin(e.anim * 0.9) * 0.7;
        ax = (nx * Math.max(-1, Math.min(1, err * 0.5)) - nz * strafe) * spd * 8;
        az = (nz * Math.max(-1, Math.min(1, err * 0.5)) + nx * strafe) * spd * 8;
        if (e.tele > 0) {
          e.tele -= dt / e.teleMax;
          if (e.tele <= 0) {
            fireProjectile(e.x + nx, e.z + nz, nx, nz, 12.5, 10, 0.45, false);
            burst(e.x + nx, 1.0, e.z + nz, 5, 0x7df0ff, 4, 0.14);
            e.cd = 2.2 - game.tier * 0.25;
          }
        } else if (e.cd <= 0 && dist < 12) {
          e.tele = 1;
          e.teleMax = 0.6;
        }
      } else {
        const spd = 2.2 * tierSpd;
        if (e.tele > 0) {
          e.tele -= dt / e.teleMax;
          if (e.tele <= 0) {
            ring(e.x, e.z, 0.5, 4.0, 0.3, 0xff4d6a);
            burst(e.x, 0.6, e.z, 20, 0xff4d6a, 9, 0.24);
            game.shake = Math.max(game.shake, 0.5);
            if (Math.hypot(player.x - e.x, player.z - e.z) < 4.0) damagePlayer(20, e.x, e.z);
            e.cd = 2.4;
          }
        } else if (dist < 3.6 && e.cd <= 0) {
          e.tele = 1;
          e.teleMax = 0.95;
        } else {
          ax = nx * spd * 9;
          az = nz * spd * 9;
        }
      }

      e.vx += ax * dt;
      e.vz += az * dt;
      const damp = Math.exp(-4.5 * dt);
      e.vx *= damp;
      e.vz *= damp;
      e.x += e.vx * dt;
      e.z += e.vz * dt;

      const r = Math.hypot(e.x, e.z);
      const lim = ARENA_R - 0.6;
      if (r > lim) {
        e.x = (e.x / r) * lim;
        e.z = (e.z / r) * lim;
        e.vx *= 0.4;
        e.vz *= 0.4;
      }

      const cd = e.type === E_HEAVY ? 1.55 : 1.05;
      if (dist < cd) {
        damagePlayer(e.type === E_HEAVY ? 12 : e.type === E_CHASER ? 9 : 6, e.x, e.z);
        e.vx -= nx * 6;
        e.vz -= nz * 6;
      }
    }

  const all: Enemy[] = [];
  for (const pool of enemies) for (const e of pool) if (e.alive) all.push(e);
  for (let i = 0; i < all.length; i++)
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!;
      const b = all[j]!;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d = Math.hypot(dx, dz) || 0.001;
      const min = 1.5;
      if (d < min) {
        const push = ((min - d) / min) * 9 * dt;
        a.vx -= (dx / d) * push * 10;
        a.vz -= (dz / d) * push * 10;
        b.vx += (dx / d) * push * 10;
        b.vz += (dz / d) * push * 10;
      }
    }
}

function stepProjectiles(dt: number) {
  for (const p of projectiles) {
    if (!p.alive) continue;
    p.life -= dt;
    p.x += p.vx * dt;
    p.z += p.vz * dt;
    if (p.life <= 0 || Math.hypot(p.x, p.z) > ARENA_R + 1) {
      p.alive = false;
      continue;
    }
    if (Math.random() < (p.charged ? 0.9 : 0.35))
      spawnParticle(p.x, p.y, p.z, 0, 0.3, 0, 0.22, p.charged ? 0.2 : 0.11, p.friendly ? 0xffc46a : 0x7df0ff, 0);

    if (p.friendly) {
      for (const pool of enemies)
        for (const e of pool) {
          if (!e.alive) continue;
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d < p.r + 0.75) {
            const nx = p.vx,
              nz = p.vz;
            const l = Math.hypot(nx, nz) || 1;
            hitEnemy(e, p.dmg, nx / l, nz / l, p.charged ? 14 : 6);
            if (!p.charged) { p.alive = false; }
            break;
          }
        }
      if (!p.alive) continue;
    } else {
      const d = Math.hypot(player.x - p.x, player.z - p.z);
      if (d < p.r + 0.65) {
        if (player.guardT > 0 && player.guardPerfect > 0) {
          p.friendly = true;
          p.dmg = 3;
          p.vx *= -1.4;
          p.vz *= -1.4;
          p.life = 1.2;
          player.guardFx = 1;
          addScore(80);
          ring(player.x, player.z, 0.4, 2.8, 0.3, 0x7df0ff);
          burst(p.x, 1.0, p.z, 10, 0x9ff6ff, 6, 0.18);
        } else {
          damagePlayer(p.dmg, p.x, p.z);
          burst(p.x, 1.0, p.z, 8, 0xff6a6a, 5, 0.16);
          p.alive = false;
        }
      }
    }
  }
}

function stepShards(dt: number) {
  for (const s of shards) {
    if (!s.alive) continue;
    s.t += dt;
    const dx = player.x - s.x;
    const dz = player.z - s.z;
    const d = Math.hypot(dx, dz) || 0.001;
    if (d < 4.2) {
      const pull = (1 - d / 4.2) * 46 * dt;
      s.vx += (dx / d) * pull;
      s.vz += (dz / d) * pull;
    }
    const damp = Math.exp(-2.4 * dt);
    s.vx *= damp;
    s.vz *= damp;
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    s.y = 0.85 + Math.sin(s.t * 4) * 0.16;

    if (d < 1.0) {
      s.alive = false;
      game.totalShards++;
      game.gateCharge++;
      addScore(25);
      burst(s.x, 1.0, s.z, 6, 0x7df0ff, 4, 0.14);
      if (game.gateCharge % SHARDS_PER_CHARGE === 0) {
        game.gatePower = 8;
        game.shake = Math.max(game.shake, 0.35);
        ring(0, 0, 1, 9, 0.7, 0x7df0ff);
        toast(game.loreUnlocked ? "FLUX GATE ONLINE" : "GATE POWERED — STEP IN");
      }
    }
  }
}

function stepGate() {
  if (game.gatePower <= 0) return;
  if (Math.hypot(player.x, player.z) > GATE_R) return;

  game.gatePower = 0;
  game.gateUses++;
  game.mult = Math.min(5, game.mult + 1);
  game.multTimer = 14;
  game.score += 400 * game.mult;
  game.arenaBoost = 1;
  game.shake = Math.max(game.shake, 0.8);
  ring(0, 0, 1, ARENA_R, 0.9, 0xffc46a);
  ring(0, 0, 1, ARENA_R * 0.6, 0.6, 0x7df0ff);
  burst(0, 1.2, 0, 34, 0xffc46a, 12, 0.3);
  if (!game.loreUnlocked) {
    game.loreUnlocked = true;
    toast("FLUX SURGE ×" + game.mult + " — KIC HARDER");
  } else {
    toast("FLUX SURGE ×" + game.mult);
  }
  for (const pool of enemies)
    for (const e of pool) {
      if (!e.alive) continue;
      const d = Math.hypot(e.x, e.z) || 1;
      hitEnemy(e, 2, e.x / d, e.z / d, 10);
    }
}

function stepParticles(dt: number) {
  for (const p of particles) {
    if (!p.alive) continue;
    p.life -= dt;
    if (p.life <= 0) { p.alive = false; continue; }
    p.vy += p.grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.35; p.vx *= 0.7; p.vz *= 0.7; }
  }
}

function stepRings(dt: number) {
  for (const r of rings) {
    if (!r.alive) continue;
    r.t += dt;
    if (r.t >= r.dur) r.alive = false;
  }
}
