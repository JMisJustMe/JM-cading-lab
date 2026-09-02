import { useCallback, useEffect, useRef, useState } from "react";
import { MAX_TIME, SHARD_GOAL, forcePublish, useHud } from "./hudStore";
import { game, input, player, resetRun } from "./world";

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const idRef = useRef<number | null>(null);

  const set = useCallback((cx: number, cy: number, e: PointerEvent | React.PointerEvent) => {
    const R = 56;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    input.moveX = dx / R;
    input.moveY = dy / R;
  }, []);

  const onDown = (e: React.PointerEvent) => {
    const el = base.current;
    if (!el) return;
    e.preventDefault();
    const r = el.getBoundingClientRect();
    idRef.current = e.pointerId;
    el.setPointerCapture(e.pointerId);
    set(r.left + r.width / 2, r.top + r.height / 2, e);
  };
  const onMove = (e: React.PointerEvent) => {
    if (idRef.current !== e.pointerId) return;
    const el = base.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    set(r.left + r.width / 2, r.top + r.height / 2, e);
  };
  const onUp = (e: React.PointerEvent) => {
    if (idRef.current !== e.pointerId) return;
    idRef.current = null;
    setKnob({ x: 0, y: 0 });
    input.moveX = 0;
    input.moveY = 0;
  };

  return (
    <div
      ref={base}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      className="pointer-events-auto relative h-[132px] w-[132px] touch-none rounded-full border border-cyan-300/25 bg-slate-950/45 backdrop-blur-sm"
      style={{ boxShadow: "0 0 30px rgba(95,227,255,0.15) inset" }}
      aria-label="Move"
    >
      <div className="absolute inset-[26%] rounded-full border border-cyan-200/15" />
      <div
        className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/50 bg-cyan-300/20"
        style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
      />
    </div>
  );
}

function AbilityButton({ label, sub, cd, color, onPress, big, onRelease }: {
  label: string;
  sub?: string;
  cd: number;
  color: string;
  onPress: () => void;
  onRelease?: () => void;
  big?: boolean;
}) {
  const ready = cd <= 0;
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onPress(); }}
      onPointerUp={(e) => { e.preventDefault(); onRelease?.(); }}
      onPointerCancel={() => onRelease?.()}
      onPointerLeave={(e) => { if (e.buttons) onRelease?.(); }}
      className={`pointer-events-auto relative flex touch-none select-none flex-col items-center justify-center rounded-full border font-semibold uppercase tracking-wider transition-transform active:scale-95 ${big ? "h-[104px] w-[104px] text-base" : "h-[70px] w-[70px] text-[11px]"}`}
      style={{
        borderColor: ready ? color : "rgba(255,255,255,0.12)",
        color: ready ? color : "rgba(255,255,255,0.35)",
        background: ready ? `radial-gradient(circle at 50% 40%, ${color}22, rgba(6,10,16,0.7))` : "rgba(6,10,16,0.6)",
        boxShadow: ready ? `0 0 18px ${color}33` : "none",
      }}
    >
      {label}
      {sub ? <span className="text-[9px] opacity-60">{sub}</span> : null}
      {!ready && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/45 text-xs text-white/70">{cd.toFixed(1)}</span>}
    </button>
  );
}

