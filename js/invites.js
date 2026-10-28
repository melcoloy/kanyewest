// ---------- Graphe des invités ----------
// Ye au centre, chaque invité crédité (data/tracklists.js) autour. Plus un artiste apparaît
// souvent, plus il est près du centre et gros ; sur chaque cercle, l'ordre suit la chronologie
// (première collaboration). Un trait relie deux invités crédités sur le même morceau.
// Clic sur un artiste (ou dans la liste) : ses morceaux avec Ye.
// S'appuie sur app.js (albums, tracks, covers, gradient, escapeHtml, openAlbum).

(() => {
  const root = document.getElementById("invites");
  if (!root) return;

  // ---- Données : invité → morceaux ; paires d'invités sur un même morceau
  const guests = new Map();
  const pairs = new Map();
  for (const a of albums) {
    // Édition standard + titres nouveaux ou modifiés des éditions deluxe (ex. Lauryn Hill sur Bully deluxe)
    const extra = (editions[a.id] || []).flatMap((e) =>
      e.tracks.filter((t) => e.nouveaux.includes(t.titre) || e.modifies[t.titre]).map((t) => ({ ...t, titre: e.modifies[t.titre] ? `${t.titre} (${e.nom.toLowerCase()})` : t.titre }))
    );
    for (const t of [...(tracks[a.id] || []), ...extra]) {
      for (const f of t.feats) {
        if (!guests.has(f)) guests.set(f, { name: f, songs: [], first: a.date });
        guests.get(f).songs.push({ titre: t.titre, albumId: a.id });
      }
      for (let i = 0; i < t.feats.length; i++)
        for (let j = i + 1; j < t.feats.length; j++) {
          const k = [t.feats[i], t.feats[j]].sort().join("\u0000");
          pairs.set(k, (pairs.get(k) || 0) + 1);
        }
    }
  }
  if (!guests.size) return;
  const all = [...guests.values()].map((g) => ({ ...g, n: g.songs.length }));
  const byName = Object.fromEntries(all.map((g) => [g.name, g]));

  const state = { min: 2, selected: null, query: "" };
  const W = 1000, C = W / 2;
  // Cercles : plus de collaborations = plus près du centre
  const ringOf = (n) => (n >= 4 ? 0 : n === 3 ? 1 : n === 2 ? 2 : 3);
  const RADII = [170, 285, 385, 470];

  function layout() {
    const nodes = all.filter((g) => g.n >= state.min);
    const rings = [[], [], [], []];
    for (const g of nodes) rings[ringOf(g.n)].push(g);
    for (const [r, list] of rings.entries()) {
      list.sort((x, y) => x.first.localeCompare(y.first) || y.n - x.n);
      const off = r * 0.35; // décale chaque cercle pour éviter les alignements
      list.forEach((g, i) => {
        g.angle = -Math.PI / 2 + off + (i / list.length) * Math.PI * 2;
        g.x = C + RADII[r] * Math.cos(g.angle);
        g.y = C + RADII[r] * Math.sin(g.angle);
        g.r = 5 + Math.sqrt(g.n) * 4;
      });
    }
    return nodes;
  }

  function render() {
    const nodes = layout();
    const shown = new Set(nodes.map((g) => g.name));
    const sel = state.selected && shown.has(state.selected) ? byName[state.selected] : null;
    const linked = new Set();
    const pairEdges = [];
    for (const [k, w] of pairs) {
      const [p, q] = k.split("\u0000");
      if (!shown.has(p) || !shown.has(q)) continue;
      pairEdges.push({ p: byName[p], q: byName[q], w });
      if (sel && (p === sel.name || q === sel.name)) linked.add(p === sel.name ? q : p);
    }
    const q = state.query;
    const match = (g) => q && g.name.toLowerCase().includes(q);

    const svg = `
      <svg class="gv-svg${sel ? " has-sel" : ""}" viewBox="-130 -10 ${W + 260} ${W + 20}" role="img" aria-label="Graphe des invités de Ye">
        ${RADII.slice(0, state.min === 1 ? 4 : 3).map((r) => `<circle class="gv-ring" cx="${C}" cy="${C}" r="${r}"/>`).join("")}
        ${nodes.map((g) => `<line class="gv-spoke${sel === g ? " on" : ""}" x1="${C}" y1="${C}" x2="${g.x.toFixed(1)}" y2="${g.y.toFixed(1)}"/>`).join("")}
        ${pairEdges
          .map(({ p, q: o, w }) => {
            const on = sel && (p === sel || o === sel);
            // Courbe tirée vers le centre, pour ne pas couper le graphe en ligne droite
            const mx = (p.x + o.x) / 2, my = (p.y + o.y) / 2;
            const cx = mx + (C - mx) * 0.35, cy = my + (C - my) * 0.35;
            return `<path class="gv-pair${on ? " on" : ""}" style="stroke-width:${1 + w}" d="M${p.x.toFixed(1)},${p.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${o.x.toFixed(1)},${o.y.toFixed(1)}"/>`;
          })
          .join("")}
        <circle class="gv-ye" cx="${C}" cy="${C}" r="46"/>
        <text class="gv-ye-label" x="${C}" y="${C + 9}" text-anchor="middle">YE</text>
        ${nodes
          .map((g) => {
            const right = Math.cos(g.angle) >= 0;
            const lx = g.x + Math.cos(g.angle) * (g.r + 6), ly = g.y + Math.sin(g.angle) * (g.r + 6) + 4;
            const cls = ["gv-node", sel === g ? "sel" : "", linked.has(g.name) ? "linked" : "", match(g) ? "match" : "", `n${Math.min(g.n, 4)}`].join(" ");
            return `<g class="${cls}" data-guest="${escapeHtml(g.name)}" tabindex="0" role="button" aria-label="${escapeHtml(g.name)}, ${g.n} morceau${g.n > 1 ? "x" : ""}">
              <circle cx="${g.x.toFixed(1)}" cy="${g.y.toFixed(1)}" r="${g.r.toFixed(1)}"/>
              <text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${right ? "start" : "end"}">${escapeHtml(g.name)}</text>
            </g>`;
          })
          .join("")}
      </svg>`;

    const top = [...nodes].sort((x, y) => y.n - x.n || x.first.localeCompare(y.first));
    const side = sel
      ? `<div class="gv-detail">
          <button class="bt-link" data-act="back">← Tous les invités</button>
          <h3>${escapeHtml(sel.name)}</h3>
          <p class="muted">${sel.n} morceau${sel.n > 1 ? "x" : ""} avec Ye · première fois en ${sel.first.slice(0, 4)}${linked.size ? ` · aux côtés de ${[...linked].map(escapeHtml).join(", ")}` : ""}</p>
          <ol class="bt-recap">${sel.songs
            .map((s) => {
              const a = albums.find((x) => x.id === s.albumId);
              return `<li data-album="${a.id}" tabindex="0">
                <span class="bt-rcov sm" style="background:${gradient(a.palette)}">${covers[a.id]?.img ? `<img src="${covers[a.id].img}" alt="">` : ""}</span>
                <span class="bt-rmain"><b>${escapeHtml(s.titre)}</b><span class="muted">${escapeHtml(a.titre)} · ${a.date.slice(0, 4)}</span></span>
              </li>`;
            })
            .join("")}</ol>
        </div>`
      : `<ol class="gv-list">${top
          .map((g, i) => `<li data-guest="${escapeHtml(g.name)}" tabindex="0"${match(g) ? ' class="match"' : ""}><span class="gv-rank">${i + 1}</span><span>${escapeHtml(g.name)}</span><b>${g.n}</b></li>`)
          .join("")}</ol>`;

    root.innerHTML = `
      <div class="gv-controls">
        <input type="search" id="gv-search" placeholder="Chercher un artiste…" value="${escapeHtml(q)}" aria-label="Chercher un invité" />
        <select id="gv-min" aria-label="Filtrer">
          <option value="2"${state.min === 2 ? " selected" : ""}>Invités sur au moins 2 morceaux</option>
          <option value="1"${state.min === 1 ? " selected" : ""}>Tous les invités (${all.length})</option>
        </select>
        <span class="muted gv-count">${nodes.length} artistes · ${pairEdges.length} duos sur un même morceau</span>
      </div>
      <div class="gv-layout">
        <div class="gv-graph">${svg}</div>
        <aside class="gv-side">${side}</aside>
      </div>`;

    const search = root.querySelector("#gv-search");
    search.addEventListener("input", () => {
      state.query = search.value.trim().toLowerCase();
      const pos = search.selectionStart;
      render();
      const s2 = root.querySelector("#gv-search");
      s2.focus();
      s2.setSelectionRange(pos, pos);
    });
    search.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const hit = all.find((g) => g.n >= state.min && g.name.toLowerCase().includes(state.query));
      if (hit) select(hit.name);
    });
    root.querySelector("#gv-min").addEventListener("change", (e) => {
      state.min = +e.target.value;
      render();
    });
  }

  function select(name) {
    state.selected = state.selected === name ? null : name;
    if (state.selected && byName[name].n < state.min) state.min = 1;
    render();
  }

  root.addEventListener("click", (e) => {
    const g = e.target.closest("[data-guest]");
    if (g) return select(g.dataset.guest);
    const alb = e.target.closest("[data-album]");
    if (alb) return openAlbum(alb.dataset.album);
    if (e.target.closest('[data-act="back"]')) {
      state.selected = null;
      render();
    }
  });
  root.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const g = e.target.closest("[data-guest]");
    if (g) select(g.dataset.guest);
    const alb = e.target.closest("[data-album]");
    if (alb) openAlbum(alb.dataset.album);
  });
  render();
})();
