// ---------- Mode « Paroles » ----------
// Une citation (data/paroles.js) dont les mots sont cachés. On en dévoile un quart, puis la
// moitié, les trois quarts, tout : plus tu réponds tôt, plus tu marques (4 → 3 → 2 → 1).
// 4 titres proposés, dont jusqu'à 2 pièges du même album. Partie de 10 citations au plus.
// S'appuie sur app.js (albums, tracks, covers, gradient, escapeHtml, openAlbum).

(() => {
  const root = document.getElementById("paroles");
  if (!root) return;

  const STEPS = [0.25, 0.5, 0.75, 1]; // part des mots dévoilés
  const MAX_MANCHES = 10;
  const BEST_KEY = "ye-paroles-best";
  const quotes = (window.PAROLES || []).filter((q) => q && q.texte && q.titre && albums.some((a) => a.id === q.album));

  const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]/g, "");
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch {}

  // Tous les titres connus (pour les mauvaises réponses)
  const allTracks = albums.flatMap((a) =>
    (tracks[a.id] || []).filter((t) => !/skit|interlude/i.test(t.titre)).map((t) => ({ titre: t.titre, album: a.id }))
  );

  if (!quotes.length) {
    root.innerHTML = `
      <div class="pl-empty">
        <p><b>Aucune citation pour l'instant.</b></p>
        <p class="muted">Ajoute tes citations dans <code>data/paroles.js</code>, une ligne par citation :</p>
        <pre><code>{ album: "graduation", titre: "Stronger", texte: "Ta citation ici" },</code></pre>
        <p class="muted">L'<code>album</code> est l'id utilisé dans <code>data/albums.js</code> et le <code>titre</code> celui de la tracklist. Recharge la page ensuite.</p>
      </div>`;
    return;
  }

  let game = null;

  function makeChoices(q) {
    const used = new Set([norm(q.titre)]);
    const pick = (list, n) => {
      const out = [];
      for (const c of shuffle(list)) {
        if (out.length >= n) break;
        if (used.has(norm(c.titre))) continue;
        used.add(norm(c.titre));
        out.push(c.titre);
      }
      return out;
    };
    const same = pick(allTracks.filter((t) => t.album === q.album), 2);
    const rest = pick(allTracks, 3 - same.length);
    return shuffle([q.titre, ...same, ...rest]).map((titre) => ({ titre, ok: titre === q.titre }));
  }

  // Découpe en mots en gardant la ponctuation et les retours à la ligne
  const words = (texte) => texte.split(/(\s+)/).filter((w) => w.length);

  function renderIntro() {
    game = null;
    root.innerHTML = `
      <div class="bt-setup">
        <div class="bt-rules">
          <div class="bt-steps">${STEPS.map((s, i) => `<span><b>${Math.round(s * 100)} %</b>${4 - i} pt${i < 3 ? "s" : ""}</span>`).join("")}</div>
          <p class="muted">${Math.min(MAX_MANCHES, quotes.length)} citation${quotes.length > 1 ? "s" : ""} par partie (${quotes.length} au total) · Record : <b>${best || "—"}</b></p>
        </div>
        <button class="g-btn" data-act="start">Lancer la partie</button>
      </div>`;
  }

  function start() {
    const list = shuffle(quotes).slice(0, MAX_MANCHES);
    game = { list, i: 0, score: 0, history: [] };
    newRound();
  }

  function newRound() {
    const q = game.list[game.i];
    game.round = { q, words: words(q.texte), level: 0, choices: makeChoices(q), answered: false };
    render();
  }

  function render() {
    const r = game.round;
    const real = r.words.filter((w) => !/^\s+$/.test(w));
    const shown = r.answered ? real.length : Math.max(1, Math.round(real.length * STEPS[r.level]));
    let n = 0;
    const text = r.words
      .map((w) => {
        if (/^\s+$/.test(w)) return w.includes("\n") ? "<br>" : " ";
        const vis = n++ < shown;
        return `<span class="pl-w${vis ? "" : " hid"}">${vis ? escapeHtml(w) : "•".repeat(Math.min(w.length, 8))}</span>`;
      })
      .join("");
    const a = albums.find((x) => x.id === r.q.album);
    const pts = 4 - r.level;
    root.innerHTML = `
      <div class="g-score">
        <span>Citation <b>${game.i + 1}</b>/${game.list.length}</span>
        <span>Score <b>${game.score}</b></span>
        <span>Record <b>${best}</b></span>
      </div>
      <blockquote class="pl-quote">${text}</blockquote>
      <div class="bt-under pl-under">
        <span>${r.answered ? "" : `${Math.round(STEPS[r.level] * 100)} % des mots · une bonne réponse vaut <b>${pts} pt${pts > 1 ? "s" : ""}</b>`}</span>
        ${r.answered ? "" : r.level < STEPS.length - 1 ? `<button class="bt-link" data-act="more">Dévoiler plus de mots</button>` : `<button class="bt-link" data-act="skip">Passer</button>`}
      </div>
      <div class="bt-choices">${r.choices
        .map((c, i) => {
          const st = !r.answered ? "" : c.ok ? " ok" : c.titre === r.picked ? " ko" : " off";
          return `<button class="bt-choice${st}" data-pick="${escapeHtml(c.titre)}"${r.answered ? " disabled" : ""}><kbd>${i + 1}</kbd><span>${escapeHtml(c.titre)}</span></button>`;
        })
        .join("")}</div>
      ${
        r.answered
          ? `<div class="bt-reveal ${r.gained ? "ok" : "ko"}">
              <span class="bt-rcov" style="background:${gradient(a.palette)}">${covers[a.id]?.img ? `<img src="${covers[a.id].img}" alt="">` : ""}</span>
              <div>
                <p class="bt-verdict">${r.gained ? `Bien joué ! +${r.gained} pt${r.gained > 1 ? "s" : ""}` : r.picked ? "Raté" : "Passé"}</p>
                <p class="bt-rtitle">${escapeHtml(r.q.titre)}</p>
                <p class="muted">${escapeHtml(a.titre)} · ${a.date.slice(0, 4)}</p>
                <button class="bt-link" data-album="${a.id}">Voir l'album</button>
              </div>
            </div>`
          : ""
      }
      <div class="bt-actions">
        ${r.answered ? `<button class="g-btn" data-act="next">${game.i + 1 >= game.list.length ? "Voir le résultat" : "Citation suivante →"}</button>` : ""}
        <button class="bt-link" data-act="quit">Quitter la partie</button>
      </div>`;
    if (r.answered) root.querySelector('[data-act="next"]').focus();
  }

  function answer(titre) {
    const r = game.round;
    if (r.answered) return;
    r.answered = true;
    r.picked = titre;
    r.gained = titre === r.q.titre ? 4 - r.level : 0;
    game.score += r.gained;
    game.history.push({ q: r.q, gained: r.gained });
    render();
  }

  function end() {
    const record = game.score > best;
    if (record) {
      best = game.score;
      try { localStorage.setItem(BEST_KEY, String(best)); } catch {}
    }
    root.innerHTML = `
      <div class="bt-end">
        <p class="g-over-title">${record && game.score > 0 ? "Nouveau record !" : "Partie terminée"}</p>
        <p class="bt-final"><b>${game.score}</b> / ${game.list.length * 4} pts</p>
        <div class="bt-actions">
          <button class="g-btn" data-act="start">Rejouer</button>
        </div>
      </div>`;
  }

  root.addEventListener("click", (e) => {
    const pick = e.target.closest("[data-pick]");
    if (pick) return answer(pick.dataset.pick);
    const alb = e.target.closest("[data-album]");
    if (alb) return openAlbum(alb.dataset.album);
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "start") return start();
    if (act === "quit") return renderIntro();
    if (act === "skip") return answer(null);
    if (act === "more") { game.round.level++; return render(); }
    if (act === "next") {
      game.i++;
      return game.i >= game.list.length ? end() : newRound();
    }
  });

  document.addEventListener("keydown", (e) => {
    if (window.currentTab?.() !== "paroles" || document.getElementById("modal").open || !game?.round || game.round.answered) return;
    if (/^[1-4]$/.test(e.key)) answer(game.round.choices[+e.key - 1].titre);
  });

  renderIntro();
})();