function Meter({ value, color, label }: { value: number; color: string; label?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-[width] duration-150"
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%`, background: color, boxShadow: `0 0 10px ${color}` }}
        aria-label={label}
      />
    </div>
  );
}

export function HUD() {
  const h = useHud();
  const [portrait, setPortrait] = useState(false);

  useEffect(() => {
    const on = () => setPortrait(window.innerHeight > window.innerWidth);
    on();
    window.addEventListener("resize", on);
    return () => window.removeEventListener("resize", on);
  }, []);

  useEffect(() => {
    const keys = new Set<string>();
    const apply = () => {
      const x = (keys.has("d") || keys.has("arrowright") ? 1 : 0) - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
      const y = (keys.has("s") || keys.has("arrowdown") ? 1 : 0) - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
      input.moveX = x;
      input.moveY = y;
    };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === " ") e.preventDefault();
      if (keys.has(k)) return;
      keys.add(k);
      apply();
      if (k === " " || k === "j") input.kicDown = true;
      if (k === "shift") input.dash = true;
      if (k === "k") input.guard = true;
      if (k === "l") input.shift = true;
      if (k === "p" || k === "escape") game.paused = !game.paused;
      if (k === "r" && game.phase === "over") { resetRun(); forcePublish(); }
    };
    const up = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.delete(k);
      apply();
      if (k === " " || k === "j") input.kicDown = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const restart = () => { resetRun(); forcePublish(); };

  return (
    <div className="pointer-events-none fixed inset-0 select-none font-mono text-white">
      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-200/70">Kicshift</div>
          <div className="text-2xl font-bold leading-none tabular-nums text-amber-200 drop-shadow-[0_0_10px_rgba(255,179,71,0.5)]">{h.score.toLocaleString()}</div>
          <div className="mt-1 max-w-[180px]"><Meter value={h.hp / 100} color="#ff6a2a" label="Integrity" /></div>
          <div className="mt-1 max-w-[180px]"><Meter value={h.gateCharge / SHARD_GOAL} color="#5fe3ff" label="Gate charge" /></div>
        </div>

        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Time</div>
          <div className={`text-3xl font-bold leading-none tabular-nums ${h.time <= 10 ? "text-rose-300" : "text-white"}`}>
            {String(Math.floor(h.time / 60)).padStart(2, "0")}:{String(h.time % 60).padStart(2, "0")}
          </div>
          <div className="mt-1 w-24"><Meter value={h.time / MAX_TIME} color="#b98cff" /></div>
        </div>

        <div className="flex-1 text-right">
          <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">Tier {h.tier}</div>
          <div className="text-xl font-bold leading-none text-cyan-200">x{h.mult}</div>
          {h.combo > 1 && <div className="text-sm text-amber-300">{h.combo} combo</div>}
          <button onPointerDown={() => { game.paused = !game.paused; forcePublish(); }} className="pointer-events-auto mt-1 rounded-md border border-white/20 bg-black/40 px-3 py-1 text-[11px] uppercase tracking-widest text-white/80">{h.paused ? "Resume" : "Pause"}</button>
        </div>
      </div>

      {h.toastT > 0 && <div className="absolute left-1/2 top-[26%] -translate-x-1/2 rounded-full border border-cyan-300/40 bg-black/55 px-4 py-1 text-sm uppercase tracking-[0.2em] text-cyan-200">{h.toast}</div>}
      {h.hint > 0 && h.phase === "playing" && <div className="absolute left-1/2 top-[34%] -translate-x-1/2 whitespace-nowrap rounded-md bg-black/45 px-3 py-1 text-[11px] tracking-widest text-white/70">MOVE · KIC TO STRIKE · HOLD KIC TO CHARGE</div>}

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Joystick />
        <div className="flex items-end gap-3">
          <div className="flex flex-col gap-3">
            <AbilityButton label="Shift" cd={h.shiftCd} color="#b98cff" onPress={() => (input.shift = true)} />
            <AbilityButton label="Guard" cd={h.guardCd} color="#5fe3ff" onPress={() => (input.guard = true)} />
          </div>
          <div className="flex flex-col items-center gap-3">
            <AbilityButton label="Dash" cd={h.dashCd} color="#ffb347" onPress={() => (input.dash = true)} />
            <div className="relative">
              <AbilityButton label="KIC" sub="hold" cd={0} color="#ff6a2a" big onPress={() => (input.kicDown = true)} onRelease={() => (input.kicDown = false)} />
              {h.charge > 0 && <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-amber-200" style={{ opacity: h.charge, boxShadow: `0 0 ${10 + h.charge * 22}px rgba(255,215,154,${h.charge})` }} />}
            </div>
          </div>
        </div>
      </div>

      {portrait && h.phase === "playing" && !h.paused && <div className="absolute left-1/2 top-[18%] -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-[10px] tracking-widest text-white/60">ROTATE FOR FULL ARENA</div>}

      {h.paused && h.phase === "playing" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-[300px] rounded-2xl border border-cyan-300/25 bg-slate-950/80 p-5 text-center">
            <div className="text-lg uppercase tracking-[0.3em] text-cyan-200">Paused</div>
            <p className="mt-3 text-left text-xs leading-relaxed text-white/60">Move with the stick. KIC to strike — hold to charge a flux bolt. DASH through danger, GUARD on the beat to deflect, SHIFT to blink. Collect shards to power the gate.</p>
            <div className="mt-4 flex gap-2">
              <button onPointerDown={() => { game.paused = false; forcePublish(); }} className="flex-1 rounded-lg border border-cyan-300/40 bg-cyan-400/10 py-2 text-sm uppercase tracking-widest text-cyan-200">Resume</button>
              <button onPointerDown={restart} className="flex-1 rounded-lg border border-white/20 py-2 text-sm uppercase tracking-widest text-white/70">Restart</button>
            </div>
          </div>
        </div>
      )}

      {h.phase === "over" && (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="w-[320px] rounded-2xl border border-amber-300/30 bg-slate-950/85 p-6 text-center">
            <div className="text-[11px] uppercase tracking-[0.35em] text-amber-200/70">Run Complete</div>
            <div className="mt-2 text-4xl font-bold tabular-nums text-amber-200">{h.score.toLocaleString()}</div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-left text-xs text-white/60">
              <span>Kills</span><span className="text-right text-white/90">{h.kills}</span>
              <span>Best combo</span><span className="text-right text-white/90">{h.bestCombo}</span>
              <span>Integrity</span><span className="text-right text-white/90">{h.hp}</span>
            </div>
            <button onPointerDown={restart} className="mt-5 w-full rounded-lg border border-amber-300/50 bg-amber-400/10 py-3 text-sm uppercase tracking-[0.25em] text-amber-200">Run Again</button>
          </div>
        </div>
      )}

      {h.hp < 35 && h.phase === "playing" && <div className="absolute inset-0" style={{ boxShadow: "inset 0 0 140px rgba(255,60,60,0.35)" }} />}
      <span className="sr-only">{player.hp}</span>
    </div>
  );
}
