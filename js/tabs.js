// ---------- Onglets ----------
// Discographie / Plus ou moins / Blind test. L'onglet ouvert est gardé dans l'URL
// (#plus-ou-moins, #blind-test) : on peut partager un lien direct ou utiliser ← du navigateur.
// Chaque changement envoie l'événement "tab-change" (le blind test s'en sert pour couper le son).

(() => {
  const tabs = [...document.querySelectorAll(".tab[data-tab]")];
  const names = tabs.map((t) => t.dataset.tab);
  const ALIAS = { jeu: "plus-ou-moins" }; // ancien lien #jeu
  let currentTab = null;

  function show(name, { push = false, focus = false } = {}) {
    if (!names.includes(name)) name = "disco";
    if (name === currentTab) return;
    currentTab = name;

    for (const t of tabs) {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    }
    if (focus) tabs[names.indexOf(name)].focus();
    // Sur mobile, la barre défile : on garde l'onglet actif visible
    const t = tabs[names.indexOf(name)];
    t.parentElement.scrollTo({ left: t.offsetLeft - 16, behavior: "smooth" });

    const hash = name === "disco" ? location.pathname + location.search : "#" + name;
    if (push) history.pushState(null, "", hash);

    // Si on a scrollé loin (ex. bas des stats), on remonte jusqu'à la barre d'onglets
    const bar = document.querySelector(".tabs");
    if (window.scrollY > bar.offsetTop) window.scrollTo({ top: bar.offsetTop, behavior: "instant" });

    document.dispatchEvent(new CustomEvent("tab-change", { detail: name }));
  }

  const fromHash = () => {
    const h = location.hash.slice(1);
    return ALIAS[h] || h;
  };

  tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tab, { push: true })));

  // Flèches gauche / droite dans la barre d'onglets
  document.querySelector(".tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = names.indexOf(currentTab) + (e.key === "ArrowRight" ? 1 : -1);
    show(names[(i + names.length) % names.length], { push: true, focus: true });
  });

  // Un ancre interne (#stats-title…) ne doit pas changer d'onglet
  window.addEventListener("popstate", () => {
    const h = fromHash();
    if (!h || names.includes(h)) show(h || "disco");
  });

  window.showTab = (name) => show(name, { push: true });
  window.currentTab = () => currentTab;

  const initial = fromHash();
  show(names.includes(initial) ? initial : "disco");
  if (ALIAS[location.hash.slice(1)]) history.replaceState(null, "", "#" + initial);
})();
