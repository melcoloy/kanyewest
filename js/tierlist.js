// ---------- « Mon classement » (tier list des albums) ----------
// Glisser-déposer les pochettes dans les rangs S → D (souris ou doigt).
// Sans glisser : clique / tape une pochette puis un rang, ou au clavier : sélectionne une
// pochette (Entrée) puis appuie sur S, A, B, C, D (ou 0 pour la remettre « à classer »).
// Le classement est gardé dans le navigateur et peut être exporté en image PNG.
// S'appuie sur app.js (albums, covers, gradient, escapeHtml, initials).

(() => {
  const root = document.getElementById("tierlist");
  if (!root) return;

  const TIERS = [
    { id: "S", color: "#e4c06a" },
    { id: "A", color: "#9fd36a" },
    { id: "B", color: "#6ac3d3" },
    { id: "C", color: "#8f8ae0" },
    { id: "D", color: "#d97a8c" },
  ];
  const KEY = "ye-classement";
  const ids = albums.map((a) => a.id);
  const byId = Object.fromEntries(albums.map((a) => [a.id, a]));

  // ---- État : { S: [...], A: [...], ..., pool: [...] }
  function load() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
    const st = { pool: [] };
    const placed = new Set();
    for (const t of TIERS) {
      st[t.id] = (saved[t.id] || []).filter((id) => byId[id] && !placed.has(id));
      st[t.id].forEach((id) => placed.add(id));
    }
    st.pool = ids.filter((id) => !placed.has(id)); // nouveaux albums → « à classer »
    return st;
  }
  let state = load();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };
  let selected = null;

  // ---- Rendu
  const tile = (id) => {
    const a = byId[id];
    const img = covers[id]?.img;
    return `<button class="tl-tile${selected === id ? " selected" : ""}" data-id="${id}" title="${escapeHtml(a.titre)} (${a.date.slice(0, 4)})" aria-label="${escapeHtml(a.titre)}" style="background:${gradient(a.palette)}">
      ${img ? `<img src="${img}" alt="" draggable="false">` : `<span>${initials(a.titre)}</span>`}
    </button>`;
  };

  function render() {
    const nbPlaced = ids.length - state.pool.length;
    root.innerHTML = `
      <div class="tl-bar">
        <p class="muted">${nbPlaced}/${ids.length} albums classés · Glisse les pochettes, ou clique sur une pochette puis sur un rang.</p>
        <div class="tl-btns">
          <button class="g-btn" data-act="export"${nbPlaced ? "" : " disabled"}>Exporter en image</button>
          <button class="bt-link" data-act="reset">Tout remettre à zéro</button>
        </div>
      </div>
      <div class="tl-board">
        ${TIERS.map(
          (t) => `<div class="tl-row">
            <div class="tl-label" style="background:${t.color}">${t.id}</div>
            <div class="tl-zone" data-zone="${t.id}" aria-label="Rang ${t.id}">${state[t.id].map(tile).join("")}</div>
          </div>`
        ).join("")}
      </div>
      <p class="bt-label tl-pool-label">À classer</p>
      <div class="tl-zone tl-pool" data-zone="pool" aria-label="Albums à classer">${state.pool.map(tile).join("") || `<span class="muted tl-done">Tous les albums sont classés 🎉</span>`}</div>`;
  }

  function move(id, zone, index = Infinity) {
    for (const k of Object.keys(state)) state[k] = state[k].filter((x) => x !== id);
    state[zone].splice(Math.min(index, state[zone].length), 0, id);
    selected = null;
    save();
    render();
    root.querySelector(`.tl-tile[data-id="${id}"]`)?.focus({ preventScroll: true });
  }

  // ---- Glisser-déposer (pointer events : marche à la souris et au doigt)
  let drag = null; // { id, el, ghost, startX, startY, active }
  root.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".tl-tile");
    if (!el || e.button !== 0) return;
    drag = { id: el.dataset.id, el, startX: e.clientX, startY: e.clientY, active: false };
  });

  window.addEventListener("pointermove", (e) => {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
      drag.active = true;
      const r = drag.el.getBoundingClientRect();
      drag.dx = drag.startX - r.left;
      drag.dy = drag.startY - r.top;
      drag.ghost = drag.el.cloneNode(true);
      drag.ghost.classList.add("tl-ghost");
      drag.ghost.style.width = r.width + "px";
      drag.ghost.style.height = r.height + "px";
      document.body.appendChild(drag.ghost);
      drag.el.classList.add("tl-placeholder");
      root.classList.add("dragging");
    }
    e.preventDefault();
    // Défilement automatique près des bords de l'écran
    if (e.clientY < 70) scrollBy(0, -12);
    else if (e.clientY > innerHeight - 50) scrollBy(0, 12);
    drag.ghost.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px)`;
    // Zone sous le doigt : on y déplace la pochette en direct, à la bonne position
    const zone = document.elementFromPoint(e.clientX, e.clientY)?.closest(".tl-zone");
    root.querySelectorAll(".tl-zone.over").forEach((z) => z !== zone && z.classList.remove("over"));
    if (!zone) return;
    zone.classList.add("over");
    zone.querySelector(".tl-done")?.remove();
    const others = [...zone.querySelectorAll(".tl-tile:not(.tl-placeholder)")];
    // Première pochette située après le doigt (ligne suivante, ou même ligne mais plus à droite)
    const before = others.find((t) => {
      const r = t.getBoundingClientRect();
      if (e.clientY < r.top) return true;
      return e.clientY <= r.bottom && e.clientX < r.left + r.width / 2;
    });
    if (before) { if (drag.el.nextElementSibling !== before) zone.insertBefore(drag.el, before); }
    else if (zone.lastElementChild !== drag.el) zone.appendChild(drag.el);
  }, { passive: false });

  function endDrag(cancel) {
    if (!drag) return;
    const d = drag;
    drag = null;
    if (!d.active) return;
    d.ghost.remove();
    root.classList.remove("dragging");
    root.querySelectorAll(".tl-zone.over").forEach((z) => z.classList.remove("over"));
    if (cancel) return render();
    // L'ordre affiché devient le nouvel état
    for (const z of root.querySelectorAll(".tl-zone")) state[z.dataset.zone] = [...z.querySelectorAll(".tl-tile")].map((t) => t.dataset.id);
    selected = null;
    save();
    render();
    suppressClick = true;
    setTimeout(() => (suppressClick = false), 0);
  }
  let suppressClick = false;
  window.addEventListener("pointerup", () => endDrag(false));
  window.addEventListener("pointercancel", () => endDrag(true));

  // ---- Clic / tap : sélectionner puis choisir un rang
  root.addEventListener("click", (e) => {
    if (suppressClick) return;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "reset") {
      if (!confirm("Remettre tous les albums dans « À classer » ?")) return;
      state = { pool: [...ids], ...Object.fromEntries(TIERS.map((t) => [t.id, []])) };
      selected = null;
      save();
      return render();
    }
    if (act === "export") return exportPng(e.target.closest("[data-act]"));
    const t = e.target.closest(".tl-tile");
    if (t) {
      selected = selected === t.dataset.id ? null : t.dataset.id;
      root.querySelectorAll(".tl-tile").forEach((x) => x.classList.toggle("selected", x.dataset.id === selected));
      return;
    }
    const zone = e.target.closest(".tl-zone, .tl-row");
    if (zone && selected) move(selected, zone.dataset.zone || zone.querySelector(".tl-zone").dataset.zone);
  });

  root.addEventListener("keydown", (e) => {
    const t = e.target.closest(".tl-tile");
    if (!t) return;
    const k = e.key.toUpperCase();
    if (TIERS.some((x) => x.id === k)) { e.preventDefault(); move(t.dataset.id, k); }
    else if (k === "0" || k === "BACKSPACE" || k === "DELETE") { e.preventDefault(); move(t.dataset.id, "pool"); }
  });

  // ---- Export PNG (fond sombre, comme une image à partager)
  function loadImg(src) {
    return new Promise((res) => {
      if (!src) return res(null);
      const img = new Image();
      img.crossOrigin = "anonymous"; // sans ça, le canvas refuserait l'export
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = src;
    });
  }

  async function exportPng(btn) {
    btn.disabled = true;
    btn.textContent = "Création…";
    const S = 2; // résolution x2
    const W = 1200, LABEL = 110, TILE = 104, GAP = 8, PAD = 24, HEAD = 84;
    const perLine = Math.floor((W - PAD * 2 - LABEL - GAP) / (TILE + GAP));
    const rows = TIERS.filter((t) => state[t.id].length);
    const rowH = (n) => Math.max(1, Math.ceil(n / perLine)) * (TILE + GAP) + GAP;
    const H = HEAD + rows.reduce((h, t) => h + rowH(state[t.id].length) + 6, 0) + PAD + 24;

    const cv = document.createElement("canvas");
    cv.width = W * S;
    cv.height = H * S;
    const ctx = cv.getContext("2d");
    ctx.scale(S, S);
    ctx.fillStyle = "#0b0b0c";
    ctx.fillRect(0, 0, W, H);
    const font = (w, px) => `${w} ${px}px "Archivo Black", Inter, system-ui, sans-serif`;
    ctx.fillStyle = "#f2f2f2";
    ctx.font = font(900, 30);
    ctx.textBaseline = "alphabetic";
    ctx.fillText("MON CLASSEMENT", PAD, 50);
    ctx.fillStyle = "#9a9aa2";
    ctx.font = `500 16px Inter, system-ui, sans-serif`;
    ctx.fillText("Kanye West / Ye — albums studio", PAD, 72);

    const imgs = Object.fromEntries(await Promise.all(ids.map(async (id) => [id, await loadImg(covers[id]?.img)])));
    let y = HEAD;
    for (const t of rows) {
      const h = rowH(state[t.id].length);
      ctx.fillStyle = t.color;
      ctx.fillRect(PAD, y, LABEL, h);
      ctx.fillStyle = "#151517";
      ctx.fillRect(PAD + LABEL, y, W - PAD * 2 - LABEL, h);
      ctx.fillStyle = "#0b0b0c";
      ctx.font = font(900, 44);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t.id, PAD + LABEL / 2, y + h / 2);
      state[t.id].forEach((id, i) => {
        const x = PAD + LABEL + GAP + (i % perLine) * (TILE + GAP);
        const ty = y + GAP + Math.floor(i / perLine) * (TILE + GAP);
        const a = byId[id];
        if (imgs[id]) ctx.drawImage(imgs[id], x, ty, TILE, TILE);
        else {
          const g = ctx.createLinearGradient(x, ty, x + TILE, ty + TILE);
          g.addColorStop(0, a.palette[0]);
          g.addColorStop(1, a.palette[1]);
          ctx.fillStyle = g;
          ctx.fillRect(x, ty, TILE, TILE);
          ctx.fillStyle = "rgba(255,255,255,.9)";
          ctx.font = font(900, 26);
          ctx.fillText(initials(a.titre), x + TILE / 2, ty + TILE / 2);
        }
      });
      ctx.textAlign = "left";
      y += h + 6;
    }
    ctx.fillStyle = "#62626a";
    ctx.font = `400 13px Inter, system-ui, sans-serif`;
    ctx.textBaseline = "alphabetic";
    ctx.fillText(location.host || "Ye — Discographie interactive", PAD, H - 18);

    cv.toBlob((blob) => {
      btn.disabled = false;
      btn.textContent = "Exporter en image";
      if (!blob) return alert("Export impossible dans ce navigateur.");
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ye-mon-classement.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/png");
  }

  let coverTimer = 0;
  document.addEventListener("cover-loaded", () => {
    clearTimeout(coverTimer);
    coverTimer = setTimeout(() => { if (!drag) render(); }, 200);
  });
  render();
})();
