// ---------- État ----------
const albums = [...window.ALBUMS].sort((a, b) => a.date.localeCompare(b.date));
const state = { type: "all", query: "", sort: "date-asc" };
let visible = [];   // albums affichés (après filtre + tri)
let current = -1;   // index dans `visible` de l'album ouvert dans la modale
const covers = {};  // id → { img, url } une fois la pochette chargée

// "Titre | Invités | 3:21" → { titre, feats: [...], duree }
const tracks = {};
for (const [id, lines] of Object.entries(window.TRACKLISTS || {})) {
  tracks[id] = lines.map((l) => {
    const [titre, feats = "", duree = ""] = l.split("|").map((x) => x.trim());
    return { titre, feats: feats ? feats.split(/,\s*/) : [], duree };
  });
}

// ---------- Utilitaires ----------
const $ = (sel) => document.querySelector(sel);

const fmtDate = (iso) =>
  new Date(iso + "T12:00:00").toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });

const year = (iso) => iso.slice(0, 4);

const initials = (titre) =>
  titre
    .replace(/[^A-Za-z0-9&' ]/g, "")
    .split(/\s+/)
    .filter((w) => w && !["the", "of", "is", "&"].includes(w.toLowerCase()))
    .map((w) => w[0])
    .join("")
    .slice(0, 3)
    .toUpperCase() || titre.slice(0, 2).toUpperCase();

const gradient = ([a, b]) => `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const toSec = (d) => (d ? d.split(":").reduce((m, x) => m * 60 + +x, 0) : NaN);
const fmtDuree = (sec) => {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h} h ${String(m).padStart(2, "0")} min` : `${m} min ${String(s).padStart(2, "0")} s`;
};

// Streams Spotify par morceau : { titre, streams } du morceau le plus écouté d'un album
const TS = window.TRACK_STREAMS || {};
const trackStreams = (id, titre) => TS[id]?.[titre] ?? null;
const topTrack = (id) => {
  const m = TS[id];
  if (!m) return null;
  const [titre, streams] = Object.entries(m).sort((x, y) => y[1] - x[1])[0] || [];
  return titre ? { titre, streams } : null;
};
const albumStreams = (id) => (window.STATS?.albums?.[id]?.spotify ?? -1);

const peak = (a) => (a.billboard ? `n° ${a.billboard}` : "Non classé");

// ---------- Statistiques ----------
function renderStats() {
  const solos = albums.filter((a) => a.type === "solo").length;
  const numberOnes = albums.filter((a) => a.billboard === 1).length;
  const grammys = albums.filter((a) => a.grammyAlbum).length;

  $("#stats").innerHTML = [
    [albums.length, "albums studio"],
    [solos, "albums solo"],
    [numberOnes, "n° 1 au Billboard 200"],
    [grammys, "Grammys du meilleur album"],
    [`${year(albums[0].date)}\u00a0–\u00a0auj.`, "carrière de rappeur"],
  ]
    .map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`)
    .join("");
}

// ---------- Frise chronologique ----------
function renderTimeline() {
  const start = new Date(albums[0].date).getTime();
  const end = new Date(albums.at(-1).date).getTime();
  const pos = (iso) => 2 + ((new Date(iso).getTime() - start) / (end - start)) * 96; // % (marges 2 %)

  let html = "";
  for (let y = +year(albums[0].date); y <= +year(albums.at(-1).date); y += 2) {
    const p = pos(`${y}-01-01`);
    if (p >= 0 && p <= 100) html += `<span class="tl-year" style="left:${p}%">${y}</span>`;
  }

  let prevPos = -10;
  let stack = 0;
  for (const a of albums) {
    const p = pos(a.date);
    stack = p - prevPos < 1.5 ? stack + 1 : 0; // albums très proches (ex. juin 2018) : on décale
    prevPos = p;
    html += `<button class="tl-dot" data-id="${a.id}" title="${escapeHtml(a.titre)} (${year(a.date)})"
      style="left:${p}%; top:${26 + stack * 22}px; background:${gradient(a.palette)}"></button>`;
  }
  $("#timeline").innerHTML = html;
}

// ---------- Filtre + tri ----------
function matches(a) {
  if (state.type !== "all" && a.type !== state.type) return false;
  if (!state.query) return true;
  const t = tracks[a.id] || [];
  const hay = [a.titre, a.avec, a.label, a.ere, year(a.date), ...a.titresCles,
    ...t.map((x) => x.titre), ...t.flatMap((x) => x.feats)].join(" ").toLowerCase();
  return hay.includes(state.query);
}

const sorters = {
  "date-asc": (a, b) => a.date.localeCompare(b.date),
  "date-desc": (a, b) => b.date.localeCompare(a.date),
  billboard: (a, b) => (a.billboard ?? 999) - (b.billboard ?? 999) || a.date.localeCompare(b.date),
  pistes: (a, b) => (b.pistes ?? -1) - (a.pistes ?? -1),
  streams: (a, b) => albumStreams(b.id) - albumStreams(a.id),
};

// ---------- Grille ----------
function renderGrid() {
  visible = albums.filter(matches).sort(sorters[state.sort]);
  $("#count").textContent = `${visible.length} album${visible.length > 1 ? "s" : ""}`;

  if (!visible.length) {
    $("#grid").innerHTML = `<p class="empty">Aucun album ne correspond à ta recherche.</p>`;
  } else {
    $("#grid").innerHTML = visible
      .map(
        (a) => `
      <button class="card" data-id="${a.id}">
        <div class="cover${covers[a.id] ? " has-img" : ""}" style="background:${gradient(a.palette)}">
          ${covers[a.id] ? `<img src="${covers[a.id].img}" alt="Pochette de ${escapeHtml(a.titre)}" loading="lazy">` : ""}
          <span class="badge">${a.type === "collab" ? "Collab" : "Solo"} · ${escapeHtml(a.ere)}</span>
          <span class="cover-letters">${initials(a.titre)}</span>
          <span class="cover-year">${year(a.date)}</span>
        </div>
        <div class="card-body">
          <p class="album-title">${escapeHtml(a.titre)}</p>
          <p class="card-meta">${a.avec ? "avec " + escapeHtml(a.avec) + " · " : ""}${peak(a)}${
            albumStreams(a.id) > 0 ? ` · ${fmtStreams(albumStreams(a.id))} streams` : ""
          }</p>
          ${(() => {
            const t = topTrack(a.id);
            return t ? `<p class="card-top" title="Morceau le plus écouté sur Spotify">▶ ${escapeHtml(t.titre)} <span>${fmtStreams(t.streams)}</span></p>` : "";
          })()}
        </div>
      </button>`
      )
      .join("");
  }

  // Estompe les points de la frise qui ne correspondent pas au filtre
  const ids = new Set(visible.map((a) => a.id));
  document.querySelectorAll(".tl-dot").forEach((d) => d.classList.toggle("dim", !ids.has(d.dataset.id)));
}

// ---------- Section Stats ----------
const S = window.STATS || { albums: {}, singles: [] };
const fmtNb = (n) => n.toLocaleString("fr-BE");
const fmtK = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace(".", ",")} M` : `${Math.round(n / 1000)} k`);
// "6× Platine" → 6, "Platine" → 1, "Or" → 0.5, "Diamant" → 10, aucune → 0 (pour trier)
const certVal = (c) => (!c ? 0 : /diamant/i.test(c) ? 10 : /or$/i.test(c) ? 0.5 : parseFloat(c) || 1);
const certBadge = (c) =>
  c ? `<span class="cert ${/^or$/i.test(c) ? "gold" : "plat"}">${escapeHtml(c)}</span>` : `<span class="muted">—</span>`;

const statsState = { key: "date", dir: 1 };

function renderStatsSection() {
  renderSpotify();
  renderFirstWeek();
  renderStatsTable();
  renderSingles();
}

// "9 702 556 720" → "9,70 Md" ; "708 890 822" → "709 M"
const fmtStreams = (n) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(2).replace(".", ",")} Md` : `${Math.round(n / 1e6)} M`;

// Spotify : total + top morceaux
function renderSpotify() {
  const sp = S.spotify;
  if (!sp) return;
  const date = fmtDate(sp.date);
  $("#sp-date").textContent = date;
  $("#sp-total").innerHTML = `
    <b>${(sp.total / 1e9).toFixed(1).replace(".", ",")} milliards</b>
    <span>de streams sur Spotify, tous morceaux confondus (y compris en invité)</span>`;
  const max = sp.morceaux[0].streams;
  $("#sp-songs").innerHTML = sp.morceaux
    .map((m, i) => {
      const alb = m.album && albums.find((a) => a.id === m.album);
      const meta = m.invite
        ? `invité sur un titre de ${escapeHtml(m.avec)}`
        : (m.avec ? "avec " + escapeHtml(m.avec) + " · " : "") + (alb ? escapeHtml(alb.titre) : "hors album");
      return `
      <li ${alb ? `data-id="${alb.id}" tabindex="0" class="clickable"` : ""}>
        <span class="sp-rank">${i + 1}</span>
        <span class="sp-main">
          <span class="sp-title">${escapeHtml(m.titre)}${m.invite ? ' <span class="tag">invité</span>' : ""}</span>
          <span class="sp-meta">${meta}</span>
          <span class="sp-bar" style="width:${(m.streams / max) * 100}%"></span>
        </span>
        <span class="sp-val">${fmtStreams(m.streams)}</span>
      </li>`;
    })
    .join("");
}

// Ventes de la 1re semaine : barres horizontales, ordre chronologique
function renderFirstWeek() {
  const rows = albums.filter((a) => S.albums[a.id]?.premiereSemaine);
  const max = Math.max(...rows.map((a) => S.albums[a.id].premiereSemaine));
  const record = rows.reduce((b, a) => (S.albums[a.id].premiereSemaine > S.albums[b.id].premiereSemaine ? a : b));

  $("#fw-chart").innerHTML = rows
    .map((a) => {
      const v = S.albums[a.id].premiereSemaine;
      const streaming = +year(a.date) >= 2015;
      return `
      <button class="fw-row" data-id="${a.id}" aria-label="${escapeHtml(a.titre)} : ${fmtNb(v)} unités">
        <span class="fw-name">${escapeHtml(a.titre)} <span class="fw-year">${year(a.date)}</span></span>
        <span class="fw-track">
          <span class="fw-bar${streaming ? " streaming" : ""}${a.id === record.id ? " record" : ""}" style="width:${(v / max) * 100}%"></span>
          <span class="fw-val">${fmtK(v)}</span>
        </span>
        <span class="tip">${escapeHtml(a.titre)} · ${fmtNb(v)} unités${streaming ? " (streaming compris)" : " (ventes)"}</span>
      </button>`;
    })
    .join("");
}

// Tableau triable
function renderStatsTable() {
  const get = {
    titre: (a) => a.titre.toLowerCase(),
    date: (a) => a.date,
    billboard: (a) => a.billboard ?? 999,
    fw: (a) => S.albums[a.id]?.premiereSemaine ?? -1,
    riaa: (a) => certVal(S.albums[a.id]?.riaa),
    spotify: (a) => S.albums[a.id]?.spotify ?? -1,
  };
  const { key, dir } = statsState;
  const rows = [...albums].sort((a, b) => {
    const x = get[key](a), y = get[key](b);
    return (x < y ? -1 : x > y ? 1 : 0) * dir || a.date.localeCompare(b.date);
  });

  const cols = [
    ["titre", "Album"],
    ["date", "Année"],
    ["billboard", "Billboard 200"],
    ["fw", "1re semaine"],
    ["riaa", "Certification RIAA"],
    ["spotify", "Streams Spotify"],
  ];
  $("#stats-table").innerHTML = `
    <thead><tr>${cols
      .map(
        ([k, l]) => `<th aria-sort="${k === key ? (dir > 0 ? "ascending" : "descending") : "none"}">
          <button data-sort="${k}">${l}<span class="arrow">${k === key ? (dir > 0 ? "↑" : "↓") : ""}</span></button></th>`
      )
      .join("")}</tr></thead>
    <tbody>${rows
      .map((a) => {
        const st = S.albums[a.id] || {};
        return `<tr data-id="${a.id}" tabindex="0">
          <td class="t-album">${covers[a.id] ? `<img src="${covers[a.id].img}" alt="">` : `<span class="t-dot" style="background:${gradient(a.palette)}"></span>`}${escapeHtml(a.titre)}</td>
          <td class="num">${year(a.date)}</td>
          <td class="num">${a.billboard ? "n° " + a.billboard : "—"}</td>
          <td class="num">${st.premiereSemaine ? fmtNb(st.premiereSemaine) : "—"}</td>
          <td>${certBadge(st.riaa)}</td>
          <td class="num">${st.spotify ? fmtStreams(st.spotify) : "—"}</td>
        </tr>`;
      })
      .join("")}</tbody>`;
}

// Singles du top 10
function renderSingles() {
  $("#singles").innerHTML = [...S.singles]
    .sort((a, b) => a.hot100 - b.hot100 || a.annee - b.annee)
    .map(
      (s) => `
      <li ${s.album ? `data-id="${s.album}" tabindex="0" class="clickable"` : ""}>
        <span class="peak${s.hot100 === 1 ? " one" : ""}">#${s.hot100}</span>
        <span class="s-main">
          <span class="s-title">${escapeHtml(s.titre)}</span>
          <span class="s-meta">${s.avec ? "feat. " + escapeHtml(s.avec) + " · " : ""}${s.annee}${
            s.album ? " · " + escapeHtml(albums.find((a) => a.id === s.album)?.titre || "") : " · hors album"
          }</span>
        </span>
        ${certBadge(s.riaa)}
      </li>`
    )
    .join("");
}

// ---------- Modale ----------
function openAlbum(id) {
  // Si l'album est masqué par le filtre, on navigue dans la liste complète
  let list = visible.some((a) => a.id === id) ? visible : albums;
  visible = list;
  current = list.findIndex((a) => a.id === id);
  renderModal();
  if (!$("#modal").open) $("#modal").showModal();
}

function renderModal() {
  const a = visible[current];
  const facts = [
    ["Sortie", fmtDate(a.date)],
    ["Label", a.label],
    ["Titres", a.pistes ?? "Variable"],
    ["Billboard 200", peak(a)],
  ];

  $("#modal-body").innerHTML = `
    <div class="modal-hero" style="background:${gradient(a.palette)}">
      ${covers[a.id] ? `<img class="modal-cover" src="${covers[a.id].img}" alt="Pochette de ${escapeHtml(a.titre)}">` : ""}
      <div>
        <h2>${escapeHtml(a.titre)}</h2>
        <p>${a.avec ? "Kanye West & " + escapeHtml(a.avec) : "Kanye West"} · ère « ${escapeHtml(a.ere)} »</p>
      </div>
    </div>
    <div class="modal-content">
      <div class="facts">
        ${facts.map(([k, v]) => `<div class="fact"><span>${k}</span><b>${escapeHtml(v)}</b></div>`).join("")}
      </div>
      <p>${escapeHtml(a.resume)}</p>
      <h3>Titres clés</h3>
      <ul class="tags">${a.titresCles.map((t) => `<li>${escapeHtml(t)}</li>`).join("")}</ul>
      ${
        a.distinctions.length
          ? `<h3>Distinctions</h3><ul class="tags">${a.distinctions.map((d) => `<li>🏆 ${escapeHtml(d)}</li>`).join("")}</ul>`
          : ""
      }
      ${renderTracklist(a)}
      ${renderListen(a)}
    </div>`;

  $("#prev").disabled = current === 0;
  $("#next").disabled = current === visible.length - 1;
  $("#modal").scrollTop = 0;
}

// Liens d'écoute : lien direct si fourni dans `liens` (ou trouvé par l'API pour Apple), sinon une recherche
function renderListen(a) {
  const q = encodeURIComponent(`${a.avec && !a.avec.includes("¥$") ? a.avec.split(" (")[0] + " " : ""}Kanye West ${a.titre}`);
  const liens = a.liens || {};
  const plateformes = [
    ["Spotify", liens.spotify || `https://open.spotify.com/search/${q}`],
    ["Apple Music", liens.apple || covers[a.id]?.url || `https://music.apple.com/search?term=${q}`],
    ["Deezer", liens.deezer || `https://www.deezer.com/search/${q}/album`],
    ["YouTube Music", liens.youtube || `https://music.youtube.com/search?q=${q}`],
  ];
  const note = a.id === "donda-2" ? `<p class="tr-note">ⓘ La version Stem Player n'est pas sur les plateformes ; les liens mènent à une recherche.</p>` : "";
  return `
    <h3>Écouter</h3>
    <div class="listen">
      ${plateformes.map(([nom, url]) => `<a href="${url}" target="_blank" rel="noopener">${nom} ↗</a>`).join("")}
    </div>${note}`;
}

