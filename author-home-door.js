(() => {
  const AUTHOR_ID = 'author-house';

  function trackAuthorVisit() {
    try {
      const recent = JSON.parse(localStorage.getItem('jm-estate-recent') || '[]');
      const entry = {
        id: AUTHOR_ID,
        name: 'Theodore / JM — Author & Source Creator',
        path: './author/',
        route: null,
        at: new Date().toISOString()
      };
      const next = [entry, ...recent.filter(item => item.id !== AUTHOR_ID)].slice(0, 8);
      localStorage.setItem('jm-estate-recent', JSON.stringify(next));
    } catch (_) {
      // Navigation must never depend on local storage.
    }
  }

  function makeDoor() {
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
    door.addEventListener('click', trackAuthorVisit);
    return door;
  }

  function mountDoor() {
    const host = document.getElementById('featureDoors');
    if (!host || host.querySelector('[data-card-id="author-house"]')) return;
    host.prepend(makeDoor());
  }

  function watchFrontDoors() {
    const host = document.getElementById('featureDoors');
    if (!host) return;
    new MutationObserver(mountDoor).observe(host, { childList: true });
    mountDoor();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchFrontDoors, { once: true });
  } else {
    watchFrontDoors();
  }
})();
