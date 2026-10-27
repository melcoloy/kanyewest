// ---------- Blind test + Défi du jour ----------
// Un extrait d'un morceau, 4 propositions. On commence avec 2 s ; chaque « Rallonger »
// allonge l'extrait (5 s, 10 s, 20 s) mais rapporte moins de points (4 → 3 → 2 → 1).
//
// Deux jeux utilisent ce moteur :
//   - Blind test (#blindtest) : 10 manches, mode « morceau » ou « album », classiques ou tout.
//   - Défi du jour (#defi)    : 5 morceaux tirés au sort à partir de la date, donc les mêmes
//     pour tout le monde ; une seule partie par jour, série de jours, résultat à partager.
// Extraits : js/previews.js. S'appuie sur app.js (albums, covers, tracks, TS, gradient,
// escapeHtml, fmtStreams, initials, toSec, openAlbum).

(() => {
  const LEVELS = [2, 5, 10, 20];      // durées d'extrait (s)
  const CLASSIQUE = 100e6;             // « Les classiques » : ≥ 100 M de streams Spotify
  const EXCLUS = new Set(["donda-2"]); // pas sur les plateformes
  const EMOJI = ["🟩", "🟨", "🟧", "🟥"]; // trouvé à 2 s / 5 s / 10 s / 20 s ; ⬛ = raté

  // ---- Pool de morceaux (tracklists locales)
  const pool = [];
  for (const a of albums) {
    if (EXCLUS.has(a.id)) continue;
    for (const t of tracks[a.id] || []) {
      if (/skit|interlude|intermission|\bintro\b/i.test(t.titre)) continue;
      const sec = toSec(t.duree);
      if (!isNaN(sec) && sec < 60) continue; // trop court pour un extrait de 20 s
      pool.push({ titre: t.titre, albumId: a.id, streams: TS[a.id]?.[t.titre] ?? 0 });
    }
  }
  const classiques = pool.filter((t) => t.streams >= CLASSIQUE);

  // ---- Utilitaires
  const norm = Previews.norm;
  const albumOf = (t) => albums.find((a) => a.id === t.albumId);
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  // Générateur pseudo-aléatoire reproductible (même graine → même suite de nombres)
  function seeded(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 3432918353), (h = (h << 13) | (h >>> 19));
    let a = h >>> 0;
    return () => {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const shuffle = (arr, rng = Math.random) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const dateKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const addDays = (key, n) => {
    const d = new Date(key + "T12:00:00");
    d.setDate(d.getDate() + n);
    return dateKey(d);
  };

  // Un seul lecteur audio pour les deux jeux
  const audio = new Audio();
  audio.preload = "auto";
  // Son vide joué au clic sur « Jouer » : débloque la lecture automatique (Safari / iOS)
  const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
  let owner = null; // jeu qui utilise le lecteur

  function createGame(root, daily) {
    if (!root || pool.length < 4) return;

    const MANCHES = daily ? 5 : 10;
    const BEST_KEY = "ye-blindtest-best";
    const DEFI_KEY = "ye-defi";
    let settings = daily ? { mode: "titre", sel: "classiques" } : { mode: "titre", sel: "classiques" };
    let game = null; // { list, i, score, history, round, next, rng }
    const best = daily ? {} : store.get(BEST_KEY, {});
    const bestKey = () => `${settings.mode}-${settings.sel}`;
    const selection = () => (settings.sel === "classiques" ? classiques : pool);

    // ---- Lecteur
    let limit = 0, rafId = 0, offset = 0, offsetFrac = 0; // limit : durée d'écoute autorisée depuis `offset`
    const mine = () => owner === api;

    audio.addEventListener("loadedmetadata", () => {
      if (!mine()) return;
      // Point de départ dans l'aperçu, en gardant 20 s d'écoute possibles
      offset = Math.max(0, offsetFrac * Math.min(8, audio.duration - LEVELS.at(-1) - 0.5));
      audio.currentTime = offset;
    });
    function tick() {
      if (!mine()) return;
      const bar = root.querySelector(".bt-fill");
      const elapsed = Math.max(0, audio.currentTime - offset);
      if (bar) bar.style.width = `${Math.min(100, (elapsed / LEVELS.at(-1)) * 100)}%`;
      if (audio.currentTime >= offset + limit) {
        audio.pause();
        if (bar) bar.style.width = `${(limit / LEVELS.at(-1)) * 100}%`;
      }
      if (!audio.paused) rafId = requestAnimationFrame(tick);
      syncPlayBtn();
    }
    audio.addEventListener("play", () => { if (mine()) { cancelAnimationFrame(rafId); rafId = requestAnimationFrame(tick); } });
    audio.addEventListener("pause", () => mine() && syncPlayBtn());
    audio.addEventListener("ended", () => mine() && syncPlayBtn());
    audio.addEventListener("error", () => {
      if (!mine() || audio.src.startsWith("data:") || !game?.round) return;
      const msg = root.querySelector(".bt-msg");
      if (msg) msg.textContent = "Impossible de lire cet extrait.";
    });

    function load(round) {
      owner = api;
      limit = 0;
      offset = 0;
      offsetFrac = round.offsetFrac;
      audio.src = round.url;
    }
    function playSnippet() {
      limit = LEVELS[game.round.level];
      if (audio.readyState >= 1) audio.currentTime = offset;
      audio.play().catch(() => syncPlayBtn());
    }
    function playRest() { // après la réponse : la suite de l'aperçu
      limit = Infinity;
      if (audio.paused) audio.play().catch(() => {});
    }
    function syncPlayBtn() {
      const b = root.querySelector(".bt-play");
      if (!b) return;
      const playing = !audio.paused && !audio.ended;
      b.classList.toggle("playing", playing);
      b.setAttribute("aria-label", playing ? "Pause" : "Écouter l'extrait");
      b.innerHTML = playing ? "❚❚" : "▶";
    }
    const stop = () => { if (mine()) audio.pause(); };

    // ---- Préparation des manches
    function makeChoices(t, rng) {
      if (settings.mode === "album") {
        const others = shuffle(albums.filter((a) => a.id !== t.albumId && !EXCLUS.has(a.id)), rng).slice(0, 3);
        return shuffle([albumOf(t), ...others], rng).map((a) => ({ key: a.id, ok: a.id === t.albumId, album: a }));
      }
      // Mode morceau : jusqu'à 2 pièges du même album, le reste au hasard
      const base = selection();
      const used = new Set([norm(t.titre)]);
      const pickFrom = (list, n) => {
        const out = [];
        for (const c of shuffle(list, rng)) {
          if (out.length >= n) break;
          if (used.has(norm(c.titre))) continue;
          used.add(norm(c.titre));
          out.push(c);
        }
        return out;
      };
      const same = pickFrom(pool.filter((c) => c.albumId === t.albumId), 2);
      const rest = pickFrom(base.length > 10 ? base : pool, 3 - same.length);
      return shuffle([t, ...same, ...rest], rng).map((c) => ({ key: c.titre, ok: c === t, track: c }));
    }

    // Tire la liste des morceaux. Défi du jour : tout est calculé d'avance à partir de la date
    // (morceaux, propositions, point de départ de l'extrait) pour que chacun ait la même partie.
    function buildList() {
      const rng = daily ? seeded("ye-defi-" + dateKey()) : Math.random;
      let list = shuffle(selection(), rng);
      // Évite deux morceaux du même album d'affilée quand c'est possible
      for (let i = 1; i < list.length; i++) {
        if (list[i].albumId === list[i - 1].albumId) {
          const j = list.findIndex((x, k) => k > i && x.albumId !== list[i - 1].albumId);
          if (j > 0) [list[i], list[j]] = [list[j], list[i]];
        }
      }
      if (daily) list = list.slice(0, MANCHES + 6); // quelques réserves si un extrait manque
      return list.map((t) => ({ t, choices: daily ? makeChoices(t, rng) : null, offsetFrac: rng() }));
    }

    async function prepare(g) {
      while (g.list.length) {
        const item = g.list.shift();
        const url = await Previews.ye(item.t).catch(() => null);
        if (url) return { ...item, url, choices: item.choices || makeChoices(item.t), level: 0, answered: false };
      }
      return null;
    }

    // ---- Défi du jour : stockage et partage
    const defi = () => store.get(DEFI_KEY, { jours: {} });
    function streaks(d = defi()) {
      const days = Object.keys(d.jours).sort();
      let bestRun = 0, run = 0, prev = null;
      for (const k of days) {
        run = prev && addDays(prev, 1) === k ? run + 1 : 1;
        bestRun = Math.max(bestRun, run);
        prev = k;
      }
      const today = dateKey();
      let cur = 0;
      for (let k = d.jours[today] ? today : addDays(today, -1); d.jours[k]; k = addDays(k, -1)) cur++;
      return { cur, best: bestRun, played: days.length };
    }
    const fmtDay = (k) => new Date(k + "T12:00:00").toLocaleDateString("fr-BE", { day: "numeric", month: "long", year: "numeric" });
    const grid = (res) => res.manches.map((m) => (m.gained ? EMOJI[m.level] : "⬛")).join("");
    function shareText(k, res) {
      const url = location.origin + location.pathname + "#defi";
      return `Ye · Défi du jour — ${new Date(k + "T12:00:00").toLocaleDateString("fr-BE")}\n${grid(res)}  ${res.score}/${MANCHES * 4}\n${url}`;
    }
    async function share(text, btn) {
      const done = (msg) => { btn.textContent = msg; setTimeout(() => (btn.textContent = "Partager mon résultat"), 2000); };
      if (navigator.share && matchMedia("(pointer: coarse)").matches) {
        try { await navigator.share({ text }); return; } catch (e) { if (e.name === "AbortError") return; }
      }
      try {
        await navigator.clipboard.writeText(text);
        done("Copié !");
      } catch {
        prompt("Copie ton résultat :", text);
      }
    }
    let countdownTimer = 0;
    function countdown() {
      const el = root.querySelector("#bt-countdown");
      if (!el) return clearInterval(countdownTimer);
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const min = Math.ceil((next - now) / 60000);
      el.textContent = `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min`;
      if (min <= 0) renderSetup();
    }

    // ---- Écrans
    function renderSetup() {
      stop();
      game = null;
      clearInterval(countdownTimer);
      return daily ? renderDailyIntro() : renderOptions();
    }

    function renderOptions() {
      const opt = (group, val, label, sub) => `
        <button class="bt-opt${settings[group] === val ? " active" : ""}" data-set="${group}" data-val="${val}" aria-pressed="${settings[group] === val}">
          <b>${label}</b><span>${sub}</span>
        </button>`;
      root.innerHTML = `
        <div class="bt-setup">
          <div class="bt-group">
            <p class="bt-label">Mode</p>
            <div class="bt-opts">
              ${opt("mode", "titre", "Trouve le morceau", "4 titres proposés")}
              ${opt("mode", "album", "Trouve l'album", "4 pochettes proposées")}
            </div>
          </div>
          <div class="bt-group">
            <p class="bt-label">Morceaux</p>
            <div class="bt-opts">
              ${opt("sel", "classiques", "Les classiques", `${classiques.length} titres à plus de 100 M de streams`)}
              ${opt("sel", "tout", "Toute la discographie", `${pool.length} titres, deep cuts compris`)}
            </div>
          </div>
          <div class="bt-rules">
            ${stepsHtml()}
            <p class="muted">${MANCHES} manches · ${MANCHES * 4} points max · Record dans ce mode : <b>${best[bestKey()] ?? "—"}</b></p>
          </div>
          <button class="g-btn bt-start" data-act="start">Lancer la partie</button>
          <p class="bt-msg muted" role="status"></p>
        </div>`;
    }
    const stepsHtml = () =>
      `<div class="bt-steps">${LEVELS.map((s, i) => `<span>${daily ? EMOJI[i] + " " : ""}<b>${s} s</b>${4 - i} pt${i < 3 ? "s" : ""}</span>`).join("")}</div>`;

    function renderDailyIntro() {
      const k = dateKey();
      const d = defi();
      const res = d.jours[k];
      const st = streaks(d);
      const scores = Object.values(d.jours).map((r) => r.score);
      const moy = scores.length ? (scores.reduce((s, x) => s + x, 0) / scores.length).toFixed(1).replace(".", ",") : "—";
      const statsHtml = `
        <div class="dj-stats">
          <div><b>${st.cur}</b><span>série en cours</span></div>
          <div><b>${st.best}</b><span>meilleure série</span></div>
          <div><b>${st.played}</b><span>défis joués</span></div>
          <div><b>${moy}</b><span>score moyen</span></div>
        </div>`;
      if (res) {
        root.innerHTML = `
          <div class="bt-setup">
            <p class="dj-date">Défi du ${fmtDay(k)}</p>
            <div class="dj-result">
              <p class="dj-grid" aria-label="Résultat">${grid(res)}</p>
              <p class="bt-final"><b>${res.score}</b> / ${MANCHES * 4} pts</p>
              <button class="g-btn" data-act="share">Partager mon résultat</button>
              <p class="muted">Prochain défi dans <b id="bt-countdown"></b></p>
            </div>
            ${statsHtml}
            ${recapHtml(res.manches)}
          </div>`;
        countdown();
        countdownTimer = setInterval(countdown, 30000);
        return;
      }
      root.innerHTML = `
        <div class="bt-setup">
          <p class="dj-date">Défi du ${fmtDay(k)}</p>
          <p>${MANCHES} morceaux parmi les classiques, <b>les mêmes pour tout le monde</b> aujourd'hui. Une seule tentative : trouve-les avec l'extrait le plus court possible.</p>
          <div class="bt-rules">${stepsHtml()}</div>
          ${statsHtml}
          <button class="g-btn bt-start" data-act="start">Jouer le défi</button>
          <p class="bt-msg muted" role="status"></p>
        </div>`;
    }

    async function start() {
      owner = api;
      audio.src = SILENCE;
      audio.play().catch(() => {});
      game = { list: buildList(), i: 0, score: 0, history: [], round: null, next: null, day: dateKey() };
      const msg = root.querySelector(".bt-msg");
      root.querySelector(".bt-start").disabled = true;
      msg.textContent = "Chargement des extraits…";
      const g = game;
      const round = await prepare(g);
      if (game !== g) return; // l'utilisateur a changé d'écran entre-temps
      if (!round) {
        root.querySelector(".bt-start").disabled = false;
        msg.textContent = "Impossible de charger les extraits : vérifie ta connexion (l'API iTunes est peut-être bloquée).";
        game = null;
        return;
      }
      showRound(round, true);
    }

    function showRound(round, autoplay) {
      game.round = round;
      game.i++;
      game.next = game.i < MANCHES ? prepare(game) : Promise.resolve(null); // manche suivante préparée pendant qu'on joue
      load(round);
      renderRound();
      if (autoplay) playSnippet();
    }

    function choiceHtml(c, i) {
      const r = game.round;
      const state = !r.answered ? "" : c.ok ? " ok" : c.key === r.picked ? " ko" : " off";
      const dis = r.answered ? " disabled" : "";
      if (settings.mode === "album") {
        const a = c.album;
        const img = covers[a.id]?.img;
        return `<button class="bt-choice bt-album${state}" data-pick="${escapeHtml(c.key)}"${dis}>
          <span class="bt-cov" style="background:${gradient(a.palette)}">${img ? `<img src="${img}" alt="">` : `<span>${initials(a.titre)}</span>`}</span>
          <span class="bt-ctext"><kbd>${i + 1}</kbd>${escapeHtml(a.titre)}</span>
        </button>`;
      }
      return `<button class="bt-choice${state}" data-pick="${escapeHtml(c.key)}"${dis}>
        <kbd>${i + 1}</kbd><span>${escapeHtml(c.track.titre)}</span>
      </button>`;
    }

    function renderRound() {
      const r = game.round;
      const lvl = LEVELS[r.level];
      const a = albumOf(r.t);
      const pts = 4 - r.level;
      const marks = LEVELS.map((s) => `<span class="bt-mark" style="left:${(s / LEVELS.at(-1)) * 100}%"></span>`).join("");
      const reveal = r.answered
        ? `<div class="bt-reveal ${r.gained ? "ok" : "ko"}">
            <span class="bt-rcov" style="background:${gradient(a.palette)}">${covers[a.id]?.img ? `<img src="${covers[a.id].img}" alt="">` : ""}</span>
            <div>
              <p class="bt-verdict">${r.gained ? `Bien joué ! +${r.gained} pt${r.gained > 1 ? "s" : ""}` : r.picked ? "Raté" : "Passé"}</p>
              <p class="bt-rtitle">${escapeHtml(r.t.titre)}</p>
              <p class="muted">${escapeHtml(a.titre)} · ${a.date.slice(0, 4)}${r.t.streams ? ` · ${fmtStreams(r.t.streams)} streams` : ""}</p>
              <button class="bt-link" data-album="${a.id}">Voir l'album</button>
            </div>
          </div>`
        : "";
      const last = game.i >= MANCHES;
      root.innerHTML = `
        <div class="g-score">
          <span>Manche <b>${game.i}</b>/${MANCHES}</span>
          <span>Score <b>${game.score}</b></span>
          ${daily ? `<span class="dj-live">${game.history.map((h) => (h.gained ? EMOJI[h.level] : "⬛")).join("")}</span>` : `<span>Record <b>${best[bestKey()] ?? 0}</b></span>`}
        </div>
        <div class="bt-player">
          <button class="bt-play" data-act="play" aria-label="Écouter l'extrait">▶</button>
          <div class="bt-track">
            <div class="bt-bar">
              <span class="bt-avail" style="width:${r.answered ? 100 : (lvl / LEVELS.at(-1)) * 100}%"></span>
              <span class="bt-fill"></span>${marks}
            </div>
            <div class="bt-under">
              <span>${r.answered ? "Écoute la suite de l'extrait" : `Extrait : <b>${lvl} s</b> · une bonne réponse vaut <b>${pts} pt${pts > 1 ? "s" : ""}</b>`}</span>
              ${
                r.answered
                  ? ""
                  : r.level < LEVELS.length - 1
                    ? `<button class="bt-link" data-act="more">Rallonger (${LEVELS[r.level + 1]} s)</button>`
                    : `<button class="bt-link" data-act="skip">Passer</button>`
              }
            </div>
          </div>
        </div>
        <p class="bt-msg muted" role="status"></p>
        <div class="bt-choices${settings.mode === "album" ? " albums" : ""}">${r.choices.map(choiceHtml).join("")}</div>
        ${reveal}
        <div class="bt-actions">
          ${r.answered ? `<button class="g-btn" data-act="next">${last ? "Voir le résultat" : "Manche suivante →"}</button>` : ""}
          <button class="bt-link" data-act="quit">${daily ? "Abandonner" : "Quitter la partie"}</button>
        </div>`;
      syncPlayBtn();
      if (r.answered) root.querySelector('[data-act="next"]').focus();
    }

    function answer(key) {
      const r = game.round;
      if (r.answered) return;
      r.answered = true;
      r.picked = key;
      const ok = key != null && r.choices.find((c) => c.key === key)?.ok;
      r.gained = ok ? 4 - r.level : 0;
      game.score += r.gained;
      game.history.push({ t: r.t, gained: r.gained, level: r.level, picked: key });
      renderRound();
      playRest();
    }

    async function next() {
      if (game.i >= MANCHES) return renderEnd();
      const g = game;
      stop();
      const btn = root.querySelector('[data-act="next"]');
      btn.disabled = true;
      btn.textContent = "Chargement…";
      // La manche est en général déjà prête (préchargée) et le lecteur a été débloqué au
      // lancement : la lecture démarre aussitôt.
      const round = await g.next;
      if (game !== g) return;
      if (!round) return renderEnd();
      showRound(round, true);
    }

    function recapHtml(list) {
      return `<ol class="bt-recap">${list
        .map((h) => {
          const a = albums.find((x) => x.id === h.albumId);
          return `<li data-album="${a.id}" tabindex="0">
            <span class="bt-rcov sm" style="background:${gradient(a.palette)}">${covers[a.id]?.img ? `<img src="${covers[a.id].img}" alt="">` : ""}</span>
            <span class="bt-rmain"><b>${escapeHtml(h.titre)}</b><span class="muted">${escapeHtml(a.titre)}</span></span>
            <span class="bt-pts ${h.gained ? "ok" : "ko"}">${h.gained ? `${daily ? EMOJI[h.level] + " " : ""}+${h.gained} · ${LEVELS[h.level]} s` : h.picked ? "✗" : "passé"}</span>
          </li>`;
        })
        .join("")}</ol>`;
    }

    function renderEnd() {
      stop();
      const manches = game.history.map((h) => ({ titre: h.t.titre, albumId: h.t.albumId, gained: h.gained, level: h.level, picked: h.picked ?? null }));
      if (daily) {
        // Abandon : les manches non jouées comptent comme ratées
        while (manches.length < MANCHES && game.list.length) {
          const { t } = game.list.shift();
          manches.push({ titre: t.titre, albumId: t.albumId, gained: 0, level: 0, picked: null });
        }
        const d = defi();
        d.jours[game.day] = { score: game.score, manches };
        store.set(DEFI_KEY, d);
        game = null;
        return renderDailyIntro();
      }
      const key = bestKey();
      const record = game.score > (best[key] ?? -1);
      if (record) {
        best[key] = game.score;
        store.set(BEST_KEY, best);
      }
      root.innerHTML = `
        <div class="bt-end">
          <p class="g-over-title">${record && game.score > 0 ? "Nouveau record !" : "Partie terminée"}</p>
          <p class="bt-final"><b>${game.score}</b> / ${manches.length * 4} pts</p>
          <p class="muted">${manches.filter((h) => h.gained).length} bonne(s) réponse(s) sur ${manches.length} · Record : ${best[key]}</p>
          ${recapHtml(manches)}
          <div class="bt-actions">
            <button class="g-btn" data-act="start">Rejouer</button>
            <button class="bt-link" data-act="setup">Changer de mode</button>
          </div>
        </div>`;
      root.querySelector('[data-act="start"]').focus();
    }

    // ---- Événements
    root.addEventListener("click", (e) => {
      const set = e.target.closest("[data-set]");
      if (set) {
        settings[set.dataset.set] = set.dataset.val;
        return renderSetup();
      }
      const pick = e.target.closest("[data-pick]");
      if (pick) return answer(pick.dataset.pick);
      const alb = e.target.closest("[data-album]");
      if (alb) return openAlbum(alb.dataset.album);
      const btn = e.target.closest("[data-act]");
      const act = btn?.dataset.act;
      if (!act) return;
      if (act === "start") {
        if (!root.querySelector(".bt-start")) renderSetup(); // « Rejouer » depuis l'écran de fin
        return start();
      }
      if (act === "share") return share(shareText(dateKey(), defi().jours[dateKey()]), btn);
      if (act === "setup") return renderSetup();
      if (act === "quit") return daily && game ? renderEnd() : renderSetup();
      if (act === "next") return next();
      if (act === "skip") return answer(null);
      if (act === "more") {
        game.round.level++;
        renderRound();
        return playSnippet();
      }
      if (act === "play") {
        if (!mine()) load(game.round);
        if (!audio.paused) return audio.pause();
        return game.round.answered ? playRest() : playSnippet();
      }
    });

    const api = {
      tab: daily ? "defi" : "blind-test",
      // Clavier : 1-4 pour répondre, Espace pour écouter
      key(e) {
        if (e.key === "Enter" && e.target.closest?.("[data-album]")) return openAlbum(e.target.closest("[data-album]").dataset.album);
        const r = game?.round;
        if (!r || !root.querySelector(".bt-player")) return;
        if (/^[1-4]$/.test(e.key) && !r.answered) {
          const c = r.choices[+e.key - 1];
          if (c) answer(c.key);
        } else if (e.key === " " && !e.target.closest?.("button")) {
          e.preventDefault();
          root.querySelector(".bt-play").click();
        }
      },
      refresh() {
        if (game?.round && root.querySelector(".bt-player")) renderRound();
        else if (!game && daily) renderSetup(); // nouveau jour, pochettes du récap…
      },
      stop,
    };
    renderSetup();
    return api;
  }

  const games = [createGame(document.getElementById("blindtest"), false), createGame(document.getElementById("defi"), true)].filter(Boolean);

  document.addEventListener("keydown", (e) => {
    if (document.getElementById("modal").open || e.target.closest?.("input, select, textarea")) return;
    games.find((g) => g.tab === window.currentTab?.())?.key(e);
  });
  // On coupe le son quand on change d'onglet ; on rafraîchit le défi (la date a pu changer)
  document.addEventListener("tab-change", (e) => {
    for (const g of games) if (g.tab !== e.detail) g.stop();
    if (e.detail === "defi") games.find((g) => g.tab === "defi")?.refresh();
  });
  document.addEventListener("cover-loaded", () => games.forEach((g) => g.refresh()));
})();
