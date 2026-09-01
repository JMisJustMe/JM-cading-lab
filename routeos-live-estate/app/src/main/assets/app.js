(() => {
  'use strict';

  const {
    GRID, ANCHOR, CROWNS, HAZARDS, WALLS, Simulation
  } = window.RouteOSCore;
  const EstateRouter = window.JMEstateRouter;

  const SAVE_KEY = 'jm.routeos.five-crowns.state.v2';
  const ROUTER_QUERY_KEY = 'jm.routeos.estate-router.query.v1';
  const VIEWS = ['library', 'play', 'router', 'crowns', 'proof'];
  const sim = new Simulation();

  let currentView = 'library';
  let manifest = null;
  let estateRegistry = null;
  let compatibility = null;
  let currentPlan = null;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];

  class Store {
    static loadGame() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (_) {
        return null;
      }
    }

    static saveGame(snapshot) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
      } catch (_) {
        // The cartridge remains playable even if storage is unavailable.
      }
    }

    static clearGame() {
      try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* no-op */ }
    }

    static loadQuery() {
      try { return localStorage.getItem(ROUTER_QUERY_KEY) || ''; } catch (_) { return ''; }
    }

    static saveQuery(query) {
      try { localStorage.setItem(ROUTER_QUERY_KEY, String(query)); } catch (_) { /* no-op */ }
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

      const bg = ctx.createRadialGradient(
        width * .5, height * .4, 20,
        width * .5, height * .5, Math.max(width, height)
      );
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
          ctx.fillStyle = (x + y) % 2 === 0
            ? 'rgba(21,42,61,.62)'
            : 'rgba(14,31,47,.62)';
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
      ctx.strokeStyle = sim.collected.length === CROWNS.length
        ? '#8dffb8'
        : 'rgba(141,255,184,.35)';
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

  function loadJson(path) {
    return fetch(path).then(response => {
      if (!response.ok) throw new Error(`HTTP_${response.status}:${path}`);
      return response.json();
    });
  }

  async function loadAuthority() {
    manifest = await loadJson('cartridges.json');

    const meta = await loadJson('estate-registry/REGISTRY.json');
    const parts = await Promise.all(meta.parts.map(relative =>
      loadJson(`estate-registry/${relative}`)
    ));
    compatibility = await loadJson('estate-registry/COMPATIBILITY.json');
    estateRegistry = EstateRouter.combineRegistryParts(meta, parts);

    const estateValidation = EstateRouter.validateRegistry(estateRegistry);
    const cartridgeValidation = EstateRouter.validateCartridgeRegistry(manifest);
    if (!estateValidation.valid) throw new Error(estateValidation.failures.join(','));
    if (!cartridgeValidation.valid) throw new Error(cartridgeValidation.failures.join(','));
  }

  function restoreState() {
    const saved = Store.loadGame();
    if (saved) sim.restore(saved);
  }

  function saveState() {
    Store.saveGame(sim.snapshot());
  }

  function setView(view) {
    if (!VIEWS.includes(view)) view = 'library';
    currentView = view;
    $$('main > section[data-view]').forEach(section => {
      section.hidden = section.dataset.view !== view;
    });
    $$('[data-nav]').forEach(button => {
      const active = button.dataset.nav === view;
      button.classList.toggle('active', active);
      button.setAttribute('aria-current', active ? 'page' : 'false');
    });
    document.body.dataset.view = view;
    if (view === 'play') $('#gameCanvas').focus({ preventScroll: true });
  }

  function openCartridge(id) {
    const cartridge = EstateRouter.resolveCartridge(manifest, id);
    if (!cartridge) {
      setView('library');
      return false;
    }
    const view = cartridge.view || 'library';
    history.replaceState(null, '', `#${encodeURIComponent(cartridge.id)}`);
    setView(view);
    return true;
  }

  function renderLibrary() {
    const shelf = $('#cartridgeShelf');
    shelf.innerHTML = manifest.cartridges.map((cartridge, index) => `
      <article class="cartridgeCard">
        <div class="cartridgeGlyph">${index === 0 ? '♛' : '↯'}</div>
        <div>
          <h3>${escapeHtml(cartridge.title)}</h3>
          <p>${escapeHtml(cartridge.description || '')}</p>
        </div>
        <button data-open-cartridge="${escapeHtml(cartridge.id)}">Open</button>
      </article>
    `).join('');

    $('#registryStatus').textContent =
      `${manifest.cartridges.length} mounted cartridges · ${estateRegistry.bodies.length} routed bodies · fully offline`;
  }

  function renderGameUI() {
    const next = sim.nextCrown();
    $('#routeMessage').textContent = sim.message;
    $('#progressValue').textContent = `${sim.collected.length}/5`;
    $('#faultValue').textContent = String(sim.faults);
    $('#recoveryValue').textContent = String(sim.recoveries);
    $('#moveValue').textContent = String(sim.moves);
    $('#nextValue').textContent = next ? next.name : sim.won ? 'Anchored' : 'Permanent anchor';
    $('#winPanel').hidden = !sim.won;

    $('#crownRail').innerHTML = CROWNS.map((crown, index) => {
      const complete = sim.collected.includes(crown.id);
      const active = sim.collected.length === index;
      return `<li class="${complete ? 'complete' : ''} ${active ? 'active' : ''}">
        <span class="routeDot">${complete ? '✓' : index + 1}</span>
        <span><b>${crown.name}</b><small>${crown.version}</small></span>
      </li>`;
    }).join('');

    $('#traceList').innerHTML = sim.trace
      .slice()
      .reverse()
      .map(entry => `<li>${escapeHtml(entry)}</li>`)
      .join('');
  }

  function applyMove(dx, dy) {
    if (currentView !== 'play') setView('play');
    sim.move(dx, dy);
    saveState();
    renderGameUI();
  }

  function act() {
    sim.act();
    saveState();
    renderGameUI();
  }

  function resetGame() {
    sim.reset();
    Store.clearGame();
    saveState();
    renderGameUI();
    setView('play');
  }

  function renderCrowns() {
    $('#crownCards').innerHTML = CROWNS.map((crown, index) => `
      <article class="crownCard">
        <div class="crownNumber">${index + 1}</div>
        <div>
          <h3>${crown.name} <span>${crown.version}</span></h3>
          <p>${crown.meaning}</p>
          <dl>
            <div><dt>Proof</dt><dd>${crown.proof}</dd></div>
            <div><dt>Freeze</dt><dd><code>${crown.freezeHead.slice(0, 12)}…</code></dd></div>
          </dl>
          <a href="https://github.com/JMisJustMe/JM-cading-lab/pull/${crown.pr}">Inspect PR #${crown.pr}</a>
        </div>
      </article>
    `).join('');
  }

  function planRouter(query) {
    if (!estateRegistry) return;
    const clean = String(query || '').trim();
    if (!clean) return;
    currentPlan = EstateRouter.planEstateRoute(clean, estateRegistry, { includeDelivery: true });
    Store.saveQuery(clean);
    renderRoutePlan(currentPlan);
  }

  function renderRoutePlan(plan) {
    const byId = new Map(estateRegistry.bodies.map(body => [body.id, body]));
    $('#routeTitle').textContent = plan.query;
    $('#intentSummary').textContent = plan.intents.length
      ? plan.intents.join(' · ')
      : 'general route';

    $('#plannedRoute').innerHTML = plan.route.map(item => `
      <li>
        <span class="routeOrder">${item.order}</span>
        <span class="routeBody">
          <b>${escapeHtml(item.name)}</b>
          <small>${escapeHtml(item.role)}</small>
        </span>
        <span class="routeReason">${escapeHtml(item.reasons.join(' · '))}</span>
      </li>
    `).join('');

    const links = [];
    for (let index = 0; index < plan.route.length - 1; index += 1) {
      const from = byId.get(plan.route[index].id);
      const to = byId.get(plan.route[index + 1].id);
      const relation = EstateRouter.compatibilityBetween(from, to, compatibility);
      links.push(`<span class="${escapeHtml(relation.mode)}">${escapeHtml(from.name)} → ${escapeHtml(to.name)} · ${escapeHtml(relation.mode)}</span>`);
    }
    $('#compatibilityPath').innerHTML = links.join('');
    $('#appliedLaws').innerHTML = plan.lawsApplied
      .map(law => `<span>${escapeHtml(law)}</span>`)
      .join('');
  }

  function routeReceiptText() {
    if (!currentPlan) return '';
    return [
      `JM Sovereign Estate Route`,
      `Query: ${currentPlan.query}`,
      `Intents: ${currentPlan.intents.join(', ') || 'general'}`,
      '',
      ...currentPlan.route.map(item => `${item.order}. ${item.name} — ${item.role}`),
      '',
      `Laws: ${currentPlan.lawsApplied.join(', ')}`
    ].join('\n');
  }

  function renderBodyResults(query = '') {
    const bodies = EstateRouter.searchBodies(estateRegistry, query, 24);
    $('#bodyResults').innerHTML = bodies.map(body => `
      <article class="bodyResult">
        <b>${escapeHtml(body.name)}</b>
        <small>${escapeHtml(body.family)} · ${escapeHtml(body.category)}</small>
        <p>${escapeHtml(body.role)}</p>
      </article>
    `).join('');
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
    $$('[data-nav]').forEach(button => {
      button.addEventListener('click', () => setView(button.dataset.nav));
    });

    document.addEventListener('click', event => {
      const button = event.target.closest('[data-open-cartridge]');
      if (button) openCartridge(button.dataset.openCartridge);
    });

    $$('[data-move]').forEach(button => {
      button.addEventListener('click', () => {
        const [dx, dy] = button.dataset.move.split(',').map(Number);
        applyMove(dx, dy);
      });
    });

    $$('[data-copy]').forEach(button => {
      button.addEventListener('click', () => copyText(button.dataset.copy, button));
    });

    $('#actButton').addEventListener('click', act);
    $('#resetButton').addEventListener('click', resetGame);
    $('#resetProofButton').addEventListener('click', resetGame);
    $('#libraryButton').addEventListener('click', () => setView('library'));
    $('#compassButton').addEventListener('click', () => {
      if (!nativeBridge('returnToCompass')) window.history.back();
    });

    $('#planRouteButton').addEventListener('click', () => planRouter($('#routePrompt').value));
    $('#copyRouteButton').addEventListener('click', event => copyText(routeReceiptText(), event.currentTarget));
    $$('.quickPrompts [data-prompt]').forEach(button => {
      button.addEventListener('click', () => {
        $('#routePrompt').value = button.dataset.prompt;
        planRouter(button.dataset.prompt);
      });
    });
    $('#bodySearch').addEventListener('input', event => renderBodyResults(event.target.value));

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

  function initialCartridge() {
    const id = decodeURIComponent(location.hash.replace(/^#/, '') || '');
    if (id && openCartridge(id)) return;
    setView('library');
  }

  async function start() {
    try {
      await loadAuthority();
    } catch (error) {
      $('#registryStatus').textContent = `Authority load failed: ${error.message}`;
      throw error;
    }

    restoreState();
    renderLibrary();
    renderCrowns();
    renderGameUI();
    renderBodyResults();

    $('#bodyCount').textContent = String(estateRegistry.bodies.length);
    $('#batchCount').textContent = String(estateRegistry.loadedParts.length);
    $('#failureCount').textContent = String(
      Object.values(estateRegistry.proofByBatch).reduce((sum, proof) => sum + proof.failed, 0)
    );

    const savedQuery = Store.loadQuery();
    if (savedQuery) $('#routePrompt').value = savedQuery;
    planRouter($('#routePrompt').value);

    bindControls();
    new Renderer($('#gameCanvas'), sim);
    initialCartridge();
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
      return openCartridge(id);
    }
  };

  document.addEventListener('DOMContentLoaded', start);
})();
