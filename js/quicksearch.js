// ---------- Recherche rapide ----------
// Une seule barre pour chercher partout : sections et jeux, albums, morceaux (éditions deluxe
// comprises), invités, samples. Ouverture : touche / ou Ctrl + K (⌘ + K sur Mac), ou le bouton
// loupe de la barre d'onglets. ↑ ↓ pour choisir, Entrée pour ouvrir, Échap pour fermer.
// S'appuie sur app.js (albums, allTracks, covers, gradient, initials, escapeHtml, norm, openAlbum,
// editionOf, focusTrack), js/tabs.js (showTab) et js/invites.js (selectGuest).

(() => {
  const ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>`;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

  // ---- Bouton dans la barre d'onglets + fenêtre de recherche
  const bar = document.querySelector(".tabs-bar");
  const btn = Object.assign(document.createElement("button"), {
    className: "qs-btn",
    type: "button",
    title: `Rechercher (/ ou ${isMac ? "⌘" : "Ctrl"} + K)`,
    innerHTML: ICON,
  });
  btn.setAttribute("aria-label", "Rechercher dans tout le site");
  bar.insertBefore(btn, document.getElementById("vol"));

  const dlg = document.createElement("dialog");
  dlg.className = "qs";
  dlg.setAttribute("aria-label", "Recherche rapide");
  dlg.innerHTML = `
    <div class="qs-head">
      ${ICON}
      <input type="search" id="qs-input" placeholder="Album, morceau, invité, sample, jeu…" autocomplete="off" spellcheck="false"
        role="combobox" aria-expanded="true" aria-controls="qs-list" aria-autocomplete="list" />
      <kbd class="qs-esc">Échap</kbd>
    </div>
    <ul class="qs-list" id="qs-list" role="listbox"></ul>
    <p class="qs-foot muted"><kbd>↑</kbd><kbd>↓</kbd> choisir · <kbd>Entrée</kbd> ouvrir · <kbd>/</kbd> ou <kbd>${isMac ? "⌘" : "Ctrl"} K</kbd> pour revenir ici</p>`;
  document.body.append(dlg);
  const input = dlg.querySelector("#qs-input");
  const list = dlg.querySelector("#qs-list");

  // ---- Index : tout ce qu'on peut chercher, une fois pour toutes
  const go = (tab, sub = "") => () => window.showTab?.(tab, sub);
  const scrollTo = (sel) => () => { window.showTab?.("disco"); requestAnimationFrame(() => document.querySelector(sel)?.scrollIntoView({ behavior: "smooth", block: "start" })); };
  const PAGES = [
    ["Discographie", "Albums, frise, recherche", go("disco")],
    ["Stats", "Ventes, certifications, streams Spotify", scrollTo("#stats-title")],
    ["Plus fortes hausses", "Morceaux qui ont gagné le plus de streams", scrollTo("#gains-panel")],
    ["Comparer", "Deux albums côte à côte", go("comparer")],
    ["Samples", "Les morceaux d'origine qu'il a samplés", go("samples")],
    ["Invités", "Graphe et classement des featurings", go("invites")],
    ["Mon classement", "Tier list des albums et des morceaux", go("classement")],
    ["Défi du jour", "5 morceaux, les mêmes pour tout le monde", go("defi")],
    ["Blind test", "Jeu · trouve le morceau à l'oreille", go("jeux", "blind-test")],
    ["Pochette floue", "Jeu · devine l'album pixelisé", go("jeux", "pochette")],
    ["Devine l'année", "Jeu · place le morceau sur la frise", go("jeux", "annee")],
    ["Plus ou moins", "Jeu · lequel a le plus de streams ?", go("jeux", "plus-ou-moins")],
    ["Qui est l'invité ?", "Jeu · trouve le featuring", go("jeux", "invite")],
    ["Ma progression", "Records, série du défi, badges", go("jeux", "progression")],
  ].map(([titre, sub, run]) => ({ kind: "page", titre, sub, run, key: norm(titre + " " + sub) }));

  const openSong = (id, titre) => () => {
    editionChoice[id] = editionOf(id, titre);
    openAlbum(id);
    requestAnimationFrame(() => focusTrack(titre));
  };
  const ALBUMS = albums.map((a) => ({
    kind: "album", a, titre: a.titre, sub: `${a.avec ? "avec " + a.avec + " · " : ""}${a.date.slice(0, 4)} · album`,
    run: () => openAlbum(a.id), key: norm(`${a.titre} ${a.avec || ""} ${a.date.slice(0, 4)}`),
  }));
  const TRACKS = albums.flatMap((a) =>
    allTracks(a.id).map((t) => ({
      kind: "track", a, titre: t.titre, sub: `${a.titre} · ${a.date.slice(0, 4)}${t.feats.length ? ` · feat. ${t.feats.join(", ")}` : ""}`,
      run: openSong(a.id, t.titre), key: norm(t.titre),
    }))
  );
  const guestCount = new Map();
  for (const a of albums) for (const t of allTracks(a.id)) for (const f of t.feats) guestCount.set(f, (guestCount.get(f) || 0) + 1);
  const GUESTS = [...guestCount].map(([name, n]) => ({
    kind: "guest", titre: name, sub: `invité · ${n} morceau${n > 1 ? "x" : ""} avec Ye`, n,
    run: () => { window.showTab?.("invites"); window.selectGuest?.(name); }, key: norm(name),
  }));
  const SAMPLES = (window.SAMPLES || []).map((s) => ({
    kind: "sample", a: albums.find((a) => a.id === s.album), titre: `${s.titre} ← ${s.sample.titre}`,
    sub: `sample · ${s.sample.artiste}${s.sample.annee ? " · " + s.sample.annee : ""}`,
    run: () => {
      window.showTab?.("samples");
      const box = document.getElementById("sm-search");
      if (box) {
        box.value = s.titre;
        box.dispatchEvent(new Event("input", { bubbles: true }));
      }
    },
    key: norm(`${s.titre} ${s.sample.titre} ${s.sample.artiste}`),
  }));

  // 0 = identique, 1 = commence par, 2 = un mot commence par, 3 = contient, 4 = tous les mots présents
  function rank(key, q, words) {
    if (key === q) return 0;
    if (key.startsWith(q)) return 1;
    if (key.includes(" " + q) || key.includes("(" + q)) return 2;
    if (key.includes(q)) return 3;
    if (words.length > 1 && words.every((w) => key.includes(w))) return 4;
    return -1;
  }
  const GROUPS = [
    ["Sections et jeux", PAGES, 4],
    ["Albums", ALBUMS, 5],
    ["Morceaux", TRACKS, 8],
    ["Invités", GUESTS, 5],
    ["Samples", SAMPLES, 5],
  ];

  let results = [];
  let active = 0;

  function search(raw) {
    const q = norm(raw.trim()).replace(/\s+/g, " ");
    if (!q) return PAGES.map((r) => ({ ...r, group: "Aller à" }));
    const words = q.split(" ");
    return GROUPS.flatMap(([group, items, max]) =>
      items
        .map((r) => ({ r, k: rank(r.key, q, words) }))
        .filter((x) => x.k >= 0)
        .sort((x, y) => x.k - y.k || (y.r.n || 0) - (x.r.n || 0) || x.r.titre.localeCompare(y.r.titre))
        .slice(0, max)
        .map((x) => ({ ...x.r, group }))
    );
  }

  const thumb = (r) =>
    r.a
      ? `<span class="hit-cov qs-cov" style="background:${gradient(r.a.palette)}">${covers[r.a.id] ? `<img src="${covers[r.a.id].img}" alt="">` : initials(r.a.titre)}</span>`
      : `<span class="qs-cov qs-ico">${{ page: "→", guest: "★" }[r.kind] || "•"}</span>`;

  function render() {
    results = search(input.value);
    active = Math.min(active, Math.max(0, results.length - 1));
    if (!results.length) {
      list.innerHTML = `<li class="qs-empty muted">Rien trouvé pour « ${escapeHtml(input.value.trim())} ».</li>`;
      return input.removeAttribute("aria-activedescendant");
    }
    let last = "";
    list.innerHTML = results
      .map((r, i) => {
        const head = r.group !== last ? `<li class="qs-group" role="presentation">${(last = r.group)}</li>` : "";
        return `${head}<li class="qs-item${i === active ? " active" : ""}" id="qs-${i}" role="option" aria-selected="${i === active}" data-i="${i}">
          ${thumb(r)}<span class="qs-main"><b>${escapeHtml(r.titre)}</b><span>${escapeHtml(r.sub)}</span></span></li>`;
      })
      .join("");
    input.setAttribute("aria-activedescendant", `qs-${active}`);
  }

  function move(d) {
    if (!results.length) return;
    active = (active + d + results.length) % results.length;
    list.querySelectorAll(".qs-item").forEach((li) => {
      const on = +li.dataset.i === active;
      li.classList.toggle("active", on);
      li.setAttribute("aria-selected", on);
      if (on) li.scrollIntoView({ block: "nearest" });
    });
    input.setAttribute("aria-activedescendant", `qs-${active}`);
  }

  function choose(i) {
    const r = results[i];
    if (!r) return;
    dlg.close();
    const album = document.getElementById("modal");
    if (r.kind !== "album" && r.kind !== "track" && album.open) album.close();
    r.run();
  }

  function open() {
    if (dlg.open) return input.select();
    input.value = "";
    active = 0;
    render();
    dlg.showModal();
    input.focus();
  }

  btn.addEventListener("click", open);
  input.addEventListener("input", () => {
    active = 0;
    render();
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") { e.preventDefault(); choose(active); }
    else if (e.key === "Escape") { e.preventDefault(); dlg.close(); } // sinon Échap vide seulement le champ
  });
  list.addEventListener("click", (e) => {
    const li = e.target.closest(".qs-item");
    if (li) choose(+li.dataset.i);
  });
  list.addEventListener("mousemove", (e) => {
    const li = e.target.closest(".qs-item");
    if (li && +li.dataset.i !== active) move(+li.dataset.i - active);
  });
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // clic sur le fond

  // Raccourcis : / (hors champ de saisie) ou Ctrl / ⌘ + K (partout)
  document.addEventListener("keydown", (e) => {
    const typing = e.target.closest?.("input, textarea, select, [contenteditable]");
    if ((e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      open();
    } else if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      open();
    }
  });
})();
