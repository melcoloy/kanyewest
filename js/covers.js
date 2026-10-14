// ---------- Pochettes ----------
// Ordre de priorité pour chaque album :
//   1. `cover` dans data/albums.js  → une image à toi (fichier local ou URL)
//   2. `appleId` dans data/albums.js → l'album exact sur Apple Music
//   3. recherche automatique dans l'API iTunes Search d'Apple
// Si rien ne marche, la carte garde son dégradé.
// JSONP plutôt que fetch() pour que ça marche aussi en ouvrant index.html en double-clic.

window.Covers = (() => {
  const CACHE_KEY = "ye-covers-v2"; // v2 : l'ancien cache gardait aussi les échecs
  const CACHE_DAYS = 30;
  const COUNTRIES = ["be", "us", "fr"]; // certains albums ne sont dispo que dans certains pays
  let cache = {};
  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { cache = {}; }
  try { localStorage.removeItem("ye-covers-v1"); } catch {}

  const saveCache = () => {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* stockage indisponible */ }
  };

  const norm = (s) =>
    s.toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, "")    // retire "(Deluxe)", "[Explicit]"…
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]/g, "");

  let jsonpId = 0;
  function jsonp(url, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      const cb = `__itunes_cb_${++jsonpId}`;
      const script = document.createElement("script");
      const timer = setTimeout(() => cleanup(new Error("timeout")), timeoutMs);
      function cleanup(err, data) {
        clearTimeout(timer);
        window[cb] = () => {}; // une réponse tardive ne doit pas planter
        script.remove();
        err ? reject(err) : resolve(data);
      }
      window[cb] = (data) => cleanup(null, data);
      script.onerror = () => cleanup(new Error("network"));
      script.src = `${url}&callback=${cb}`;
      document.head.appendChild(script);
    });
  }

  // Ye apparaît sous plusieurs noms selon les albums : Kanye West, Ye, ¥$, JAY-Z & Kanye West…
  const ARTIST = /kanye|\bye\b|¥\$|jay-z|kids see ghosts|ty dolla/i;

  function pick(results, album) {
    const target = norm(album.titre);
    return results
      .filter((r) => r.collectionName && ARTIST.test(r.artistName || ""))
      .map((r) => {
        const name = norm(r.collectionName);
        let score = name === target ? 3 : name.startsWith(target) ? 2 : name.includes(target) ? 1 : 0;
        if (r.collectionExplicitness === "cleaned") score -= 0.5; // préfère la version originale
        return { r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.r;
  }

  const toData = (r) => ({ img: r.artworkUrl100.replace("100x100bb", "600x600bb"), url: r.collectionViewUrl });

  async function findOnApple(album) {
    if (album.appleId) {
      for (const c of COUNTRIES) {
        const res = await jsonp(`https://itunes.apple.com/lookup?id=${album.appleId}&entity=album&country=${c}`);
        const r = res.results.find((x) => x.wrapperType === "collection");
        if (r) return toData(r);
      }
      return null;
    }
    const terms = [`Kanye West ${album.titre}`, `Ye ${album.titre}`, album.titre];
    for (const c of COUNTRIES) {
      for (const t of terms) {
        const res = await jsonp(
          `https://itunes.apple.com/search?term=${encodeURIComponent(t)}&entity=album&limit=50&country=${c}`
        );
        const r = pick(res.results, album);
        if (r) return toData(r);
      }
    }
    return null;
  }

  async function load(album) {
    if (album.cover) return { img: album.cover, url: null };

    const hit = cache[album.id];
    if (hit && hit.key === (album.appleId || "") && Date.now() - hit.t < CACHE_DAYS * 864e5) return hit.data;

    const data = await findOnApple(album);
    if (data) {
      cache[album.id] = { t: Date.now(), key: album.appleId || "", data }; // on ne garde que les succès
      saveCache();
    } else {
      console.info(`[pochettes] Rien trouvé pour « ${album.titre} » : ajoute "appleId" ou "cover" dans data/albums.js`);
    }
    return data;
  }

  // Charge les pochettes une par une (l'API limite le nombre de requêtes)
  async function loadAll(albums, onLoad) {
    for (const a of albums) {
      try {
        const data = await load(a);
        if (data) onLoad(a.id, data);
      } catch { /* hors ligne ou API bloquée : on garde le dégradé */ }
    }
  }

  return { loadAll };
})();
