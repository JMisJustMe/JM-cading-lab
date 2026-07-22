'use strict';

(() => {
  const GRAFT_URL = './data/chat-graft-v1.b64?v=1000';
  const grafts = new Map();
  let graftReady = false;

  const escGraft = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function addStyles() {
    if (document.getElementById('jm-chat-graft-style')) return;
    const style = document.createElement('style');
    style.id = 'jm-chat-graft-style';
    style.textContent = `
      .chat-graft-box{margin-top:20px;border:1px solid #35617c;border-radius:16px;background:#081b2a;padding:16px;overflow-wrap:anywhere}
      .chat-graft-box h3{margin:0 0 8px;font-size:20px}
      .chat-graft-box .graft-meta{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0 12px}
      .chat-graft-box .graft-tag{border:1px solid #3f7894;border-radius:999px;padding:5px 8px;color:#9cecff;font-size:10px;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
      .chat-graft-box pre{white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:14px;border:1px solid #243f53;border-radius:13px;background:#06131e;color:#d4e0e9;font:500 14px/1.62 Inter,ui-sans-serif,system-ui,sans-serif}
      .chat-graft-box .graft-boundary{margin-top:12px;color:#9fb1c3;font-size:12px;line-height:1.5}
      .row.chat-grafted small:after{content:' · CHAT SOURCE';color:#66e4ff;font-weight:900}
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
    return true;
  }

  function markRows() {
    document.querySelectorAll('#results [data-id]').forEach((row) => {
      if (grafts.has(String(row.dataset.id))) row.classList.add('chat-grafted');
    });
  }

  function appendGraft(record) {
    const reader = document.querySelector('#reader');
    if (!reader || !record?.chat_source || reader.querySelector('.chat-graft-box')) return;
    const graft = record.chat_source;
    const location = graft.source_line
      ? `${graft.source_file} · line ${graft.source_line}`
      : `${graft.source_file} · character ${graft.source_char_offset ?? 'trace located'}`;
    reader.insertAdjacentHTML('beforeend', `
      <section class="chat-graft-box">
        <div class="eyebrow">Recovered chat-source layer</div>
        <h3>Chat Source</h3>
        <div class="graft-meta">
          <span class="graft-tag">${escGraft(graft.match_state)}</span>
          <span class="graft-tag">${escGraft(graft.source_occurrences)} trace${Number(graft.source_occurrences) === 1 ? '' : 's'}</span>
        </div>
        <pre>${escGraft(graft.chat_source_excerpt)}</pre>
        <div class="graft-boundary"><b>Source:</b> ${escGraft(location)}<br><b>Boundary:</b> ${escGraft(graft.boundary)}</div>
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
    if (!graftReady) return;
    mergeIntoRecords();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  addStyles();
  fetch(GRAFT_URL, { cache: 'no-store' })
    .then((response) => {
      if (!response.ok) throw new Error(`Chat graft returned ${response.status}`);
      return response.text();
    })
    .then(decodePayload)
    .then((payload) => {
      for (const graft of payload.records || []) grafts.set(String(graft.id), graft);
      graftReady = true;
      mergeIntoRecords();
    })
    .catch((error) => console.error('JM theory chat-source graft:', error));
})();
