(() => {
  const AUTHOR_ID = 'author-house';
  const MONEY_ID = 'money-menu-house';

  function trackVisit(entry) {
    try {
      const recent = JSON.parse(localStorage.getItem('jm-estate-recent') || '[]');
      const next = [{...entry, at:new Date().toISOString()}, ...recent.filter(item => item.id !== entry.id)].slice(0, 8);
      localStorage.setItem('jm-estate-recent', JSON.stringify(next));
    } catch (_) {
      // Navigation must never depend on local storage.
    }
  }

  function makeAuthorDoor() {
    const door = document.createElement('a');
    door.className = 'door-card author-door-card';
    door.href = './author/';
    door.dataset.cardId = AUTHOR_ID;
    door.style.setProperty('--accent', '#f0c66d');
    door.setAttribute('aria-label', 'Open Theodore Benjamin Scott / JM author page');
    door.innerHTML = `
      <span class="door-state">PUBLIC AUTHOR ROUTE · LIVE</span>
      <h3>Theodore / JM</h3>
      <p>Meet the human source behind the Estate: author, verbalist, lyricist, theorist, game and world builder, tool creator and source-to-body architect.</p>
      <div class="door-foot"><span>Meet the creator</span><span aria-hidden="true">↗</span></div>
    `;
    door.addEventListener('click', () => trackVisit({id:AUTHOR_ID,name:'Theodore / JM — Author & Source Creator',path:'./author/',route:null}));
    return door;
  }

  function makeMoneyDoor() {
    const door = document.createElement('a');
    door.className = 'door-card money-menu-door-card';
    door.href = './money-menu/';
    door.dataset.cardId = MONEY_ID;
    door.style.setProperty('--accent', '#77e8bd');
    door.setAttribute('aria-label', 'Open the JM Money Menu');
    door.innerHTML = `
      <span class="door-state">PUBLIC COMMERCIAL ROUTE · 242 GOVERNED ROUTES</span>
      <h3>JM Money Menu</h3>
      <p>Search the governed route field, shortlist exact bodies and build an enquiry → brief → scope → receipt pack without silently submitting anything.</p>
      <div class="door-foot"><span>Open the Money Menu</span><span aria-hidden="true">↗</span></div>
    `;
    door.addEventListener('click', () => trackVisit({id:MONEY_ID,name:'JM Money Menu — Public Contact Carrier v1.2',path:'./money-menu/',route:null}));
    return door;
  }

  function mountDoors() {
    const host = document.getElementById('featureDoors');
    if (!host) return;
    if (!host.querySelector(`[data-card-id="${MONEY_ID}"]`)) host.prepend(makeMoneyDoor());
    if (!host.querySelector(`[data-card-id="${AUTHOR_ID}"]`)) host.append(makeAuthorDoor());
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
