// ---------- Jeu « Plus ou moins » ----------
// Deux morceaux : le nombre de streams du premier est connu, il faut deviner si le second
// en a plus ou moins. Utilise les données de data/track-streams.js et data/stats.js.
// S'appuie sur des fonctions de app.js (albums, covers, gradient, escapeHtml, fmtNb).

(() => {
  const root = document.getElementById("game");
  if (!root) return;

  const MIN_STREAMS = 10e6;  // on écarte les morceaux trop confidentiels
  const MIN_ECART = 1.08;    // pas de duel quasi à égalité (moins de 8 % d'écart)
  const BEST_KEY = "ye-plusoumoins-best";

  // ---- Pool de morceaux (un seul exemplaire par titre, le plus écouté)
  const pool = [];
  const seen = new Set();
  const add = (titre, streams, albumId, invite) => {
    const key = titre.toLowerCase();
    if (!streams || streams < MIN_STREAMS || seen.has(key)) return;
    if (/skit|interlude|intermission|intro/i.test(titre)) return; // pas de duels sur des interludes
    seen.add(key);
    pool.push({ titre, streams, albumId, invite });
  };
  for (const [albumId, m] of Object.entries(window.TRACK_STREAMS || {})) {
    for (const [titre, streams] of Object.entries(m)) add(titre, streams, albumId);
  }
  for (const m of window.STATS?.spotify?.morceaux || []) {
    if (!m.album) add(m.titre, m.streams, null, m.invite ? m.avec : m.avec ? "avec " + m.avec : "");
  }
  if (pool.length < 2) return;

  // ---- État
  let left, right, score = 0, locked = false, recent = [];
  let best = 0;
  try { best = +localStorage.getItem(BEST_KEY) || 0; } catch {}

  const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function pickOther(ref) {
    for (let i = 0; i < 200; i++) {
      const c = rand(pool);
      if (c === ref || recent.includes(c.titre)) continue;
      const ratio = Math.max(c.streams, ref.streams) / Math.min(c.streams, ref.streams);
      if (ratio >= MIN_ECART) return c;
    }
    return rand(pool.filter((c) => c !== ref));
  }

  // ---- Rendu
  const album = (t) => (t.albumId ? albums.find((a) => a.id === t.albumId) : null);
  function cardHtml(t, side) {
    const a = album(t);
    const img = a && covers[a.id]?.img;
    const bg = a ? gradient(a.palette) : "linear-gradient(135deg,#333,#111)";
    const sub = a ? escapeHtml(a.titre) + " · " + a.date.slice(0, 4) : t.invite ? escapeHtml(t.invite) : "Hors album";
    return `
      <div class="g-card" style="background:${bg}">
        ${img ? `<img src="${img}" alt="">` : ""}
        <div class="g-shade"></div>
        <div class="g-info">
          <p class="g-title">${escapeHtml(t.titre)}</p>
          <p class="g-sub">${sub}</p>
          ${
            side === "left"
              ? `<p class="g-num">${fmtNb(t.streams)}</p><p class="g-unit">streams</p>`
              : `<p class="g-q">a…</p>
                 <div class="g-btns">
                   <button class="g-btn" data-guess="plus">▲ Plus</button>
                   <button class="g-btn" data-guess="moins">▼ Moins</button>
                 </div>
                 <p class="g-unit">de streams que «\u00a0${escapeHtml(left.titre)}\u00a0»</p>`
          }
        </div>
      </div>`;
  }

  function render() {
    root.innerHTML = `
      <div class="g-score">
        <span>Score <b id="g-score">${score}</b></span>
        <span>Record <b>${best}</b></span>
      </div>
      <div class="g-board">
        ${cardHtml(left, "left")}
        <div class="g-vs" id="g-vs">VS</div>
        <div id="g-right">${cardHtml(right, "right")}</div>
      </div>`;
  }

  function start() {
    score = 0;
    recent = [];
    left = rand(pool);
    right = pickOther(left);
    locked = false;
    render();
  }

  // Compteur animé qui révèle le nombre de streams
  function countUp(el, target, ms = 700) {
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      el.textContent = fmtNb(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function guess(choice) {
    if (locked) return;
    locked = true;
    const ok = choice === "plus" ? right.streams > left.streams : right.streams < left.streams;

    // Révèle le chiffre à la place des boutons
    const info = root.querySelector("#g-right .g-info");
    info.querySelector(".g-q").remove();
    info.querySelector(".g-btns").outerHTML = `<p class="g-num" id="g-reveal">0</p>`;
    info.querySelector(".g-unit").textContent = "streams";
    countUp(document.getElementById("g-reveal"), right.streams);

    const vs = document.getElementById("g-vs");
    vs.textContent = ok ? "✓" : "✗";
    vs.classList.add(ok ? "ok" : "ko");

    setTimeout(() => {
      if (ok) {
        score++;
        recent = [left.titre, ...recent].slice(0, 15);
        left = right;
        right = pickOther(left);
        locked = false;
        render();
      } else {
        const record = score > best;
        if (record) {
          best = score;
          try { localStorage.setItem(BEST_KEY, String(best)); } catch {}
        }
        root.insertAdjacentHTML(
          "beforeend",
          `<div class="g-over">
            <p class="g-over-title">${record && score > 0 ? "Nouveau record !" : "Perdu"}</p>
            <p>«\u00a0${escapeHtml(right.titre)}\u00a0» a ${fmtNb(right.streams)} streams, contre ${fmtNb(left.streams)} pour «\u00a0${escapeHtml(left.titre)}\u00a0».</p>
            <p>Score : <b>${score}</b> · Record : <b>${best}</b></p>
            <button class="g-btn" id="g-replay">Rejouer</button>
          </div>`
        );
        document.getElementById("g-replay").focus();
      }
    }, 1500);
  }

  root.addEventListener("click", (e) => {
    const b = e.target.closest("[data-guess]");
    if (b) return guess(b.dataset.guess);
    if (e.target.closest("#g-replay")) start();
  });

  // Une pochette arrive : on rafraîchit si elle concerne un des deux morceaux affichés
  document.addEventListener("cover-loaded", (e) => {
    if (!locked && !root.querySelector(".g-over") && [left?.albumId, right?.albumId].includes(e.detail)) render();
  });

  start();
})();