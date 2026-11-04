#!/usr/bin/env node
// Test automatique du site dans un vrai navigateur (Chromium, via Playwright).
//
//   npm install --no-save playwright axe-core && npx playwright install chromium   (une fois)
//   node scripts/smoke_test.js
//
// Lancé par GitHub Actions à chaque push (.github/workflows/check-data.yml, tâche « Site »).
// Le script sert le site lui-même (petit serveur local), coupe les accès extérieurs (pochettes et
// extraits d'Apple, polices) pour que le test soit rapide et toujours identique, puis passe sur
// tous les onglets, tous les jeux, les fiches album, les liens directs et la recherche rapide,
// sur ordinateur et sur mobile. Il échoue à la moindre erreur JavaScript ou si une vérification rate.
// Accessibilité : axe-core (règles WCAG 2.1 A et AA : contrastes, noms des boutons, rôles…) sur chaque
// vue, en thème sombre et en thème clair.

"use strict";
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
let AXE = null;
try { AXE = require.resolve("axe-core/axe.min.js"); } catch {}

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

// Extrait silencieux d'une seconde : remplace les extraits d'Apple pour jouer vraiment au blind test
function silentWav(sec = 1, rate = 8000) {
  const n = sec * rate, b = Buffer.alloc(44 + n * 2);
  b.write("RIFF", 0); b.writeUInt32LE(36 + n * 2, 4); b.write("WAVE", 8); b.write("fmt ", 12);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24);
  b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write("data", 36); b.writeUInt32LE(n * 2, 40);
  return b;
}
const WAV = silentWav();
async function fakePreviews(page) {
  await page.route("**/__smoke/*.wav", (r) => r.fulfill({ body: WAV, contentType: "audio/wav" }));
  await page.evaluate(() => { Previews.ye = async (t) => `/__smoke/${encodeURIComponent(t.titre)}.wav`; });
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
  check(await exists("#gains li"), "Plus fortes hausses affichées");
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
    ["progression", "#progression", null, null], // records et badges
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

// ---- Duel à distance : A joue 10 manches et crée le lien, B l'ouvre et rejoue la même partie
async function remoteDuel(browser, base) {
  console.log("\nDuel à distance (blind test)");
  const open = async (url) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block", permissions: ["clipboard-read", "clipboard-write"] });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    await page.goto(url);
    await page.waitForTimeout(400);
    await fakePreviews(page);
    return { ctx, page, errors };
  };
  const play = async (page) => {
    const seen = [];
    for (let i = 0; i < 10; i++) {
      await page.waitForSelector("#blindtest [data-pick]", { timeout: 5000 });
      seen.push(await page.$$eval("#blindtest [data-pick]", (l) => l.map((x) => x.dataset.pick).join("/")));
      await page.click(`#blindtest [data-pick]:nth-child(${(i % 4) + 1})`);
      await page.click('#blindtest [data-act="next"]');
    }
    return seen;
  };
  const A = await open(base + "/index.html#jeux/blind-test");
  await A.page.click('#blindtest [data-act="start"]');
  const seenA = await play(A.page);
  check(await A.page.$('#blindtest [data-act="challenge"]'), "Fin de partie : bouton « Défier un ami »");
  await A.page.fill("#duel-name", "Test");
  await A.page.click('#blindtest [data-act="challenge"]');
  await A.page.waitForTimeout(150);
  const link = (await A.page.evaluate(() => navigator.clipboard.readText())).match(/https?:\/\/\S+/)?.[0];
  check(link && link.includes("?duel=1-"), "Lien de défi créé");
  const B = await open(link);
  check(await B.page.$("#blindtest .duel-intro"), "Lien ouvert : écran du défi avec le score à battre");
  await B.page.click('#blindtest [data-act="accept"]');
  const seenB = await play(B.page);
  check(seenA.every((x, i) => x === seenB[i]), "Mêmes morceaux et mêmes propositions pour les deux joueurs");
  check(await B.page.$("#blindtest .duel-rows"), "Fin du défi : les deux scores côte à côte");
  check(![...A.errors, ...B.errors].length, `Aucune erreur JavaScript${A.errors.length + B.errors.length ? " : " + [...A.errors, ...B.errors].join(" / ") : ""}`);
  await A.ctx.close();
  await B.ctx.close();
}

// ---- Accessibilité : chaque vue, en sombre puis en clair
const A11Y_VIEWS = [
  ["Discographie", "", null],
  ["Fiche album", "#album/graduation/Stronger", null],
  ["Recherche rapide", "", "quicksearch"],
  ["Comparer", "#comparer", null],
  ["Samples", "#samples", null],
  ["Invités", "#invites", ".gv-list li"],
  ["Mon classement", "#classement", null],
  ["Défi du jour", "#defi", null],
  ["Blind test", "#jeux/blind-test", null],
  ["Défi reçu (duel)", "&duel=1-abcdef-tc-0123x0123x-Test#jeux/blind-test", null],
  ["Pochette floue", "#jeux/pochette", null],
  ["Devine l'année", "#jeux/annee", '#annee [data-act="start"]'],
  ["Plus ou moins", "#jeux/plus-ou-moins", null],
  ["Qui est l'invité ?", "#jeux/invite", '#quiz-invites [data-act="start"]'],
  ["Ma progression", "#jeux/progression", null],
];
async function accessibility(browser, base) {
  console.log("\nAccessibilité (axe-core, WCAG 2.1 A et AA)");
  if (!AXE) return check(false, "axe-core n'est pas installé (npm install --no-save axe-core)");
  for (const scheme of ["dark", "light"]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, colorScheme: scheme, serviceWorkers: "block" });
    const page = await ctx.newPage();
    await page.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
    for (const [i, [name, hash, action]] of A11Y_VIEWS.entries()) {
      await page.goto(`${base}/index.html?vue=${i}${hash}`); // vrai rechargement (un simple # garderait l'état)
      await page.waitForTimeout(300);
      if (action === "quicksearch") {
        await page.keyboard.press("Control+k");
        await page.keyboard.type("stron");
      } else if (action) await page.click(action, { timeout: 5000 });
      await page.waitForTimeout(150);
      await page.addScriptTag({ path: AXE });
      const violations = await page.evaluate(async () => {
        const r = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] }, resultTypes: ["violations"] });
        return r.violations.map((v) => `${v.id} — ${v.help} (${v.nodes.length} élément${v.nodes.length > 1 ? "s" : ""} : ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")})`);
      });
      check(!violations.length, `${name} (thème ${scheme === "dark" ? "sombre" : "clair"})${violations.length ? " :\n      " + violations.join("\n      ") : ""}`);
    }
    await ctx.close();
  }
}

(async () => {
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}`;
  // Lecture audio sans clic préalable (le test lance les extraits silencieux tout seul)
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"], ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  try {
    await run(browser, base, "Ordinateur", { width: 1280, height: 900 });
    await run(browser, base, "Mobile", { width: 390, height: 844 });
    await remoteDuel(browser, base);
    await accessibility(browser, base);
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
