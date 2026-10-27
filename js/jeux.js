// ---------- Jeux « Pochette floue » et « Devine l'année » ----------
// Pochette floue : la pochette d'un album s'affiche en très gros pixels (6 × 6), puis de plus en
//   plus nette (10, 18, 40). 4 albums proposés ; 4 → 3 → 2 → 1 point selon la netteté.
// Devine l'année : un morceau (avec son extrait), une frise de 2004 à aujourd'hui ;
//   5 points pour l'année exacte, 3 à un an près, 1 à deux ans près.
// S'appuie sur app.js (albums, covers, tracks, TS, gradient, escapeHtml, fmtStreams, openAlbum),
// js/previews.js et js/player.js.

(() => {
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
    `<span class="${cls}" style="background:${gradient(a.palette)}">${covers[a.id]?.img ? `<img src="${covers[a.id].img}" alt="">` : ""}</span>`;

  // =====================================================================
  // Pochette floue
  // =====================================================================
  (() => {
    const root = document.getElementById("pixel");
    if (!root) return;
    const LEVELS = [6, 10, 18, 40]; // pixels de côté
    const MANCHES = 8;
    const BEST = "ye-pochette-best";
    let best = store.get(BEST, 0);
    let game = null;

    const withCover = () => albums.filter((a) => covers[a.id]?.img);

    function intro(msg = "") {
      game = null;
      const n = withCover().length;
      root.innerHTML = `
        <div class="bt-setup">
          <div class="bt-rules">
            <div class="bt-steps">${LEVELS.map((s, i) => `<span><b>${s} × ${s}</b>${pts(4 - i)}</span>`).join("")}</div>
            <p class="muted">${MANCHES} pochettes · ${MANCHES * 4} points max · Record : <b>${best || "—"}</b></p>
          </div>
          <button class="g-btn" data-act="start"${n < 4 ? " disabled" : ""}>Lancer la partie</button>
          <p class="bt-msg muted" role="status">${msg || (n < 4 ? "Chargement des pochettes… (il faut être en ligne la première fois)" : "")}</p>
        </div>`;
    }

    function start() {
      const pool = withCover();
      if (pool.length < 4) return intro("Pas assez de pochettes chargées : vérifie ta connexion.");
      game = { list: shuffle(pool).slice(0, MANCHES), i: 0, score: 0, history: [] };
      next();
    }

    function next() {
      const a = game.list[game.i];
      const others = shuffle(albums.filter((x) => x.id !== a.id)).slice(0, 3);
      game.round = { a, level: 0, choices: shuffle([a, ...others]), answered: false };
      render();
    }

    function render() {
      const r = game.round;
      const n = r.answered ? 0 : LEVELS[r.level];
      const img = covers[r.a.id].img;
      root.innerHTML = `
        <div class="g-score">
          <span>Pochette <b>${game.i + 1}</b>/${game.list.length}</span>
          <span>Score <b>${game.score}</b></span>
          <span>Record <b>${best}</b></span>
        </div>
        <div class="px-wrap">
          <canvas class="px-frame" width="560" height="560" aria-label="Pochette pixelisée à deviner"></canvas>
          <div class="px-side">
            <p class="muted">${r.answered ? "" : `Netteté : <b>${n} × ${n}</b> pixels · une bonne réponse vaut <b>${pts(4 - r.level)}</b>`}</p>
            ${
              r.answered
                ? ""
                : r.level < LEVELS.length - 1
                  ? `<button class="bt-link" data-act="more">Plus net</button>`
                  : `<button class="bt-link" data-act="skip">Passer</button>`
            }
            <div class="bt-choices px-choices">${r.choices
              .map((c, i) => {
                const st = !r.answered ? "" : c.id === r.a.id ? " ok" : c.id === r.picked ? " ko" : " off";
                return `<button class="bt-choice${st}" data-pick="${c.id}"${r.answered ? " disabled" : ""}><kbd>${i + 1}</kbd><span>${escapeHtml(c.titre)}</span></button>`;
              })
              .join("")}</div>
            ${
              r.answered
                ? `<p class="bt-verdict ${r.gained ? "ok" : "ko"}">${r.gained ? `Bien joué ! +${pts(r.gained)}` : r.picked ? "Raté" : "Passé"} — ${escapeHtml(r.a.titre)} (${r.a.date.slice(0, 4)})</p>
                   <div class="bt-actions"><button class="g-btn" data-act="next">${game.i + 1 >= game.list.length ? "Voir le résultat" : "Pochette suivante →"}</button>
                   <button class="bt-link" data-album="${r.a.id}">Voir l'album</button></div>`
                : `<div class="bt-actions"><button class="bt-link" data-act="quit">Quitter la partie</button></div>`
            }
          </div>
        </div>`;
      draw(img, n);
      if (r.answered) root.querySelector('[data-act="next"]').focus();
    }

    // Pixelisation : on réduit l'image à n × n (moyenne des couleurs), puis on l'agrandit sans lissage.
    // Pas besoin d'autorisation CORS : on dessine seulement, on ne lit jamais les pixels.
    const imgCache = {};
    function draw(src, n) {
      const cv = root.querySelector(".px-frame");
      const img = (imgCache[src] ||= Object.assign(new Image(), { src }));
      if (!img.complete || !img.naturalWidth) return void img.addEventListener("load", () => root.contains(cv) && draw(src, n), { once: true });
      const ctx = cv.getContext("2d");
      if (!n) {
        ctx.imageSmoothingEnabled = true;
        return ctx.drawImage(img, 0, 0, cv.width, cv.height);
      }
      // Réduction par paliers (÷2) pour un vrai mélange des couleurs
      let cur = img, size = img.naturalWidth;
      while (size / 2 > n) {
        size = Math.max(n, Math.floor(size / 2));
        const c = Object.assign(document.createElement("canvas"), { width: size, height: size });
        c.getContext("2d").drawImage(cur, 0, 0, size, size);
        cur = c;
      }
      const small = Object.assign(document.createElement("canvas"), { width: n, height: n });
      small.getContext("2d").drawImage(cur, 0, 0, n, n);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, cv.width, cv.height);
    }

    function answer(id) {
      const r = game.round;
      if (r.answered) return;
      r.answered = true;
      r.picked = id;
      r.gained = id === r.a.id ? 4 - r.level : 0;
      game.score += r.gained;
      game.history.push({ a: r.a, gained: r.gained, level: r.level });
      render();
    }

    function end() {
      const record = game.score > best;
      if (record) store.set(BEST, (best = game.score));
      root.innerHTML = `
        <div class="bt-end">
          <p class="g-over-title">${record && game.score ? "Nouveau record !" : "Partie terminée"}</p>
          <p class="bt-final"><b>${game.score}</b> / ${game.list.length * 4} pts</p>
          <ol class="bt-recap">${game.history
            .map(
              (h) => `<li data-album="${h.a.id}" tabindex="0">${coverHtml(h.a, "bt-rcov sm")}
              <span class="bt-rmain"><b>${escapeHtml(h.a.titre)}</b><span class="muted">${h.a.date.slice(0, 4)}</span></span>
              <span class="bt-pts ${h.gained ? "ok" : "ko"}">${h.gained ? `+${h.gained} · ${LEVELS[h.level]} × ${LEVELS[h.level]}` : "✗"}</span></li>`
            )
            .join("")}</ol>
          <div class="bt-actions"><button class="g-btn" data-act="start">Rejouer</button></div>
        </div>`;
    }

    root.addEventListener("click", (e) => {
      const pick = e.target.closest("[data-pick]");
      if (pick) return answer(pick.dataset.pick);
      const alb = e.target.closest("[data-album]");
      if (alb) return openAlbum(alb.dataset.album);
      const act = e.target.closest("[data-act]")?.dataset.act;
      if (act === "start") return start();
      if (act === "quit") return intro();
      if (act === "skip") return answer(null);
      if (act === "more") { game.round.level++; return render(); }
      if (act === "next") { game.i++; return game.i >= game.list.length ? end() : next(); }
    });
    document.addEventListener("keydown", (e) => {
      if (window.currentView?.() !== "jeux/pochette" || document.getElementById("modal").open) return;
      const r = game?.round;
      if (r && !r.answered && /^[1-4]$/.test(e.key)) answer(r.choices[+e.key - 1].id);
    });
    // Les pochettes arrivent après le chargement de la page : on réactive le bouton
    document.addEventListener("cover-loaded", () => { if (!game) intro(); });
    intro();
  })();

  // =====================================================================
  // Devine l'année
  // =====================================================================
  (() => {
    const root = document.getElementById("annee");
    if (!root) return;
    const MANCHES = 10;
    const BEST = "ye-annee-best";
    const MIN = +albums[0].date.slice(0, 4);
    const MAX = Math.max(new Date().getFullYear(), +albums.at(-1).date.slice(0, 4));
    let best = store.get(BEST, 0);
    let game = null;

    // Morceaux connus (≥ 50 M de streams), sans Donda 2 ni les skits
    const pool = albums
      .filter((a) => a.id !== "donda-2")
      .flatMap((a) => (tracks[a.id] || []).map((t) => ({ titre: t.titre, albumId: a.id, streams: TS[a.id]?.[t.titre] ?? 0 })))
      .filter((t) => t.streams >= 50e6 && !/skit|interlude/i.test(t.titre));

    const score = (diff) => (diff === 0 ? 5 : diff === 1 ? 3 : diff === 2 ? 1 : 0);

    function intro() {
      game = null;
      root.innerHTML = `
        <div class="bt-setup">
          <div class="bt-rules">
            <div class="bt-steps"><span><b>Année exacte</b>5 pts</span><span><b>± 1 an</b>3 pts</span><span><b>± 2 ans</b>1 pt</span></div>
            <p class="muted">${MANCHES} morceaux parmi ${pool.length} titres connus · ${MANCHES * 5} points max · Record : <b>${best || "—"}</b></p>
          </div>
          <button class="g-btn" data-act="start">Lancer la partie</button>
        </div>`;
    }

    function start() {
      // Un seul morceau par album tant que possible, pour varier les époques
      const byAlbum = shuffle(albums.map((a) => a.id)).map((id) => shuffle(pool.filter((t) => t.albumId === id))).filter((l) => l.length);
      const list = [];
      for (let k = 0; list.length < MANCHES && k < 5; k++) for (const l of byAlbum) if (l[k] && list.length < MANCHES) list.push(l[k]);
      game = { list: shuffle(list), i: 0, score: 0, history: [] };
      next();
    }

    function next() {
      game.round = { t: game.list[game.i], guess: Math.round((MIN + MAX) / 2), answered: false };
      render();
    }

    function render() {
      MiniPlayer.stop();
      const r = game.round;
      const a = albumOf(r.t.albumId);
      const year = +a.date.slice(0, 4);
      const ticks = [];
      for (let y = MIN; y <= MAX; y += 2) ticks.push(`<span style="left:${((y - MIN) / (MAX - MIN)) * 100}%">${y}</span>`);
      root.innerHTML = `
        <div class="g-score">
          <span>Morceau <b>${game.i + 1}</b>/${game.list.length}</span>
          <span>Score <b>${game.score}</b></span>
          <span>Record <b>${best}</b></span>
        </div>
        <div class="an-card">
          <button class="sm-play an-play" data-act="play" data-state="idle">▶</button>
          <div>
            <p class="an-title">${escapeHtml(r.t.titre)}</p>
            <p class="muted">${r.answered ? `${escapeHtml(a.titre)} · ${fmtStreams(r.t.streams)} streams` : "En quelle année est sorti ce morceau ?"}</p>
          </div>
        </div>
        <div class="an-year" aria-live="polite">${r.answered ? year : r.guess}</div>
        <div class="an-slider">
          <input type="range" id="an-range" min="${MIN}" max="${MAX}" step="1" value="${r.guess}" ${r.answered ? "disabled" : ""} aria-label="Année">
          ${r.answered ? `<span class="an-mark truth" style="left:${((year - MIN) / (MAX - MIN)) * 100}%" title="Bonne réponse"></span><span class="an-mark guess" style="left:${((r.guess - MIN) / (MAX - MIN)) * 100}%" title="Ta réponse"></span>` : ""}
          <div class="an-ticks">${ticks.join("")}</div>
        </div>
        ${
          r.answered
            ? `<p class="bt-verdict ${r.gained ? "ok" : "ko"}">${r.gained ? `${r.gained === 5 ? "Exactement !" : "Pas loin !"} +${pts(r.gained)}` : "Raté"} — ta réponse : ${r.guess}, bonne réponse : ${year}</p>
               <div class="bt-actions"><button class="g-btn" data-act="next">${game.i + 1 >= game.list.length ? "Voir le résultat" : "Morceau suivant →"}</button>
               <button class="bt-link" data-album="${a.id}">Voir l'album</button></div>`
            : `<div class="bt-actions"><button class="g-btn" data-act="validate">Valider ${r.guess}</button><button class="bt-link" data-act="quit">Quitter la partie</button></div>`
        }`;
      const range = root.querySelector("#an-range");
      range.addEventListener("input", () => {
        r.guess = +range.value;
        root.querySelector(".an-year").textContent = r.guess;
        root.querySelector('[data-act="validate"]').textContent = `Valider ${r.guess}`;
      });
      (r.answered ? root.querySelector('[data-act="next"]') : range).focus({ preventScroll: true });
    }

    function validate() {
      const r = game.round;
      if (r.answered) return;
      const year = +albumOf(r.t.albumId).date.slice(0, 4);
      r.answered = true;
      r.gained = score(Math.abs(r.guess - year));
      game.score += r.gained;
      game.history.push({ t: r.t, guess: r.guess, year, gained: r.gained });
      render();
    }

    function end() {
      MiniPlayer.stop();
      const record = game.score > best;
      if (record) store.set(BEST, (best = game.score));
      root.innerHTML = `
        <div class="bt-end">
          <p class="g-over-title">${record && game.score ? "Nouveau record !" : "Partie terminée"}</p>
          <p class="bt-final"><b>${game.score}</b> / ${game.list.length * 5} pts</p>
          <ol class="bt-recap">${game.history
            .map((h) => {
              const a = albumOf(h.t.albumId);
              return `<li data-album="${a.id}" tabindex="0">${coverHtml(a, "bt-rcov sm")}
                <span class="bt-rmain"><b>${escapeHtml(h.t.titre)}</b><span class="muted">${escapeHtml(a.titre)} · ${h.year}</span></span>
                <span class="bt-pts ${h.gained ? "ok" : "ko"}">${h.gained ? `+${h.gained}` : "✗"} · ${h.guess}</span></li>`;
            })
            .join("")}</ol>
          <div class="bt-actions"><button class="g-btn" data-act="start">Rejouer</button></div>
        </div>`;
    }

    root.addEventListener("click", (e) => {
      const alb = e.target.closest("[data-album]");
      if (alb) return openAlbum(alb.dataset.album);
      const btn = e.target.closest("[data-act]");
      const act = btn?.dataset.act;
      if (act === "start") return start();
      if (act === "quit") return MiniPlayer.stop(), intro();
      if (act === "validate") return validate();
      if (act === "play") return MiniPlayer.toggle(btn, () => Previews.ye(game.round.t));
      if (act === "next") { game.i++; return game.i >= game.list.length ? end() : next(); }
    });
    root.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.id === "an-range") {
        e.preventDefault(); // sinon la même touche « clique » aussi sur « Morceau suivant »
        validate();
      }
    });
    intro();
  })();
})();
