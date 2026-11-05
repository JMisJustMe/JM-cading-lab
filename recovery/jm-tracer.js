/* JM ECOSTATE Recovery Head · Body/Carrier/Route Tracer CP01
 * Additive read-only capability. Source Ledger/FTR/TraceBox semantics are
 * inherited as governance rules, not replaced or merged.
 * No private files uploaded; no source writes; no automatic downloads.
 */
(function () {
  'use strict';
  const host = document.querySelector('main.shell');
  const grid = host && host.querySelector('section.grid');
  if (!grid || document.getElementById('jm-tracer')) return;

  const css = document.createElement('style');
  css.textContent = '.jm-tracer{margin:22px 0;border-color:#397766}.jm-tracer h2{margin:4px 0 7px}.jm-tracer p{color:#afcec4}.jm-tracer .trace-actions{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0}.jm-tracer .trace-actions label{display:inline-flex;align-items:center}.jm-tracer .trace-flow{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin:14px 0}.jm-tracer .trace-node{padding:12px 8px;border:1px solid #325a50;border-radius:12px;background:#091c18;text-align:center;font-size:.85rem}.jm-tracer .trace-node b{display:block;color:#d6fff0}.jm-tracer .trace-node span{display:block;color:#8db7aa;font-size:.75rem}.jm-tracer .trace-readout{white-space:pre-wrap;overflow-wrap:anywhere;max-height:390px;overflow:auto;margin:12px 0;padding:14px;background:#06100e;color:#e2fff6;border:1px solid #294b43;border-radius:12px;font:13px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace}.jm-tracer .trace-small{font-size:.82rem;color:#b4cec5}.jm-tracer input[type=file]{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}.jm-tracer .trace-pill{display:inline-block;border:1px solid #426758;border-radius:999px;padding:4px 10px;font-size:.8rem;color:#b7f7d9}@media(max-width:720px){.jm-tracer .trace-flow{grid-template-columns:1fr 1fr}.jm-tracer .trace-node:last-child{grid-column:1/-1}}';
  document.head.appendChild(css);

  const root = document.createElement('section');
  root.id = 'jm-tracer';
  root.className = 'card jm-tracer';
  root.setAttribute('aria-label', 'JM Body/Carrier/Route Tracer');
  root.innerHTML =
    '<div class="eyebrow">Existing Recovery Head · TraceBox × FTR × Source Ledger</div>' +
    '<h2>Trace the body, not just its box</h2>' +
    '<p>Follow what entered, where it came from, what contains it, which route was taken and what visibly works. One inspection, separate identities. This diagnostic never uploads, moves, executes or replaces selected local files.</p>' +
    '<div class="trace-flow" aria-label="Trace stages">' +
      '<div class="trace-node"><b>1 · Source</b><span>Origin / custody</span></div>' +
      '<div class="trace-node"><b>2 · Body</b><span>Actual bytes + hash</span></div>' +
      '<div class="trace-node"><b>3 · Container</b><span>ZIP / format / contents</span></div>' +
      '<div class="trace-node"><b>4 · Route</b><span>Loader / dependencies</span></div>' +
      '<div class="trace-node"><b>5 · Contact</b><span>Observed behaviour</span></div>' +
    '</div>' +
    '<div class="trace-actions">' +
      '<button type="button" class="btn primary" id="jm-trace-theory">Examine live Theory rooms</button>' +
      '<label class="btn" for="jm-trace-file">Inspect a file / ZIP<input type="file" id="jm-trace-file" aria-label="Choose a local file to inspect"></label>' +
      '<button type="button" class="btn" id="jm-trace-receipt" disabled>Export inspection receipt</button>' +
    '</div>' +
    '<span class="trace-pill" id="jm-trace-status" role="status" aria-live="polite">READY · No inspection yet</span>' +
    '<pre class="trace-readout" id="jm-trace-readout" aria-live="polite">Choose a file, or trace the live Theory room route. Unknown origin stays UNKNOWN; matched hashes establish byte equality, not authorship or working gameplay.</pre>' +
    '<p class="trace-small">BIAT → FLAZ boundaries: source ≠ container; exact bytes ≠ working behaviour; registration ≠ visible contact; a diagnostic receipt is not a current-best promotion. Protected sources stay local.</p>';
  grid.before(root);

  const $ = (id) => root.querySelector('#' + id);
  const report = {schema:'JM.ECOSTATE.BodyCarrierRouteTracer/1.0', version:'CP01', mode:'READ_ONLY',
    preservation:'NO_FILE_WRITES_NO_UPLOAD_NO_AUTO_EXPORT', theory:null, localFile:null};
  function status(message, body) {
    $('jm-trace-status').textContent = message;
    if (body !== undefined) $('jm-trace-readout').textContent = body;
    $('jm-trace-receipt').disabled = !report.theory && !report.localFile;
  }
  function hex(bytes) {
    return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
  }
  async function hash(buffer) {
    if (!globalThis.crypto || !crypto.subtle) throw Error('SHA-256 requires a secure browser context (HTTPS or localhost).');
    return hex(await crypto.subtle.digest('SHA-256', buffer));
  }
  function url(path) { return new URL('../theory/' + path, location.href); }
  function zipInfo(buffer) {
    const view = new DataView(buffer), end = buffer.byteLength;
    let eocd = -1;
    for (let i = end - 22; i >= Math.max(0,end - 65557); i--) {
      if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) <= end) {eocd = i; break;}
    }
    if (eocd < 0) throw Error('ZIP central-directory end not found; no extraction attempted.');
    const count = view.getUint16(eocd + 10, true);
    const start = view.getUint32(eocd + 16, true);
    if (count === 0xffff || start === 0xffffffff) throw Error('ZIP64 requires a specialist parser; contents left unverified.');
    if (start >= eocd && count) throw Error('Invalid ZIP directory offset.');
    let offset = start, entries = [], unsafe = 0, encrypted = 0, totalUnpacked = 0;
    for (let i = 0; i < count; i++) {
      if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw Error('Incomplete ZIP central directory at item '+i);
      const flags = view.getUint16(offset + 8, true);
      const unpacked = view.getUint32(offset + 24, true);
      const nameSize = view.getUint16(offset + 28, true);
      const extraSize = view.getUint16(offset + 30, true);
      const commentSize = view.getUint16(offset + 32, true);
      if (offset + 46 + nameSize + extraSize + commentSize > end) throw Error('Truncated ZIP entry.');
      const name = new TextDecoder((flags & 0x800) ? 'utf-8' : 'windows-1252').decode(
        new Uint8Array(buffer, offset + 46, nameSize));
      if (/^(\/|[A-Za-z]:)|(^|\/)\.\.(\/|$)|\\/.test(name)) unsafe++;
      if (flags & 1) encrypted++;
      if (entries.length < 30) entries.push(name);
      totalUnpacked += unpacked;
      offset += 46 + nameSize + extraSize + commentSize;
    }
    return {centralDirectoryEntries: count, first30EntryNames: entries, encryptedEntries: encrypted,
      suspiciousPaths: unsafe, declaredUncompressedBytes: totalUnpacked,
      boundary:'Central-directory metadata only. No ZIP members were extracted, executed or verified individually.'};
  }

  async function inspect(file) {
    if (!file) return;
    status('INSPECTING · Local only', 'Reading metadata and calculating SHA-256. This file stays on your device.');
    let result = {name:file.name, bytes:file.size, mediaType:file.type||'unspecified',
      exactByteHash:null, format:file.name.toLowerCase().endsWith('.zip')?'ZIP':'OTHER',
      origin:'HOLD_NOT_ESTABLISHED', functionalProof:'NOT_TESTED', container:null};
    try {
      if (file.size > 268435456) throw Error('File exceeds 256 MiB phone-safe inspection limit; unchanged, no hash claim.');
      const buffer = await file.arrayBuffer();
      result.exactByteHash = await hash(buffer);
      if (result.format === 'ZIP') result.container = zipInfo(buffer);
      result.hashState = 'PASS_SHA256_CALCULATED_NOT_COMPARED_TO_AUTHORITY';
      report.localFile = result;
      status('HASHED · Authority remains separate', JSON.stringify(result, null, 2));
    } catch (error) {
      result.hold = String(error.message||error);
      report.localFile = result;
      status('HOLD · Local file unchanged', JSON.stringify(result, null, 2));
    }
  }

  async function checkSource(path) {
    const address = url(path);
    const response = await fetch(address, {cache:'no-store',credentials:'same-origin'});
    if (!response.ok) throw Error(path + ' returned HTTP ' + response.status);
    const bytes = await response.arrayBuffer();
    return {path:address.pathname, http:response.status, bytes:bytes.byteLength,
      sha256:await hash(bytes), text:new TextDecoder().decode(bytes)};
  }
  async function checkRuntime() {
    const frame = document.createElement('iframe');
    frame.title = 'Temporary same-origin read-only Theory room check';
    frame.setAttribute('aria-hidden','true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:absolute;left:-10000px;top:0;width:500px;height:400px;opacity:0;pointer-events:none';
    root.appendChild(frame);
    try {
      frame.src = url('');
      const deadline = Date.now()+14000;
      while (Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 180));
        let doc;
        try {doc = frame.contentDocument;} catch {throw Error('Same-origin room contact unavailable');}
        if (!doc) continue;
        const cards = doc.querySelectorAll('#roomGrid .room-card');
        if (cards.length === 42) {
          const roomButton = doc.querySelector('#roomGrid [data-room-select]');
          if (roomButton) roomButton.click();
          const readerText = (doc.querySelector('#roomReader')?.textContent||'').trim();
          return {renderedCards:cards.length, firstRoomTitle:cards[0]?.querySelector('h3')?.textContent||null,
            readerOpened:!!(roomButton && readerText.includes('Coding Becomes Cold Ding')),
            contact:'ACTUAL_SAME_ORIGIN_DOM', deviceScope:'BROWSER_VIEWPORT_NOT_FOLD8_OWNER_ACCEPTANCE'};
        }
      }
      let count = 0;
      try { count = frame.contentDocument?.querySelectorAll('#roomGrid .room-card').length||0; } catch {}
      return {renderedCards:count, readerOpened:false, contact:'HOLD_TIMEOUT_OR_MISSING_CARDS'};
    } finally {frame.remove();}
  }

  async function traceTheory() {
    $('jm-trace-theory').disabled = true;
    status('TRACING · Source → container → runtime', 'Recovering actual mounted-room data and loader from the existing Theory Wing…');
    const result = {target:'JM Theory MultiHub · Mounted Chat Rooms', mode:'READ_ONLY',
      source:'existing deployed Theory Wing', originAuthority:'PUBLIC_CARRIER_ONLY',
      registeredRooms:null, distinctRoomIds:null, sourceFiles:[], runtime:null,
      verdict:'HOLD', time:new Date().toISOString()};
    try {
      const paths=['index.html','data/chat-room-recovery/mounted-rooms.js','chat-room-recovery-v6.js'];
      for (const path of paths) {
        const checked=await checkSource(path);
        result.sourceFiles.push({path:checked.path,http:checked.http,bytes:checked.bytes,sha256:checked.sha256});
        if (path.includes('mounted-rooms')) {
          const match=checked.text.match(/^\s*window\.JMTheoryMountedRoomsCompact\s*=\s*(\[[\s\S]*\]);?\s*$/);
          if (!match) throw Error('Mounted-room payload assignment could not be parsed as JSON safely.');
          const rows=JSON.parse(match[1]);
          if (!Array.isArray(rows)) throw Error('Room source is not an array.');
          result.registeredRooms=rows.length;
          result.distinctRoomIds=new Set(rows.map((r)=>r.i)).size;
        }
        if (path.includes('recovery-v6') && !checked.text.includes('JMTheoryMountedRoomsCompact'))
          throw Error('Loader does not reference the mounted-room source.');
      }
      result.runtime=await checkRuntime();
      result.verdict=result.registeredRooms===42 && result.distinctRoomIds===42 &&
        result.runtime.renderedCards===42 && result.runtime.readerOpened ? 'PASS_SCOPED_LIVE_ROOM_CONTACT' : 'HOLD_MISMATCH';
      report.theory=result;
      status(result.verdict.startsWith('PASS')?'PASS · Live room route':'HOLD · Incomplete live contact',
        JSON.stringify(result,null,2));
    } catch (error) {
      result.error=String(error.message||error);
      report.theory=result;
      status('HOLD · No live proof', JSON.stringify(result,null,2));
    } finally {
      $('jm-trace-theory').disabled = false;
    }
  }
  function exportReceipt() {
    if (!report.theory && !report.localFile) return;
    const receipt={...report, generatedAt:new Date().toISOString(),
      boundary:'Public carrier or local hash contact does not prove original authorship, device acceptance, dependency safety or other untested creations.'};
    const bytes = new Blob([JSON.stringify(receipt,null,2)], {type:'application/json'});
    const link = document.createElement('a');
    link.href=URL.createObjectURL(bytes);
    link.download='JM_BODY_CARRIER_ROUTE_TRACE_CP01_RECEIPT.json';
    link.click();
    setTimeout(()=>URL.revokeObjectURL(link.href),1000);
  }
  $('jm-trace-theory').addEventListener('click',traceTheory);
  $('jm-trace-file').addEventListener('change',(event)=>inspect(event.target.files?.[0]));
  $('jm-trace-receipt').addEventListener('click',exportReceipt);
  window.JMBodyCarrierTracer = Object.freeze({version:'CP01',inspect,traceTheory,
    snapshot:()=>JSON.parse(JSON.stringify(report))});
  if (location.hash==='#jm-tracer') requestAnimationFrame(()=>root.scrollIntoView({block:'start'}));
})();
