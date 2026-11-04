// ---------- Volume des extraits ----------
// Un seul réglage pour tout le site (fiches album, Samples, blind test, jeux), gardé dans le
// navigateur. Les lecteurs audio s'inscrivent avec Volume.register(audio) ; le bouton 🔊 de la
// barre d'onglets ouvre le curseur.
// Sur iPhone / iPad, le volume d'une page web ne se règle pas (seuls les boutons du téléphone
// comptent) : on ne garde alors que le bouton pour couper le son.

window.Volume = (() => {
  const KEY = "ye-volume";
  let level = 0.8; // 0 → 1
  let muted = false;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved && typeof saved.level === "number") level = Math.min(1, Math.max(0, saved.level));
    if (saved) muted = !!saved.muted;
  } catch {}

  const players = new Set();
  const silent = () => muted || level === 0;
  const apply = (a) => {
    a.volume = level;
    a.muted = silent();
  };
  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify({ level, muted })); } catch {}
  };

  // Le navigateur laisse-t-il régler le volume ? (non sur iOS : la valeur reste à 1)
  const probe = new Audio();
  probe.volume = 0.5;
  const canSetVolume = probe.volume === 0.5;

  const root = document.getElementById("vol");
  const btn = document.getElementById("vol-btn");
  const pop = document.getElementById("vol-pop");
  const mute = document.getElementById("vol-mute");
  const range = document.getElementById("vol-range");
  const val = document.getElementById("vol-val");

  function sync() {
    const pct = Math.round(level * 100);
    const state = silent() ? "off" : level < 0.5 ? "low" : "high";
    for (const b of [btn, mute]) b.dataset.vol = state;
    btn.setAttribute("aria-label", silent() ? "Volume : son coupé" : `Volume : ${pct} %`);
    mute.setAttribute("aria-label", silent() ? "Remettre le son" : "Couper le son");
    mute.setAttribute("aria-pressed", silent());
    range.value = muted ? 0 : pct;
    range.style.setProperty("--fill", `${muted ? 0 : pct}%`);
    val.textContent = muted ? "Coupé" : `${pct} %`;
    players.forEach(apply);
  }

  function open(on) {
    pop.hidden = !on;
    btn.setAttribute("aria-expanded", on);
  }

  if (root) {
    if (!canSetVolume) {
      range.hidden = true;
      val.textContent = "";
      pop.classList.add("no-range");
    }
    btn.addEventListener("click", () => open(pop.hidden));
    mute.addEventListener("click", () => {
      if (silent()) {
        muted = false;
        if (level === 0) level = 0.5; // remis à zéro avec le curseur : on repart à mi-volume
      } else muted = true;
      save();
      sync();
    });
    range.addEventListener("input", () => {
      level = range.value / 100;
      muted = false;
      sync();
    });
    range.addEventListener("change", save);
    // Fermer : clic ailleurs ou Échap
    document.addEventListener("click", (e) => !pop.hidden && !root.contains(e.target) && open(false));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !pop.hidden) {
        open(false);
        btn.focus();
      }
    });
    sync();
  }

  return {
    register(audio) {
      players.add(audio);
      apply(audio);
    },
  };
})();
