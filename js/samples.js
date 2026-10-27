// ---------- Page « Samples » ----------
// Pour chaque morceau de data/samples.js : le titre de Ye et le morceau d'origine, avec un
// bouton ▶ pour écouter les deux (aperçus iTunes, via js/previews.js) et un lien YouTube.
// S'appuie sur app.js (albums, covers, gradient, escapeHtml, openAlbum).

(() => {
  const root = document.getElementById("samples");
  if (!root) return;
  const data = (window.SAMPLES || []).filter((s) => albums.some((a) => a.id === s.album));
  if (!data.length) return;

  const TYPES = { sample: "Sample", interpolation: "Interpolation", voix: "Voix / extrait parlé" };
  const state = { album: "all", query: "" };

  // ---- Lecteur partagé : un seul extrait à la fois
  const audio = new Audio();
  let playingBtn = null;
  function setBtn(btn, mode) {
    btn.dataset.state = mode;
    btn.textContent = { idle: "▶", load: "…", play: "❚❚", none: "—" }[mode];
    btn.title = mode === "none" ? "Extrait introuvable sur iTunes" : mode === "play" ? "Pause" : "Écouter un extrait";
    btn.disabled = mode === "none";
  }
  const stop = () => {
    audio.pause();
    if (playingBtn) setBtn(playingBtn, "idle");
    playingBtn = null;
  };
  const real = () => !audio.src.startsWith("data:"); // ignore le son vide de déblocage
  audio.addEventListener("ended", () => real() && stop());
  audio.addEventListener("pause", () => { if (real() && playingBtn && !audio.ended) setBtn(playingBtn, "idle"); });

  async function play(btn) {
    if (playingBtn === btn && !audio.paused) return stop();
    stop();
    playingBtn = btn;
    // Lecture lancée tout de suite dans le clic (sinon Safari la bloque), la source arrive ensuite
    audio.src = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
    audio.play().catch(() => {});
    setBtn(btn, "load");
    const s = data[+btn.dataset.i];
    const url = await (btn.dataset.side === "ye"
      ? Previews.ye({ titre: s.titre, albumId: s.album })
      : Previews.any(s.sample.artiste, s.sample.titre)
    ).catch(() => null);
    if (playingBtn !== btn) return; // un autre bouton a été cliqué entre-temps
    if (!url) {
      playingBtn = null;
      return setBtn(btn, "none");
    }
    audio.src = url;
    audio.play().then(() => setBtn(btn, "play")).catch(() => stop());
  }

  // ---- Rendu
  const count = (arr, f) => arr.reduce((m, x) => m.set(f(x), (m.get(f(x)) || 0) + 1), new Map());
  const topArtists = [...count(data.filter((s) => s.type !== "voix"), (s) => s.sample.artiste)]
    .filter(([, n]) => n > 1)
    .sort((a, b) => b[1] - a[1]);
  const albumIds = albums.map((a) => a.id).filter((id) => data.some((s) => s.album === id));

  function matches(s) {
    if (state.album !== "all" && s.album !== state.album) return false;
    if (!state.query) return true;
    return [s.titre, s.sample.artiste, s.sample.titre, s.sample.annee].join(" ").toLowerCase().includes(state.query);
  }

  function renderShell() {
    root.innerHTML = `
      <div class="sm-head">
        <div class="sm-facts">
          <div><b>${data.length}</b><span>morceaux</span></div>
          <div><b>${albumIds.length}</b><span>albums</span></div>
          ${topArtists.length ? `<div><b>${escapeHtml(topArtists[0][0])}</b><span>la plus samplée (${topArtists[0][1]} fois)</span></div>` : ""}
          <div><b>${Math.min(...data.map((s) => s.sample.annee || 9999))}</b><span>le plus vieux sample</span></div>
        </div>
        <div class="sm-controls">
          <input type="search" id="sm-search" placeholder="Morceau, artiste samplé, année…" aria-label="Rechercher un sample" />
          <select id="sm-album" aria-label="Album">
            <option value="all">Tous les albums</option>
            ${albumIds.map((id) => `<option value="${id}">${escapeHtml(albums.find((a) => a.id === id).titre)}</option>`).join("")}
          </select>
        </div>
      </div>
      <div id="sm-list"></div>`;
    root.querySelector("#sm-search").addEventListener("input", (e) => { state.query = e.target.value.trim().toLowerCase(); renderList(); });
    root.querySelector("#sm-album").addEventListener("change", (e) => { state.album = e.target.value; renderList(); });
    renderList();
  }

  function renderList() {
    stop();
    const ytUrl = (s) => `https://www.youtube.com/results?search_query=${encodeURIComponent(s.sample.artiste + " " + s.sample.titre)}`;
    const groups = albumIds
      .map((id) => ({ a: albums.find((x) => x.id === id), items: data.map((s, i) => ({ s, i })).filter(({ s }) => s.album === id && matches(s)) }))
      .filter((g) => g.items.length);
    root.querySelector("#sm-list").innerHTML = groups.length
      ? groups
          .map(
            ({ a, items }) => `
        <section class="sm-group">
          <button class="sm-album" data-album="${a.id}">
            <span class="sm-cov" style="background:${gradient(a.palette)}">${covers[a.id]?.img ? `<img src="${covers[a.id].img}" alt="">` : ""}</span>
            <span><b>${escapeHtml(a.titre)}</b><span class="muted">${a.date.slice(0, 4)}</span></span>
          </button>
          <div class="sm-cards">
            ${items
              .map(
                ({ s, i }) => `
              <article class="sm-card">
                <div class="sm-row">
                  <button class="sm-play" data-i="${i}" data-side="ye" data-state="idle" title="Écouter un extrait">▶</button>
                  <div class="sm-txt"><span class="sm-kicker">Ye</span><b>${escapeHtml(s.titre)}</b></div>
                </div>
                <div class="sm-link"><span class="tag">${TYPES[s.type] || "Sample"}</span></div>
                <div class="sm-row">
                  ${
                    s.type === "voix"
                      ? `<span class="sm-play ghost" aria-hidden="true">“</span>`
                      : `<button class="sm-play" data-i="${i}" data-side="orig" data-state="idle" title="Écouter un extrait">▶</button>`
                  }
                  <div class="sm-txt"><span class="sm-kicker">Original${s.sample.annee ? ` · ${s.sample.annee}` : ""}</span><b>${escapeHtml(s.sample.titre)}</b><span class="muted">${escapeHtml(s.sample.artiste)}</span></div>
                  ${s.type === "voix" ? "" : `<a class="sm-yt" href="${ytUrl(s)}" target="_blank" rel="noopener" title="Chercher sur YouTube">YouTube ↗</a>`}
                </div>
                ${s.note ? `<p class="sm-note">${escapeHtml(s.note)}</p>` : ""}
              </article>`
              )
              .join("")}
          </div>
        </section>`
          )
          .join("")
      : `<p class="empty">Aucun sample ne correspond à ta recherche.</p>`;
  }

  root.addEventListener("click", (e) => {
    const b = e.target.closest(".sm-play[data-i]");
    if (b) return play(b);
    const alb = e.target.closest("[data-album]");
    if (alb) openAlbum(alb.dataset.album);
  });
  document.addEventListener("tab-change", (e) => { if (e.detail !== "samples") stop(); });
  document.addEventListener("cover-loaded", (e) => {
    const img = covers[e.detail]?.img;
    const cov = root.querySelector(`.sm-album[data-album="${e.detail}"] .sm-cov`);
    if (img && cov && !cov.querySelector("img")) cov.innerHTML = `<img src="${img}" alt="">`;
  });

  renderShell();
})();
