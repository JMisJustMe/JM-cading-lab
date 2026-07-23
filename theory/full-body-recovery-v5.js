'use strict';

(() => {
  const EXPECTED_RECOVERIES = 4;
  const BASELINE_FULL = 13;
  const BASELINE_ROUTES = 297;
  let payload = null;
  let applied = false;

  const escV5 = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function addStyles() {
    if (document.getElementById('jm-full-body-recovery-v5-style')) return;
    const style = document.createElement('style');
    style.id = 'jm-full-body-recovery-v5-style';
    style.textContent = `
      .pill.full-body-count{border-color:#397454;color:#a8f5ca}
      .full-body-recovery-note{margin-top:10px;padding:11px 13px;border:1px solid #397454;border-radius:12px;background:#071b13;color:#a8f5ca;font-size:12px;font-weight:800;line-height:1.5}
      .row.full-body-recovered small:after{content:' · BODY RECOVERED';color:#a8f5ca;font-weight:900}
      .feature.full-body-recovered{border-color:#397454;background:linear-gradient(145deg,#0d2019,#0a151c)}
      .feature.full-body-recovered .source-note{color:#a8f5ca}
      .reader .body-copy{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word}
    `;
    document.head.appendChild(style);
  }

  async function decodeBody(record) {
    const value = record.body_b64 || (record.body_b64_chunks || []).join('');
    if (!value) throw new Error(`missing recovered body payload: ${record.id}`);
    const bytes = Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    record.body = new TextDecoder().decode(new Uint8Array(await new Response(stream).arrayBuffer()));
    delete record.body_b64;
    delete record.body_b64_chunks;
    return record;
  }

  async function loadPayload() {
    const records = window.JMTheoryRecoveredBodies || [];
    if (records.length !== EXPECTED_RECOVERIES) {
      throw new Error(`v5 recovery module count ${records.length}, expected ${EXPECTED_RECOVERIES}`);
    }
    if (new Set(records.map((record) => String(record.id))).size !== EXPECTED_RECOVERIES) {
      throw new Error('v5 recovery modules contain duplicate ids');
    }
    payload = { version: 'v0.14', records: await Promise.all(records.map((record) => decodeBody({ ...record }))) };
  }

  async function waitForEstate() {
    for (let attempt = 0; attempt < 300; attempt += 1) {
      if (typeof DATA !== 'undefined' && Array.isArray(DATA.records) && DATA.records.length >= BASELINE_ROUTES) {
        if (window.JMTheorySourceGraftV4 || attempt > 160) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error('theory census did not become ready for full-body recovery');
  }

  function recoverRecords() {
    const map = new Map(DATA.records.map((record) => [String(record.id), record]));
    for (const source of payload.records) {
      const record = map.get(String(source.id));
      const body = { ...source };
      delete body.mode;
      if (source.mode === 'upgrade') {
        if (!record) throw new Error(`upgrade target missing: ${source.id}`);
        Object.assign(record, body, { full_body_recovered_v5: true });
      } else if (source.mode === 'add') {
        if (record) {
          Object.assign(record, body, { full_body_recovered_v5: true });
        } else {
          DATA.records.push({ ...body, full_body_recovered_v5: true });
          map.set(String(source.id), DATA.records[DATA.records.length - 1]);
        }
      } else {
        throw new Error(`unsupported recovery mode: ${source.mode}`);
      }
    }
  }

  function fullBodyCount() {
    return DATA.records.filter((record) => record.complete || record.grade === 'COMPLETE').length;
  }

  function updateStaticCopy() {
    const full = fullBodyCount();
    const total = DATA.records.length;
    document.title = `JM Theory Multihub v0.14 — ${full} Full Bodies Mounted`;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = `JM Theory Multihub v0.14 — Full-Body Recovery Pass 001, with ${full} full/canonical bodies mounted across ${total} census routes.`;

    const brand = document.querySelector('.brand small');
    if (brand) brand.textContent = `v0.14 · Full-Body Recovery Pass 001 · ${full} full/canonical bodies mounted`;
    const topRoutes = document.getElementById('topRoutes');
    if (topRoutes) topRoutes.textContent = String(total);

    const topstats = document.querySelector('.topstats');
    if (topstats && !topstats.querySelector('.full-body-count')) {
      topstats.insertAdjacentHTML('afterbegin', `<span class="pill full-body-count"><b id="topFullBodies">${full}</b> full bodies</span>`);
    } else {
      const count = document.getElementById('topFullBodies');
      if (count) count.textContent = String(full);
    }

    const headline = document.querySelector('[data-view-panel="home"] .hero-copy h1');
    if (headline) headline.textContent = 'Recover the bodies behind the names—and mount the bodies, not merely their addresses.';
    const lead = document.getElementById('sourcePassLead');
    if (lead) lead.textContent = `Full-Body Recovery Pass 001 has recovered four actual bodies from Library source files. WORDS ARE DATA CONSTRAINERS upgrades its existing placeholder; Hit-Window Law, Become a Probability and the Change–Continuation Spine enter as complete bodies. The mounted full/canonical count is now ${full}.`;
    const keeper = document.querySelector('[data-view-panel="home"] .hero-copy .keeper');
    if (keeper) keeper.textContent = 'A title is a retrieval key. A located manuscript is a body. Only explicit completion, freeze or package receipts earn the complete-body crown.';

    const heroProof = document.querySelector('.hero-proof');
    if (heroProof && !heroProof.querySelector('[data-v5-full]')) {
      heroProof.insertAdjacentHTML('afterbegin', `<div class="stat" data-v5-full><strong>${full}</strong><span>full/canonical bodies mounted</span></div><div class="stat" data-v5-recovered><strong>4</strong><span>actual bodies recovered in this pass</span></div>`);
    }
    const censusStat = [...document.querySelectorAll('.hero-proof .stat')].find((stat) => stat.textContent.includes('census routes preserved'));
    if (censusStat) censusStat.innerHTML = `<strong>${total}</strong><span>census routes mounted</span>`;

    const proofTitle = document.querySelector('[data-view-panel="proof"] h2');
    if (proofTitle) proofTitle.textContent = 'What Full-Body Recovery Pass 001 proves';
    const proofGrid = document.querySelector('[data-view-panel="proof"] .proof-grid');
    if (proofGrid && !proofGrid.querySelector('[data-v5-proof]')) {
      proofGrid.insertAdjacentHTML('afterbegin', `<article class="card proof" data-v5-proof><h3>Four bodies—not four more names</h3><ul><li><b>WORDS ARE DATA CONSTRAINERS</b> upgraded from T1 title-level to its recovered complete professional manuscript.</li><li><b>Hit-Window Law v1.0</b> mounted from its complete OPEN_FIRST package.</li><li><b>BECOME A PROBABILITY</b> mounted from its complete polished Body-Participation package.</li><li><b>Estate-Wide Change–Continuation Spine</b> mounted from its frozen authoritative v1.0 body.</li></ul><p class="full-body-recovery-note">Result: ${BASELINE_FULL} → ${full} full/canonical bodies. Census: ${BASELINE_ROUTES} → ${total} routes. Lower-grade passages remain lower-grade; this pass does not counterfeit completion.</p></article>`);
    }

    const nav37 = document.querySelector('a.nav[href*="all-37"]');
    if (nav37) nav37.textContent = '▣  37-Body Earlier Source Library';
  }

  function recoveryFeature(record) {
    const grade = typeof gradeOf === 'function' ? gradeOf(record) : 'COMPLETE';
    return `<button type="button" class="card feature full-body-recovered" data-id="${escV5(record.id)}"><span class="meta"><span class="tag complete">${escV5(grade)}</span><span class="tag">${escV5(record.shelf)}</span></span><span class="feature-title">${escV5(record.title)}</span><span class="feature-copy">${escV5(record.identity || record.claim)}</span><span class="source-note">${escV5(record.source)}</span></button>`;
  }

  function renderRecoveryFeatures() {
    const features = document.getElementById('features');
    if (!features) return;
    features.querySelectorAll('.full-body-recovered').forEach((node) => node.remove());
    const recovered = payload.records
      .map((source) => DATA.records.find((record) => String(record.id) === String(source.id)))
      .filter(Boolean);
    features.insertAdjacentHTML('afterbegin', recovered.map(recoveryFeature).join(''));
  }

  function markRecoveredRows() {
    document.querySelectorAll('#results [data-id]').forEach((row) => {
      const record = DATA.records.find((item) => String(item.id) === String(row.dataset.id));
      row.classList.toggle('full-body-recovered', Boolean(record?.full_body_recovered_v5));
    });
  }

  function rerender() {
    if (typeof renderList === 'function') renderList();
    if (typeof renderProjects === 'function') renderProjects();
    if (typeof renderDistricts === 'function') renderDistricts();
    renderRecoveryFeatures();
    markRecoveredRows();
    const result = document.getElementById('resultCount');
    if (result && !state.query && state.filter === 'ALL') result.textContent = `${DATA.records.length} routes`;
    if (state.selected) {
      const selected = DATA.records.find((record) => record.id === state.selected);
      if (selected?.full_body_recovered_v5 && typeof openRecord === 'function') openRecord(selected.id, true);
    }
  }

  function apply() {
    if (applied) return;
    applied = true;
    recoverRecords();
    updateStaticCopy();
    rerender();
    window.JMTheoryFullBodyRecoveryV5 = Object.freeze({
      version: payload.version,
      recovered: EXPECTED_RECOVERIES,
      fullBodies: fullBodyCount(),
      censusRoutes: DATA.records.length,
      ids: payload.records.map((record) => record.id)
    });
  }

  const observer = new MutationObserver(() => {
    if (!applied) return;
    markRecoveredRows();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  addStyles();
  Promise.all([loadPayload(), waitForEstate()])
    .then(apply)
    .catch((error) => console.error('JM theory full-body recovery v5:', error));
})();
