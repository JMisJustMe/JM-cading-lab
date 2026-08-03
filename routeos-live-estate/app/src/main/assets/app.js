(() => {
  'use strict';

  const {
    GRID, START, ANCHOR, CROWNS, HAZARDS, WALLS,
    HAZARD_KEYS, WALL_KEYS, keyOf, Simulation
  } = window.RouteOSCore;

  const SAVE_KEY = 'jm.routeos.five-crowns.state.v2';
  const VIEWS = ['library', 'play', 'crowns', 'proof'];
  const sim = new Simulation();
  let currentView = 'library';
  let manifest = null;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  class Store {
    static load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    }

    static save(snapshot) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
      } catch (_) {
        // The cartridge remains playable even if storage is unavailable.
      }
    }

    static clear() {
      try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* no-op */ }
    }
  }

  class Renderer {
    constructor(canvas, simulation) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.simulation = simulation;
      this.frame = 0;
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(canvas.parentElement);
      this.resize();
      requestAnimationFrame(() => this.loop());
    }

    resize() {
      const box = this.canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.canvas.width = Math.max(1, Math.floor(box.width * dpr));
      this.canvas.height = Math.max(1, Math.floor(box.height * dpr));
      this.canvas.style.width = `${box.width}px`;
      this.canvas.style.height = `${box.height}px`;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.cssWidth = box.width;
      this.cssHeight = box.height;
      this.draw();
    }

    loop() {
      this.frame += 1;
      this.draw();
      requestAnimationFrame(() => this.loop());
    }

    draw() {
      const ctx = this.ctx;
      const width = this.cssWidth || 1;
      const height = this.cssHeight || 1;
      ctx.clearRect(0, 0, width, height);
      if (width < 80 || height < 80) return;

      const controlReserve = width < 600 ? 142 : 0;
      const usableHeight = Math.max(80, height - controlReserve);
      const tile = Math.min((width - 34) / GRID.cols, (usableHeight - 34) / GRID.rows);
      const boardW = tile * GRID.cols;
      const boardH = tile * GRID.rows;
      const ox = (width - boardW) / 2;
      const oy = (usableHeight - boardH) / 2;
      const pulse = (Math.sin(this.frame / 22) + 1) / 2;

      const bg = ctx.createRadialGradient(width * .5, height * .4, 20, width * .5, height * .5, Math.max(width, height));
      bg.addColorStop(0, '#15253a');
      bg.addColorStop(.55, '#09121d');
      bg.addColorStop(1, '#05080d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(ox, oy);
      ctx.fillStyle = 'rgba(5,12,20,.88)';
      ctx.strokeStyle = 'rgba(105,210,255,.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0, 0, boardW, boardH, 16);
      ctx.fill();
      ctx.stroke();

      for (let y = 0; y < GRID.rows; y += 1) {
        for (let x = 0; x < GRID.cols; x += 1) {
          const px = x * tile;
          const py = y * tile;
          ctx.fillStyle = (x + y) % 2 === 0 ? 'rgba(21,42,61,.62)' : 'rgba(14,31,47,.62)';
          ctx.fillRect(px + 1, py + 1, tile - 2, tile - 2);
          ctx.strokeStyle = 'rgba(103,191,230,.09)';
          ctx.strokeRect(px + .5, py + .5, tile - 1, tile - 1);
        }
      }

      WALLS.forEach(point => {
        const px = point.x * tile;
        const py = point.y * tile;
        ctx.fillStyle = 'rgba(110,132,153,.3)';
        ctx.fillRect(px + tile * .18, py + tile * .15, tile * .64, tile * .7);
        ctx.strokeStyle = 'rgba(183,211,231,.4)';
        ctx.strokeRect(px + tile * .18, py + tile * .15, tile * .64, tile * .7);
      });

      HAZARDS.forEach(point => {
        const cx = point.x * tile + tile / 2;
        const cy = point.y * tile + tile / 2;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = `rgba(255,78,116,${.34 + pulse * .18})`;
        ctx.strokeStyle = '#ff6a8d';
        ctx.lineWidth = 2;
        ctx.fillRect(-tile * .23, -tile * .23, tile * .46, tile * .46);
        ctx.strokeRect(-tile * .23, -tile * .23, tile * .46, tile * .46);
        ctx.restore();
      });

      CROWNS.forEach((crown, index) => {
        const complete = sim.collected.includes(crown.id);
        const active = sim.collected.length === index;
        const cx = crown.x * tile + tile / 2;
        const cy = crown.y * tile + tile / 2;
        this.drawCrown(ctx, cx, cy, tile * .54, complete, active, pulse, crown.name[0]);
      });

      const ax = ANCHOR.x * tile + tile / 2;
      const ay = ANCHOR.y * tile + tile / 2;
      ctx.save();
      ctx.translate(ax, ay);
      ctx.strokeStyle = sim.collected.length === CROWNS.length ? '#8dffb8' : 'rgba(141,255,184,.35)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, tile * .28 + pulse * 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-tile * .18, 0);
      ctx.lineTo(tile * .18, 0);
      ctx.moveTo(0, -tile * .18);
      ctx.lineTo(0, tile * .18);
      ctx.stroke();
      ctx.restore();

      const px = sim.player.x * tile + tile / 2;
      const py = sim.player.y * tile + tile / 2;
      ctx.save();
      ctx.translate(px, py);
      ctx.shadowColor = '#56d8ff';
      ctx.shadowBlur = 14;
      ctx.fillStyle = '#eafaff';
      ctx.strokeStyle = '#4fd7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, tile * .22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#0a1420';
      ctx.font = `700 ${Math.max(10, tile * .22)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('JM', 0, 1);
      ctx.restore();

      ctx.restore();
    }

    drawCrown(ctx, cx, cy, size, complete, active, pulse, label) {
      ctx.save();
      ctx.translate(cx, cy);
      const alpha = complete ? 1 : active ? .9 : .3;
      ctx.globalAlpha = alpha;
      ctx.shadowColor = complete ? '#76ffb3' : '#ffd868';
      ctx.shadowBlur = active || complete ? 12 + pulse * 8 : 0;
      ctx.fillStyle = complete ? '#72ffad' : '#ffd56a';
      ctx.strokeStyle = complete ? '#d9ffe8' : '#fff1bd';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-size * .42, size * .2);
      ctx.lineTo(-size * .5, -size * .25);
      ctx.lineTo(-size * .14, -size * .02);
      ctx.lineTo(0, -size * .48);
      ctx.lineTo(size * .14, -size * .02);
      ctx.lineTo(size * .5, -size * .25);
      ctx.lineTo(size * .42, size * .2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillRect(-size * .42, size * .18, size * .84, size * .17);
      ctx.fillStyle = '#0b1520';
      ctx.shadowBlur = 0;
      ctx.font = `800 ${Math.max(9, size * .3)}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, size * .12);
      ctx.restore();
    }
  }

  function loadManifest() {
    return fetch('cartridges.json')
      .then(response => response.ok ? response.json() : Promise.reject(new Error('manifest unavailable')))
      .then(value => { manifest = value; return value; })
      .catch(() => null);
  }

  function restoreState() {
    const saved = Store.load();
    if (saved) sim.restore(saved);
  }

  function saveState() {
    Store.save(sim.snapshot());
  }

  function setView(view) {
    if (!VIEWS.includes(view)) view = 'library';
    currentView = view;
    $$('main > section[data-view]').forEach(section => section.hidden = section.dataset.view !== view);
    $$('[data-nav]').forEach(button => {
      const active = button.dataset.nav === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.body.dataset.view = view;
    if (view === 'play') $('#gameCanvas').focus({ preventScroll: true });
  }

  function renderUI() {
    const next = sim.nextCrown();
    $('#routeMessage').textContent = sim.message;
    $('#progressValue').textContent = `${sim.collected.length}/5`;
    $('#faultValue').textContent = String(sim.faults);
    $('#recoveryValue').textContent = String(sim.recoveries);
    $('#moveValue').textContent = String(sim.moves);
    $('#nextValue').textContent = next ? next.name : sim.won ? 'Anchored' : 'Permanent anchor';
    $('#winPanel').hidden = !sim.won;
    $('#continueLabel').textContent = sim.collected.length ? `Continue ${sim.collected.length}/5` : 'Play Five Crowns';

    const rail = $('#crownRail');
    rail.innerHTML = CROWNS.map((crown, index) => {
      const complete = sim.collected.includes(crown.id);
      const active = sim.collected.length === index;
      return `<li class="${complete ? 'complete' : ''} ${active ? 'active' : ''}">
        <span class="routeDot">${complete ? '✓' : index + 1}</span>
        <span><b>${crown.name}</b><small>${crown.version}</small></span>
      </li>`;
    }).join('');

    $('#traceList').innerHTML = sim.trace.slice().reverse().map(entry => `<li>${escapeHtml(entry)}</li>`).join('');
  }

  function applyMove(dx, dy) {
    if (currentView !== 'play') setView('play');
    sim.move(dx, dy);
    saveState();
    renderUI();
  }

  function act() {
    sim.act();
    saveState();
    renderUI();
  }

  function resetGame() {
    sim.reset();
    Store.clear();
    saveState();
    renderUI();
    setView('play');
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  function nativeBridge(method, ...args) {
    const bridge = window.RouteOSEstate;
    if (bridge && typeof bridge[method] === 'function') {
      bridge[method](...args);
      return true;
    }
    return false;
  }

  function copyText(text, button) {
    if (!nativeBridge('copyText', text) && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    if (button) {
      const old = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = old; }, 900);
    }
  }

  function bindControls() {
    $$('[data-nav]').forEach(button => button.addEventListener('click', () => setView(button.dataset.nav)));
    $$('[data-move]').forEach(button => {
      button.addEventListener('click', () => {
        const [dx, dy] = button.dataset.move.split(',').map(Number);
        applyMove(dx, dy);
      });
    });
    $$('[data-copy]').forEach(button => button.addEventListener('click', () => copyText(button.dataset.copy, button)));

    $('#launchButton').addEventListener('click', () => setView('play'));
    $('#continueButton').addEventListener('click', () => setView('play'));
    $('#actButton').addEventListener('click', act);
    $('#resetButton').addEventListener('click', resetGame);
    $('#resetProofButton').addEventListener('click', resetGame);
    $('#libraryButton').addEventListener('click', () => setView('library'));
    $('#compassButton').addEventListener('click', () => {
      if (!nativeBridge('returnToCompass')) window.history.back();
    });

    window.addEventListener('keydown', event => {
      if (currentView !== 'play') return;
      const map = {
        ArrowUp: [0, -1], w: [0, -1], W: [0, -1],
        ArrowDown: [0, 1], s: [0, 1], S: [0, 1],
        ArrowLeft: [-1, 0], a: [-1, 0], A: [-1, 0],
        ArrowRight: [1, 0], d: [1, 0], D: [1, 0]
      };
      if (map[event.key]) {
        event.preventDefault();
        applyMove(...map[event.key]);
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        act();
      }
    });
  }

  function renderCrowns() {
    $('#crownCards').innerHTML = CROWNS.map((crown, index) => `
      <article class="crownCard">
        <div class="crownNumber">${index + 1}</div>
        <div>
          <h3>${crown.name} <span>${crown.version}</span></h3>
          <p>${crown.meaning}</p>
          <dl><div><dt>Proof</dt><dd>${crown.proof}</dd></div><div><dt>Freeze</dt><dd><code>${crown.freezeHead.slice(0, 12)}…</code></dd></div></dl>
          <a href="https://github.com/JMisJustMe/JM-cading-lab/pull/${crown.pr}">Inspect PR #${crown.pr}</a>
        </div>
      </article>`).join('');
  }

  function initialCartridge() {
    const id = decodeURIComponent(location.hash.replace(/^#/, '') || 'library');
    const known = new Set(['five-crowns', 'routeos-five-crowns', 'routeos-v1.9a', 'orchestrationroute']);
    setView(known.has(id.toLowerCase()) ? 'play' : 'library');
  }

  async function start() {
    await loadManifest();
    restoreState();
    renderCrowns();
    bindControls();
    new Renderer($('#gameCanvas'), sim);
    renderUI();
    initialCartridge();

    $('#registryStatus').textContent = manifest
      ? `${manifest.cartridges.length} mounted cartridge · offline registry ready`
      : 'Built-in cartridge ready · registry fallback active';
  }

  window.RouteOSEstateApp = {
    nativeBack() {
      if (currentView !== 'library') {
        setView('library');
        return true;
      }
      return false;
    },
    openCartridge(id) {
      if (['five-crowns', 'routeos-five-crowns', 'routeos-v1.9a', 'orchestrationroute'].includes(String(id).toLowerCase())) {
        setView('play');
        return true;
      }
      setView('library');
      return false;
    }
  };

  document.addEventListener('DOMContentLoaded', start);
})();
