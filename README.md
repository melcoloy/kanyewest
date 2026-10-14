# Ye — Discographie interactive

Site statique (HTML / CSS / JavaScript, sans framework) qui présente la discographie studio de Kanye West / Ye :

- **Frise chronologique** cliquable de 2004 à 2026
- **Pochettes** chargées automatiquement (API iTunes Search), ou tes propres images
- **Liens d'écoute** : Spotify, Apple Music, Deezer, YouTube Music
- **Tracklist complète** dans chaque fiche, avec durées et **invités crédités** — clic sur un invité = tous ses albums avec Ye
- **Recherche** (album, morceau, invité, label, année)
- **Filtres** solo / collaborations et **tri** (date, classement, longueur)
- **Fiche détaillée** par album : date, label, place au Billboard 200, titres clés, distinctions, lien Apple Music — navigation avec ← →
- **Graphique** de la longueur des albums

Les pochettes ne sont pas stockées dans le dépôt : le navigateur les récupère chez Apple à l'affichage (© labels respectifs), puis les garde en cache 30 jours.

## Lancer le projet

Ouvre simplement `index.html` dans un navigateur, ou dans VS Code avec l'extension **Live Server** (clic droit → *Open with Live Server*).

## Structure

```
ye-discographie/
├── index.html
├── css/style.css
├── js/
│   ├── app.js          ← affichage, filtres, fiche album
│   └── covers.js       ← chargement des pochettes (API iTunes)
├── img/                ← tes pochettes perso (optionnel)
└── data/
    ├── albums.js       ← infos des albums
    └── tracklists.js   ← tracklists : "Titre | Invités | Durée"
```

Pour ajouter un album : un objet dans `data/albums.js` et sa tracklist dans `data/tracklists.js` (même `id`).

### Pochette manquante ou incorrecte

Deux options, à ajouter dans l'objet de l'album dans `data/albums.js` :

1. **`appleId`** : ouvre l'album sur music.apple.com, copie le nombre à la fin de l'URL
   (`…/album/yeezus/1440873107` → `appleId: 1440873107`).
2. **`cover`** : ton propre fichier dans `img/` (`cover: "img/yeezus.jpg"`) ou une URL d'image.

Après une modification, recharge la page. La console du navigateur (F12) indique les albums sans pochette.

### Liens d'écoute

Chaque fiche propose Spotify, Apple Music, Deezer et YouTube Music (recherche par défaut).
Pour un lien direct : `liens: { spotify: "https://open.spotify.com/album/…" }`.

## Sources et limites

Tracklists d'après Wikipedia (éditions standard à la sortie). Les invités sont ceux crédités officiellement. La tracklist de *Bully* est à confirmer (les sources indiquent 18 à 20 titres) ; *Donda 2* n'existe pas sur les plateformes, il garde donc son dégradé.

## Mettre en ligne avec GitHub Pages

Dans *Settings → Pages* du dépôt : *Source* = `Deploy from a branch`, branche `main`, dossier `/ (root)`.
Le site sera disponible à `https://<ton-pseudo>.github.io/ye-discographie/`.
