/* JM ECOSTATE contextual return route v0.1
   Carrier navigation only: remembers a declared entry door and offers a reversible route back.
   RETURN TO EARLIER POINT ≠ RETURN TO EARLIER STATE.
*/
(() => {
  'use strict';

  const SCHEMA = 'JM.EstateReturnRoute/0.1';
  const KEY = 'jm-estate-return-origin-v01';
  const PARAM = 'jm_origin';
  const ORIGINS = {
    career: { id: 'career', label: 'Career / UX', href: '/career/' }
  };

  const norm = p => {
    const value = String(p || '/').replace(/\/index\.html$/i, '/');
    return value.endsWith('/') ? value : value + '/';
  };

  const readStored = () => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && ORIGINS[parsed.id] ? ORIGINS[parsed.id] : null;
    } catch (_) {
      return null;
    }
  };

  const store = origin => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify({
        schema: SCHEMA,
        id: origin.id,
        label: origin.label,
        href: origin.href,
        setAt: new Date().toISOString()
      }));
    } catch (_) {}
  };

  const clear = () => {
    try { sessionStorage.removeItem(KEY); } catch (_) {}
  };

  const currentPath = norm(location.pathname);
  const ownOrigin = Object.values(ORIGINS).find(origin => currentPath === norm(origin.href)) || null;

  // A declared origin in the URL is the cross-page handoff.
  const url = new URL(location.href);
  const incomingId = url.searchParams.get(PARAM);
  if (incomingId && ORIGINS[incomingId]) {
    store(ORIGINS[incomingId]);
    url.searchParams.delete(PARAM);
    try {
      history.replaceState(history.state, '', url.pathname + (url.search ? url.search : '') + url.hash);
    } catch (_) {}
  }

  // The source door marks outgoing same-origin links so the destination can recover origin.
  if (ownOrigin) {
    clear();
    document.documentElement.dataset.jmReturnOrigin = ownOrigin.id;

    document.querySelectorAll('a[href]').forEach(anchor => {
      if (anchor.hasAttribute('download')) return;
      const raw = anchor.getAttribute('href') || '';
      if (!raw || raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:') || raw.startsWith('javascript:')) return;

      let target;
      try { target = new URL(raw, location.href); } catch (_) { return; }
      if (!/^https?:$/.test(target.protocol)) return;
      if (target.origin !== location.origin) return;
      if (norm(target.pathname) === norm(ownOrigin.href)) return;

      target.searchParams.set(PARAM, ownOrigin.id);
      anchor.href = target.href;
      anchor.dataset.jmReturnCarry = ownOrigin.id;
    });
    return;
  }

  const origin = readStored();
  if (!origin) return;

  // Arriving back at the origin consumes the return route.
  if (currentPath === norm(origin.href)) {
    clear();
    return;
  }

  const style = document.createElement('style');
  style.id = 'jm-estate-return-route-style-v01';
  style.textContent = `
    #jm-estate-return-route-v01{
      position:fixed;right:18px;bottom:24px;z-index:2147483000;
      display:flex;align-items:center;gap:7px;
      font:800 14px/1.15 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
      filter:drop-shadow(0 14px 28px rgba(0,0,0,.34))
    }
    #jm-estate-return-route-v01 a,
    #jm-estate-return-route-v01 button{
      border:1px solid rgba(255,211,109,.46);
      color:#fff;background:rgba(8,14,20,.96);
      min-height:44px;border-radius:999px
    }
    #jm-estate-return-route-v01 a{
      display:inline-flex;align-items:center;gap:8px;
      padding:10px 15px;text-decoration:none
    }
    #jm-estate-return-route-v01 a:hover,
    #jm-estate-return-route-v01 a:focus-visible{
      outline:2px solid #ffd36d;outline-offset:2px
    }
    #jm-estate-return-route-v01 button{
      width:44px;cursor:pointer;font-size:18px
    }
    #jm-estate-return-route-v01 button:focus-visible{
      outline:2px solid #ffd36d;outline-offset:2px
    }
    @media(max-width:760px){
      #jm-estate-return-route-v01{
        left:12px;right:12px;bottom:82px
      }
      #jm-estate-return-route-v01 a{flex:1;justify-content:center}
    }
    @media(prefers-reduced-motion:reduce){
      #jm-estate-return-route-v01 *{scroll-behavior:auto!important;transition:none!important}
    }
  `;
  document.head.appendChild(style);

  const rail = document.createElement('aside');
  rail.id = 'jm-estate-return-route-v01';
  rail.dataset.schema = SCHEMA;
  rail.setAttribute('aria-label', 'Return to entry route');

  const back = document.createElement('a');
  back.href = origin.href;
  back.textContent = '↩ Return to ' + origin.label;
  back.addEventListener('click', clear);

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.setAttribute('aria-label', 'Dismiss return route');
  dismiss.textContent = '×';
  dismiss.addEventListener('click', () => {
    clear();
    rail.remove();
    style.remove();
  });

  rail.append(back, dismiss);
  document.body.appendChild(rail);
  document.documentElement.dataset.jmReturnRoute = origin.id;

  document.dispatchEvent(new CustomEvent('jm:return-route-ready', {
    detail: { schema: SCHEMA, origin: origin.id, href: origin.href }
  }));
})();
