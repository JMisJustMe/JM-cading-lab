(() => {
  'use strict';

  const path = location.pathname.replace(/\/+$/, '/');
  if (!/\/games-beyond\/$/.test(path) && !/\/games-beyond\/index\.html$/.test(location.pathname)) return;
  if (document.getElementById('jm-games-beyond-contact-safety-v1')) return;

  const style = document.createElement('style');
  style.id = 'jm-games-beyond-contact-safety-v1';
  style.textContent = '.toast{pointer-events:none!important}';
  document.head.appendChild(style);
})();

(() => {
  'use strict';

  const script = document.currentScript;
  if (!script) return;

  const contractUrl = new URL('./registry/estate-head-public-current.json', script.src);
  const clean = value => String(value || '').replace(/^\/+/, '').replace(/index\.html$/, '');

  fetch(contractUrl, { cache: 'no-store' })
    .then(response => {
      if (!response.ok) throw new Error(`Estate Head ${response.status}`);
      return response.json();
    })
    .then(contract => {
      window.JM_ESTATE_HEAD_PUBLIC = contract;
      document.documentElement.dataset.estateHeadAuthority = contract.current_public_subset_version || 'current';
      document.documentElement.dataset.estateHeadConsumption = contract.deployment_state || 'unknown';

      const pagePath = clean(
        location.pathname.includes('/JM-cading-lab/')
          ? location.pathname.split('/JM-cading-lab/').pop()
          : location.pathname
      );
      const house = (contract.public_house_routes || []).find(item => clean(item.path) === pagePath);

      if (house) {
        document.documentElement.dataset.estateHouseState = house.state || 'REGISTERED';
        document.documentElement.dataset.estateHouseName = house.body || '';
      }

      const stampTarget = document.querySelector('.brand small,.head span,.topbar .brand small,header small');
      if (stampTarget && !stampTarget.dataset.estateHeadStamped) {
        stampTarget.dataset.estateHeadStamped = 'true';
        stampTarget.textContent = `${stampTarget.textContent.trim()} · EH ${contract.current_public_subset_version || 'current'}`;
      }

      document.dispatchEvent(new CustomEvent('jm:estate-head-authority', {
        detail: { contract, house }
      }));
    })
    .catch(error => {
      document.documentElement.dataset.estateHeadConsumption = 'sovereign-fallback';
      document.dispatchEvent(new CustomEvent('jm:estate-head-unavailable', { detail: { error } }));
      console.warn('Estate Head authority unavailable; House kept its sovereign fallback.', error);
    });
})();

(() => {
  'use strict';

  const path = location.pathname.replace(/\/+$/, '/');
  if (!/\/theory\/$/.test(path) && !/\/theory\/index\.html$/.test(location.pathname)) return;

  const host = document.currentScript?.src || location.href;
  let loading = false;
  let tries = 0;

  function loadIntegrity() {
    if (loading || window.JMTheorySourceIntegrityV12) return;
    loading = true;

    const priorRender = typeof window.renderFeatures === 'function' ? window.renderFeatures : null;
    if (priorRender) window.renderFeatures = () => {};

    const integrityScript = document.createElement('script');
    integrityScript.src = new URL('./theory/source-body-integrity-v12.js?v=2001', host).href;
    integrityScript.async = true;
    integrityScript.onload = () => {
      let restoreTries = 0;
      const restore = setInterval(() => {
        if (window.JMTheorySourceIntegrityV12 || ++restoreTries > 600) {
          clearInterval(restore);
          if (priorRender) window.renderFeatures = priorRender;
        }
      }, 50);
    };
    integrityScript.onerror = () => {
      loading = false;
      if (priorRender) window.renderFeatures = priorRender;
      console.error('Theory source-body integrity v0.20.1 failed to load');
    };
    document.head.appendChild(integrityScript);
  }

  const ready = setInterval(() => {
    if (window.JMTheoryFirstStageT1ReconciliationV10) {
      clearInterval(ready);
      loadIntegrity();
    } else if (++tries > 800) {
      clearInterval(ready);
      loadIntegrity();
    }
  }, 50);
})();

