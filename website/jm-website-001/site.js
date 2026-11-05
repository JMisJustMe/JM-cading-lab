/* JM WEBSITE 001: small original progressive enhancement. The JM.WEB output remains the content authority. */
(() => {
  "use strict";
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");
  const store = "jm.website.001.theme";
  let stored = null;
  try { stored = localStorage.getItem(store); } catch (_) {}
  if (stored === "light" || stored === "dark") root.dataset.theme = stored;
  function refreshTheme() {
    const light = root.dataset.theme === "light";
    button.textContent = light ? "☾ Dark" : "☀ Light";
    button.setAttribute("aria-pressed", String(light));
    button.setAttribute("aria-label", light ? "Switch to dark theme" : "Switch to light theme");
  }
  if (button) {
    refreshTheme();
    button.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      try { localStorage.setItem(store, root.dataset.theme); } catch (_) {}
      refreshTheme();
    });
  }
  const links = Array.from(document.querySelectorAll(".nav a[href^='#']"));
  const articles = Array.from(document.querySelectorAll("main article[id]"));
  function activate(id) {
    links.forEach(link => {
      if (link.hash === "#" + id) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) activate(visible[0].target.id);
    }, {rootMargin:"-20% 0px -60% 0px",threshold:[0,0.15,0.5]});
    articles.forEach(article => observer.observe(article));
  }
  links.forEach(link => link.addEventListener("click", () => activate(link.hash.substring(1))));
  if (location.hash) activate(location.hash.slice(1)); else activate("home");
  document.querySelectorAll('main a[href^="https://"]').forEach(link => {
    link.target = "_blank"; link.rel = "noopener noreferrer";
  });
})();