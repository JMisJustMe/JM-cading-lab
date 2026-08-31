(() => {
  const AUTHOR_ID = 'author-house';
  const MONEY_ID = 'money-menu-house';
  const SHIMS_ID = 'shims-reader-house';
  const LYRICS_ID = 'lyrics-house';
  const EARN_NOW_ID = 'earn-now-house';

  function trackVisit(entry) {
    try {
      const recent = JSON.parse(localStorage.getItem('jm-estate-recent') || '[]');
      const next = [{...entry, at:new Date().toISOString()}, ...recent.filter(item => item.id !== entry.id)].slice(0, 8);
      localStorage.setItem('jm-estate-recent', JSON.stringify(next));
    } catch (_) {
      // Navigation must never depend on local storage.
    }
  }

  function makeDoor({id,href,accent,label,state,title,copy,action,visitName}) {
    const door = document.createElement('a');
    door.className = `door-card ${id}-door-card`;
    door.href = href;
    door.dataset.cardId = id;
    door.style.setProperty('--accent', accent);
    door.setAttribute('aria-label', label);
    door.innerHTML = `
      <span class="door-state">${state}</span>
      <h3>${title}</h3>
      <p>${copy}</p>
      <div class="door-foot"><span>${action}</span><span aria-hidden="true">↗</span></div>
    `;
    door.addEventListener('click', () => trackVisit({id,name:visitName,path:href,route:null}));
    return door;
  }

  function makeEarnNowDoor() {
    return makeDoor({
      id:EARN_NOW_ID,href:'./earn-now/',accent:'#ffd166',
      label:'Open the JM Earn-Now hire window',
      state:'HIRE JM NOW · CLEAR STARTING OFFERS',title:'Hire JM · Earn-Now',
      copy:'Start with a buyer-readable service: writing, naming, audits, game/app testing, project rescue or a bounded OneBody build. The full governed Money Menu stays behind this front window.',
      action:'See what you can hire now',visitName:'JM Earn-Now Window v1.0'
    });
  }

  function makeAuthorDoor() {
    return makeDoor({
      id:AUTHOR_ID,href:'./author/',accent:'#f0c66d',
      label:'Open Theodore Benjamin Scott / JM author page',
      state:'PUBLIC AUTHOR ROUTE · LIVE',title:'Theodore / JM',
      copy:'Meet the human source behind the Estate: author, verbalist, lyricist, theorist, game and world builder, tool creator and source-to-body architect.',
      action:'Meet the creator',visitName:'Theodore / JM — Author & Source Creator'
    });
  }

  function makeMoneyDoor() {
    return makeDoor({
      id:MONEY_ID,href:'./money-menu/',accent:'#77e8bd',
      label:'Open the JM Money Menu',
      state:'PUBLIC COMMERCIAL ROUTE · 242 GOVERNED ROUTES',title:'JM Money Menu',
      copy:'Search the governed route field, shortlist exact bodies and build an enquiry → brief → scope → receipt pack without silently submitting anything.',
      action:'Open the Money Menu',visitName:'JM Money Menu — Public Contact Carrier v1.2'
    });
  }

  function makeShimsDoor() {
    return makeDoor({
      id:SHIMS_ID,href:'./shims-reader/',accent:'#ff8fb8',
      label:'Open SHIMS Reader reflective route reading',
      state:'PUBLIC SERVICE ROUTE · FREE TASTER + PAID READING',title:'SHIMS Reader',
      copy:'Try a private local reflective route-reading taster, then carry the situation into a human-reviewed Starter, Full or Deep reading if useful.',
      action:'Try SHIMS Reader',visitName:'SHIMS Reader — Reflective Route Reading'
    });
  }

  function makeLyricsDoor() {
    return makeDoor({
      id:LYRICS_ID,href:'./lyrics/',accent:'#ff75ad',
      label:'Open JM Lyrics and Music House',
      state:'PUBLIC CREATIVE ROUTE · SOURCE-SAFE',title:'Lyrics & Music House',
      copy:'Explore public-safe project, performance and recovered-work routes without exposing the private lyric and Evernote source corpus.',
      action:'Enter Lyrics & Music',visitName:'JM Lyrics & Music House'
    });
  }

  function mountHeroHire() {
    const actions = document.querySelector('.hero-actions');
    if (!actions || actions.querySelector('.jm-hire-now-button')) return;
    const hire = document.createElement('a');
    hire.className = 'button primary jm-hire-now-button';
    hire.href = './earn-now/';
    hire.textContent = 'Hire JM now';
    hire.setAttribute('aria-label', 'Open the JM Earn-Now hire window');
    hire.addEventListener('click', () => trackVisit({id:EARN_NOW_ID,name:'JM Earn-Now Window v1.0',path:'./earn-now/',route:null}));
    actions.prepend(hire);
  }

  function mountDoors() {
    const host = document.getElementById('featureDoors');
    if (!host) return;
    if (!host.querySelector(`[data-card-id="${MONEY_ID}"]`)) host.prepend(makeMoneyDoor());
    if (!host.querySelector(`[data-card-id="${SHIMS_ID}"]`)) host.prepend(makeShimsDoor());
    if (!host.querySelector(`[data-card-id="${EARN_NOW_ID}"]`)) host.prepend(makeEarnNowDoor());
    if (!host.querySelector(`[data-card-id="${LYRICS_ID}"]`)) host.append(makeLyricsDoor());
    if (!host.querySelector(`[data-card-id="${AUTHOR_ID}"]`)) host.append(makeAuthorDoor());
    mountHeroHire();
  }

  function watchFrontDoors() {
    const host = document.getElementById('featureDoors');
    if (!host) return;
    new MutationObserver(mountDoors).observe(host, { childList: true });
    mountDoors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchFrontDoors, { once: true });
  } else {
    watchFrontDoors();
  }
})();
