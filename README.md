# Ye — Discographie interactive

Site statique (HTML / CSS / JavaScript, sans framework) qui présente la discographie studio de Kanye West / Ye :

- **Ce jour-là** : bandeau quand un album fête sa sortie (aujourd'hui, ces derniers jours, ou le prochain anniversaire) ;
  pour tester une autre date : `index.html?jour=2026-11-22`
- **Frise chronologique** cliquable de 2004 à 2026
- **Pochettes** chargées automatiquement (API iTunes Search), ou tes propres images
- **Liens d'écoute** : Spotify, Apple Music, Deezer, YouTube Music
- **Tracklist complète** dans chaque fiche, avec durées et **invités crédités** — clic sur un invité = tous ses albums avec Ye
- **Recherche rapide** partout (touche `/`, `Ctrl + K` ou la loupe de la barre d'onglets) : sections, jeux, albums,
  morceaux, invités, samples — ↑ ↓ et Entrée pour ouvrir
- **Recherche** (album, morceau, invité, label, année), sans tenir compte des accents ni des majuscules : les morceaux trouvés (éditions deluxe comprises) s'affichent dans une liste, un clic ouvre la fiche sur le bon titre
- **Filtres** par année, par album, solo / collaborations, et **tri** (date, classement, longueur)
- **Fiche détaillée** par album : date, label, place au Billboard 200, titres clés, distinctions, lien Apple Music — navigation avec ← →
- **Liens directs** : `#album/graduation` ouvre la fiche, `#album/graduation/Stronger` la fiche avec le morceau surligné ;
  bouton « Partager » dans chaque fiche, clic sur un titre de la tracklist pour l'ajouter au lien
- **Graphique** de la longueur des albums
- **Plus fortes hausses** : les 10 morceaux qui ont gagné le plus de streams depuis le relevé précédent, en nombre ou en %, clic = la fiche sur le bon titre
- **Volume des extraits** : bouton 🔊 dans la barre d'onglets (curseur + couper le son), réglage gardé d'une visite à l'autre
- **Mode clair / sombre** : suit le réglage du système, bouton ☀ / ☾ pour forcer l'un ou l'autre
- **Fiches album** : ▶ sur chaque numéro de la tracklist pour écouter un extrait, et courbe des streams Spotify ;
  « Écouter les extraits à la suite » enchaîne les extraits de tout l'album (depuis le titre sélectionné s'il y en a un) ;
  sur téléphone, l'écran verrouillé affiche le morceau, la pochette et les boutons pause / suivant / précédent
- **Onglets** (lien direct possible : `#comparer`, `#samples`, `#invites`, `#classement`, `#defi`, `#jeux/…`) :
  - **Comparer** : deux albums côte à côte, le meilleur chiffre de chaque ligne mis en valeur
  - **Samples** : les morceaux d'origine qu'il a samplés, à écouter côte à côte avec sa version
  - **Invités** : graphe de tous les artistes en featuring (plus ils sont proches du centre, plus ils reviennent souvent),
    liste classée par nombre de morceaux ou par streams cumulés, et pour chaque invité : albums, période, morceau le plus écouté
  - **Mon classement** : tier list S → D des albums ou des morceaux de chaque album, export en image,
    partage par lien (l'ami voit ton classement au-dessus du sien) et « Mon top global » (tous tes sons en S et A)
  - **Défi du jour** : 5 morceaux, les mêmes pour tout le monde chaque jour ; série de jours et résultat à partager en emojis
  - **Jeux** (bouton « Partager mon score » en fin de partie : grille d'emojis + lien, comme le défi du jour) :
    - *Blind test* : retrouve le morceau ou l'album à partir d'un extrait de 2 à 20 s — 10 manches, contre la montre (60 s) ou en duel à deux sur le même écran (buzzers A et L)
    - *Pochette floue* : devine l'album d'après sa pochette pixelisée
    - *Devine l'année* : place un morceau sur la frise 2004 → aujourd'hui
    - *Plus ou moins* : quel morceau a le plus de streams Spotify ?
    - *Qui est l'invité ?* : trouve l'artiste en featuring parmi 4 (2 pts sans écouter, 1 pt après l'extrait)
- **Installable (PWA)** : « Installer l'application » dans le navigateur ; la discographie reste consultable hors ligne
- **Aperçu de lien** : image et titre quand le lien est partagé (WhatsApp, Discord…)
- **Streams mis à jour automatiquement** chaque lundi par GitHub Actions, avec historique pour les courbes (voir plus bas)

Extraits audio : aperçus de 30 s de l'API iTunes Search (il faut être en ligne pour les jeux audio).

Les pochettes ne sont pas stockées dans le dépôt : le navigateur les récupère chez Apple à l'affichage (© labels respectifs), puis les garde en cache 30 jours.

## Lancer le projet

Ouvre simplement `index.html` dans un navigateur, ou dans VS Code avec l'extension **Live Server** (clic droit → *Open with Live Server*).

## Structure

```
kanyewest/
├── index.html
├── manifest.webmanifest   ← infos de l'application installable
├── sw.js                  ← service worker (hors ligne)
├── css/style.css
├── icons/                 ← icônes de l'application + og-image.png (aperçu de lien)
├── js/
│   ├── app.js             ← affichage, filtres, fiche album, stats, courbes
│   ├── covers.js          ← chargement des pochettes (API iTunes)
│   ├── previews.js        ← recherche des extraits audio (API iTunes)
│   ├── volume.js          ← volume des extraits (bouton 🔊 de la barre d'onglets)
│   ├── player.js          ← mini-lecteur d'extraits (fiches, samples, devine l'année)
│   ├── blindtest.js       ← blind test (solo, chrono, duel) + défi du jour
│   ├── jeux.js            ← pochette floue + devine l'année
│   ├── quiz-invites.js    ← jeu « Qui est l'invité ? »
│   ├── share.js           ← partage des scores des jeux
│   ├── game.js            ← jeu « Plus ou moins »
│   ├── comparer.js        ← comparateur d'albums
│   ├── invites.js         ← graphe des invités
│   ├── samples.js         ← page Samples
│   ├── tierlist.js        ← Mon classement (albums, morceaux, partage, top global)
│   ├── quicksearch.js     ← recherche rapide (/ ou Ctrl + K)
│   ├── theme.js           ← mode clair / sombre
│   └── tabs.js            ← navigation entre les onglets
├── img/                   ← tes pochettes perso (optionnel)
├── data/
│   ├── albums.js          ← infos des albums
│   ├── tracklists.js      ← tracklists : "Titre | Invités | Durée"
│   ├── stats.js           ← ventes, certifications, streams des albums
│   ├── track-streams.js   ← streams Spotify par morceau
│   ├── track-streams-prev.js ← relevé précédent (écrit par le script, sert aux « Plus fortes hausses »)
│   ├── history.js         ← historique des streams (une ligne par lundi)
│   └── samples.js         ← liste des samples
├── scripts/update_streams.py           ← mise à jour des streams depuis kworb.net
├── scripts/check_data.js              ← vérification des données (node scripts/check_data.js)
├── .github/workflows/update-streams.yml ← lance le script chaque lundi
└── .github/workflows/check-data.yml     ← vérifie les données à chaque push
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

Chaque lundi matin, GitHub Actions lance `scripts/update_streams.py`, qui lit les pages kworb.net de Kanye,
met à jour `data/track-streams.js` et `data/stats.js`, ajoute une ligne à `data/history.js` (les courbes),
copie l'ancien relevé des morceaux dans `data/track-streams-prev.js` (les « Plus fortes hausses »),
puis commite le résultat.

- Lancement manuel : onglet **Actions** du dépôt → *Mise à jour des streams* → *Run workflow*.
- Le dépôt reçoit donc des commits du robot : fais un **Pull** dans VS Code avant de travailler.
- En local : `python scripts/update_streams.py --dry-run` (affiche les changements sans rien écrire).
- Le script met à jour les morceaux déjà présents, sans en ajouter. Il ignore une valeur qui baisse ou qui explose.
  *Kids See Ghosts* (publié sous un autre nom d'artiste) et *Vultures 2* restent à mettre à jour à la main.

## Vérification des données

`node scripts/check_data.js` contrôle que tout se tient : ids d'albums identiques d'un fichier à l'autre,
durées au format `3:21`, titres de `track-streams.js` et `samples.js` présents dans les tracklists, dates valides,
fichiers du site bien listés dans `sw.js`… GitHub Actions le lance à chaque push (onglet **Actions** →
*Vérification des données*, une croix rouge = une erreur à corriger, le détail est dans le journal) et après
la mise à jour des streams du lundi (si le contrôle échoue, rien n'est commité).
Les avertissements (`!`) signalent un détail à vérifier sans bloquer.

## Aperçu de lien

Les balises `og:` de `index.html` pointent vers `https://melcoloy.github.io/kanyewest/`. Si l'adresse
GitHub Pages du site est différente, remplace-la dans `og:url` et `og:image`.

## Application installable (PWA)

Une fois le site sur GitHub Pages, Chrome / Edge proposent « Installer » dans la barre d'adresse, et sur iPhone
*Partager → Sur l'écran d'accueil*. Ça ne marche pas en ouvrant `index.html` en double-clic (il faut une adresse http/https).
Si tu ajoutes un fichier au site, ajoute-le aussi dans la liste `SHELL` de `sw.js`.

## Sources et limites

Tracklists d'après Wikipedia (éditions standard à la sortie). Les invités sont ceux crédités officiellement. La tracklist de *Bully* est à confirmer (les sources indiquent 18 à 20 titres) ; *Donda 2* n'existe pas sur les plateformes, il garde donc son dégradé.

## Mettre en ligne avec GitHub Pages

Dans *Settings → Pages* du dépôt : *Source* = `Deploy from a branch`, branche `main`, dossier `/ (root)`.
Le site sera disponible à `https://melcoloy.github.io/kanyewest/` (l'adresse déjà utilisée par les balises `og:` de `index.html`).
