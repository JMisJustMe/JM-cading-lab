(() => {
  const AUTHOR_ID = 'author-house';
  const PLATFORM_CONTRACT_PATH = './platform/jm-platform-contract.json';
  const BRIDGE_SCHEMA = 'JM.NativeBridge/1.0';

  function installNativeBridge() {
    const existing = window.JMPlatform || {};

    function getAndroidBridge() {
      const candidates = [window.JMAndroidBridge, window.AndroidBridge, window.JMNativeBridge];
      return candidates.find(candidate => candidate && typeof candidate.postMessage === 'function') || null;
    }

    const bridge = {
      ...existing,
      schema: BRIDGE_SCHEMA,
      source: 'JM_SHARED_WEB_CORE',
      contractPath: PLATFORM_CONTRACT_PATH,
      get isNative() {
        return Boolean(getAndroidBridge());
      },
      get platform() {
        return getAndroidBridge() ? 'android' : 'web';
      },
      post(action, payload = {}) {
        const packet = {
          schema: BRIDGE_SCHEMA,
          id: `jm-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          action: String(action || 'unknown'),
          payload,
          at: new Date().toISOString()
        };
        const androidBridge = getAndroidBridge();
        if (androidBridge) {
          androidBridge.postMessage(JSON.stringify(packet));
        } else {
          window.dispatchEvent(new CustomEvent('jm:web-action', { detail: packet }));
        }
        return packet.id;
      },
      receive(message) {
        let packet = message;
        if (typeof message === 'string') {
          try {
            packet = JSON.parse(message);
          } catch (_) {
            packet = { schema: BRIDGE_SCHEMA, action: 'native-message', payload: message };
          }
        }
        window.dispatchEvent(new CustomEvent('jm:native-message', { detail: packet }));
      },
      snapshot() {
        return {
          schema: BRIDGE_SCHEMA,
          platform: this.platform,
          isNative: this.isNative,
          online: navigator.onLine,
          href: location.href,
          viewport: { width: innerWidth, height: innerHeight, pixelRatio: devicePixelRatio },
          at: new Date().toISOString()
        };
      }
    };

    window.JMPlatform = bridge;
    document.documentElement.dataset.jmDelivery = bridge.platform;
    document.documentElement.dataset.jmPlatformFoundation = 'v1';
    window.dispatchEvent(new CustomEvent('jm:platform-ready', { detail: bridge.snapshot() }));
  }

  function applyFreestandingAuthority() {
    const publicDoor = [...document.querySelectorAll('.status-rail article')]
      .find(article => article.querySelector('span')?.textContent.trim() === 'Public door');

    if (publicDoor) {
      const value = publicDoor.querySelector('strong');
      const detail = publicDoor.querySelector('small');
      if (value) value.textContent = 'JM';
      if (detail) detail.textContent = 'custom-domain destination in build';
    }

    document.querySelectorAll('.site-footer a').forEach(link => {
      if (/github\.com/i.test(link.href)) link.remove();
    });

    const footerLinks = document.querySelector('.site-footer .footer-links');
    if (footerLinks && !footerLinks.querySelector('[data-platform-contract]')) {
      const contractLink = document.createElement('a');
      contractLink.href = PLATFORM_CONTRACT_PATH;
      contractLink.textContent = 'Website + APK contract';
      contractLink.dataset.platformContract = 'true';
      footerLinks.append(contractLink);
    }

    document.documentElement.dataset.publicIdentity = 'JMISJUSTME';
    document.documentElement.dataset.supportHostsAreAuthority = 'false';
  }

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

  function boot() {
    installNativeBridge();
    applyFreestandingAuthority();
    watchFrontDoors();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
