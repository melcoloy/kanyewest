// ---------- Partager un résultat de jeu ----------
// Utilisé par tous les jeux (blind test, défi du jour, pochette floue, devine l'année, plus ou moins,
// qui est l'invité ?) :
//   ShareResult.text({ jeu, score, grille, vue })  → texte à partager (avec le lien du jeu)
//   ShareResult.grid([[points, max], …])           → une case par manche : 🟩 tout, 🟨 une partie, ⬛ raté
//   ShareResult.button()                           → le bouton « Partager mon score » (data-act="share-result")
//   ShareResult.share(texte, bouton[, message])    → feuille de partage sur téléphone, copie ailleurs

window.ShareResult = (() => {
  const LABEL = "📤 Partager mon score";
  const url = (vue) => location.origin + location.pathname + (vue ? "#" + vue : "");
  const grid = (manches) => manches.map(([got, max]) => (!got ? "⬛" : got >= max ? "🟩" : "🟨")).join("");
  const text = ({ jeu, score, grille = "", vue }) => [`Ye · ${jeu} — ${score}`, grille, url(vue)].filter(Boolean).join("\n");
  const button = (label = LABEL) => `<button class="g-btn ghost share-res" data-act="share-result" data-label="${label}">${label}</button>`;

  async function share(txt, btn, copied = "✓ Résultat copié") {
    const label = btn?.dataset.label || LABEL;
    const done = (msg) => {
      if (!btn) return;
      btn.textContent = msg;
      setTimeout(() => (btn.textContent = label), 2000);
    };
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ text: txt });
        return;
      } catch (e) {
        if (e.name === "AbortError") return; // partage annulé
      }
    }
    try {
      await navigator.clipboard.writeText(txt);
      done(copied);
    } catch {
      prompt("Copie ton résultat :", txt);
    }
  }

  return { text, grid, button, share, url };
})();
