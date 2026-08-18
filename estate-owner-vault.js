(() => {
  'use strict';

  const API = './api/owner/vault';
  const SESSION_KEY = 'jm-owner-vault-key';
  const LOCAL = {
    notes: 'jm-estate-owner-notes',
    favourites: 'jm-estate-favourites',
    recent: 'jm-estate-recent',
    mounted: 'jm-estate-mounted'
  };

  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));

  const parse = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
  };

  const key = () => sessionStorage.getItem(SESSION_KEY) || '';
  const setKey = value => value ? sessionStorage.setItem(SESSION_KEY, value) : sessionStorage.removeItem(SESSION_KEY);

  async function request(path = '', options = {}, requireKey = true) {
    const headers = new Headers(options.headers || {});
    if (requireKey) {
      const ownerKey = key();
      if (!ownerKey) throw Object.assign(new Error('OWNER_KEY_REQUIRED'), { code: 'OWNER_KEY_REQUIRED' });
      headers.set('X-JM-Owner-Key', ownerKey);
    }
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const response = await fetch(`${API}${path}`, { ...options, headers, cache: 'no-store' });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      let payload = null;
      if (contentType.includes('application/json')) payload = await response.json().catch(() => null);
      const error = new Error(payload?.error || `HTTP_${response.status}`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    if (contentType.includes('application/json')) return response.json();
    return response;
  }

  function installStyle() {
    if (document.getElementById('jmOwnerVaultStyle')) return;
    const style = document.createElement('style');
    style.id = 'jmOwnerVaultStyle';
    style.textContent = `
      .jm-vault-panel{border:1px solid rgba(114,236,255,.24);background:linear-gradient(135deg,rgba(11,20,34,.96),rgba(22,14,34,.96));}
      .jm-vault-panel .jm-vault-kicker{font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:#72ecff;font-weight:800}
      .jm-vault-panel .jm-vault-copy{max-width:74ch;color:var(--muted,#a9b1c2)}
      .jm-vault-status{display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin:.8rem 0 1rem}
      .jm-vault-pill{display:inline-flex;align-items:center;gap:.4rem;padding:.38rem .65rem;border-radius:999px;background:rgba(255,255,255,.07);font-size:.78rem;font-weight:800}
      .jm-vault-pill[data-state="ready"]{color:#7ff0a6}.jm-vault-pill[data-state="locked"]{color:#ffd166}.jm-vault-pill[data-state="offline"]{color:#ff8b9b}
      .jm-vault-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin:.9rem 0}
      .jm-vault-actions button{min-height:44px}
      .jm-vault-note{font-size:.82rem;color:var(--muted,#a9b1c2);margin:.2rem 0 0}
      .jm-vault-remote{display:grid;gap:.55rem;margin-top:1rem}
      .jm-vault-card{display:flex;justify-content:space-between;align-items:center;gap:.8rem;padding:.8rem;border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.035)}
      .jm-vault-card b{display:block}.jm-vault-card small{display:block;color:var(--muted,#a9b1c2);margin-top:.2rem}
      .jm-vault-card-actions{display:flex;flex-wrap:wrap;gap:.4rem;justify-content:flex-end}
      .jm-vault-card-actions button{border:0;border-radius:10px;padding:.55rem .7rem;background:rgba(255,255,255,.09);color:inherit;font-weight:800;cursor:pointer}
      .jm-vault-card-actions button.danger{color:#ff9aaa}
      @media(max-width:680px){.jm-vault-card{align-items:flex-start;flex-direction:column}.jm-vault-card-actions{width:100%;justify-content:flex-start}}
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    const grid = document.querySelector('#view-owner .owner-grid');
    if (!grid || document.getElementById('jmOwnerVaultPanel')) return null;
    const panel = document.createElement('section');
    panel.id = 'jmOwnerVaultPanel';
    panel.className = 'owner-panel owner-wide jm-vault-panel';
    panel.innerHTML = `
      <div class="panel-head"><div><span class="jm-vault-kicker">PRIVATE DURABLE STORAGE</span><h2 style="margin:.28rem 0 0">JM Owner Vault</h2></div><span id="jmVaultCount">0 REMOTE BODIES</span></div>
      <p class="jm-vault-copy">Your existing Owner Room stays local-first. This vault adds an explicit private R2 copy for notes, favourites, recent routes and mounted HTML bodies. <strong>Nothing uploads unless you press Sync.</strong></p>
      <div class="jm-vault-status"><span class="jm-vault-pill" id="jmVaultStatus" data-state="offline">CHECKING VAULT…</span><span class="jm-vault-pill" id="jmVaultAuth" data-state="locked">LOCKED</span></div>
      <div class="jm-vault-actions">
        <button class="button secondary" id="jmVaultUnlock" type="button">Unlock this session</button>
        <button class="button primary" id="jmVaultSync" type="button">Sync local shelf to vault</button>
        <button class="button quiet" id="jmVaultRestore" type="button">Restore owner state</button>
        <button class="button quiet" id="jmVaultSnapshot" type="button">Seal metadata snapshot</button>
        <button class="button quiet" id="jmVaultLock" type="button">Lock</button>
      </div>
      <p class="jm-vault-note" id="jmVaultMessage" role="status" aria-live="polite">Checking whether the durable storage binding is mounted on this host.</p>
      <div class="jm-vault-remote" id="jmVaultRemote" aria-live="polite"></div>
    `;
    grid.prepend(panel);
    return panel;
  }

  const el = id => document.getElementById(id);
  const message = text => { const node = el('jmVaultMessage'); if (node) node.textContent = text; };
  const authLabel = unlocked => {
    const node = el('jmVaultAuth');
    if (!node) return;
    node.textContent = unlocked ? 'UNLOCKED THIS SESSION' : 'LOCKED';
    node.dataset.state = unlocked ? 'ready' : 'locked';
  };

  async function status() {
    const node = el('jmVaultStatus');
    try {
      const data = await request('?mode=status', {}, false);
      if (data.ready) {
        node.textContent = 'R2 VAULT MOUNTED';
        node.dataset.state = 'ready';
        message(key() ? 'Vault is mounted. Session key is present; refreshing private index.' : 'Vault is mounted and fail-closed. Unlock this session to read or write private data.');
        if (key()) await refreshRemote();
      } else {
        node.textContent = 'VAULT NOT CONFIGURED';
        node.dataset.state = 'locked';
        message('Code is present, but Cloudflare still needs the JM_OWNER_VAULT R2 binding and JM_OWNER_VAULT_KEY secret. Local Owner Room remains unchanged.');
      }
    } catch {
      node.textContent = 'LOCAL-ONLY ON THIS HOST';
      node.dataset.state = 'offline';
      message('This host has no Owner Vault API. The ordinary local-first Owner Room still works.');
    }
    authLabel(Boolean(key()));
  }

  async function unlock() {
    const supplied = window.prompt('Enter the JM Owner Vault key for this browser session. It is kept in sessionStorage only.');
    if (!supplied) return false;
    setKey(supplied);
    try {
      await request('');
      authLabel(true);
      message('Owner Vault unlocked for this browser session. Nothing has been uploaded.');
      await refreshRemote();
      return true;
    } catch (error) {
      setKey('');
      authLabel(false);
      message(error.status === 503 ? 'Vault storage is not configured yet.' : 'That owner key did not open the vault.');
      return false;
    }
  }

  async function ensureUnlocked() {
    if (key()) return true;
    return unlock();
  }

  function localState() {
    return {
      notes: localStorage.getItem(LOCAL.notes) || '',
      favourites: parse(LOCAL.favourites, []),
      recent: parse(LOCAL.recent, [])
    };
  }

  function localBodies() {
    return parse(LOCAL.mounted, []).filter(body => body && typeof body.content === 'string');
  }

  async function sync() {
    if (!(await ensureUnlocked())) return;
    const button = el('jmVaultSync');
    button.disabled = true;
    try {
      message('Saving owner state…');
      await request('', { method: 'PUT', body: JSON.stringify({ state: localState() }) });
      const bodies = localBodies();
      let stored = 0;
      let duplicates = 0;
      for (let i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        message(`Syncing HTML body ${i + 1} of ${bodies.length}: ${body.name || body.fileName || 'Untitled'}…`);
        const result = await request('', {
          method: 'POST',
          body: JSON.stringify({ action: 'upload-body', body: {
            name: body.name,
            fileName: body.fileName,
            content: body.content
          } })
        });
        if (result.duplicate) duplicates += 1; else stored += 1;
      }
      message(`Sync complete: owner state saved; ${stored} new HTML ${stored === 1 ? 'body' : 'bodies'} stored; ${duplicates} duplicate ${duplicates === 1 ? 'body' : 'bodies'} already held.`);
      await refreshRemote();
    } catch (error) {
      if (error.status === 401) { setKey(''); authLabel(false); }
      message(`Vault sync stopped: ${error.payload?.message || error.message}. No public-publication claim was made.`);
    } finally {
      button.disabled = false;
    }
  }

  async function restoreState() {
    if (!(await ensureUnlocked())) return;
    if (!window.confirm('Restore remote owner notes, favourites and recent routes onto this device? Local mounted HTML bodies will NOT be overwritten.')) return;
    try {
      const data = await request('');
      localStorage.setItem(LOCAL.notes, data.state?.notes || '');
      localStorage.setItem(LOCAL.favourites, JSON.stringify(data.state?.favourites || []));
      localStorage.setItem(LOCAL.recent, JSON.stringify(data.state?.recent || []));
      message('Remote owner state restored. Reloading the Estate so the local shelves re-render.');
      location.reload();
    } catch (error) {
      message(`Restore failed: ${error.message}`);
    }
  }

  async function snapshot() {
    if (!(await ensureUnlocked())) return;
    try {
      const result = await request('', { method: 'POST', body: JSON.stringify({ action: 'snapshot' }) });
      message(`Metadata snapshot sealed at ${new Date(result.snapshot.created_at).toLocaleString()}. HTML bytes were not duplicated.`);
    } catch (error) {
      message(`Snapshot failed: ${error.message}`);
    }
  }

  async function previewRemote(id, name) {
    try {
      const response = await request(`?body=${encodeURIComponent(id)}`);
      const html = await response.text();
      const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const frame = document.getElementById('previewFrame');
      const title = document.getElementById('previewTitle');
      const dialog = document.getElementById('previewDialog');
      if (frame && dialog) {
        frame.src = blobUrl;
        if (title) title.textContent = `${name} · private vault copy`;
        dialog.showModal();
        dialog.addEventListener('close', () => URL.revokeObjectURL(blobUrl), { once: true });
      } else {
        URL.revokeObjectURL(blobUrl);
      }
    } catch (error) {
      message(`Preview failed: ${error.message}`);
    }
  }

  async function downloadRemote(id, fileName) {
    try {
      const response = await request(`?body=${encodeURIComponent(id)}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'jm-estate-body.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (error) {
      message(`Download failed: ${error.message}`);
    }
  }

  async function removeRemote(id, name) {
    if (!window.confirm(`Remove the private durable copy of “${name}”? This does not delete any public repository body or local device copy.`)) return;
    try {
      await request(`?body=${encodeURIComponent(id)}`, { method: 'DELETE' });
      message(`Private durable copy removed: ${name}.`);
      await refreshRemote();
    } catch (error) {
      message(`Remove failed: ${error.message}`);
    }
  }

  async function refreshRemote() {
    if (!key()) return;
    try {
      const data = await request('');
      authLabel(true);
      const bodies = Array.isArray(data.bodies) ? data.bodies : [];
      el('jmVaultCount').textContent = `${bodies.length} REMOTE ${bodies.length === 1 ? 'BODY' : 'BODIES'}`;
      const shelf = el('jmVaultRemote');
      shelf.innerHTML = bodies.length ? bodies.map(body => `
        <article class="jm-vault-card">
          <div><b>${escapeHTML(body.name)}</b><small>${Math.round((body.bytes || 0) / 1024)} KB · ${escapeHTML(body.status || 'PRIVATE COPY')} · ${escapeHTML((body.sha256 || '').slice(0, 12))}…</small></div>
          <div class="jm-vault-card-actions">
            <button type="button" data-vault-preview="${escapeHTML(body.id)}">PREVIEW</button>
            <button type="button" data-vault-download="${escapeHTML(body.id)}">DOWNLOAD</button>
            <button type="button" class="danger" data-vault-delete="${escapeHTML(body.id)}">REMOVE</button>
          </div>
        </article>`).join('') : '<div class="empty-state">No private durable HTML body stored yet.</div>';

      shelf.querySelectorAll('[data-vault-preview]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultPreview);
        if (body) previewRemote(body.id, body.name);
      }));
      shelf.querySelectorAll('[data-vault-download]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultDownload);
        if (body) downloadRemote(body.id, body.fileName);
      }));
      shelf.querySelectorAll('[data-vault-delete]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultDelete);
        if (body) removeRemote(body.id, body.name);
      }));
    } catch (error) {
      if (error.status === 401) { setKey(''); authLabel(false); }
      message(`Vault index unavailable: ${error.message}`);
    }
  }

  function bind() {
    el('jmVaultUnlock')?.addEventListener('click', unlock);
    el('jmVaultSync')?.addEventListener('click', sync);
    el('jmVaultRestore')?.addEventListener('click', restoreState);
    el('jmVaultSnapshot')?.addEventListener('click', snapshot);
    el('jmVaultLock')?.addEventListener('click', () => {
      setKey(''); authLabel(false); el('jmVaultRemote').innerHTML = ''; el('jmVaultCount').textContent = '0 REMOTE BODIES';
      message('Vault locked. The session key was removed from this browser tab/session.');
    });
  }

  function init() {
    installStyle();
    if (!buildPanel()) return;
    bind();
    status();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
