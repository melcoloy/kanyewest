// ---------- Comparateur d'albums ----------
// Deux albums côte à côte ; sur chaque ligne chiffrée, le meilleur est mis en valeur.
// S'appuie sur app.js (albums, tracks, covers, S, gradient, escapeHtml, fmtDate, fmtNb,
// fmtStreams, fmtDuree, toSec, topTrack, certVal, certBadge, openAlbum).

(() => {
  const root = document.getElementById("comparer");
  if (!root) return;
  const KEY = "ye-comparer";
  const byId = Object.fromEntries(albums.map((a) => [a.id, a]));
  let pair = ["graduation", "mbdtf"];
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.length === 2 && saved.every((id) => byId[id])) pair = saved;
  } catch {}

  const TIER_ORDER = ["S", "A", "B", "C", "D"];
  const myTier = (id) => {
    try {
      const st = JSON.parse(localStorage.getItem("ye-classement")) || {};
      return TIER_ORDER.find((t) => (st[t] || []).includes(id)) || null;
    } catch { return null; }
  };
  const duration = (id) => {
    const secs = (tracks[id] || []).map((t) => toSec(t.duree));
    return secs.length && secs.every((x) => !isNaN(x)) ? secs.reduce((s, x) => s + x, 0) : null;
  };
  const guests = (id) => new Set((tracks[id] || []).flatMap((t) => t.feats)).size;
  const nbSamples = (id) => (window.SAMPLES || []).filter((s) => s.album === id).length;

  // [libellé, valeur (pour comparer), affichage, meilleur : "max" | "min" | null]
  const ROWS = [
    ["Sortie", (a) => a.date, (a) => fmtDate(a.date), null],
    ["Label", (a) => a.label, (a) => escapeHtml(a.label), null],
    ["Titres", (a) => a.pistes, (a) => a.pistes ?? "Variable", null],
    ["Durée", (a) => duration(a.id), (a) => (duration(a.id) ? fmtDuree(duration(a.id)) : "—"), null],
    ["Invités crédités", (a) => guests(a.id), (a) => guests(a.id), "max"],
    ["Billboard 200", (a) => a.billboard, (a) => (a.billboard ? `n° ${a.billboard}` : "Non classé"), "min"],
    ["Ventes 1re semaine", (a) => S.albums[a.id]?.premiereSemaine, (a) => (S.albums[a.id]?.premiereSemaine ? fmtNb(S.albums[a.id].premiereSemaine) : "—"), "max"],
    ["Certification RIAA", (a) => certVal(S.albums[a.id]?.riaa) || null, (a) => certBadge(S.albums[a.id]?.riaa), "max"],
    ["Streams Spotify", (a) => S.albums[a.id]?.spotify, (a) => (S.albums[a.id]?.spotify ? fmtStreams(S.albums[a.id].spotify) : "—"), "max"],
    ["Morceau le plus écouté", (a) => topTrack(a.id)?.streams, (a) => {
      const t = topTrack(a.id);
      return t ? `${escapeHtml(t.titre)} <span class="muted">${fmtStreams(t.streams)}</span>` : "—";
    }, "max"],
    ["Distinctions", (a) => a.distinctions.length, (a) => (a.distinctions.length ? a.distinctions.map((d) => `🏆 ${escapeHtml(d)}`).join("<br>") : "—"), "max"],
    ["Samples connus", (a) => nbSamples(a.id), (a) => nbSamples(a.id) || "—", null],
    ["Ton classement", (a) => (myTier(a.id) ? 5 - TIER_ORDER.indexOf(myTier(a.id)) : null), (a) => (myTier(a.id) ? `<span class="cmp-tier t${myTier(a.id)}">${myTier(a.id)}</span>` : `<span class="muted">pas classé</span>`), "max"],
  ];

  function render() {
    const [a, b] = pair.map((id) => byId[id]);
    const wins = [0, 0];
    const options = (sel) => albums.map((x) => `<option value="${x.id}"${x.id === sel ? " selected" : ""}>${escapeHtml(x.titre)} (${x.date.slice(0, 4)})</option>`).join("");
    const head = (x, i) => `
      <div class="cmp-head">
        <button class="cmp-cov" data-album="${x.id}" style="background:${gradient(x.palette)}" aria-label="Ouvrir ${escapeHtml(x.titre)}">
          ${covers[x.id]?.img ? `<img src="${covers[x.id].img}" alt="">` : `<span>${initials(x.titre)}</span>`}
        </button>
        <select class="cmp-select" data-side="${i}" aria-label="Album ${i + 1}">${options(x.id)}</select>
      </div>`;
    const rows = ROWS.map(([label, val, show, better]) => {
      const va = val(a), vb = val(b);
      let w = -1;
      if (better && va != null && vb != null && va !== vb) w = (better === "max" ? va > vb : va < vb) ? 0 : 1;
      else if (better && va != null && vb == null) w = 0;
      else if (better && vb != null && va == null) w = 1;
      if (w >= 0 && a.id !== b.id) wins[w]++;
      return `<tr>
        <td class="${w === 0 ? "win" : ""}">${show(a)}</td>
        <th scope="row">${label}</th>
        <td class="${w === 1 ? "win" : ""}">${show(b)}</td>
      </tr>`;
    }).join("");
    const verdict =
      a.id === b.id ? "Choisis deux albums différents."
        : wins[0] === wins[1] ? `Égalité : ${wins[0]} lignes partout.`
        : `<b>${escapeHtml((wins[0] > wins[1] ? a : b).titre)}</b> l'emporte sur ${Math.max(...wins)} lignes contre ${Math.min(...wins)}.`;
    root.innerHTML = `
      <div class="cmp-top">
        ${head(a, 0)}
        <button class="cmp-swap" data-act="swap" aria-label="Inverser les deux albums" title="Inverser">⇄</button>
        ${head(b, 1)}
      </div>
      <p class="cmp-verdict">${verdict}</p>
      <div class="table-wrap"><table class="cmp-table">${rows}</table></div>`;
    root.querySelectorAll(".cmp-select").forEach((sel) =>
      sel.addEventListener("change", () => {
        pair[+sel.dataset.side] = sel.value;
        save();
        render();
      })
    );
  }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(pair)); } catch {} };

  root.addEventListener("click", (e) => {
    const alb = e.target.closest("[data-album]");
    if (alb) return openAlbum(alb.dataset.album);
    if (e.target.closest('[data-act="swap"]')) {
      pair.reverse();
      save();
      render();
    }
  });
  // Pochettes qui arrivent, classement modifié dans l'autre onglet
  let t = 0;
  document.addEventListener("cover-loaded", () => { clearTimeout(t); t = setTimeout(render, 200); });
  document.addEventListener("tab-change", (e) => { if (e.detail === "comparer") render(); });
  render();
})();