function renderTracklist(a) {
  const t = tracks[a.id];
  if (!t) return "";
  const secs = t.map((x) => toSec(x.duree));
  const total = secs.every((x) => !isNaN(x)) ? ` · ${fmtDuree(secs.reduce((s, x) => s + x, 0))}` : "";
  const nbFeats = new Set(t.flatMap((x) => x.feats)).size;
  const note = (window.TRACKLIST_NOTES || {})[a.id];
  const st = t.map((x) => trackStreams(a.id, x.titre));
  const maxSt = Math.max(0, ...st.filter(Boolean));
  const hasSt = maxSt > 0;

  return `
    <h3>Tracklist <span class="h3-meta">${t.length} titres${total}${nbFeats ? ` · ${nbFeats} invités` : ""}</span></h3>
    <ol class="tracklist">
      ${t
        .map(
          (x, i) => `
        <li>
          <span class="tr-num">${i + 1}</span>
          <span class="tr-title">${escapeHtml(x.titre)}${
            x.feats.length
              ? `<span class="tr-feat">feat. ${x.feats
                  .map((f) => `<button class="feat" data-feat="${escapeHtml(f)}">${escapeHtml(f)}</button>`)
                  .join(", ")}</span>`
              : ""
          }${
            hasSt && st[i]
              ? `<span class="tr-streams"><span class="tr-strack"><span class="tr-sbar" style="width:${(st[i] / maxSt) * 100}%"></span></span>${fmtStreams(st[i])}${
                  st[i] === maxSt ? ' <span class="tag top">le plus écouté</span>' : ""
                }</span>`
              : ""
          }</span>
          <span class="tr-dur">${x.duree || ""}</span>
        </li>`
        )
        .join("")}
    </ol>
    ${hasSt ? `<p class="tr-note">Streams Spotify au ${fmtDate((window.STATS?.spotify?.date) || "2026-10-24")} (kworb.net).</p>` : ""}
    ${note ? `<p class="tr-note">ⓘ ${escapeHtml(note)}</p>` : ""}`;
}

