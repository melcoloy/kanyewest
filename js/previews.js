// ---------- Extraits audio (API iTunes Search) ----------
// Aperçus de 30 s fournis par Apple, utilisés par le blind test, le défi du jour et la page Samples.
//   Previews.ye(track)              → extrait d'un morceau de Ye ({ titre, albumId })
//   Previews.any(artiste, titre)    → extrait de n'importe quel morceau (samples originaux)
// Résultats gardés 7 jours dans le navigateur. S'appuie sur covers.js (Covers.jsonp, Covers.ARTIST)
// et app.js (albums, covers).

window.Previews = (() => {
  const COUNTRIES = ["be", "us", "fr"];
  const CACHE_KEY = "ye-previews-v1";
  const CACHE_DAYS = 7;

  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch {}
  try { localStorage.removeItem("ye-blindtest-previews-v1"); } catch {} // ancien cache du blind test
  const save = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {} };
  const fromCache = (k) => {
    const h = cache[k];
    return h && Date.now() - h.t < CACHE_DAYS * 864e5 ? h.u : undefined;
  };
  const toCache = (k, u) => { if (u) { cache[k] = { u, t: Date.now() }; save(); } return u; };

  const norm = (s) =>
    String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, "")
      .replace(/\bfeat\..*$/, "")
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "");

  const VARIANTE = /remix|live|instrumental|acapella|a cappella|version|karaoke|tribute|cover/i;

  async function search(term) {
    const out = [];
    for (const c of COUNTRIES) {
      try {
        const res = await Covers.jsonp(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=song&limit=25&country=${c}`);
        out.push(...res.results);
        if (res.results.length) return out;
      } catch {}
    }
    return out;
  }

  // ---- Morceaux de Ye : d'abord la tracklist de l'album sur Apple, sinon recherche du titre
  const albumSongs = {};
  const collectionId = (a) => a.appleId || (covers[a.id]?.url || "").match(/\/(\d+)(?:\?|$)/)?.[1] || null;

  function getAlbumSongs(a) {
    const cid = collectionId(a);
    if (!cid) return Promise.resolve(null); // pochette pas encore chargée
    return (albumSongs[a.id] ??= (async () => {
      for (const c of COUNTRIES) {
        try {
          const res = await Covers.jsonp(`https://itunes.apple.com/lookup?id=${cid}&entity=song&limit=200&country=${c}`);
          const songs = res.results.filter((r) => r.wrapperType === "track" && r.previewUrl);
          if (songs.length) return new Map(songs.map((r) => [norm(r.trackName), r.previewUrl]));
        } catch {}
      }
      return null;
    })());
  }

  async function ye(t) {
    const key = `ye|${t.albumId}|${t.titre}`;
    const hit = fromCache(key);
    if (hit) return hit;
    const a = albums.find((x) => x.id === t.albumId);
    const target = norm(t.titre);
    let url = (await getAlbumSongs(a))?.get(target);
    if (!url) {
      const albumKey = norm(a.titre);
      for (const term of [`Kanye West ${t.titre}`, `${t.titre} ${a.titre}`]) {
        const hitR = (await search(term))
          .filter((r) => r.previewUrl && Covers.ARTIST.test(r.artistName || "") && norm(r.trackName || "") === target)
          .filter((r) => VARIANTE.test(t.titre) || !VARIANTE.test(r.trackName + " " + r.collectionName))
          .sort((x, y) => norm(y.collectionName || "").includes(albumKey) - norm(x.collectionName || "").includes(albumKey))[0];
        if (hitR) { url = hitR.previewUrl; break; }
      }
    }
    return toCache(key, url);
  }

  // ---- N'importe quel morceau (ex. le morceau samplé)
  async function any(artiste, titre) {
    const key = `any|${artiste}|${titre}`;
    const hit = fromCache(key);
    if (hit) return hit;
    const target = norm(titre);
    const art = norm(artiste.split(/,| & | and | feat/i)[0]);
    const results = (await search(`${artiste} ${titre}`)).filter((r) => r.previewUrl && !VARIANTE.test(r.trackName || ""));
    const pick =
      results.find((r) => norm(r.trackName) === target && norm(r.artistName).includes(art)) ||
      results.find((r) => norm(r.trackName).startsWith(target) && norm(r.artistName).includes(art));
    return toCache(key, pick?.previewUrl);
  }

  return { ye, any, norm };
})();
