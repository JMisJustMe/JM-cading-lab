import { useSyncExternalStore } from "react";
import { game, player, RUN_TIME, SHARDS_PER_CHARGE } from "./world";

export interface HudSnapshot {
  phase: "playing" | "over";
  paused: boolean;
  score: number;
  combo: number;
  bestCombo: number;
  mult: number;
  time: number;
  tier: number;
  hp: number;
  charge: number;
  gateCharge: number;
  gatePower: number;
  dashCd: number;
  guardCd: number;
  shiftCd: number;
  hint: number;
  toast: string;
  toastT: number;
  kills: number;
  loreUnlocked: boolean;
}

let snapshot: HudSnapshot = build();
const listeners = new Set<() => void>();

function build(): HudSnapshot {
  return {
    phase: game.phase,
    paused: game.paused,
    score: game.score,
    combo: game.combo,
    bestCombo: game.bestCombo,
    mult: game.mult,
    time: Math.max(0, Math.ceil(game.time)),
    tier: game.tier,
    hp: Math.max(0, Math.round(player.hp)),
    charge: Math.round(player.charge * 20) / 20,
    gateCharge: game.gateCharge % SHARDS_PER_CHARGE,
    gatePower: Math.ceil(game.gatePower),
    dashCd: Math.round(player.dashCd * 10) / 10,
    guardCd: Math.round(player.guardCd * 10) / 10,
    shiftCd: Math.round(player.shiftCd * 10) / 10,
    hint: game.hint > 0 ? 1 : 0,
    toast: game.toast,
    toastT: game.toastT > 0 ? 1 : 0,
    kills: game.kills,
    loreUnlocked: game.loreUnlocked,
  };
}

function differs(a: HudSnapshot, b: HudSnapshot) {
  for (const k of Object.keys(a) as (keyof HudSnapshot)[]) if (a[k] !== b[k]) return true;
  return false;
}

export function publishHud() {
  const next = build();
  if (differs(snapshot, next)) {
    snapshot = next;
    listeners.forEach((l) => l());
  }
}

export function forcePublish() {
  snapshot = build();
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const getSnapshot = () => snapshot;

export function useHud(): HudSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export const MAX_TIME = RUN_TIME;
export const SHARD_GOAL = SHARDS_PER_CHARGE;
