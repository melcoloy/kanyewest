#!/usr/bin/env node
// Vérifie la cohérence des données du site avant la mise en ligne.
//
//   node scripts/check_data.js
//
// Lancé automatiquement par GitHub Actions à chaque push et pull request
// (.github/workflows/check-data.yml), et après la mise à jour des streams du lundi.
// Erreur (✗) = quelque chose casserait l'affichage : le contrôle échoue.
// Avertissement (!) = à vérifier, mais le site fonctionne : le contrôle passe quand même.
// Aucune dépendance : Node.js 18+.

"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const errors = [];
const warnings = [];
const err = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

// ---------------------------------------------------------------- chargement des fichiers data/*.js
const DATA = ["albums", "tracklists", "stats", "track-streams", "track-streams-prev", "samples", "history"];
const sandbox = { window: {} };
vm.createContext(sandbox);
for (const f of DATA) {
  const file = path.join(ROOT, "data", f + ".js");
  if (!fs.existsSync(file)) {
    err(`data/${f}.js : fichier manquant`);
    continue;
  }
  try {
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: `data/${f}.js` });
  } catch (e) {
    err(`data/${f}.js : erreur de syntaxe JavaScript — ${e.message}`);
  }
}
const W = sandbox.window;

// ---------------------------------------------------------------- utilitaires
const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
const isInt = (x) => Number.isInteger(x);
const isDate = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return !isNaN(d) && d.toISOString().slice(0, 10) === s;
};
const isColor = (s) => typeof s === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s);
const DURATION = /^\d{1,2}:[0-5]\d$/;

// "Titre | Invités | Durée" → { titre, feats, duree }, en signalant les lignes mal formées
function parseLine(line, where) {
  if (typeof line !== "string") {
    err(`${where} : la ligne n'est pas un texte (${JSON.stringify(line)})`);
    return null;
  }
  const parts = line.split("|").map((x) => x.trim());
  if (parts.length > 3) err(`${where} : trop de « | » dans "${line}" (format : "Titre | Invités | Durée")`);
  const [titre, feats = "", duree = ""] = parts;
  if (!titre) err(`${where} : titre vide dans "${line}"`);
  if (duree && !DURATION.test(duree)) err(`${where} : durée "${duree}" invalide pour « ${titre} » (format attendu : 3:21)`);
  const featList = feats ? feats.split(/,\s*/) : [];
  if (featList.some((f) => !f.trim())) err(`${where} : invité vide (virgule en trop ?) pour « ${titre} »`);
  return { titre, feats: featList, duree };
}

