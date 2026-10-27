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
- **Mode clair / sombre** : suit le réglage du système, bouton ☀ / ☾ pour forcer l'un ou l'autre
- **Onglets** (lien direct possible : `#samples`, `#classement`, `#defi`, `#blind-test`, `#plus-ou-moins`, `#paroles`) :
  - **Samples** : les morceaux d'origine qu'il a samplés, à écouter côte à côte avec sa version
  - **Mon classement** : tier list S → D des albums, ou des morceaux de chaque album (menu en haut), par glisser-déposer, exportable en image
  - **Défi du jour** : 5 morceaux, les mêmes pour tout le monde chaque jour ; série de jours et résultat à partager en emojis
  - **Blind test** : retrouve le morceau (ou l'album) à partir d'un extrait de 2, 5, 10 ou 20 s
  - **Plus ou moins** : quel morceau a le plus de streams Spotify ?
  - **Paroles** : une citation qui se dévoile mot par mot (citations à ajouter toi-même dans `data/paroles.js`)
- **Installable (PWA)** : « Installer l'application » dans le navigateur ; la discographie reste consultable hors ligne
- **Streams mis à jour automatiquement** chaque lundi par GitHub Actions (voir plus bas)

Extraits audio : aperçus de 30 s de l'API iTunes Search (il faut être en ligne pour les jeux audio).

Les pochettes ne sont pas stockées dans le dépôt : le navigateur les récupère chez Apple à l'affichage (© labels respectifs), puis les garde en cache 30 jours.

## Lancer le projet

Ouvre simplement `index.html` dans un navigateur, ou dans VS Code avec l'extension **Live Server** (clic droit → *Open with Live Server*).

## Structure

```
ye-discographie/
├── index.html
├── manifest.webmanifest   ← infos de l'application installable
├── sw.js                  ← service worker (hors ligne)
├── css/style.css
├── icons/                 ← icônes de l'application
├── js/
│   ├── app.js             ← affichage, filtres, fiche album
│   ├── covers.js          ← chargement des pochettes (API iTunes)
│   ├── previews.js        ← recherche des extraits audio (API iTunes)
│   ├── blindtest.js       ← blind test + défi du jour
│   ├── game.js            ← jeu « Plus ou moins »
│   ├── paroles.js         ← mode Paroles
│   ├── samples.js         ← page Samples
│   ├── tierlist.js        ← Mon classement
│   ├── theme.js           ← mode clair / sombre
│   └── tabs.js            ← navigation entre les onglets
├── img/                   ← tes pochettes perso (optionnel)
├── data/
│   ├── albums.js          ← infos des albums
│   ├── tracklists.js      ← tracklists : "Titre | Invités | Durée"
│   ├── stats.js           ← ventes, certifications, streams des albums
│   ├── track-streams.js   ← streams Spotify par morceau
│   ├── samples.js         ← liste des samples
│   └── paroles.js         ← tes citations pour le mode Paroles
├── scripts/update_streams.py           ← mise à jour des streams depuis kworb.net
└── .github/workflows/update-streams.yml ← lance le script chaque lundi
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

## Mise à jour automatique des streams

Chaque lundi matin, GitHub Actions lance `scripts/update_streams.py`, qui lit les pages kworb.net de Kanye
et met à jour `data/track-streams.js` et `data/stats.js`, puis commite le résultat.

- Lancement manuel : onglet **Actions** du dépôt → *Mise à jour des streams* → *Run workflow*.
- Le dépôt reçoit donc des commits du robot : fais un **Pull** dans VS Code avant de travailler.
- En local : `python scripts/update_streams.py --dry-run` (affiche les changements sans rien écrire).
- Le script met à jour les morceaux déjà présents, sans en ajouter. Il ignore une valeur qui baisse ou qui explose.
  *Kids See Ghosts* (publié sous un autre nom d'artiste) et *Vultures 2* restent à mettre à jour à la main.

## Mode Paroles

`data/paroles.js` est vide au départ : ajoute une ligne par citation,
`{ album: "graduation", titre: "Stronger", texte: "…" },`. Garde des citations courtes (une ou deux lignes).

## Application installable (PWA)

Une fois le site sur GitHub Pages, Chrome / Edge proposent « Installer » dans la barre d'adresse, et sur iPhone
*Partager → Sur l'écran d'accueil*. Ça ne marche pas en ouvrant `index.html` en double-clic (il faut une adresse http/https).
Si tu ajoutes un fichier au site, ajoute-le aussi dans la liste `SHELL` de `sw.js`.

## Sources et limites

Tracklists d'après Wikipedia (éditions standard à la sortie). Les invités sont ceux crédités officiellement. La tracklist de *Bully* est à confirmer (les sources indiquent 18 à 20 titres) ; *Donda 2* n'existe pas sur les plateformes, il garde donc son dégradé.

## Mettre en ligne avec GitHub Pages

Dans *Settings → Pages* du dépôt : *Source* = `Deploy from a branch`, branche `main`, dossier `/ (root)`.
Le site sera disponible à `https://<ton-pseudo>.github.io/ye-discographie/`.
