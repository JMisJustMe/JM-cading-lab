'use strict';

const PARTS = 7;
const EXPECTED_ROUTES = 297;
const EXPECTED_B64 = 50428;
let DATA = { records: [], districts: [] };
let state = { view: 'home', query: '', filter: 'ALL', selected: null };
let loadAttempt = 0;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

function gradeOf(record) {
  if (record.complete || record.grade === 'COMPLETE') return 'COMPLETE';
  const haystack = [record.grade, record.subtitle, ...(record.tags || [])].join(' ').toUpperCase();
  for (const grade of ['T4', 'T3', 'T2', 'T1']) {
    if (haystack.includes(grade)) return grade;
  }
  return 'ROUTE';
}

function gradeClass(grade) {
  return grade === 'COMPLETE' ? 'complete' : grade.toLowerCase();
}

function isMobile() {
  return matchMedia('(max-width: 850px)').matches;
}

function setView(view, resetScroll = true) {
  state.view = view;
  $$('.view').forEach((panel) => panel.classList.toggle('active', panel.dataset.viewPanel === view));
  $$('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === view));

  if (view !== 'library') closeReader(false);
  if (resetScroll) {
    const panel = $(`.view[data-view-panel="${CSS.escape(view)}"]`);
    if (panel) panel.scrollTop = 0;
    if (isMobile()) window.scrollTo({ top: 0, behavior: 'instant' });
  }
}

function safeReplaceUrl(url) {
  try { history.replaceState(null, '', url); } catch (_) { /* Some embedded test shells have an opaque origin. */ }
}

function closeReader(clearHash = true) {
  const reader = $('#reader');
  if (!reader) return;
  reader.classList.remove('open');
  if (clearHash && location.hash.startsWith('#body=')) {
    safeReplaceUrl(`${location.pathname}${location.search}`);
  }
}

function bindShell() {
  document.addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view]');
    if (viewButton) {
      event.preventDefault();
      setView(viewButton.dataset.view);
      return;
    }

    const goButton = event.target.closest('[data-go]');
    if (goButton) {
      event.preventDefault();
      setView(goButton.dataset.go);
      return;
    }

    const openButton = event.target.closest('[data-open], [data-id]');
    if (openButton && (openButton.dataset.open || openButton.dataset.id)) {
      event.preventDefault();
      openRecord(openButton.dataset.open || openButton.dataset.id);
      return;
    }

    const filterButton = event.target.closest('[data-filter]');
    if (filterButton) {
      event.preventDefault();
      state.filter = filterButton.dataset.filter;
      $$('[data-filter]').forEach((item) => item.classList.toggle('active', item === filterButton));
      renderList();
      return;
    }

    const projectButton = event.target.closest('[data-project]');
    if (projectButton) {
      event.preventDefault();
      setView('library');
      state.query = projectButton.dataset.project;
      $('#search').value = state.query;
      renderList();
      return;
    }

    const termButton = event.target.closest('[data-term]');
    if (termButton) {
      event.preventDefault();
      setView('library');
      state.query = termButton.dataset.term;
      $('#search').value = state.query;
      renderList();
      return;
    }

    if (event.target.closest('#readerClose')) {
      event.preventDefault();
      closeReader();
      return;
    }

    if (event.target.closest('#retryLoad')) {
      event.preventDefault();
      loadData();
      return;
    }

    if (event.target.closest('#continueShell')) {
      event.preventDefault();
      $('#loading').hidden = true;
      document.body.classList.add('shell-only');
    }
  });

  $('#search')?.addEventListener('input', (event) => {
    state.query = event.target.value;
    renderList();
  });

  window.addEventListener('hashchange', () => {
    const id = new URLSearchParams(location.hash.replace(/^#/, '')).get('body');
    if (id && id !== state.selected && DATA.records.length) openRecord(id, true);
  });
}

function renderFilters() {
  const grades = ['ALL', 'COMPLETE', 'T4', 'T3', 'T2', 'T1'];
  $('#filters').innerHTML = grades.map((grade) => (
    `<button type="button" class="filter ${grade === 'ALL' ? 'active' : ''}" data-filter="${grade}">${grade}</button>`
  )).join('');
}

function filteredRecords() {
  const query = state.query.trim().toLowerCase();
  return DATA.records.filter((record) => {
    const gradeMatches = state.filter === 'ALL' || gradeOf(record) === state.filter;
    const searchText = [
      record.title, record.subtitle, record.shelf, record.lane, record.identity,
      record.claim, record.source, ...(record.tags || [])
    ].join(' ').toLowerCase();
    return gradeMatches && (!query || searchText.includes(query));
  });
}

function renderList() {
  if (!DATA.records.length) return;
  const rows = filteredRecords();
  $('#resultCount').textContent = `${rows.length} of ${DATA.records.length} routes`;
  $('#results').innerHTML = rows.length
    ? rows.map((record) => `
      <button type="button" class="row ${state.selected === record.id ? 'active' : ''}" data-id="${esc(record.id)}">
        <b>${esc(record.n)} · ${esc(record.title)}</b>
        <small>${esc(gradeOf(record))} · ${esc(record.shelf)}</small>
      </button>`).join('')
    : '<div class="source-note">No routes match this search.</div>';
}

function openRecord(id, fromHash = false) {
  const record = DATA.records.find((item) => item.id === id);
  if (!record) return;

  state.selected = id;
  setView('library', false);
  renderList();

  const grade = gradeOf(record);
  const route = record.route
    ? (record.route.startsWith('theory/') ? `../${record.route}` : record.route)
    : '';
  const reader = $('#reader');
  reader.className = 'card reader open';
  reader.innerHTML = `
    <button type="button" class="btn reader-close" id="readerClose">← Back to list</button>
    <div class="meta">
      <span class="tag ${gradeClass(grade)}">${esc(grade)}</span>
      <span class="tag">${esc(record.shelf)}</span>
      <span class="tag">${esc(record.n)}</span>
    </div>
    <h2>${esc(record.title)}</h2>
    <div class="subtitle">${esc(record.subtitle || record.identity)}</div>
    <div class="claim"><b>Core route</b><br>${esc(record.claim || record.identity)}</div>
    ${record.keepers?.length ? `
      <h3>Keeper lines</h3>
      <ul class="keeper-list">${record.keepers.map((line) => `<li>${esc(line)}</li>`).join('')}</ul>` : ''}
    <div class="body-copy">${esc(record.body || record.identity)}</div>
    <div class="reader-footer">
      <b>Source state:</b> ${esc(record.source || 'Project-source census')}<br>
      <b>Boundary:</b> ${record.complete
        ? 'Complete within its declared scope; universal empirical validity is not silently claimed.'
        : 'Recovered route; current grade does not silently crown completion.'}
      ${route ? `<div class="actions"><a class="btn primary" href="${esc(route)}">Open dedicated full public body ↗</a></div>` : ''}
    </div>`;

  reader.scrollTop = 0;
  if (!fromHash) safeReplaceUrl(`#body=${encodeURIComponent(id)}`);
}

function featureHTML(record) {
  const grade = gradeOf(record);
  return `
    <button type="button" class="card feature" data-id="${esc(record.id)}">
      <span class="meta"><span class="tag ${gradeClass(grade)}">${esc(grade)}</span><span class="tag">${esc(record.shelf)}</span></span>
      <span class="feature-title">${esc(record.title)}</span>
      <span class="feature-copy">${esc(record.identity || record.claim)}</span>
      <span class="source-note">${esc(record.source)}</span>
    </button>`;
}

function renderFeatures() {
  const ids = [
    'cause-must-pass', 'medium-dependency-law', 'contact-causation-authority',
    'actual-mental-health', 'project-contact-field-theory', 'project-spalktalk',
    'project-benefitmerge-theory', 'project-first-house-palace-place-to-lace-v0-1'
  ];
  $('#features').innerHTML = ids
    .map((id) => DATA.records.find((record) => record.id === id))
    .filter(Boolean)
    .map(featureHTML)
    .join('');
}

function projectChildren(tag) {
  return DATA.records.filter((record) => (record.tags || []).includes(tag));
}

function renderProjects() {
  const definitions = [
    { id: 'bringing-it-all-together', tag: 'bringing-it-all-together', label: 'Bringing It All Together', count: 76 },
    { id: 'first-stage-jungle', tag: 'first-stage-jungle', label: 'First Stage / Step Into / Out of the Jungle', count: 187 }
  ];

  $('#projectGrid').innerHTML = definitions.map((definition) => {
    const children = projectChildren(definition.tag).filter((record) => record.id !== definition.id);
    const trunk = DATA.records.find((record) => record.id === definition.id);
    return `
      <article class="card project">
        <div class="eyebrow">Project trunk</div>
        <div class="count">${definition.count}</div>
        <h2>${esc(definition.label)}</h2>
        <p class="project-copy">${esc(trunk?.identity || 'Mounted project-source children')}</p>
        <div class="actions">
          <button type="button" class="btn primary" data-id="${definition.id}">Open trunk</button>
          <button type="button" class="btn" data-project="${definition.tag}">Filter its children</button>
        </div>
        <div class="child-list">${children.slice(0, 18).map((record) => (
          `<button type="button" class="child" data-id="${esc(record.id)}">${esc(record.title)}</button>`
        )).join('')}</div>
      </article>`;
  }).join('');
}

function renderDistricts() {
  $('#districtGrid').innerHTML = DATA.districts.map((district) => `
    <article class="card district">
      <div class="eyebrow">District</div>
      <h3>${esc(district.name)}</h3>
      ${district.bodies.map((name) => `<button type="button" data-term="${esc(name)}">${esc(name)} →</button>`).join('')}
    </article>`).join('');
}

function boot() {
  renderFilters();
  renderList();
  renderFeatures();
  renderProjects();
  renderDistricts();
  $('#topRoutes').textContent = DATA.records.length;
  document.body.classList.add('data-ready');

  const id = new URLSearchParams(location.hash.replace(/^#/, '')).get('body');
  if (id) openRecord(id, true);
}

async function ungzip(bytes) {
  if (!('DecompressionStream' in window)) {
    throw new Error('This browser cannot decode the mounted payload. The shell remains usable; open CAUSE MUST PASS or retry in Chrome.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function base64Bytes(value) {
  const clean = value.replace(/\s/g, '');
  const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
  let cursor = 0;
  for (let index = 0; index < clean.length; index += 32768) {
    const binary = atob(clean.slice(index, index + 32768));
    for (let offset = 0; offset < binary.length; offset += 1) {
      bytes[cursor++] = binary.charCodeAt(offset);
    }
  }
  return bytes.slice(0, cursor);
}

async function loadData() {
  const attempt = ++loadAttempt;
  const loading = $('#loading');
  const status = $('#loadStatus');
  const errorBox = $('#loadError');
  loading.hidden = false;
  loading.classList.remove('error-state');
  errorBox.innerHTML = '';

  try {
    status.textContent = `Fetching ${PARTS} mounted data sections…`;
    const requests = Array.from({ length: PARTS }, (_, index) => {
      const part = String(index + 1).padStart(2, '0');
      return fetch(`./data/v0_4/part-${part}.txt?v=0410`, { cache: 'no-store' })
        .then((response) => {
          if (!response.ok) throw new Error(`Data section ${part} returned ${response.status}.`);
          return response.text();
        });
    });

    const chunks = await Promise.all(requests);
    if (attempt !== loadAttempt) return;
    const joined = chunks.map((chunk) => chunk.trim()).join('');
    if (joined.length !== EXPECTED_B64) {
      throw new Error(`Payload length mismatch: ${joined.length} instead of ${EXPECTED_B64}.`);
    }

    status.textContent = 'Opening 297 routes…';
    const raw = await ungzip(base64Bytes(joined));
    DATA = JSON.parse(new TextDecoder().decode(raw));
    if (!Array.isArray(DATA.records) || DATA.records.length !== EXPECTED_ROUTES) {
      throw new Error(`Route count mismatch: ${DATA.records?.length || 0} instead of ${EXPECTED_ROUTES}.`);
    }

    boot();
    loading.hidden = true;
  } catch (error) {
    console.error(error);
    loading.classList.add('error-state');
    status.textContent = 'The Theory Wing data did not finish opening.';
    errorBox.innerHTML = `
      <p>${esc(error.message)}</p>
      <div class="actions loading-actions">
        <button type="button" class="btn primary" id="retryLoad">Retry now</button>
        <button type="button" class="btn" id="continueShell">Use the visible shell</button>
        <a class="btn" href="./cause-must-pass/00_OPEN_FIRST.html">Open CAUSE MUST PASS</a>
      </div>`;
  }
}

bindShell();
loadData();
