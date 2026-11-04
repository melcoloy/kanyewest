// ---------- Jeu « Qui est l'invité ? » ----------
// Un morceau (titre, album, année, extrait à écouter) : trouve l'artiste en featuring parmi 4.
// 2 points en répondant sans écouter, 1 point après avoir lancé l'extrait. 10 manches.
// Les mauvaises réponses sont des invités d'autres morceaux de la même époque (± 4 ans) quand
// c'est possible, pour que ce ne soit pas trop facile.
// S'appuie sur app.js (albums, tracks, editions, TS, covers, gradient, escapeHtml, fmtStreams,
// openAlbum, editionOf, focusTrack), js/previews.js, js/player.js et js/share.js.

(() => {
  const root = document.getElementById("quiz-invites");
  if (!root) return;
  const MANCHES = 10;
  const BEST = "ye-invite-best";
  const VUE = "jeux/invite";

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const albumOf = (id) => albums.find((a) => a.id === id);
  const pts = (n) => `${n} pt${n > 1 ? "s" : ""}`;
  const coverHtml = (a, cls = "bt-rcov") =>
    `<span class="${cls}" style="background:${gradient(a.palette)}">${covers[a.id]?.img ? `<img loading="lazy" decoding="async" src="${covers[a.id].img}" alt="">` : ""}</span>`;

  // ---- Morceaux avec au moins un invité : édition standard + titres nouveaux des éditions deluxe.
  // Sans Donda 2 (pas d'extraits) ni les skits.
  const all = [];
  for (const a of albums) {
    if (a.id === "donda-2") continue;
    const extra = (editions[a.id] || []).flatMap((e) => e.tracks.filter((t) => e.nouveaux.includes(t.titre)));
    for (const t of [...(tracks[a.id] || []), ...extra]) {
      if (!t.feats.length || /skit|interlude/i.test(t.titre)) continue;
      all.push({ titre: t.titre, albumId: a.id, year: +a.date.slice(0, 4), feats: t.feats, streams: TS[a.id]?.[t.titre] ?? 0 });
    }
  }
  // Morceaux connus en priorité (≥ 30 M de streams), sinon tous
  const known = all.filter((t) => t.streams >= 30e6);
  const pool = known.length >= MANCHES ? known : all;
  // Invité → années de ses apparitions
  const guestYears = new Map();
  for (const t of all) for (const f of t.feats) guestYears.set(f, [...(guestYears.get(f) || []), t.year]);
  const guests = [...guestYears.keys()];
  if (pool.length < MANCHES || guests.length < 4) return;

  let best = store.get(BEST, 0);
  let game = null;

  function intro() {
    MiniPlayer.stop();
    game = null;
    root.innerHTML = `
      <div class="bt-setup">
        <div class="bt-rules">
          <div class="bt-steps"><span><b>Sans écouter</b>2 pts</span><span><b>Après l'extrait</b>1 pt</span></div>
          <p class="muted">${MANCHES} morceaux parmi ${pool.length} titres avec invités · ${MANCHES * 2} points max · Record : <b>${best || "—"}</b></p>
        </div>
        <button class="g-btn" data-act="start">Lancer la partie</button>
      </div>`;
  }

  function start() {
    // Un morceau par album tant que possible, pour varier les époques
    const byAlbum = shuffle([...new Set(pool.map((t) => t.albumId))]).map((id) => shuffle(pool.filter((t) => t.albumId === id)));
    const list = [];
    for (let k = 0; list.length < MANCHES && k < 10; k++) for (const l of byAlbum) if (l[k] && list.length < MANCHES) list.push(l[k]);
    game = { list: shuffle(list), i: 0, score: 0, history: [] };
    next();
  }

  // 3 invités absents du morceau, de la même époque si possible
  function distractors(t) {
    const others = guests.filter((g) => !t.feats.includes(g));
    const near = shuffle(others.filter((g) => guestYears.get(g).some((y) => Math.abs(y - t.year) <= 4)));
    const far = shuffle(others.filter((g) => !near.includes(g)));
    return [...near, ...far].slice(0, 3);
  }

  function next() {
    const t = game.list[game.i];
    const answer = t.feats[Math.floor(Math.random() * t.feats.length)];
    game.round = { t, answer, choices: shuffle([answer, ...distractors(t)]), listened: false, answered: false };
    render();
  }

  function render() {
    MiniPlayer.stop();
    const r = game.round;
    const a = albumOf(r.t.albumId);
    const several = r.t.feats.length > 1;
    root.innerHTML = `
      <div class="g-score">
        <span>Morceau <b>${game.i + 1}</b>/${game.list.length}</span>
        <span>Score <b>${game.score}</b></span>
        <span>Record <b>${best}</b></span>
      </div>
      <div class="an-card qi-card">
        <button class="sm-play an-play" data-act="play" data-state="idle" aria-label="Écouter l'extrait">▶</button>
        ${coverHtml(a, "bt-rcov qi-cov")}
        <div>
          <p class="an-title">${escapeHtml(r.t.titre)}</p>
          <p class="muted">${escapeHtml(a.titre)} · ${r.t.year}</p>
        </div>
      </div>
      <p class="qi-question"><span>${several ? "Qui est <b>l'un des invités</b> de ce morceau ?" : "Qui est <b>en featuring</b> sur ce morceau ?"}</span>
        ${r.answered ? "" : `<span class="muted">${r.listened ? "Extrait écouté : 1 point" : "Sans écouter : 2 points · après l'extrait : 1 point"}</span>`}</p>
      <div class="bt-choices">${r.choices
        .map((c, i) => {
          const st = !r.answered ? "" : c === r.answer ? " ok" : c === r.picked ? " ko" : " off";
          return `<button class="bt-choice${st}" data-pick="${i}"${r.answered ? " disabled" : ""}><kbd>${i + 1}</kbd><span>${escapeHtml(c)}</span></button>`;
        })
        .join("")}</div>
      ${
        r.answered
          ? `<p class="bt-verdict qi-verdict ${r.gained ? "ok" : "ko"}">${r.gained ? `Bien joué ! +${pts(r.gained)}` : r.picked ? "Raté" : "Passé"} — feat. ${r.t.feats.map(escapeHtml).join(", ")}</p>
             <div class="bt-actions"><button class="g-btn" data-act="next">${game.i + 1 >= game.list.length ? "Voir le résultat" : "Morceau suivant →"}</button>
             <button class="bt-link" data-album="${a.id}" data-titre="${escapeHtml(r.t.titre)}">Voir le morceau dans l'album</button></div>`
          : `<div class="bt-actions"><button class="bt-link" data-act="skip">Passer</button><button class="bt-link" data-act="quit">Quitter la partie</button></div>`
      }`;
    if (r.answered) root.querySelector('[data-act="next"]').focus({ preventScroll: true });
  }

  function pick(i) {
    const r = game.round;
    if (r.answered) return;
    r.answered = true;
    r.picked = i == null ? null : r.choices[i];
    r.gained = r.picked === r.answer ? (r.listened ? 1 : 2) : 0;
    game.score += r.gained;
    game.history.push({ t: r.t, answer: r.answer, picked: r.picked, gained: r.gained });
    render();
  }

  function end() {
    MiniPlayer.stop();
    const record = game.score > best;
    if (record) store.set(BEST, (best = game.score));
    window.Progress?.check();
    const max = game.list.length * 2;
    root.innerHTML = `
      <div class="bt-end">
        <p class="g-over-title">${record && game.score ? "Nouveau record !" : "Partie terminée"}</p>
        <p class="bt-final"><b>${game.score}</b> / ${max} pts</p>
        <p class="muted">${game.history.filter((h) => h.gained).length} bonne(s) réponse(s) sur ${game.history.length} · Record : ${best}</p>
        <ol class="bt-recap">${game.history
          .map((h) => {
            const a = albumOf(h.t.albumId);
            return `<li data-album="${a.id}" data-titre="${escapeHtml(h.t.titre)}" tabindex="0">${coverHtml(a, "bt-rcov sm")}
              <span class="bt-rmain"><b>${escapeHtml(h.t.titre)}</b><span class="muted">feat. ${h.t.feats.map(escapeHtml).join(", ")}${h.picked && !h.gained ? ` · ta réponse : ${escapeHtml(h.picked)}` : ""}</span></span>
              <span class="bt-pts ${h.gained ? "ok" : "ko"}">${h.gained ? `+${h.gained}` : "✗"}</span></li>`;
          })
          .join("")}</ol>
        <div class="bt-actions"><button class="g-btn" data-act="start">Rejouer</button>${ShareResult.button()}</div>
      </div>`;
    game.shareText = ShareResult.text({
      jeu: "Qui est l'invité ?",
      score: `${game.score}/${max} pts`,
      grille: ShareResult.grid(game.history.map((h) => [h.gained, 2])),
      vue: VUE,
    });
    root.querySelector('[data-act="start"]').focus({ preventScroll: true });
  }

  // Ouvre la fiche de l'album sur ce morceau (bonne édition, titre surligné)
  function openSong(el) {
    const id = el.dataset.album, titre = el.dataset.titre;
    editionChoice[id] = editionOf(id, titre);
    openAlbum(id);
    requestAnimationFrame(() => focusTrack(titre));
  }

  root.addEventListener("click", (e) => {
    const p = e.target.closest("[data-pick]");
    if (p) return pick(+p.dataset.pick);
    const alb = e.target.closest("[data-album]");
    if (alb) return openSong(alb);
    const btn = e.target.closest("[data-act]");
    const act = btn?.dataset.act;
    if (act === "start") return start();
    if (act === "quit") return intro();
    if (act === "skip") return pick(null);
    if (act === "share-result") return ShareResult.share(game?.shareText || "", btn);
    if (act === "next") {
      game.i++;
      return game.i >= game.list.length ? end() : next();
    }
    if (act === "play") {
      const r = game.round;
      if (!r.answered && !r.listened) {
        r.listened = true; // on ne redessine pas : ça couperait l'extrait qui démarre
        const hint = root.querySelector(".qi-question .muted");
        if (hint) hint.textContent = "Extrait écouté : 1 point";
      }
      return MiniPlayer.toggle(btn, () => Previews.ye(r.t));
    }
  });
  // Clavier : 1-4 pour répondre, Espace pour écouter, Entrée sur une ligne du récap
  document.addEventListener("keydown", (e) => {
    if (window.currentView?.() !== VUE || document.getElementById("modal").open || e.target.closest?.("input, select, textarea")) return;
    if (e.key === "Enter" && e.target.closest?.("[data-album]")) return openSong(e.target.closest("[data-album]"));
    const r = game?.round;
    if (!r || !root.querySelector(".qi-card")) return;
    if (/^[1-4]$/.test(e.key) && !r.answered) pick(+e.key - 1);
    else if (e.key === " " && !e.target.closest?.("button")) {
      e.preventDefault();
      root.querySelector('[data-act="play"]').click();
    }
  });
  // Pochette arrivée pendant une manche : on l'ajoute sans redessiner (ça couperait l'extrait)
  document.addEventListener("cover-loaded", (e) => {
    const c = root.querySelector(".qi-cov");
    if (c && e.detail === game?.round?.t.albumId && covers[e.detail]?.img && !c.querySelector("img"))
      c.innerHTML = `<img loading="lazy" decoding="async" src="${covers[e.detail].img}" alt="">`;
  });
  intro();
})();
