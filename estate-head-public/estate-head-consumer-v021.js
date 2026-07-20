(() => {
  'use strict';

  const CURRENT_URL = '/data/estate-head-public-current.json';
  const SUBSET_URL = '/data/estate-head-public-v0.2.1.json';
  const HEAD_URL = '/estate-head/';
  const VERSION = 'v0.2.1';

  const ROUTE_HOUSES = [
    [/^\/apps(?:\/|$)/, 'H05'],
    [/^\/theory(?:\/|$)/, 'H02'],
    [/^\/lyrics(?:\/|$)/, 'H06'],
    [/^\/recovery(?:\/|$)/, 'H10'],
    [/^\/navigator(?:\/|$)/, 'H08'],
    [/^\/estate-head(?:\/|$)/, 'H00'],
    [/^\/*$/, 'H07']
  ];

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function routeHouse() {
    const path = location.pathname.replace(/\/index\.html$/i, '/');
    const match = ROUTE_HOUSES.find(([pattern]) => pattern.test(path));
    return match ? match[1] : null;
  }

  async function fetchJSON(url) {
    const response = await fetch(`${url}?head=${encodeURIComponent(VERSION)}`, {
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return response.json();
  }

  function addStyle() {
    if (document.querySelector('style[data-jm-head-consumer]')) return;
    const style = document.createElement('style');
    style.dataset.jmHeadConsumer = 'true';
    style.textContent = `
      .jmHeadRail{width:min(1120px,calc(100% - 28px));margin:24px auto 92px;border:1px solid #7c6640;border-radius:20px;background:linear-gradient(145deg,#15130f,#090a0c);color:#f7f1e6;font-family:system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 18px 60px #0007;overflow:hidden}
      .jmHeadRail *{box-sizing:border-box}.jmHeadRail a{color:inherit}
      .jmHeadRailTop{display:flex;align-items:center;gap:12px;padding:15px 16px;border-bottom:1px solid #493d29}
      .jmHeadMark{display:grid;place-items:center;flex:0 0 46px;height:46px;border:1px solid #e4b957;border-radius:14px;color:#e9c56f;font-weight:1000}
      .jmHeadCopy{min-width:0;flex:1}.jmHeadCopy b{display:block;font-size:1rem}.jmHeadCopy span{display:block;color:#bdb4a3;font-size:.75rem;margin-top:2px}
      .jmHeadState{border:1px solid #4b8f72;border-radius:999px;padding:6px 9px;color:#8de5b6;font-size:.68rem;font-weight:900;white-space:nowrap}
      .jmHeadBody{padding:15px 16px;display:grid;gap:12px}.jmHeadStats{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}
      .jmHeadStat{border:1px solid #342f27;border-radius:13px;background:#0d0e10;padding:10px}.jmHeadStat b{display:block;color:#e9c56f;font-size:1.05rem}.jmHeadStat span{color:#aaa293;font-size:.65rem}
      .jmHeadProject{border-left:4px solid #e9c56f;padding:9px 11px;background:#17140e;border-radius:0 12px 12px 0}.jmHeadProject strong{display:block}.jmHeadProject span{display:block;color:#bdb4a3;font-size:.75rem;margin-top:3px}
      .jmHeadDetails{border:1px solid #342f27;border-radius:13px;background:#0d0e10}.jmHeadDetails summary{cursor:pointer;padding:11px 12px;font-weight:900}.jmHeadList{display:grid;gap:7px;padding:0 11px 11px}
      .jmHeadItem{border-top:1px solid #292720;padding-top:8px}.jmHeadItem b{display:block;font-size:.82rem}.jmHeadItem small{display:block;color:#aaa293;line-height:1.4;margin-top:2px}
      .jmHeadActions{display:flex;flex-wrap:wrap;gap:8px}.jmHeadButton{display:inline-flex;min-height:42px;align-items:center;justify-content:center;padding:9px 12px;border:1px solid #e4b957;border-radius:11px;background:#251c09;color:#f5d681!important;text-decoration:none;font-weight:950;font-size:.78rem}
      .jmHeadButton.secondary{border-color:#3c4652;background:#11161d;color:#d7e7f7!important}
      .jmHeadWarn{border-color:#9c4c4c}.jmHeadWarn .jmHeadState{border-color:#9c4c4c;color:#ffaaa1}
      @media(max-width:650px){.jmHeadRail{margin-bottom:110px}.jmHeadStats{grid-template-columns:repeat(2,1fr)}.jmHeadState{display:none}}
    `;
    document.head.append(style);
  }

  function insertionPoint() {
    return document.querySelector('footer, .site-footer') || null;
  }

  function render(current, subset) {
    const versionOK = current.current_public_subset_version === subset.meta?.version;
    const consumed = current.deployment_state === 'PUBLIC_CONSUMED';
    const houseId = routeHouse();
    const house = subset.houses.find(item => item.id === houseId);
    const project = subset.project_heads.find(item => item.house === houseId);
    const bodies = houseId ? subset.bodies.filter(item => item.house === houseId) : [];
    const gaps = subset.gap_snapshot?.current_classification || {};
    const rail = document.createElement('section');
    rail.className = `jmHeadRail${versionOK && consumed ? '' : ' jmHeadWarn'}`;
    rail.setAttribute('aria-label', 'JM Estate Head public source status');
    rail.dataset.version = subset.meta?.version || 'unknown';
    const bodyList = bodies.slice(0, 8).map(body => `
      <div class="jmHeadItem">
        <b>${escapeHTML(body.name)} · ${escapeHTML(body.version || 'version open')}</b>
        <small>${escapeHTML(body.status || 'registered')} — ${escapeHTML(body.proof || body.next || 'Public-safe Estate Head record.')}</small>
      </div>`).join('');
    rail.innerHTML = `
      <div class="jmHeadRailTop">
        <span class="jmHeadMark" aria-hidden="true">JM</span>
        <div class="jmHeadCopy"><b>JM ESTATE HEAD ${escapeHTML(subset.meta?.version || '')}</b><span>${escapeHTML(house?.name || 'Whole Estate')} · shared canonical public subset</span></div>
        <span class="jmHeadState">${versionOK && consumed ? 'LIVE SOURCE' : 'SOURCE CHECK'}</span>
      </div>
      <div class="jmHeadBody">
        <div class="jmHeadStats">
          <div class="jmHeadStat"><b>${escapeHTML(subset.bodies.length)}</b><span>canonical bodies</span></div>
          <div class="jmHeadStat"><b>${escapeHTML(subset.project_heads.length)}</b><span>Project Heads</span></div>
          <div class="jmHeadStat"><b>${escapeHTML(gaps.OPEN ?? 0)}</b><span>open gaps</span></div>
          <div class="jmHeadStat"><b>${escapeHTML(gaps.RESOLVED ?? 0)}</b><span>resolved gaps</span></div>
        </div>
        <div class="jmHeadProject">
          <strong>${escapeHTML(project?.name || 'Estate & Command Head')}</strong>
          <span>${escapeHTML(project?.current || subset.meta?.status || '')}</span>
        </div>
        ${bodies.length ? `<details class="jmHeadDetails"><summary>${bodies.length} canonical ${escapeHTML(house?.name || 'House')} bodies</summary><div class="jmHeadList">${bodyList}${bodies.length > 8 ? `<div class="jmHeadItem"><small>+ ${bodies.length - 8} more in the full public Head.</small></div>` : ''}</div></details>` : ''}
        <div class="jmHeadActions">
          <a class="jmHeadButton" href="${HEAD_URL}">OPEN PUBLIC ESTATE HEAD</a>
          <a class="jmHeadButton secondary" href="/data/estate-head-public-v0.2.1.json">READ PUBLIC JSON</a>
        </div>
      </div>`;
    const point = insertionPoint();
    if (point) point.parentNode.insertBefore(rail, point);
    else document.body.append(rail);
    document.documentElement.dataset.jmEstateHead = subset.meta?.version || 'unknown';
  }

  async function start() {
    if (document.documentElement.dataset.jmHeadConsumerMounted) return;
    document.documentElement.dataset.jmHeadConsumerMounted = 'true';
    addStyle();
    try {
      const [current, subset] = await Promise.all([fetchJSON(CURRENT_URL), fetchJSON(SUBSET_URL)]);
      window.JM_ESTATE_HEAD_PUBLIC = Object.freeze({ current, subset });
      document.dispatchEvent(new CustomEvent('jm-estate-head-ready', { detail: { current, subset } }));
      if (!/^\/estate-head(?:\/|$)/.test(location.pathname)) render(current, subset);
      else document.documentElement.dataset.jmEstateHead = subset.meta?.version || 'unknown';
    } catch (error) {
      console.error('JM Estate Head consumer failed:', error);
      const fallback = {
        current_public_subset_version: VERSION,
        deployment_state: 'SOURCE_UNAVAILABLE'
      };
      window.JM_ESTATE_HEAD_PUBLIC = Object.freeze({ current: fallback, subset: null });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