// ---------------------------------------------------------------- albums
const albums = Array.isArray(W.ALBUMS) ? W.ALBUMS : [];
if (!Array.isArray(W.ALBUMS)) err("data/albums.js : window.ALBUMS doit être une liste");
const ids = new Set();
for (const [i, a] of albums.entries()) {
  const where = `data/albums.js, album ${a?.id ? `« ${a.id} »` : `n° ${i + 1}`}`;
  if (!isObj(a)) { err(`${where} : ce n'est pas un objet`); continue; }
  if (typeof a.id !== "string" || !/^[a-z0-9-]+$/.test(a.id)) err(`${where} : id invalide (minuscules, chiffres et tirets)`);
  else if (ids.has(a.id)) err(`${where} : id en double`);
  else ids.add(a.id);
  if (!a.titre) err(`${where} : titre manquant`);
  if (!isDate(a.date)) err(`${where} : date "${a.date}" invalide (format AAAA-MM-JJ)`);
  if (!["solo", "collab"].includes(a.type)) err(`${where} : type "${a.type}" invalide ("solo" ou "collab")`);
  if (!Array.isArray(a.palette) || a.palette.length !== 2 || !a.palette.every(isColor)) err(`${where} : palette invalide (2 couleurs "#rrggbb")`);
  if (a.billboard != null && !(isInt(a.billboard) && a.billboard >= 1 && a.billboard <= 200)) err(`${where} : billboard doit être un entier de 1 à 200 ou null`);
  if (a.pistes != null && !(isInt(a.pistes) && a.pistes > 0)) err(`${where} : pistes doit être un entier positif ou null`);
  for (const k of ["titresCles", "distinctions"]) if (!Array.isArray(a[k])) err(`${where} : ${k} doit être une liste`);
  for (const k of ["label", "ere", "resume"]) if (!a[k]) warn(`${where} : champ « ${k} » vide`);
  if (a.cover && !/^https?:\/\//.test(a.cover) && !fs.existsSync(path.join(ROOT, a.cover))) err(`${where} : pochette "${a.cover}" introuvable`);
}
const albumIds = [...ids];
const knownAlbum = (id) => ids.has(id);

// ---------------------------------------------------------------- tracklists et éditions
const tracks = {}; // id → [{ titre, feats, duree }]
const TL = W.TRACKLISTS || {};
if (!isObj(W.TRACKLISTS)) err("data/tracklists.js : window.TRACKLISTS manquant");
for (const [id, lines] of Object.entries(TL)) {
  const where = `data/tracklists.js, « ${id} »`;
  if (!knownAlbum(id)) err(`${where} : aucun album avec cet id dans data/albums.js`);
  if (!Array.isArray(lines) || !lines.length) { err(`${where} : tracklist vide`); continue; }
  tracks[id] = lines.map((l, i) => parseLine(l, `${where}, piste ${i + 1}`)).filter(Boolean);
  const seen = new Set();
  for (const t of tracks[id]) {
    if (seen.has(t.titre)) err(`${where} : « ${t.titre} » apparaît deux fois`);
    seen.add(t.titre);
  }
}
for (const a of albums) {
  if (!TL[a.id]) warn(`data/tracklists.js : pas de tracklist pour « ${a.id} »`);
  else if (a.pistes != null && a.pistes !== TL[a.id].length)
    warn(`« ${a.id} » : pistes = ${a.pistes} dans data/albums.js, mais ${TL[a.id].length} titres dans data/tracklists.js`);
}
for (const id of Object.keys(W.TRACKLIST_NOTES || {})) if (!knownAlbum(id)) err(`data/tracklists.js, TRACKLIST_NOTES : album « ${id} » inconnu`);

const editionTracks = {}; // id → Set des titres de toutes les éditions
for (const [id, eds] of Object.entries(W.TRACKLIST_EDITIONS || {})) {
  const where = `data/tracklists.js, TRACKLIST_EDITIONS « ${id} »`;
  if (!knownAlbum(id)) err(`${where} : album inconnu`);
  if (!Array.isArray(eds)) { err(`${where} : doit être une liste d'éditions`); continue; }
  const edIds = new Set();
  const std = new Set((tracks[id] || []).map((t) => t.titre));
  for (const e of eds) {
    const w = `${where}, édition « ${e?.id} »`;
    if (!e?.id || e.id === "standard" || edIds.has(e.id)) err(`${w} : id manquant, en double ou réservé ("standard")`);
    edIds.add(e?.id);
    if (!e?.nom) err(`${w} : nom manquant`);
    if (e?.date && !isDate(e.date)) err(`${w} : date "${e.date}" invalide`);
    if (!Array.isArray(e?.pistes) || !e.pistes.length) { err(`${w} : pistes manquantes`); continue; }
    const titres = new Set(e.pistes.map((l, i) => parseLine(l, `${w}, piste ${i + 1}`)?.titre));
    editionTracks[id] ??= new Set();
    titres.forEach((t) => editionTracks[id].add(t));
    for (const t of e.nouveaux || []) {
      if (!titres.has(t)) err(`${w} : « ${t} » est dans « nouveaux » mais pas dans les pistes de l'édition`);
      else if (std.has(t)) warn(`${w} : « ${t} » est marqué « nouveau » mais existe déjà dans l'édition standard`);
    }
    for (const t of Object.keys(e.modifies || {})) if (!titres.has(t)) err(`${w} : « ${t} » est dans « modifies » mais pas dans les pistes de l'édition`);
  }
}
// Tous les titres d'un album, toutes éditions confondues
const allTitles = (id) => new Set([...(tracks[id] || []).map((t) => t.titre), ...(editionTracks[id] || [])]);

for (const a of albums) {
  if (!tracks[a.id]) continue;
  const all = allTitles(a.id);
  for (const t of a.titresCles || []) if (!all.has(t)) warn(`data/albums.js, « ${a.id} » : titre clé « ${t} » absent de la tracklist`);
}

// ---------------------------------------------------------------- streams par morceau
function checkTrackStreams(obj, file) {
  if (!isObj(obj)) return err(`${file} : objet manquant`);
  for (const [id, m] of Object.entries(obj)) {
    if (!knownAlbum(id)) { err(`${file} : album « ${id} » inconnu`); continue; }
    const all = allTitles(id);
    for (const [titre, n] of Object.entries(m || {})) {
      if (!all.has(titre)) err(`${file}, « ${id} » : « ${titre} » n'est dans aucune tracklist de l'album (titre exact attendu)`);
      if (!(isInt(n) && n > 0)) err(`${file}, « ${id} » / « ${titre} » : ${n} n'est pas un nombre de streams valide`);
    }
  }
}
checkTrackStreams(W.TRACK_STREAMS, "data/track-streams.js");
checkTrackStreams(W.TRACK_STREAMS_PREV, "data/track-streams-prev.js");

// ---------------------------------------------------------------- stats
const S = W.STATS || {};
if (!isObj(W.STATS)) err("data/stats.js : window.STATS manquant");
for (const [id, x] of Object.entries(S.albums || {})) {
  const where = `data/stats.js, albums « ${id} »`;
  if (!knownAlbum(id)) err(`${where} : album inconnu`);
  if (x.spotify != null && !(isInt(x.spotify) && x.spotify > 0)) err(`${where} : spotify invalide (${x.spotify})`);
  if (x.premiereSemaine != null && !(isInt(x.premiereSemaine) && x.premiereSemaine > 0)) err(`${where} : premiereSemaine invalide`);
}
for (const a of albums) if (!S.albums?.[a.id]) warn(`data/stats.js : pas de stats pour « ${a.id} »`);
const sp = S.spotify || {};
if (!isDate(sp.date)) err(`data/stats.js : spotify.date "${sp.date}" invalide`);
if (!(isInt(sp.total) && sp.total > 0)) err("data/stats.js : spotify.total invalide");
for (const m of sp.morceaux || []) {
  const where = `data/stats.js, top morceaux « ${m.titre} »`;
  if (!m.titre || !(isInt(m.streams) && m.streams > 0)) err(`${where} : titre ou streams invalide`);
  if (m.album != null && !knownAlbum(m.album)) err(`${where} : album « ${m.album} » inconnu`);
  else if (m.album && !m.invite && !allTitles(m.album).has(m.titre)) warn(`${where} : absent de la tracklist de « ${m.album} »`);
}
for (const s of S.singles || []) {
  if (s.album && !knownAlbum(s.album)) err(`data/stats.js, singles « ${s.titre} » : album « ${s.album} » inconnu`);
  else if (s.album && !allTitles(s.album).has(s.titre)) warn(`data/stats.js, singles « ${s.titre} » : absent de la tracklist de « ${s.album} »`);
}
const prevDate = W.TRACK_STREAMS_PREV_DATE;
if (prevDate != null && (!isDate(prevDate) || (isDate(sp.date) && prevDate >= sp.date)))
  err(`data/track-streams-prev.js : date du relevé précédent "${prevDate}" invalide ou pas antérieure à ${sp.date}`);

// ---------------------------------------------------------------- historique
let last = "";
for (const h of W.STREAMS_HISTORY || []) {
  const where = `data/history.js, relevé du ${h?.date}`;
  if (!isDate(h?.date)) { err(`${where} : date invalide`); continue; }
  if (h.date <= last) err(`${where} : les dates doivent être uniques et dans l'ordre`);
  last = h.date;
  if (h.total != null && !(isInt(h.total) && h.total > 0)) err(`${where} : total invalide`);
  for (const [id, n] of Object.entries(h.albums || {})) {
    if (!knownAlbum(id)) err(`${where} : album « ${id} » inconnu`);
    if (!(isInt(n) && n > 0)) err(`${where} : streams de « ${id} » invalides`);
  }
}

// ---------------------------------------------------------------- samples
const TYPES = ["sample", "interpolation", "voix"];
for (const [i, s] of (W.SAMPLES || []).entries()) {
  const where = `data/samples.js, n° ${i + 1} (« ${s?.titre} »)`;
  if (!knownAlbum(s?.album)) { err(`${where} : album « ${s?.album} » inconnu`); continue; }
  if (!allTitles(s.album).has(s.titre)) err(`${where} : pas dans la tracklist de « ${s.album} » (titre exact attendu)`);
  if (!s.sample?.artiste || !s.sample?.titre) err(`${where} : sample.artiste et sample.titre sont obligatoires`);
  if (s.sample?.annee != null && !(isInt(s.sample.annee) && s.sample.annee >= 1850 && s.sample.annee <= 2100)) err(`${where} : année du sample invalide`);
  if (!TYPES.includes(s.type)) err(`${where} : type "${s.type}" invalide (${TYPES.join(", ")})`);
}

// ---------------------------------------------------------------- fichiers du site (hors ligne, icônes)
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const exists = (f) => fs.existsSync(path.join(ROOT, f));
const sw = read("sw.js");
const shellBlock = sw.match(/const SHELL = \[([\s\S]*?)\];/);
const shell = shellBlock ? [...shellBlock[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]) : [];
if (!shellBlock) err("sw.js : liste SHELL introuvable");
for (const f of shell) if (f !== "./" && !exists(f)) err(`sw.js : « ${f} » est dans SHELL mais le fichier n'existe pas`);
const html = read("index.html");
const local = (u) => !/^(https?:)?\/\//.test(u) && !u.startsWith("data:");
const assets = [
  ...[...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]),
].filter(local);
for (const f of assets) {
  if (!exists(f)) err(`index.html : « ${f} » n'existe pas`);
  else if (!shell.includes(f)) err(`sw.js : ajoute « ${f} » à la liste SHELL (sinon il manque hors ligne)`);
}
for (const m of html.matchAll(/<link[^>]+rel="(?:icon|apple-touch-icon|manifest)"[^>]+href="([^"]+)"/g))
  if (local(m[1]) && !exists(m[1])) err(`index.html : « ${m[1]} » n'existe pas`);
try {
  const manifest = JSON.parse(read("manifest.webmanifest"));
  for (const ic of manifest.icons || []) if (!exists(ic.src)) err(`manifest.webmanifest : icône « ${ic.src} » introuvable`);
} catch (e) {
  err(`manifest.webmanifest : JSON invalide — ${e.message}`);
}

// ---------------------------------------------------------------- rapport
const nTracks = Object.values(tracks).reduce((n, t) => n + t.length, 0);
console.log(`${albumIds.length} albums, ${nTracks} titres, ${(W.SAMPLES || []).length} samples, ${(W.STREAMS_HISTORY || []).length} relevés vérifiés.`);
for (const w of warnings) console.log(`  ! ${w}`);
for (const e of errors) console.log(`  ✗ ${e}`);
if (errors.length) {
  console.log(`\n${errors.length} erreur${errors.length > 1 ? "s" : ""} à corriger${warnings.length ? `, ${warnings.length} avertissement${warnings.length > 1 ? "s" : ""}` : ""}.`);
  process.exit(1);
}
console.log(warnings.length ? `\nAucune erreur (${warnings.length} avertissement${warnings.length > 1 ? "s" : ""} à vérifier).` : "\nTout est bon.");