(() => {
  'use strict';

  const path = location.pathname;
  if (!/\/theory\/(?:index\.html)?$/.test(path)) return;

  const styleId = 'jm-theory-mobile-nav-v13';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = '@media(max-width:850px){.mobile-nav{grid-template-columns:repeat(6,minmax(0,1fr))!important}.mobile-nav button{min-width:0!important;padding-left:2px!important;padding-right:2px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}}';
  document.head.appendChild(style);
})();

(() => {
  'use strict';

  const path = location.pathname.replace(/\/+$/, '/');
  if (!/\/author\/$/.test(path) && !/\/author\/index\.html$/.test(location.pathname)) return;

  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[character]));

  const routeHref = routePath => `../${String(routePath || '').replace(/^\/+/, '')}`;
  const displayDate = value => {
    if (!value) return 'current public contract';
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  };

  function addStyles() {
    if (document.getElementById('jm-author-current-style-v1')) return;
    const style = document.createElement('style');
    style.id = 'jm-author-current-style-v1';
    style.textContent = `
      .author-now-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.8rem;margin:1.2rem 0}
      .author-now-stat,.author-now-route{border:1px solid var(--line);border-radius:18px;background:rgba(255,255,255,.025);padding:1rem}
      .author-now-stat strong{display:block;color:var(--gold2);font-size:clamp(1.7rem,4vw,2.6rem);line-height:1;margin-bottom:.45rem}
      .author-now-stat span{color:var(--muted);font-size:.86rem}
      .author-now-routes{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;margin-top:1rem}
      .author-now-route{text-decoration:none;display:flex;flex-direction:column;gap:.5rem;min-height:9rem;transition:border-color .18s ease,transform .18s ease}
      .author-now-route:hover,.author-now-route:focus-visible{border-color:var(--gold);transform:translateY(-2px);outline:none}
      .author-now-route small{color:var(--green);font-size:.7rem;font-weight:850;letter-spacing:.05em;text-transform:uppercase;overflow-wrap:anywhere}
      .author-now-route b{font-size:1.08rem;line-height:1.2}
      .author-now-route span{color:var(--muted);font-size:.88rem;margin-top:auto}
      .author-now-meta{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:1rem}
      .author-now-meta span{border:1px solid var(--line);border-radius:999px;padding:.35rem .65rem;color:var(--muted);font-size:.78rem}
      .author-now-loading{color:var(--muted);padding:1rem 0}
      @media(max-width:760px){.author-now-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.author-now-routes{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensureSection() {
    let section = document.getElementById('current');
    if (section) return section;

    section = document.createElement('section');
    section.className = 'section';
    section.id = 'current';
    section.setAttribute('aria-labelledby', 'author-current-title');
    section.innerHTML = `
      <div class="section-head">
        <div>
          <div class="kicker">Current public field</div>
          <h2 id="author-current-title">What Theodore / JM is building now</h2>
        </div>
        <p class="section-intro">This panel reads the governed Estate contract, so the author page can keep moving without pretending every private body is public.</p>
      </div>
      <div id="authorCurrentBody" class="author-now-loading" role="status" aria-live="polite">Reading the current public Estate…</div>
    `;

    const about = document.getElementById('about');
    const roles = document.getElementById('roles');
    if (about?.parentNode) about.insertAdjacentElement('afterend', section);
    else if (roles?.parentNode) roles.insertAdjacentElement('beforebegin', section);
    else document.querySelector('main')?.appendChild(section);

    const nav = document.querySelector('.topbar-inner');
    if (nav && !nav.querySelector('a[href="#current"]')) {
      const nowLink = document.createElement('a');
      nowLink.className = 'navlink';
      nowLink.href = '#current';
      nowLink.textContent = 'Now';
      const rolesLink = nav.querySelector('a[href="#roles"]');
      if (rolesLink) rolesLink.insertAdjacentElement('beforebegin', nowLink);
      else nav.appendChild(nowLink);
    }

    return section;
  }

  function selectRoutes(contract) {
    const routes = Array.isArray(contract.public_house_routes) ? contract.public_house_routes : [];
    const priorities = [
      'JM Estate — Recent Chat Convergence',
      'JM Non-Game Apps House',
      'JM Games — Current Direction Ledger',
      'JM Theory Multihub',
      'JM BIOHOUSE',
      'TraSta',
      'Reality, Route & Meaning Ethos'
    ];

    const selected = [];
    for (const priority of priorities) {
      const match = routes.find(route => String(route.body || '').includes(priority));
      if (match && !selected.includes(match)) selected.push(match);
      if (selected.length === 6) break;
    }

    if (selected.length < 6) {
      for (const route of routes) {
        if (selected.includes(route)) continue;
        if (/Owned Web Estate|Author & Source Creator|Public Authority/.test(String(route.body || ''))) continue;
        selected.push(route);
        if (selected.length === 6) break;
      }
    }

    return selected;
  }

  function render(contract) {
    addStyles();
    ensureSection();

    const body = document.getElementById('authorCurrentBody');
    if (!body) return;

    const governance = contract.source_to_living_governance || {};
    const recent = contract.recent_convergence || {};
    const routes = selectRoutes(contract);
    const stats = [
      [contract.body_count ?? '—', 'governed body passports'],
      [contract.project_head_count ?? '—', 'Project Head passports'],
      [governance.governed_records ?? '—', 'governed records'],
      [governance.stage_receipts ?? '—', 'six-stage receipts']
    ];

    body.className = '';
    body.innerHTML = `
      <div class="author-now-grid">
        ${stats.map(([value, label]) => `<article class="author-now-stat"><strong>${escapeHTML(value)}</strong><span>${escapeHTML(label)}</span></article>`).join('')}
      </div>
      <div class="author-now-routes">
        ${routes.map(route => `
          <a class="author-now-route" href="${escapeHTML(routeHref(route.path))}">
            <small>${escapeHTML(route.state || 'PUBLIC ROUTE')}</small>
            <b>${escapeHTML(route.body || 'JM Estate route')}</b>
            <span>Open current public body →</span>
          </a>
        `).join('')}
      </div>
      <div class="author-now-meta">
        <span>Authority ${escapeHTML(contract.current_public_subset_version || 'current')}</span>
        <span>Effective ${escapeHTML(displayDate(contract.effective_date))}</span>
        <span>${escapeHTML(recent.current_lanes_represented ?? '—')} recent lanes represented</span>
        <span>${escapeHTML(governance.public_promotions_guarded ?? '—')} guarded public promotions</span>
      </div>
      <div class="boundary" style="margin-top:1rem">
        <strong>Live boundary:</strong> these figures describe the governed public field. They do not claim that the complete private Estate, source vaults or personal biography have been published.
      </div>
    `;

    const mountedLine = document.querySelector('.hero-side .boundary p');
    if (mountedLine) {
      mountedLine.textContent = `Public author page v0.3 · live authority ${contract.current_public_subset_version || 'current'} · ${displayDate(contract.effective_date)}`;
    }
  }

  function renderFallback() {
    addStyles();
    ensureSection();
    const body = document.getElementById('authorCurrentBody');
    if (!body) return;
    body.className = 'author-now-loading';
    body.textContent = 'The live Estate contract is temporarily unavailable. The sovereign Author page remains readable and no current counts are being invented.';
  }

  addStyles();
  ensureSection();

  document.addEventListener('jm:estate-head-authority', event => render(event.detail.contract), { once: true });
  document.addEventListener('jm:estate-head-unavailable', renderFallback, { once: true });

  if (window.JM_ESTATE_HEAD_PUBLIC) render(window.JM_ESTATE_HEAD_PUBLIC);
})();
