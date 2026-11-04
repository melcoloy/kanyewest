#!/usr/bin/env node
// Test automatique du site dans un vrai navigateur (Chromium, via Playwright).
//
//   npm install --no-save playwright && npx playwright install chromium   (une fois)
//   node scripts/smoke_test.js
//
// Lancé par GitHub Actions à chaque push (.github/workflows/check-data.yml, tâche « Site »).
// Le script sert le site lui-même (petit serveur local), coupe les accès extérieurs (pochettes et
// extraits d'Apple, polices) pour que le test soit rapide et toujours identique, puis passe sur
// tous les onglets, tous les jeux, les fiches album, les liens directs et la recherche rapide,
// sur ordinateur et sur mobile. Il échoue à la moindre erreur JavaScript ou si une vérification rate.

"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };

// ---- Petit serveur de fichiers statiques
function serve() {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (p.endsWith("/")) p += "index.html";
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("introuvable");
    }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const failures = [];
const check = (ok, msg) => {
  if (!ok) failures.push(msg);
  console.log(`  ${ok ? "✓" : "✗"} ${msg}`);
};

async function run(browser, base, label, viewport) {
  console.log(`\n${label} (${viewport.width} × ${viewport.height})`);
  const ctx = await browser.newContext({ viewport, serviceWorkers: "block" });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    // Les échecs réseau sont attendus : on coupe Apple et Google Fonts
    if (m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(m.text());
  });
  await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());

  const $ = (sel) => page.$(sel);
  const exists = async (sel) => !!(await $(sel));
  const click = (sel) => page.click(sel, { timeout: 5000 });
  const evalPage = (fn, arg) => page.evaluate(fn, arg);

  // ---- Discographie
  await page.goto(base + "/index.html");
  await page.waitForSelector(".card");
  const nCards = await page.$$eval(".card", (c) => c.length);
  const nAlbums = await evalPage(() => window.ALBUMS.length);
  check(nCards === nAlbums, `Discographie : ${nCards} cartes pour ${nAlbums} albums`);
  check(await exists("#anniv .anniv"), "Bandeau « Ce jour-là » affiché");
  check(await exists("#timeline .tl-dot"), "Frise chronologique affichée");
  check(await exists("#sp-songs li"), "Stats Spotify affichées");
  await page.fill("#search", "jay");
  await page.waitForTimeout(150);
  check(await exists("#hit-list .hit"), "Recherche « jay » : des morceaux trouvés");
  await page.fill("#search", "");

  // ---- Fiche album : toutes les fiches avec → , édition deluxe, fermeture
  await click(".card");
  check(await evalPage(() => document.getElementById("modal").open), "Fiche album ouverte au clic");
  for (let i = 1; i < nAlbums; i++) await page.keyboard.press("ArrowRight");
  check((await evalPage(() => location.hash)) === `#album/${await evalPage(() => albums.at(-1).id)}`, "Fiches parcourues avec → jusqu'au dernier album");
  if (await exists("#modal [data-edition]:not(.active)")) {
    await click("#modal [data-edition]:not(.active)");
    check(await exists("#modal .tracklist li"), "Changement d'édition : tracklist affichée");
  }
  await page.keyboard.press("Escape");
  await page.waitForTimeout(100);
  check(!(await evalPage(() => document.getElementById("modal").open)) && !(await evalPage(() => location.hash)), "Fiche fermée avec Échap, adresse remise à zéro");

  // ---- Lien direct
  await page.goto(base + "/index.html#album/graduation/Stronger");
  await page.waitForTimeout(400);
  check(
    await evalPage(() => document.getElementById("modal").open && document.querySelector(".hit-row .tr-title")?.firstChild.textContent.trim() === "Stronger"),
    "Lien #album/graduation/Stronger : fiche ouverte, morceau surligné"
  );
  await page.keyboard.press("Escape");

  // ---- Onglets
  for (const t of ["comparer", "samples", "invites", "classement", "defi"]) {
    await click(`.tab[data-tab="${t}"]`);
    await page.waitForTimeout(150);
    const ok = await evalPage((t) => !document.getElementById("panel-" + t).hidden && document.getElementById("panel-" + t).innerText.trim().length > 50, t);
    check(ok, `Onglet ${t} affiché`);
  }
  await click('.tab[data-tab="invites"]');
  await click(".gv-list li");
  check(await exists(".gv-detail .gv-facts"), "Invités : fiche d'un invité avec ses chiffres");

  // ---- Jeux : chaque jeu se lance et accepte une réponse
  await click('.tab[data-tab="jeux"]');
  const games = [
    ["blind-test", "#blindtest", '#blindtest [data-act="start"]', "#blindtest [data-pick]"],
    ["annee", "#annee", '#annee [data-act="start"]', '#annee [data-act="validate"]'],
    ["invite", "#quiz-invites", '#quiz-invites [data-act="start"]', "#quiz-invites [data-pick]"],
    ["plus-ou-moins", "#game", null, "#game [data-guess]"],
    ["pochette", "#pixel", null, null], // sans pochettes (hors ligne), le jeu reste sur son écran d'accueil
  ];
  for (const [sub, root, start, answer] of games) {
    try {
      await click(`.subtab[data-sub="${sub}"]`);
      await page.waitForTimeout(150);
      if (start) await click(start);
      // Le blind test attend son extrait (coupé ici) avant d'afficher les choix : réponse facultative
      const canAnswer = answer && (await page.waitForSelector(answer, { timeout: 2000 }).then(() => true, () => false));
      if (canAnswer) {
        await click(answer);
        await page.waitForTimeout(sub === "plus-ou-moins" ? 1700 : 150);
      }
      const ok = await evalPage((root) => document.querySelector(root)?.innerText.trim().length > 20, root);
      check(ok, `Jeu ${sub} : ${canAnswer ? "partie lancée, réponse acceptée" : start ? "partie lancée" : "affiché"}`);
    } catch (e) {
      check(false, `Jeu ${sub} : ${e.message.split("\n")[0]}`);
    }
  }

  // ---- Recherche rapide
  await page.keyboard.press("Control+k");
  await page.keyboard.type("runaway");
  await page.waitForTimeout(100);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  check((await evalPage(() => location.hash)) === "#album/mbdtf/Runaway", "Recherche rapide : « runaway » ouvre le bon morceau");
  await page.keyboard.press("Escape");

  // ---- Thème, volume
  const before = await evalPage(() => getComputedStyle(document.body).backgroundColor);
  await click("#theme-btn");
  check(before !== (await evalPage(() => getComputedStyle(document.body).backgroundColor)), "Bouton clair / sombre");
  await click("#vol-btn");
  check(await evalPage(() => !document.getElementById("vol-pop").hidden), "Réglage du volume ouvert");

  // ---- Pas de défilement horizontal
  const wide = await evalPage(() => {
    // Défilement instantané (la page utilise un défilement doux), mesuré en haut de page
    const y = scrollY;
    scrollTo({ left: 200, top: 0, behavior: "instant" });
    const x = scrollX;
    scrollTo({ left: 0, top: y, behavior: "instant" });
    if (!x) return "";
    // Éléments qui dépassent à droite, hors zones qui défilent elles-mêmes (frise, tableau…)
    const clipped = (el) => { for (let e = el.parentElement; e; e = e.parentElement) if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(e).overflowX) && e !== document.body && e !== document.documentElement) return true; return false; };
    return [...document.querySelectorAll("body *")]
      .filter((e) => e.getBoundingClientRect().right > innerWidth + 1 && e.getClientRects().length && !clipped(e))
      .slice(0, 5).map((e) => `${e.tagName.toLowerCase()}${e.id ? "#" + e.id : ""}.${[...e.classList].join(".")}`).join(", ");
  });
  check(!wide, `Pas de défilement horizontal${wide ? " (dépassent : " + wide + ")" : ""}`);

  check(!errors.length, `Aucune erreur JavaScript${errors.length ? " :\n      " + [...new Set(errors)].join("\n      ") : ""}`);
  await ctx.close();
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    await run(browser, base, "Ordinateur", { width: 1280, height: 900 });
    await run(browser, base, "Mobile", { width: 390, height: 844 });
  } catch (e) {
    failures.push(`Le test s'est arrêté : ${e.message.split("\n")[0]}`);
    console.log(`  ✗ ${failures.at(-1)}`);
  } finally {
    await browser.close();
    server.close();
  }
  console.log(failures.length ? `\n${failures.length} problème${failures.length > 1 ? "s" : ""} trouvé${failures.length > 1 ? "s" : ""}.` : "\nTout fonctionne.");
  process.exit(failures.length ? 1 : 0);
})();