function step(delta) {
  const n = current + delta;
  if (n < 0 || n >= visible.length) return;
  current = n;
  renderModal();
}

// ---------- Événements ----------
function bindEvents() {
  $("#search").addEventListener("input", (e) => {
    state.query = e.target.value.trim().toLowerCase();
    renderGrid();
  });

  document.querySelectorAll(".chip").forEach((chip) =>
    chip.addEventListener("click", () => {
      document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      state.type = chip.dataset.type;
      renderGrid();
    })
  );

  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    renderGrid();
  });

  // Clic sur un invité : ferme la fiche et cherche tous ses albums
  $("#modal").addEventListener("click", (e) => {
    const f = e.target.closest(".feat");
    if (!f) return;
    $("#search").value = f.dataset.feat;
    state.query = f.dataset.feat.toLowerCase();
    $("#modal").close();
    window.showTab?.("disco"); // la fiche peut avoir été ouverte depuis un jeu
    document.querySelector(".controls").scrollIntoView({ behavior: "smooth" });
  });

  // Un seul écouteur pour la grille, la frise et le graphique
  document.addEventListener("click", (e) => {
    const sortBtn = e.target.closest("[data-sort]");
    if (sortBtn) {
      const k = sortBtn.dataset.sort;
      statsState.dir = statsState.key === k ? -statsState.dir : (k === "titre" || k === "date" || k === "billboard" ? 1 : -1);
      statsState.key = k;
      return renderStatsTable();
    }
    const el = e.target.closest(".card, .tl-dot, .fw-row, #stats-table tr[data-id], #singles li[data-id], #sp-songs li[data-id]");
    if (el) openAlbum(el.dataset.id);
  });

  $("#close").addEventListener("click", () => $("#modal").close());
  $("#prev").addEventListener("click", () => step(-1));
  $("#next").addEventListener("click", () => step(1));

  // Clic sur le fond = fermer
  $("#modal").addEventListener("click", (e) => {
    if (e.target === $("#modal")) $("#modal").close();
  });

  // Quand on ferme, on remet la liste filtrée
  $("#modal").addEventListener("close", renderGrid);

  document.addEventListener("keydown", (e) => {
    const row = e.target.closest?.("#stats-table tr[data-id], #singles li[data-id], #sp-songs li[data-id]");
    if (row && e.key === "Enter") return openAlbum(row.dataset.id);
    if (!$("#modal").open) return;
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
}

// ---------- Init ----------
renderStats();
renderTimeline();
renderGrid();
renderStatsSection();
bindEvents();

if (window.Covers) {
  Covers.loadAll(albums, (id, data) => {
    covers[id] = data;
    const card = document.querySelector(`.card[data-id="${id}"] .cover`);
    if (card && !card.classList.contains("has-img")) {
      const img = new Image();
      img.alt = "Pochette";
      img.onload = () => card.classList.add("has-img");
      img.src = data.img;
      card.prepend(img);
    }
    if ($("#modal").open && visible[current]?.id === id) renderModal();
    clearTimeout(window.__tblTimer);
    window.__tblTimer = setTimeout(renderStatsTable, 300);
    document.dispatchEvent(new CustomEvent("cover-loaded", { detail: id }));
  });
}