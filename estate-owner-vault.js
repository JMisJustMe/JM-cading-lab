(() => {
  'use strict';

  const API = './api/owner/vault';
  const SESSION_KEY = 'jm-owner-vault-key';
  let editing = null;
  let proofBusy = false;
  // Last authenticated state head; never treat an unseen remote state as blank.
  let observedStateRevision = null;
  const DOCUMENT_INSTANCE = crypto.randomUUID(); // changes on a genuine document reload
  const PROOF_PENDING = 'jm-owner-vault-cp08-pending';
  const PROOF_RECEIPT = 'jm-owner-vault-cp08-receipt';
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
      .jm-vault-editor{margin-top:1rem;padding:1rem;border:1px solid rgba(114,236,255,.38);border-radius:14px;background:rgba(7,15,24,.82)}
      .jm-vault-editor[hidden]{display:none}
      .jm-vault-editor textarea{display:block;box-sizing:border-box;width:100%;min-height:260px;max-width:100%;resize:vertical;margin:.65rem 0;background:#09111b;border:1px solid #44647a;border-radius:10px;color:#f7fbff;padding:12px;font:13px/1.48 ui-monospace,monospace}
      .jm-vault-editor button{margin-right:.55rem;margin-bottom:.35rem;min-height:44px}
      .jm-vault-proof{padding:1rem;margin:1rem 0;border:1px solid rgba(127,240,166,.32);border-radius:14px;background:rgba(9,27,29,.7)}
      .jm-vault-proof p{font-size:.84rem;color:var(--muted,#a9b1c2)}
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
      <p class="jm-vault-copy">Your existing Owner Room stays local-first. This vault adds explicit private durable storage for notes, favourites, recent routes and mounted HTML. <strong>Nothing uploads until you press Sync or Save private revision.</strong> You can edit an existing private body and verify a new protected version without publishing it.</p>
      <div class="jm-vault-status"><span class="jm-vault-pill" id="jmVaultStatus" data-state="offline">CHECKING VAULT…</span><span class="jm-vault-pill" id="jmVaultAuth" data-state="locked">LOCKED</span></div>
      <div class="jm-vault-actions">
        <button class="button secondary" id="jmVaultUnlock" type="button">Unlock this session</button>
        <button class="button primary" id="jmVaultSync" type="button">Sync local shelf to vault</button>
        <button class="button quiet" id="jmVaultRestore" type="button">Restore owner state</button>
        <button class="button quiet" id="jmVaultSnapshot" type="button">Seal metadata snapshot</button>
        <button class="button quiet" id="jmVaultLock" type="button">Lock</button>
      </div>
      <p class="jm-vault-note" id="jmVaultMessage" role="status" aria-live="polite">Checking whether the durable storage binding is mounted on this host.</p>
      <section class="jm-vault-proof" id="jmVaultOwnerProof" aria-label="Owner-device private proof">
        <strong>CP08 · Owner-session persistence proof</strong>
        <p>Only after you press Prove: save a freshly generated, temporary test body; verify private bytes; reload this page; verify again; delete only that exact test body. Your existing JM creations are never read, changed or deleted.</p>
        <div class="jm-vault-actions">
          <button class="button secondary" type="button" id="jmVaultProveRoundtrip">Prove private save → reload → recovery</button>
          <button class="button quiet" type="button" id="jmVaultExportProof" disabled>Export owner proof receipt</button>
        </div>
        <p class="jm-vault-note" id="jmVaultProofStatus" role="status" aria-live="polite">Not run on this device; no private owner proof claimed.</p>
      </section>
      <div class="jm-vault-remote" id="jmVaultRemote" aria-live="polite"></div>
      <section class="jm-vault-editor" id="jmVaultEditor" hidden aria-label="Private HTML source editor">
        <strong id="jmVaultEditorTitle">Private body source</strong>
        <p class="jm-vault-note">Editing a private Vault copy creates an additional protected revision. The ancestor is retained; no public app or website is deployed by this action.</p>
        <label for="jmVaultEditorText" class="jm-vault-note">HTML source</label>
        <textarea id="jmVaultEditorText" spellcheck="false" aria-label="Private body HTML source"></textarea>
        <div class="jm-vault-actions"><button class="button primary" id="jmVaultSaveRevision" type="button">Save private revision &amp; verify readback</button><button class="button secondary" id="jmVaultCancelEdit" type="button">Cancel editing</button></div>
      </section>
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
    // A restored private revision is already stored at its original Vault ID.
    // Re-syncing that download would create an unintended new purpose/revision.
    return parse(LOCAL.mounted, []).filter(body => body && typeof body.content === 'string' && !body.vaultBodyId);
  }

  async function sync() {
    if (!(await ensureUnlocked())) return;
    const button = el('jmVaultSync');
    button.disabled = true;
    try {
      if (!observedStateRevision) throw new Error('OWNER_STATE_BASELINE_REQUIRED_REOPEN_VAULT');
      message('Saving owner state against the last verified private revision…');
      const savedState = await request('', { method: 'PUT', body: JSON.stringify({
        state: localState(), expectedStateRevision: observedStateRevision
      }) });
      observedStateRevision = /^[a-f0-9]{64}$/.test(savedState.state_revision || '')
        ? savedState.state_revision : null;
      const bodies = localBodies();
      let stored = 0;
      let alreadySynced = 0;
      for (let i = 0; i < bodies.length; i += 1) {
        const body = bodies[i];
        message(`Syncing HTML body ${i + 1} of ${bodies.length}: ${body.name || body.fileName || 'Untitled'}…`);
        const result = await request('', {
          method: 'POST',
          body: JSON.stringify({ action: 'upload-body', body: {
            name: body.name,
            fileName: body.fileName,
            sourceInstanceId: body.id || null,
            content: body.content
          } })
        });
        if (result.same_instance) alreadySynced += 1; else stored += 1;
      }
      message(`Sync complete: owner state saved; ${stored} distinct HTML ${stored === 1 ? 'use' : 'uses'} stored; ${alreadySynced} same-instance ${alreadySynced === 1 ? 'retry' : 'retries'} already held. Matching bytes never erase a separate intended use.`);
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


  const hashText = async text => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(n=>n.toString(16).padStart(2,'0')).join('');
  function closeEditor() {
    editing = null;
    const panel = el('jmVaultEditor');
    if (panel) panel.hidden = true;
    if (el('jmVaultEditorText')) el('jmVaultEditorText').value = '';
  }

  async function editRemote(id, name, expectedSha256) {
    if (!(await ensureUnlocked())) return;
    try {
      const response = await request(`?body=${encodeURIComponent(id)}`);
      const source = await response.text();
      if (await hashText(source) !== expectedSha256) throw new Error('VAULT_SOURCE_HASH_MISMATCH');
      editing = { baseId: id, expectedSha256 };
      el('jmVaultEditorTitle').textContent = `Editing private source: ${name}`;
      el('jmVaultEditorText').value = source;
      el('jmVaultEditor').hidden = false;
      message('Private source loaded and SHA-256 verified. Save produces a new version; the original remains protected.');
      el('jmVaultEditorText').focus();
    } catch (error) {
      message(`Private editor could not open: ${error.message}`);
    }
  }

  async function saveRevision() {
    if (!editing) return;
    const action = el('jmVaultSaveRevision');
    action.disabled = true;
    let attempted = null;
    try {
      const content = el('jmVaultEditorText').value;
      const base = { ...editing };
      if (!/<html|<!doctype/i.test(content)) throw new Error('NOT_STANDALONE_HTML');
      attempted = { ...base, content, hash: await hashText(content) };
      const result = await request('', {
        method: 'POST',
        body: JSON.stringify({ action: 'revise-body', baseId: base.baseId, expectedSha256: base.expectedSha256, content })
      });
      if (result.outcome === 'REVISION_UNCHANGED') {
        message('No source difference: existing body preserved, no redundant revision stored.');
        return;
      }
      if (result.outcome !== 'BODY_REVISION_STORED' || !result.body?.id || !result.body?.sha256 || result.body.previousVersionId !== base.baseId)
        throw new Error('REVISION_RECEIPT_INVALID');
      const reloaded = await request(`?body=${encodeURIComponent(result.body.id)}`);
      const received = await reloaded.text();
      if (received !== content || await hashText(received) !== result.body.sha256)
        throw new Error('REVISION_READBACK_MISMATCH');
      const revisionId = result.body.id;
      closeEditor();
      await refreshRemote();
      message(`Private revision saved and SHA-256 readback verified (${revisionId.slice(0,8)}…). Original body retained. Public source/deployment unchanged.`);
    } catch (error) {
      if (error.status === 401) { setKey(''); authLabel(false); closeEditor(); }
      else if (attempted && error.status !== 400 && error.status !== 413) {
        // If an HTTP response or readback failed, recover the existing target
        // consequence. Never replay a possibly committed revision mutation.
        try {
          const index = await request('');
          const candidate = (index.bodies || []).find(item => item.previousVersionId === attempted.baseId && item.sha256 === attempted.hash);
          if (candidate) {
            const response = await request(`?body=${encodeURIComponent(candidate.id)}`);
            const recovered = await response.text();
            if (recovered === attempted.content && await hashText(recovered) === attempted.hash) {
              closeEditor();
              await refreshRemote();
              message(`Private revision recovered by exact SHA-256 readback (${candidate.id.slice(0,8)}…). No duplicate save issued. Original retained.`);
              return;
            }
          }
        } catch { /* Recovery is a bounded read-only contact, not authority to retry a write. */ }
      }
      message(`Revision HOLD: ${error.message}. No deployment or verified-save claim made.`);
    } finally { action.disabled = false; }
  }

  // All proof mutations are owner-initiated and restricted to an ephemeral
  // sourceInstanceId. No existing user's creation may pass the cleanup gate.
  const proofName='JM CP08 TEMPORARY CONTACT PROOF';
  const proofFile='JM_CP08_TEMPORARY_CONTACT_PROOF.html';
  const proofHTML=nonce=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>JM CP08</title></head><body><p>Temporary owner contact '+nonce+'</p></body></html>';
  function getPending() {
    try {
      const v=JSON.parse(localStorage.getItem(PROOF_PENDING)||'null');
      return v?.schema==='JM.OwnerVault.ProofPending/0.1'&&
        /^cp08-[a-f0-9]{32}$/.test(v.sourceInstanceId)&&
        /^[a-f0-9-]{36}$/.test(v.nonce)&&
        /^[a-f0-9-]{36}$/.test(v.createdDocumentInstance)&&
        /^[a-f0-9]{64}$/.test(v.sha256)&&
        ['prepared','reload','cleanup'].includes(v.phase)?v:null;
    } catch{return null;}
  }
  const proofMessage=t=>{const n=el('jmVaultProofStatus');if(n)n.textContent=t;};
  function proofState() {
    const p=getPending();
    let r=null;
    try{r=JSON.parse(localStorage.getItem(PROOF_RECEIPT)||'null');}catch{}
    const exportButton=el('jmVaultExportProof');
    if(exportButton)exportButton.disabled=!!p||!(r?.schema==='JM.OwnerVault.AuthenticatedDeviceProof/0.1'&&r.outcome==='PASS');
    proofMessage(p?'CP08 HOLD: '+p.phase+' checkpoint. Unlock your original Owner Vault and press Prove to resume.':
      r?.outcome==='PASS'?'CP08 PASS: authenticated private write, independent reload/readback and exact test cleanup proved on this browser. Export receipt.':
      'No authenticated private owner-device proof performed.');
  }
  const savePending=p=>localStorage.setItem(PROOF_PENDING,JSON.stringify(p));
  async function findTestBody(p) {
    const index=await request('');
    const matches=(index.bodies||[]).filter(b=>b.sourceInstanceId===p.sourceInstanceId &&
      b.sha256===p.sha256 && b.name===proofName && b.fileName===proofFile &&
      b.previousVersionId==null && /^[0-9a-f-]{36}$/i.test(b.id));
    if(matches.length!==1)throw new Error(matches.length?'CP08_IDENTITY_AMBIGUOUS':'CP08_TEMP_BODY_NOT_FOUND');
    if(p.bodyId && p.bodyId!==matches[0].id)throw new Error('CP08_TEMP_ID_CHANGED');
    return matches[0];
  }
  async function checkTestBody(p,b) {
    const bytes=await (await request('?body='+encodeURIComponent(b.id))).text();
    if(bytes!==proofHTML(p.nonce)||await hashText(bytes)!==p.sha256)
      throw new Error('CP08_PRIVATE_READBACK_MISMATCH');
  }
  async function closeTest(p) {
    if(p.phase!=='cleanup'||p.reloaded!==true||p.firstRead!==true)throw new Error('CP08_CLEANUP_NOT_AUTHORISED');
    const b=await findTestBody(p);
    await checkTestBody(p,b);
    const result=await request('?body='+encodeURIComponent(b.id),{method:'DELETE'});
    if(result.outcome!=='PRIVATE_COPY_REMOVED'||result.body?.id!==b.id)throw new Error('CP08_DELETE_RECEIPT_MISMATCH');
    const after=await request('');
    if((after.bodies||[]).some(x=>x.id===b.id||x.sourceInstanceId===p.sourceInstanceId))throw new Error('CP08_DELETE_NOT_VERIFIED');
    const receipt={
      schema:'JM.OwnerVault.AuthenticatedDeviceProof/0.1',outcome:'PASS',
      created_at:p.createdAt,verified_at:new Date().toISOString(),
      authenticated_private_write:true,first_readback:true,independent_reload_readback:true,
      temporary_body_exact_cleanup:true,temporary_identity:p.sourceInstanceId,
      content_sha256:p.sha256,private_owner_content_contacted:false,owner_secret_recorded:false,
      cross_device_proof:false,public_deployment_proof:false,
      boundary:'Real owner-session and original browser reload only. No whole-Estate or other-device claim.'
    };
    localStorage.setItem(PROOF_RECEIPT,JSON.stringify(receipt));
    localStorage.removeItem(PROOF_PENDING);
    proofState();
  }
  async function resumeTest(afterReload=false) {
    if(proofBusy)return;
    const p=getPending();
    if(!p){proofState();return;}
    if(!key()){proofMessage('CP08 HOLD: owner session locked. Unlock locally before resuming.');return;}
    proofBusy=true;
    try{
      if(p.phase==='prepared') {
        // Recover a lost POST response by lookup; NEVER replay the POST.
        const b=await findTestBody(p);await checkTestBody(p,b);
        p.bodyId=b.id;p.firstRead=true;p.phase='reload';savePending(p);
      }
      if(p.phase==='reload') {
        if(!afterReload || p.createdDocumentInstance===DOCUMENT_INSTANCE){location.reload();return;}
        const b=await findTestBody(p);await checkTestBody(p,b);
        p.bodyId=b.id;p.reloaded=true;p.phase='cleanup';savePending(p);
      }
      if(p.phase==='cleanup') {
        if(!afterReload){location.reload();return;}
        await closeTest(p);
      }
    }catch(e){if(e.status===401){setKey('');authLabel(false);}proofMessage('CP08 HOLD: '+e.message+'. No further write or unrelated deletion attempted.');}
    finally{proofBusy=false;}
  }
  async function startTest() {
    if(proofBusy)return;
    if(!(await ensureUnlocked()))return;
    if(getPending()){void resumeTest(false);return;}
    const nonce=crypto.randomUUID();
    const p={schema:'JM.OwnerVault.ProofPending/0.1',nonce,
      sourceInstanceId:'cp08-'+nonce.replace(/-/g,''),
      sha256:await hashText(proofHTML(nonce)),createdAt:new Date().toISOString(),
      phase:'prepared',firstRead:false,reloaded:false,createdDocumentInstance:DOCUMENT_INSTANCE};
    try{savePending(p);}catch(e){proofMessage('CP08 HOLD: no durable device checkpoint. No write attempted.');return;}
    proofBusy=true;
    try{
      proofMessage('Only the temporary CP08 test body is being saved...');
      const out=await request('',{method:'POST',body:JSON.stringify({action:'upload-body',
        body:{name:proofName,fileName:proofFile,sourceInstanceId:p.sourceInstanceId,content:proofHTML(nonce)}})});
      if(!['BODY_STORED','DUPLICATE_ALREADY_HELD'].includes(out.outcome))throw new Error('CP08_UPLOAD_RECEIPT_INVALID');
      const b=await findTestBody(p);if(out.body?.id!==b.id)throw new Error('CP08_UPLOAD_ID_MISMATCH');
      await checkTestBody(p,b);
      p.bodyId=b.id;p.firstRead=true;p.phase='reload';savePending(p);
      proofMessage('Private write and readback proved. Reloading to test independent recovery...');
      location.reload();
    }catch(e){if(e.status===401){setKey('');authLabel(false);}proofMessage('CP08 HOLD: '+e.message+'. Checkpoint retained; no duplicate POST will be issued.');}
    finally{proofBusy=false;}
  }
  function exportTestReceipt() {
    try{
      const v=JSON.parse(localStorage.getItem(PROOF_RECEIPT)||'null');
      if(v?.outcome!=='PASS'||v?.schema!=='JM.OwnerVault.AuthenticatedDeviceProof/0.1')throw new Error('NO_VERIFIED_PROOF');
      const u=URL.createObjectURL(new Blob([JSON.stringify(v,null,2)+'\n'],{type:'application/json'}));
      const a=document.createElement('a');a.href=u;a.download='JM_OWNER_VAULT_CP08_OWNER_PROOF.json';
      document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
      proofMessage('Bounded owner-device proof exported. No owner key or personal JM body content included.');
    }catch(e){proofMessage('Proof export HOLD: '+e.message);}
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

  async function downloadLineageRemote(id) {
    if (!(await ensureUnlocked())) return;
    try {
      message('Reading verified private revision ancestry for local recovery export…');
      const packet = await request(`?mode=export-lineage&body=${encodeURIComponent(id)}`);
      if (packet.schema !== 'JM.OwnerVault/0.1.LineageExport'
        || packet.selected_id !== id || !Array.isArray(packet.versions)
        || packet.versions.length < 1 || packet.version_count !== packet.versions.length
        || packet.versions.length > 16) throw new Error('LINEAGE_EXPORT_RECEIPT_INVALID');
      let total = 0, expectedId = id;
      for (const v of packet.versions) {
        if (!v || !v.metadata || typeof v.content !== 'string'
          || v.metadata.id !== expectedId
          || !/^[a-f0-9]{64}$/i.test(v.metadata.sha256 || ''))
          throw new Error('LINEAGE_EXPORT_ANCESTRY_INVALID');
        const count = new TextEncoder().encode(v.content).byteLength;
        if (count !== v.metadata.bytes || await hashText(v.content) !== v.metadata.sha256.toLowerCase())
          throw new Error('LINEAGE_EXPORT_SOURCE_HASH_MISMATCH');
        total += count;
        expectedId = v.metadata.previousVersionId || null;
      }
      if (expectedId !== null || total !== packet.source_bytes || total > 32 * 1024 * 1024)
        throw new Error('LINEAGE_EXPORT_INCOMPLETE_OR_OVERBOUNDED');
      const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `JM_Vault_Lineage_${id}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      message(`Portable lineage export offered: ${packet.version_count} verified ${packet.version_count === 1 ? 'version' : 'versions'}. Keep the JSON outside this host and verify the saved file independently; no offsite custody is claimed yet.`);
    } catch (error) {
      message(`Lineage export HOLD: ${error.message}. No backup-success claim issued.`);
    }
  }

  async function restoreRemoteBody(body) {
    if (!(await ensureUnlocked())) return;
    try {
      const already = parse(LOCAL.mounted, []);
      if (!Array.isArray(already)) throw new Error('LOCAL_MOUNT_FORMAT_HOLD');
      if (already.some(x => x.vaultBodyId === body.id)) {
        message('This exact Vault revision is already mounted locally. No duplicate created.');
        return;
      }
      if (already.length >= 12) {
        message('Local shelf is full (12 bodies). No previous body was evicted. Download this revision or choose an existing copy to remove deliberately.');
        return;
      }
      const response = await request(`?body=${encodeURIComponent(body.id)}`);
      const content = await response.text();
      if (!/<html|<!doctype/i.test(content)) throw new Error('NOT_STANDALONE_HTML');
      const hash = await hashText(content);
      if (hash !== body.sha256) throw new Error('VAULT_RESTORE_HASH_MISMATCH');
      if (already.some(x=>x.sourceInstanceId === body.sourceInstanceId && typeof x.content === 'string' && x.content === content)) {
        message('Matching source identity and exact bytes already on this device. No duplicate created.');
        return;
      }
      // The device-local identity is unique, and source identity remains
      // attached for evidence. This is a local copy, not a new R2 purpose.
      const localCopy = {
        id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: body.name || body.fileName || 'Recovered JM body',
        fileName: body.fileName || 'recovered-jm-body.html',
        bytes: new TextEncoder().encode(content).byteLength,
        content, at: new Date().toISOString(),
        vaultBodyId: body.id, vaultSha256: hash,
        sourceInstanceId: body.sourceInstanceId || `vault-${body.id}`,
        previousVersionId: body.previousVersionId || null
      };
      // LocalStorage setItem is atomic. On quota/blocked storage we change
      // neither the saved shelf nor the original in-memory Estate shelf.
      localStorage.setItem(LOCAL.mounted, JSON.stringify([localCopy,...already]));
      message('Private HTML recovered to the local shelf with exact SHA-256. Reloading the original Owner Room; remote and older local bodies were not modified.');
      location.reload();
    } catch (error) {
      if (error.status === 401) { setKey(''); authLabel(false); closeEditor(); }
      message(`Restore to device HOLD: ${error.message}. Existing local and private Vault bodies remain unchanged.`);
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
      observedStateRevision = /^[a-f0-9]{64}$/.test(data.state_revision || '')
        ? data.state_revision : null;
      authLabel(true);
      const bodies = Array.isArray(data.bodies) ? data.bodies : [];
      el('jmVaultCount').textContent = `${bodies.length} REMOTE ${bodies.length === 1 ? 'BODY' : 'BODIES'}`;
      const shelf = el('jmVaultRemote');
      shelf.innerHTML = bodies.length ? bodies.map(body => `
        <article class="jm-vault-card">
          <div><b>${escapeHTML(body.name)}</b><small>${Math.round((body.bytes || 0) / 1024)} KB · ${escapeHTML(body.status || 'PRIVATE COPY')} · ${escapeHTML((body.sha256 || '').slice(0, 12))}…</small></div>
          <div class="jm-vault-card-actions">
            <button type="button" data-vault-preview="${escapeHTML(body.id)}">PREVIEW</button>
            <button type="button" data-vault-edit="${escapeHTML(body.id)}">EDIT SOURCE</button>
            <button type="button" data-vault-download="${escapeHTML(body.id)}">DOWNLOAD</button>
            <button type="button" data-vault-lineage="${escapeHTML(body.id)}">EXPORT LINEAGE</button>
            <button type="button" data-vault-restore="${escapeHTML(body.id)}">RESTORE TO DEVICE</button>
            <button type="button" class="danger" data-vault-delete="${escapeHTML(body.id)}">REMOVE</button>
          </div>
        </article>`).join('') : '<div class="empty-state">No private durable HTML body stored yet.</div>';

      shelf.querySelectorAll('[data-vault-edit]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultEdit);
        if (body) editRemote(body.id, body.name, body.sha256);
      }));
      shelf.querySelectorAll('[data-vault-preview]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultPreview);
        if (body) previewRemote(body.id, body.name);
      }));
      shelf.querySelectorAll('[data-vault-download]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultDownload);
        if (body) downloadRemote(body.id, body.fileName);
      }));
      shelf.querySelectorAll('[data-vault-lineage]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultLineage);
        if (body) downloadLineageRemote(body.id);
      }));
      shelf.querySelectorAll('[data-vault-restore]').forEach(button => button.addEventListener('click', () => {
        const body = bodies.find(item => item.id === button.dataset.vaultRestore);
        if (body) restoreRemoteBody(body);
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
    el('jmVaultProveRoundtrip')?.addEventListener('click',startTest);
    el('jmVaultExportProof')?.addEventListener('click',exportTestReceipt);
    el('jmVaultSaveRevision')?.addEventListener('click', saveRevision);
    el('jmVaultCancelEdit')?.addEventListener('click', closeEditor);
    el('jmVaultLock')?.addEventListener('click', () => {
      setKey(''); observedStateRevision = null; authLabel(false); closeEditor(); el('jmVaultRemote').innerHTML = ''; el('jmVaultCount').textContent = '0 REMOTE BODIES';
      message('Vault locked. The session key was removed from this browser tab/session.');
    });
  }

  function init() {
    installStyle();
    if (!buildPanel()) return;
    bind();
    proofState();
    void status().then(()=>{
      const p=getPending();
      if(p&&key()&&(p.phase==='reload'||p.phase==='cleanup'))void resumeTest(true);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
