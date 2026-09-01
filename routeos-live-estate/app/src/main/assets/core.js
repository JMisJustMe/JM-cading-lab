(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RouteOSCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const GRID = Object.freeze({ cols: 12, rows: 8 });
  const START = Object.freeze({ x: 0, y: 7 });
  const ANCHOR = Object.freeze({ x: 11, y: 0 });

  const CROWNS = Object.freeze([
    Object.freeze({
      id: 'primitive', name: 'PrimitiveRoute', version: 'v1.5A', x: 2, y: 6,
      proof: '16/16 construction · 16/16 freeze',
      freezeHead: '3c759841606244876e57140254e896c9de7e927b', pr: 74,
      meaning: 'Own the basic port and memory operations the rest of the route depends on.'
    }),
    Object.freeze({
      id: 'dispatch', name: 'DispatchRoute', version: 'v1.6A', x: 4, y: 5,
      proof: '17/17 construction · 17/17 freeze',
      freezeHead: '989d204383ad7e3ea03c749aa0472d6f3c10b199', pr: 75,
      meaning: 'Route timer, syscall, fault and recovery traffic through one generated policy.'
    }),
    Object.freeze({
      id: 'entry', name: 'EntryRoute', version: 'v1.7A', x: 6, y: 3,
      proof: '18/18 construction · 18/18 freeze',
      freezeHead: '3a3476f7b6823f814085eda19ee3fc42cd430668', pr: 76,
      meaning: 'Carry the boot handoff into the generated kernel body.'
    }),
    Object.freeze({
      id: 'contract', name: 'KernelContractRoute', version: 'v1.8A', x: 8, y: 2,
      proof: '19/19 construction · 19/19 freeze',
      freezeHead: '9b36b7f526101df1b94446e632bb3d1d54fdc7b4', pr: 77,
      meaning: 'Freeze the addresses, selectors, syscall numbers and linkage contract.'
    }),
    Object.freeze({
      id: 'orchestration', name: 'OrchestrationRoute', version: 'v1.9A', x: 10, y: 1,
      proof: '20/20 construction · 20/20 freeze',
      freezeHead: '110909c7199bcfbd7007ed56437d05a8aea5967b', pr: 78,
      meaning: 'Own the complete fixed single-core activation sequence.'
    })
  ]);

  const HAZARDS = Object.freeze([
    Object.freeze({ x: 3, y: 6 }),
    Object.freeze({ x: 5, y: 4 }),
    Object.freeze({ x: 7, y: 2 }),
    Object.freeze({ x: 9, y: 1 }),
    Object.freeze({ x: 10, y: 0 })
  ]);

  const WALLS = Object.freeze([
    Object.freeze({ x: 1, y: 5 }),
    Object.freeze({ x: 3, y: 4 }),
    Object.freeze({ x: 5, y: 2 }),
    Object.freeze({ x: 7, y: 4 }),
    Object.freeze({ x: 8, y: 5 }),
    Object.freeze({ x: 10, y: 3 })
  ]);

  const keyOf = (x, y) => `${x},${y}`;
  const HAZARD_KEYS = new Set(HAZARDS.map(p => keyOf(p.x, p.y)));
  const WALL_KEYS = new Set(WALLS.map(p => keyOf(p.x, p.y)));

  class Simulation {
    constructor() {
      this.reset();
    }

    reset() {
      this.player = { x: START.x, y: START.y };
      this.checkpoint = { x: START.x, y: START.y };
      this.collected = [];
      this.faults = 0;
      this.recoveries = 0;
      this.moves = 0;
      this.won = false;
      this.message = 'Find PrimitiveRoute. Collect the five crowns in order.';
      this.trace = [];
      this._trace('BOOT · RouteOS Five Crowns cartridge mounted');
      return this.snapshot();
    }

    snapshot() {
      return {
        player: { ...this.player },
        checkpoint: { ...this.checkpoint },
        collected: [...this.collected],
        faults: this.faults,
        recoveries: this.recoveries,
        moves: this.moves,
        won: this.won,
        message: this.message,
        trace: [...this.trace]
      };
    }

    restore(saved) {
      if (!saved || !saved.player || !Array.isArray(saved.collected)) return false;
      const legal = saved.collected.every((id, index) => CROWNS[index] && CROWNS[index].id === id);
      if (!legal) return false;
      this.player = this._validPoint(saved.player) ? { x: saved.player.x, y: saved.player.y } : { ...START };
      this.checkpoint = this._validPoint(saved.checkpoint) ? { x: saved.checkpoint.x, y: saved.checkpoint.y } : { ...START };
      this.collected = [...saved.collected];
      this.faults = Number.isInteger(saved.faults) && saved.faults >= 0 ? saved.faults : 0;
      this.recoveries = Number.isInteger(saved.recoveries) && saved.recoveries >= 0 ? saved.recoveries : 0;
      this.moves = Number.isInteger(saved.moves) && saved.moves >= 0 ? saved.moves : 0;
      this.won = Boolean(saved.won && this.collected.length === CROWNS.length);
      this.message = typeof saved.message === 'string' ? saved.message : 'Saved route restored.';
      this.trace = Array.isArray(saved.trace) ? saved.trace.slice(-20).map(String) : [];
      this._trace('STATE · saved route restored');
      return true;
    }

    nextCrown() {
      return CROWNS[this.collected.length] || null;
    }

    move(dx, dy) {
      if (this.won) {
        this.message = 'The route is already frozen, locked and anchored.';
        return this.snapshot();
      }
      if (!Number.isInteger(dx) || !Number.isInteger(dy) || Math.abs(dx) + Math.abs(dy) !== 1) {
        throw new Error('Move must be one orthogonal grid step.');
      }

      const target = { x: this.player.x + dx, y: this.player.y + dy };
      if (!this._inside(target.x, target.y)) {
        this.message = 'Boundary reached. The route stays inside the mounted body.';
        this._trace('HOLD · outer boundary blocked');
        return this.snapshot();
      }
      if (WALL_KEYS.has(keyOf(target.x, target.y))) {
        this.message = 'Contract wall. Find another route.';
        this._trace(`HOLD · contract wall at ${target.x}:${target.y}`);
        return this.snapshot();
      }

      this.moves += 1;
      if (HAZARD_KEYS.has(keyOf(target.x, target.y))) {
        return this._fault(target);
      }

      this.player = target;
      this._resolveTile();
      return this.snapshot();
    }

    act() {
      if (this.won) {
        this.message = 'Anchor verified. The five-crown body remains usable.';
        this._trace('ANCHOR · verification repeated');
        return this.snapshot();
      }
      const crown = this.nextCrown();
      if (crown) {
        const distance = Math.abs(crown.x - this.player.x) + Math.abs(crown.y - this.player.y);
        this.message = distance === 0
          ? `${crown.name} is active. Step is already resolved.`
          : `${crown.name} is ${distance} route step${distance === 1 ? '' : 's'} away.`;
        this._trace(`SCAN · ${crown.name} distance ${distance}`);
      } else {
        const distance = Math.abs(ANCHOR.x - this.player.x) + Math.abs(ANCHOR.y - this.player.y);
        this.message = `All crowns mounted. Permanent anchor is ${distance} step${distance === 1 ? '' : 's'} away.`;
        this._trace(`SCAN · anchor distance ${distance}`);
      }
      return this.snapshot();
    }

    _resolveTile() {
      const crown = CROWNS.find(item => item.x === this.player.x && item.y === this.player.y);
      if (crown) {
        const next = this.nextCrown();
        if (next && next.id === crown.id) {
          this.collected.push(crown.id);
          this.checkpoint = { ...this.player };
          this.message = `${crown.name} mounted. Checkpoint advanced.`;
          this._trace(`MOUNT · ${crown.version} ${crown.name}`);
        } else if (!this.collected.includes(crown.id)) {
          this.message = `${crown.name} is real, but the earlier route must be mounted first.`;
          this._trace(`ORDER · ${crown.name} deferred`);
        }
      }

      if (this.player.x === ANCHOR.x && this.player.y === ANCHOR.y) {
        if (this.collected.length === CROWNS.length) {
          this.won = true;
          this.message = 'FIVE CROWNS DING · mounted, frozen, locked and anchored.';
          this._trace('DING · permanent anchor verified');
        } else {
          this.message = 'The anchor cannot lock an incomplete route.';
          this._trace('ANCHOR · incomplete body rejected');
        }
      }
    }

    _fault(target) {
      this.faults += 1;
      this.recoveries += 1;
      this.player = { ...this.checkpoint };
      this.message = `FaultHold caught ${target.x}:${target.y}. RecoveryBody returned you to the last crown.`;
      this._trace(`FAULT · ${target.x}:${target.y} contained`);
      this._trace(`RECOVERY · checkpoint ${this.checkpoint.x}:${this.checkpoint.y}`);
      return this.snapshot();
    }

    _trace(entry) {
      this.trace.push(entry);
      if (this.trace.length > 20) this.trace.shift();
    }

    _inside(x, y) {
      return x >= 0 && y >= 0 && x < GRID.cols && y < GRID.rows;
    }

    _validPoint(point) {
      return point && Number.isInteger(point.x) && Number.isInteger(point.y) && this._inside(point.x, point.y);
    }
  }

  return {
    GRID, START, ANCHOR, CROWNS, HAZARDS, WALLS,
    HAZARD_KEYS, WALL_KEYS, keyOf, Simulation
  };
});
