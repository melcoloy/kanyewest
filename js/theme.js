// ---------- Mode clair / sombre ----------
// Par défaut le site suit le réglage du système. Le bouton ☀ / ☾ force l'un ou l'autre
// (choix gardé dans le navigateur ; le <head> l'applique avant l'affichage).

(() => {
  const btn = document.getElementById("theme-btn");
  const meta = document.querySelector('meta[name="theme-color"]');
  const systemLight = matchMedia("(prefers-color-scheme: light)");
  const current = () => document.documentElement.dataset.theme || (systemLight.matches ? "light" : "dark");

  function sync() {
    const light = current() === "light";
    btn.textContent = light ? "☾" : "☀";
    btn.setAttribute("aria-label", light ? "Passer en mode sombre" : "Passer en mode clair");
    meta.content = light ? "#f5f4f0" : "#0b0b0c";
  }

  btn.addEventListener("click", () => {
    const next = current() === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("ye-theme", next); } catch {}
    sync();
  });
  systemLight.addEventListener("change", sync);
  sync();
})();
