'use strict';

(() => {
  const SOURCE_URL = './data/chat-graft-v4-library-wisebase.json?v=1300';
  const EXPECTED_NEW_CONTACTS = 20;
  const PLACEHOLDER_TOTAL = 260;
  const CENSUS_TOTAL = 297;
  const BASELINE_SOURCE_ROUTES = 120;
  let ready = false;
  let sourceRows = new Map();
  let sourceBacked = BASELINE_SOURCE_ROUTES;
  let sourceContacts = BASELINE_SOURCE_ROUTES;
  let stillOpen = PLACEHOLDER_TOTAL - BASELINE_SOURCE_ROUTES;

  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  function addStyles() {
    if (document.getElementById('jm-chat-graft-v4-style')) return;
    const style = document.createElement('style');
    style.id = 'jm-chat-graft-v4-style';
    style.textContent = `
      .chat-graft-box.v4-source{border-color:#6d5d2f;background:linear-gradient(150deg,#171407,#0b1720)}
      .chat-graft-box.v4-source .graft-tag{border-color:#8f7737;color:#ffe28d}
      .chat-graft-box.v4-source .graft-tag.library{border-color:#347858;color:#a8f5ca}
      .chat-graft-box.v4-source .graft-tag.wisebase{border-color:#6d56a2;color:#dac7ff}
      .row.source-contact-v4 small:after{content:' · SOURCE+';color:#ffe28d;font-weight:900}
      .source-pass-note{margin-top:8px;color:#ffe28d;font-size:12px;font-weight:800}
    `;
    document.head.appendChild(style);
  }

  async function loadPayload() {
    const response = await fetch(SOURCE_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${SOURCE_URL} returned ${response.status}`);
    const payload = await response.json();
    const records = payload.records || [];
    if (records.length !== EXPECTED_NEW_CONTACTS) {
      throw new Error(`v4 source-contact count ${records.length}, expected ${EXPECTED_NEW_CONTACTS}`);
    }
    const ids = new Set();
    for (const source of records) {
      const id = String(source.id);
      if (ids.has(id)) throw new Error(`duplicate v4 source id ${id}`);
      ids.add(id);
      sourceRows.set(id, source);
    }
  }

  function existingSourceCount() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA.records)) return 0;
    return DATA.records.filter((record) => record.chat_source).length;
  }

  async function waitForPriorPasses() {
    for (let attempt = 0; attempt < 240; attempt += 1) {
      if (typeof DATA !== 'undefined' && Array.isArray(DATA.records) && DATA.records.length === CENSUS_TOTAL) {
        if (existingSourceCount() >= BASELINE_SOURCE_ROUTES) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    console.warn('JM theory source graft v4: prior grafts did not reach 120 before timeout; merging against available state.');
  }

  function mergeIntoRecords() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA.records) || !DATA.records.length) return false;
    const recordMap = new Map(DATA.records.map((record) => [String(record.id), record]));
    const missing = [];

    for (const [id, source] of sourceRows.entries()) {
      const record = recordMap.get(id);
      if (!record) {
        missing.push(id);
        continue;
      }
      if (!Array.isArray(record.source_contacts)) {
        record.source_contacts = record.chat_source ? [record.chat_source] : [];
      }
      const alreadyAdded = record.source_contacts.some((item) => (
        String(item.source_file) === String(source.source_file)
        && String(item.chat_source_excerpt) === String(source.chat_source_excerpt)
      ));
      if (!alreadyAdded) record.source_contacts.push(source);
      record.v4_source = source;
      if (!record.chat_source) record.chat_source = source;
      record.tags = [...new Set([...(record.tags || []), 'source contact', source.match_state])];
    }

    if (missing.length) throw new Error(`v4 source ids missing from census: ${missing.join(', ')}`);

    sourceBacked = DATA.records.filter((record) => record.chat_source).length;
    sourceContacts = DATA.records.reduce((sum, record) => (
      sum + (Array.isArray(record.source_contacts) ? record.source_contacts.length : (record.chat_source ? 1 : 0))
    ), 0);
    stillOpen = Math.max(0, PLACEHOLDER_TOTAL - sourceBacked);

    markRows();
    updateCounts();
    appendSelectedSource();
    return true;
  }

  function markRows() {
    document.querySelectorAll('#results [data-id]').forEach((row) => {
      const id = String(row.dataset.id);
      const record = typeof DATA === 'undefined'
        ? null
        : DATA.records.find((item) => String(item.id) === id);
      if (record?.chat_source) row.classList.add('chat-grafted');
      if (sourceRows.has(id)) row.classList.add('source-contact-v4');
    });
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = String(value);
  }

  function updateCounts() {
    setText('topSourceRoutes', sourceBacked);
    setText('heroSourceRoutes', sourceBacked);
    setText('heroSourceContacts', sourceContacts);
    setText('heroOpenRoutes', stillOpen);
    setText('proofSourceRoutes', sourceBacked);
    setText('proofSourceContacts', sourceContacts);
    setText('proofOpenRoutes', stillOpen);

    const lead = document.getElementById('sourcePassLead');
    if (lead) {
      lead.textContent = `The first three passes supplied 120 source-backed routes. This Library + Wisebase pass adds 20 bounded source contacts from complete bodies, full chat passages, saved-memory custody and chat-purpose records. After duplicate-safe merging, ${sourceBacked} placeholders now carry source evidence and ${stillOpen} remain open.`;
    }

    const resultHead = document.querySelector('.results-head');
    if (resultHead) {
      let summary = resultHead.querySelector('.chat-graft-summary');
      if (!summary) {
        summary = document.createElement('span');
        summary.className = 'chat-graft-summary';
        resultHead.appendChild(summary);
      }
      summary.textContent = `${sourceBacked} source-backed placeholders · ${sourceContacts} source contacts · ${stillOpen} still open`;
      let note = resultHead.querySelector('.source-pass-note');
      if (!note) {
        note = document.createElement('span');
        note.className = 'source-pass-note';
        resultHead.appendChild(note);
      }
      note.textContent = 'v0.13 adds complete-body, Library-chat, saved-memory and Wisebase custody without replacing earlier source grades.';
    }
  }

  function sourceLocation(source) {
    if (source.source_date) return `${source.source_file} · ${source.source_date}`;
    if (source.source_line) return `${source.source_file} · line ${source.source_line}`;
    return source.source_file || 'source trace located';
  }

  function appendSource(record) {
    const reader = document.querySelector('#reader');
    const source = record?.v4_source;
    if (!reader || !source) return;
    const key = String(record.id).replace(/[^a-zA-Z0-9_-]/g, '_');
    if (reader.querySelector(`[data-v4-source="${key}"]`)) return;

    const isPrimary = record.chat_source === source;
    const primaryBox = reader.querySelector('.chat-graft-box:not(.v4-source)');
    if (isPrimary && primaryBox) return;

    const state = String(source.match_state || 'SOURCE CONTACT');
    const gradeClass = state.includes('WISEBASE') ? 'wisebase' : 'library';
    reader.insertAdjacentHTML('beforeend', `
      <section class="chat-graft-box v4-source" data-v4-source="${esc(key)}">
        <div class="eyebrow">${isPrimary ? 'Recovered source layer' : 'Additional recovered source layer'}</div>
        <h3>${isPrimary ? 'Source Contact' : 'Additional Source Contact'}</h3>
        <div class="graft-meta">
          <span class="graft-tag ${gradeClass}">${esc(state)}</span>
          <span class="graft-tag">${esc(source.source_occurrences)} trace${Number(source.source_occurrences) === 1 ? '' : 's'}</span>
        </div>
        <pre>${esc(source.chat_source_excerpt)}</pre>
        <div class="graft-boundary"><b>Source:</b> ${esc(sourceLocation(source))}<br><b>Boundary:</b> ${esc(source.boundary)}</div>
      </section>`);
  }

  function selectedRecord() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA.records)) return null;
    const hashId = new URLSearchParams(location.hash.replace(/^#/, '')).get('body');
    const id = (typeof state !== 'undefined' && state.selected) || hashId;
    return id ? DATA.records.find((record) => String(record.id) === String(id)) : null;
  }

  function appendSelectedSource() {
    const record = selectedRecord();
    if (!record) return;
    setTimeout(() => appendSource(record), 0);
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open], [data-id]');
    if (!opener || !ready) return;
    const id = opener.dataset.open || opener.dataset.id;
    setTimeout(() => {
      if (typeof DATA === 'undefined') return;
      appendSource(DATA.records.find((record) => String(record.id) === String(id)));
    }, 0);
  });

  const observer = new MutationObserver(() => {
    if (!ready) return;
    markRows();
    appendSelectedSource();
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });

  addStyles();
  Promise.all([loadPayload(), waitForPriorPasses()])
    .then(() => {
      ready = true;
      mergeIntoRecords();
      window.JMTheorySourceGraftV4 = Object.freeze({
        version: 'v0.13',
        sourceBacked,
        sourceContacts,
        stillOpen,
        addedContacts: EXPECTED_NEW_CONTACTS
      });
    })
    .catch((error) => console.error('JM theory source graft v4:', error));
})();
