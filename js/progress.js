// ---------- Ma progression : records, défi du jour, badges ----------
// Lit ce que les jeux gardent déjà dans le navigateur (records, résultats du défi, classements)
// et y ajoute deux choses : les fiches album ouvertes et les albums écoutés à la suite jusqu'au bout.
//   Progress.seen(albumId)  une fiche a été ouverte          (app.js)
//   Progress.queueDone()    écoute à la suite allée au bout  (app.js)
//   Progress.check()        après une partie : badges débloqués → notification
// La page s'affiche dans Jeux → Ma progression (#jeux/progression). Rien ne quitte le navigateur.
// S'appuie sur app.js (albums, allTracks, escapeHtml).

window.Progress = (() => {
  const KEY = "ye-progression"; // { seen: [ids], queueDone: n, badges: { id: "AAAA-MM-JJ" } }
  const get = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
  const first = get(KEY, null) === null; // première visite depuis l'arrivée des badges
  const data = { seen: [], queueDone: 0, badges: {}, ...get(KEY, {}) };
  const save = () => set(KEY, data);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const addDays = (k, n) => {
    const d = new Date(k + "T12:00:00");
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // ---- Tous les chiffres, relus à chaque fois (les jeux écrivent directement dans le navigateur)
  const TIERS = ["S", "A", "B", "C", "D"];
  const placed = (st) => TIERS.reduce((n, t) => n + ((st || {})[t] || []).length, 0);
  function stats() {
    const bt = get("ye-blindtest-best", {});
    const btVals = (chrono) => Object.entries(bt).filter(([k]) => k.endsWith("-chrono") === chrono).map(([, v]) => v);
    const jours = get("ye-defi", { jours: {} }).jours || {};
    const days = Object.keys(jours).sort();
    let bestRun = 0, run = 0, prev = null;
    for (const k of days) {
      run = prev && addDays(prev, 1) === k ? run + 1 : 1;
      bestRun = Math.max(bestRun, run);
      prev = k;
    }
    let cur = 0;
    for (let k = jours[today()] ? today() : addDays(today(), -1); jours[k]; k = addDays(k, -1)) cur++;
    // Classements : tous les albums ; morceaux d'un album entièrement classés
    const albumsRanked = placed(get("ye-classement", {}));
    const tracksRanked = albums.filter((a) => {
      const n = allTracks(a.id).filter((t) => !/\(skit/i.test(t.titre)).length;
      return n && placed(get(`ye-classement-${a.id}`, {})) >= n;
    }).length;
    return {
      bt: Math.max(0, ...btVals(false)),
      btChrono: Math.max(0, ...btVals(true)),
      btPlayed: Object.keys(bt).length > 0,
      defiPlayed: days.length,
      defiBest: Math.max(0, ...days.map((k) => jours[k].score || 0)),
      defiCur: cur,
      defiRun: bestRun,
      pochette: +get("ye-pochette-best", 0) || 0,
      annee: +get("ye-annee-best", 0) || 0,
      pom: +get("ye-plusoumoins-best", 0) || 0,
      invite: +get("ye-invite-best", 0) || 0,
      albumsRanked,
      tracksRanked,
      seen: data.seen.filter((id) => albums.some((a) => a.id === id)).length,
      queueDone: data.queueDone,
    };
  }

  // ---- Badges : [id, icône, nom, comment l'obtenir, (stats) → [valeur, objectif]]
  const N = albums.length;
  const BADGES = [
    ["curieux", "🔎", "Curieux", "Ouvrir 5 fiches album", (s) => [s.seen, 5]],
    ["encyclopedie", "📚", "Encyclopédie", `Ouvrir les ${N} fiches album`, (s) => [s.seen, N]],
    ["melomane", "🎧", "Mélomane", "Écouter un album à la suite jusqu'au dernier extrait", (s) => [s.queueDone, 1]],
    ["critique", "⚖️", "Critique", `Classer les ${N} albums dans Mon classement`, (s) => [s.albumsRanked, N]],
    ["puriste", "🧩", "Puriste", "Classer tous les morceaux d'un album", (s) => [s.tracksRanked, 1]],
    ["oreille", "👂", "Bonne oreille", "20 points au blind test (10 manches)", (s) => [s.bt, 20]],
    ["oreille-absolue", "🎯", "Oreille absolue", "40 / 40 au blind test", (s) => [s.bt, 40]],
    ["chrono", "⏱️", "Contre la montre", "30 points en 60 s au blind test", (s) => [s.btChrono, 30]],
    ["regulier", "📅", "Régulier", "Défi du jour 3 jours de suite", (s) => [s.defiRun, 3]],
    ["assidu", "🔥", "Assidu", "Défi du jour 7 jours de suite", (s) => [s.defiRun, 7]],
    ["defi-parfait", "💯", "Défi parfait", "20 / 20 au défi du jour", (s) => [s.defiBest, 20]],
    ["oeil", "👀", "Bon œil", "24 / 32 à la pochette floue", (s) => [s.pochette, 24]],
    ["oeil-de-lynx", "🐆", "Œil de lynx", "32 / 32 à la pochette floue", (s) => [s.pochette, 32]],
    ["historien", "🗓️", "Historien", "40 / 50 à devine l'année", (s) => [s.annee, 40]],
    ["flair", "📈", "Flair", "10 bonnes réponses d'affilée à plus ou moins", (s) => [s.pom, 10]],
    ["flair-absolu", "🚀", "Flair absolu", "25 bonnes réponses d'affilée à plus ou moins", (s) => [s.pom, 25]],
    ["carnet", "🤝", "Carnet d'adresses", "16 / 20 à qui est l'invité ?", (s) => [s.invite, 16]],
    ["carnet-complet", "🏆", "Carnet complet", "20 / 20 à qui est l'invité ?", (s) => [s.invite, 20]],
  ].map(([id, icon, nom, desc, goal]) => ({ id, icon, nom, desc, goal }));

  // ---- Notification « badge débloqué »
  let toastTimer = 0;
  function toast(list) {
    let el = document.getElementById("badge-toast");
    if (!el) {
      el = Object.assign(document.createElement("button"), { id: "badge-toast", className: "badge-toast", type: "button" });
      // En « popover », la notification passe au-dessus d'une fiche album ouverte
      if (el.showPopover) el.popover = "manual";
      el.addEventListener("click", () => {
        hide();
        document.getElementById("modal").close();
        window.showTab?.("jeux", "progression");
      });
      document.body.append(el);
    }
    el.innerHTML = list.length === 1
      ? `<span class="bt-ico">${list[0].icon}</span><span><small>Badge débloqué</small><b>${escapeHtml(list[0].nom)}</b></span>`
      : `<span class="bt-ico">🏆</span><span><small>${list.length} badges débloqués</small><b>${list.map((b) => escapeHtml(b.nom)).join(", ")}</b></span>`;
    el.setAttribute("aria-label", `Badge débloqué : ${list.map((b) => b.nom).join(", ")}. Voir ma progression`);
    if (el.showPopover) {
      try { el.hidePopover(); } catch {}
      el.showPopover(); // remis au premier plan, même au-dessus d'une fenêtre ouverte depuis
    }
    requestAnimationFrame(() => el.classList.add("on"));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, 5000);
  }
  function hide() {
    const el = document.getElementById("badge-toast");
    if (!el) return;
    el.classList.remove("on");
    setTimeout(() => { if (!el.classList.contains("on")) try { el.hidePopover?.(); } catch {} }, 400);
  }

  function check({ silent = false } = {}) {
    const s = stats();
    const fresh = BADGES.filter((b) => !data.badges[b.id] && b.goal(s)[0] >= b.goal(s)[1]);
    if (!fresh.length) return;
    fresh.forEach((b) => (data.badges[b.id] = today()));
    save();
    if (!silent) toast(fresh);
    render();
  }

  // ---- Page « Ma progression »
  const root = document.getElementById("progression");
  const fmtDay = (k) => new Date(k + "T12:00:00").toLocaleDateString("fr-BE", { day: "numeric", month: "long" });
  function render() {
    if (!root) return;
    const s = stats();
    const got = BADGES.filter((b) => data.badges[b.id]).length;
    const rec = (titre, val, sub, vue) => `
      <button class="pg-rec" data-go="${vue}">
        <span class="pg-rec-t">${titre}</span>
        <b>${val}</b>
        <span class="muted">${sub}</span>
      </button>`;
    const score = (v, max) => (v ? `${v}<small> / ${max}</small>` : "—");
    root.innerHTML = `
      <div class="pg-head">
        <div class="pg-count"><b>${got}</b> badge${got > 1 ? "s" : ""} sur ${BADGES.length}</div>
        <div class="pg-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${BADGES.length}" aria-valuenow="${got}" aria-label="Badges débloqués"><span style="width:${(got / BADGES.length) * 100}%"></span></div>
      </div>

      <h3 class="pg-h">Records</h3>
      <div class="pg-recs">
        ${rec("Blind test", score(s.bt, 40), "10 manches", "jeux/blind-test")}
        ${rec("Contre la montre", s.btChrono ? `${s.btChrono}<small> pts</small>` : "—", "blind test en 60 s", "jeux/blind-test")}
        ${rec("Défi du jour", score(s.defiBest, 20), s.defiPlayed ? `${s.defiPlayed} jour${s.defiPlayed > 1 ? "s" : ""} joué${s.defiPlayed > 1 ? "s" : ""} · série : ${s.defiCur} (record ${s.defiRun})` : "pas encore joué", "defi")}
        ${rec("Pochette floue", score(s.pochette, 32), "8 pochettes", "jeux/pochette")}
        ${rec("Devine l'année", score(s.annee, 50), "10 morceaux", "jeux/annee")}
        ${rec("Plus ou moins", s.pom ? `${s.pom}<small> d'affilée</small>` : "—", "meilleure série", "jeux/plus-ou-moins")}
        ${rec("Qui est l'invité ?", score(s.invite, 20), "10 morceaux", "jeux/invite")}
        ${rec("Mon classement", `${s.albumsRanked}<small> / ${N}</small>`, `albums classés${s.tracksRanked ? ` · ${s.tracksRanked} album${s.tracksRanked > 1 ? "s" : ""} classé${s.tracksRanked > 1 ? "s" : ""} morceau par morceau` : ""}`, "classement")}
        ${rec("Fiches album", `${s.seen}<small> / ${N}</small>`, "ouvertes au moins une fois", "disco")}
      </div>

      <h3 class="pg-h">Badges</h3>
      <ul class="pg-badges">${BADGES.map((b) => {
        const [v, goal] = b.goal(s);
        const on = !!data.badges[b.id];
        return `<li class="pg-badge${on ? " on" : ""}">
          <span class="pg-ico" aria-hidden="true">${b.icon}</span>
          <span class="pg-main"><b>${escapeHtml(b.nom)}</b><span>${escapeHtml(b.desc)}</span>
            ${on ? `<span class="pg-date">Débloqué le ${fmtDay(data.badges[b.id])}</span>` : goal > 1 ? `<span class="pg-prog"><span style="width:${Math.min(100, (v / goal) * 100)}%"></span></span><span class="pg-date">${Math.min(v, goal)} / ${goal}</span>` : ""}
          </span>
          <span class="visually-hidden">${on ? "débloqué" : "pas encore débloqué"}</span>
        </li>`;
      }).join("")}</ul>
      <p class="muted pg-note">Tout est gardé dans ce navigateur, sans compte : sur un autre appareil, la progression repart de zéro.</p>`;
  }

  root?.addEventListener("click", (e) => {
    const go = e.target.closest("[data-go]")?.dataset.go;
    if (!go) return;
    const [tab, sub = ""] = go.split("/");
    window.showTab?.(tab, sub);
  });
  // La page se met à jour quand on l'ouvre (les records ont pu changer entre-temps)
  document.addEventListener("tab-change", (e) => { if (e.detail === "jeux/progression") render(); });

  // Première visite : les badges déjà mérités sont débloqués sans notification
  check({ silent: first });
  if (first) save();
  render();

  return {
    seen(id) {
      if (data.seen.includes(id)) return;
      data.seen.push(id);
      save();
      check();
    },
    queueDone() {
      data.queueDone++;
      save();
      check();
    },
    check: () => check(),
  };
})();
