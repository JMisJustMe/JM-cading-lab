'use strict';

(() => {
  const V1_URL = './data/chat-graft-v1.b64?v=1200';
  const V2_BASE = './data/chat-graft-v2/part-';
  const V2_PARTS = 4;
  const V3_URL = './data/chat-graft-v3-memory.json?v=1200';
  const EXPECTED_V1 = 94;
  const EXPECTED_V2_NEW = 21;
  const EXPECTED_V3_NEW = 5;
  const EXPECTED_TOTAL = 120;
  const grafts = new Map();
  let graftReady = false;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function addStyles() {
    if (document.getElementById('jm-chat-graft-style')) return;
    const style = document.createElement('style');
    style.id = 'jm-chat-graft-style';
    style.textContent = `
      .chat-graft-box{margin-top:20px;border:1px solid #35617c;border-radius:16px;background:#081b2a;padding:16px;overflow-wrap:anywhere;max-width:100%}
      .chat-graft-box h3{margin:0 0 8px;font-size:20px}
      .chat-graft-box .graft-meta{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 12px}
      .chat-graft-box .graft-tag{border:1px solid #3f7894;border-radius:999px;padding:5px 8px;color:#9cecff;font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
      .chat-graft-box .graft-tag.memory{border-color:#7760a5;color:#d8c4ff}
      .chat-graft-box pre{white-space:pre-wrap;overflow-wrap:anywhere;word-break:break-word;margin:0;padding:14px;border:1px solid #243f53;border-radius:13px;background:#06131e;color:#d4e0e9;font:500 14px/1.62 Inter,ui-sans-serif,system-ui,sans-serif;max-width:100%}
      .chat-graft-box .graft-boundary{margin-top:12px;color:#9fb1c3;font-size:12px;line-height:1.5;overflow-wrap:anywhere}
      .row.chat-grafted small:after{content:' · CHAT SOURCE';color:#66e4ff;font-weight:900}
      .chat-graft-summary{margin-top:10px;color:#9cecff;font-size:12px;font-weight:800}
      @media(max-width:850px){.chat-graft-box{padding:14px}.chat-graft-box pre{font-size:14px;padding:12px}}
    `;
    document.head.appendChild(style);
  }

  async function decodePayload(value) {
    const clean = value.replace(/\s/g, '');
    const bytes = new Uint8Array(Math.floor(clean.length * 3 / 4));
    let cursor = 0;
    for (let index = 0; index < clean.length; index += 32768) {
      const binary = atob(clean.slice(index, index + 32768));
      for (let offset = 0; offset < binary.length; offset += 1) bytes[cursor++] = binary.charCodeAt(offset);
    }
    if (!('DecompressionStream' in window)) throw new Error('Chat-source graft requires current Chrome.');
    const stream = new Blob([bytes.slice(0, cursor)]).stream().pipeThrough(new DecompressionStream('gzip'));
    return JSON.parse(new TextDecoder().decode(new Uint8Array(await new Response(stream).arrayBuffer())));
  }

  async function fetchText(url) {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.text();
  }

  async function loadSources() {
    const [v1Text, v2Parts, v3] = await Promise.all([
      fetchText(V1_URL),
      Promise.all(Array.from({ length: V2_PARTS }, (_, index) => (
        fetchText(`${V2_BASE}${String(index + 1).padStart(2, '0')}.txt?v=1200`)
      ))),
      fetch(V3_URL, { cache: 'no-store' }).then((response) => {
        if (!response.ok) throw new Error(`${V3_URL} returned ${response.status}`);
        return response.json();
      })
    ]);
    const [v1, v2] = await Promise.all([
      decodePayload(v1Text),
      decodePayload(v2Parts.map((part) => part.trim()).join(''))
    ]);
    if ((v1.records || []).length !== EXPECTED_V1) throw new Error(`v1 source count ${(v1.records || []).length}, expected ${EXPECTED_V1}`);
    if ((v2.records || []).length !== EXPECTED_V2_NEW) throw new Error(`v2 delta count ${(v2.records || []).length}, expected ${EXPECTED_V2_NEW}`);
    if ((v3.records || []).length !== EXPECTED_V3_NEW) throw new Error(`v3 memory count ${(v3.records || []).length}, expected ${EXPECTED_V3_NEW}`);
    for (const graft of v1.records || []) grafts.set(String(graft.id), graft);
    for (const graft of v2.records || []) grafts.set(String(graft.id), graft);
    for (const graft of v3.records || []) grafts.set(String(graft.id), graft);
    if (grafts.size !== EXPECTED_TOTAL) throw new Error(`cumulative source count ${grafts.size}, expected ${EXPECTED_TOTAL}`);
  }

  function mergeIntoRecords() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA.records) || !DATA.records.length) return false;
    for (const record of DATA.records) {
      const graft = grafts.get(String(record.id));
      if (!graft) continue;
      record.chat_source = graft;
      record.tags = [...new Set([...(record.tags || []), 'chat source', graft.match_state])];
    }
    markRows();
    appendSelectedGraft();
    updateSummary();
    return true;
  }

  function markRows() {
    document.querySelectorAll('#results [data-id]').forEach((row) => {
      if (grafts.has(String(row.dataset.id))) row.classList.add('chat-grafted');
    });
  }

  function updateSummary() {
    const resultHead = document.querySelector('.results-head');
    if (!resultHead || resultHead.querySelector('.chat-graft-summary')) return;
    resultHead.insertAdjacentHTML('beforeend', '<span class="chat-graft-summary">120 source-backed placeholders · 140 still open</span>');
  }

  function appendGraft(record) {
    const reader = document.querySelector('#reader');
    if (!reader || !record?.chat_source || reader.querySelector('.chat-graft-box')) return;
    const graft = record.chat_source;
    const location = graft.source_date
      ? `${graft.source_file} · ${graft.source_date}`
      : graft.source_line
        ? `${graft.source_file} · line ${graft.source_line}`
        : `${graft.source_file} · character ${graft.source_char_offset ?? 'trace located'}`;
    const memoryClass = String(graft.match_state).includes('MEMORY') ? ' memory' : '';
    reader.insertAdjacentHTML('beforeend', `
      <section class="chat-graft-box">
        <div class="eyebrow">Recovered chat-source layer</div>
        <h3>Chat Source</h3>
        <div class="graft-meta">
          <span class="graft-tag${memoryClass}">${esc(graft.match_state)}</span>
          <span class="graft-tag">${esc(graft.source_occurrences)} trace${Number(graft.source_occurrences) === 1 ? '' : 's'}</span>
        </div>
        <pre>${esc(graft.chat_source_excerpt)}</pre>
        <div class="graft-boundary"><b>Source:</b> ${esc(location)}<br><b>Boundary:</b> ${esc(graft.boundary)}</div>
      </section>`);
  }

  function appendSelectedGraft() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA.records)) return;
    const hashId = new URLSearchParams(location.hash.replace(/^#/, '')).get('body');
    const id = (typeof state !== 'undefined' && state.selected) || hashId;
    if (!id) return;
    appendGraft(DATA.records.find((record) => String(record.id) === String(id)));
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open], [data-id]');
    if (!opener || !graftReady) return;
    const id = opener.dataset.open || opener.dataset.id;
    queueMicrotask(() => {
      if (typeof DATA === 'undefined') return;
      appendGraft(DATA.records.find((record) => String(record.id) === String(id)));
    });
  });

  const observer = new MutationObserver(() => {
    if (graftReady) mergeIntoRecords();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  addStyles();
  loadSources()
    .then(() => {
      graftReady = true;
      mergeIntoRecords();
    })
    .catch((error) => console.error('JM theory chat-source graft v3:', error));
})();
