// ---------- Mini-lecteur d'extraits ----------
// Un seul extrait à la fois pour tout le site (fiches album, page Samples…).
//   MiniPlayer.toggle(bouton, () => Promise<url|null>)  lance / met en pause
//   MiniPlayer.stop()                                    coupe tout
// Le bouton change d'état (data-state = idle | load | play | none) ; son texte au repos est
// data-label (par défaut ▶). Les autres lecteurs du site (blind test) se coupent via l'événement
// "ye-audio", et inversement.

window.MiniPlayer = (() => {
  const audio = new Audio();
  const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=";
  let current = null;

  function setBtn(btn, mode) {
    btn.dataset.state = mode;
    btn.textContent = mode === "idle" ? btn.dataset.label || "▶" : { load: "…", play: "❚❚", none: "—" }[mode];
    btn.title = mode === "none" ? "Extrait introuvable sur iTunes" : mode === "play" ? "Pause" : "Écouter un extrait";
    btn.setAttribute("aria-label", btn.title);
    btn.disabled = mode === "none";
  }
  function stop() {
    audio.pause();
    if (current) setBtn(current, "idle");
    current = null;
  }
  const real = () => !audio.src.startsWith("data:"); // ignore le son vide de déblocage
  audio.addEventListener("ended", () => real() && stop());
  audio.addEventListener("pause", () => { if (real() && current && !audio.ended && current.dataset.state === "play") setBtn(current, "idle"); });

  async function toggle(btn, getUrl) {
    if (current === btn && !audio.paused) return stop();
    if (current === btn && real() && audio.currentTime > 0 && !audio.ended) { // reprise après pause
      document.dispatchEvent(new CustomEvent("ye-audio", { detail: "mini" }));
      return audio.play().then(() => setBtn(btn, "play")).catch(() => {});
    }
    stop();
    current = btn;
    document.dispatchEvent(new CustomEvent("ye-audio", { detail: "mini" }));
    // Lecture lancée tout de suite dans le clic (sinon Safari la bloque), la vraie source arrive ensuite
    audio.src = SILENCE;
    audio.play().catch(() => {});
    setBtn(btn, "load");
    const url = await Promise.resolve().then(getUrl).catch(() => null);
    if (current !== btn) return; // un autre bouton a été cliqué entre-temps
    if (!url) {
      current = null;
      return setBtn(btn, "none");
    }
    audio.src = url;
    audio.play().then(() => setBtn(btn, "play")).catch(() => stop());
  }

  document.addEventListener("ye-audio", (e) => { if (e.detail !== "mini") stop(); });
  document.addEventListener("tab-change", stop);
  return { toggle, stop };
})();
