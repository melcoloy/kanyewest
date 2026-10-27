// ---------- Onglets ----------
// L'onglet ouvert est gardé dans l'URL : #samples, #classement, #jeux/blind-test…
// Une adresse peut avoir une sous-vue après « / » : le jeu choisi dans l'onglet Jeux,
// ou un classement partagé (#classement/…).
// Chaque changement envoie l'événement "tab-change" avec la vue (ex. "jeux/annee") :
// les jeux s'en servent pour couper le son quand on les quitte.

(() => {
  const tabs = [...document.querySelectorAll(".tab[data-tab]")];
  const names = tabs.map((t) => t.dataset.tab);
  const subtabs = [...document.querySelectorAll(".subtab[data-sub]")];
  const games = subtabs.map((b) => b.dataset.sub);
  // Anciens liens (avant le regroupement des jeux)
  const ALIAS = { jeu: "jeux/plus-ou-moins", "plus-ou-moins": "jeux/plus-ou-moins", "blind-test": "jeux/blind-test" };
  let currentTab = null, currentSub = "";
  let lastGame = games[0];

  const view = () => (currentSub ? `${currentTab}/${currentSub}` : currentTab);

  function show(name, sub = "", { push = false, focus = false } = {}) {
    if (!names.includes(name)) (name = "disco"), (sub = "");
    if (name === "jeux") {
      if (!games.includes(sub)) sub = lastGame;
      lastGame = sub;
    }
    if (name === currentTab && sub === currentSub) return;
    const tabChanged = name !== currentTab;
    currentTab = name;
    currentSub = sub;

    for (const t of tabs) {
      const on = t.dataset.tab === name;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute("aria-controls")).hidden = !on;
    }
    if (name === "jeux") {
      for (const b of subtabs) {
        const on = b.dataset.sub === sub;
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on);
        document.querySelector(`.game-pane[data-pane="${b.dataset.sub}"]`).hidden = !on;
      }
    }
    const t = tabs[names.indexOf(name)];
    if (focus) t.focus();
    // Sur mobile, la barre défile : on garde l'onglet actif visible
    t.parentElement.scrollTo({ left: t.offsetLeft - 16, behavior: "smooth" });

    const hash = name === "disco" ? location.pathname + location.search : "#" + view();
    if (push) history.pushState(null, "", hash);

    // Si on a scrollé loin (ex. bas des stats), on remonte jusqu'à la barre d'onglets
    const bar = document.querySelector(".tabs");
    if (tabChanged && window.scrollY > bar.offsetTop) window.scrollTo({ top: bar.offsetTop, behavior: "instant" });

    document.dispatchEvent(new CustomEvent("tab-change", { detail: view() }));
  }

  const fromHash = () => {
    let h = decodeURIComponent(location.hash.slice(1));
    h = ALIAS[h] || h;
    const i = h.indexOf("/");
    return i < 0 ? [h, ""] : [h.slice(0, i), h.slice(i + 1)];
  };

  tabs.forEach((t) => t.addEventListener("click", () => show(t.dataset.tab, "", { push: true })));
  subtabs.forEach((b) => b.addEventListener("click", () => show("jeux", b.dataset.sub, { push: true })));

  // Flèches gauche / droite dans la barre d'onglets
  document.querySelector(".tabs").addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const i = names.indexOf(currentTab) + (e.key === "ArrowRight" ? 1 : -1);
    show(names[(i + names.length) % names.length], "", { push: true, focus: true });
  });

  // Une ancre interne (#stats-title…) ne doit pas changer d'onglet
  window.addEventListener("popstate", () => {
    const [h, sub] = fromHash();
    if (!h || names.includes(h)) show(h || "disco", sub);
  });

  window.showTab = (name, sub = "") => show(name, sub, { push: true });
  window.currentTab = () => currentTab;
  window.currentView = view;

  const [initial, sub] = fromHash();
  show(names.includes(initial) ? initial : "disco", sub);
  if (ALIAS[location.hash.slice(1)]) history.replaceState(null, "", "#" + view());
})();