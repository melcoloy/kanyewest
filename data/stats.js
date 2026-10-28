// Statistiques commerciales (États-Unis).
// premiereSemaine : unités Billboard la semaine de sortie.
//   Avant 2015 = ventes d'albums uniquement ; ensuite, Billboard compte aussi le streaming.
// riaa : certification RIAA de l'album (null = aucune).
// spotify : streams Spotify cumulés de l'édition standard (relevé kworb.net, date dans spotify.date).
//   Kids See Ghosts : publié sous l'artiste « KIDS SEE GHOSTS », chiffre pris sur sa propre page kworb.
// Sources : kworb.net (Spotify), Billboard, Nielsen SoundScan (via Spin, XXL, The Source), Wikipedia (certifications).

window.STATS = {
  albums: {
    "college-dropout":   { premiereSemaine: 441000, riaa: "6× Platine", spotify: 3567649931 },
    "late-registration": { premiereSemaine: 860000, riaa: "5× Platine", spotify: 3499958864 },
    graduation:          { premiereSemaine: 957000, riaa: "8× Platine", spotify: 9716349813 },
    "808s":              { premiereSemaine: 450000, riaa: "4× Platine", spotify: 3253883748 },
    mbdtf:               { premiereSemaine: 496000, riaa: "5× Platine", spotify: 6096483004 },
    "watch-the-throne":  { premiereSemaine: 436000, riaa: "5× Platine", spotify: 3932108304 },
    yeezus:              { premiereSemaine: 327000, riaa: "3× Platine", spotify: 3362912156 },
    tlop:                { premiereSemaine: 94000,  riaa: "3× Platine", spotify: 6209825212 },
    ye:                  { premiereSemaine: 208000, riaa: "Platine", spotify: 3091865248 },
    ksg:                 { premiereSemaine: 142000, riaa: "Or", spotify: 1154469662 }, // page kworb « KIDS SEE GHOSTS », relevé du 9 oct. 2026
    jik:                 { premiereSemaine: 264000, riaa: "Platine", spotify: 1668351405 },
    donda:               { premiereSemaine: 309000, riaa: "Platine", spotify: 3588192572 },
    "donda-2":           { premiereSemaine: null,   riaa: null, spotify: 157915685 },
    "vultures-1":        { premiereSemaine: 148000, riaa: "Or", spotify: 2395381105 },
    "vultures-2":        { premiereSemaine: 107000, riaa: null, spotify: 552895604 },
    bully:               { premiereSemaine: 152000, riaa: null, spotify: 711373393 },
  },

  // Relevé Spotify (kworb.net). Pour mettre à jour : recopier les chiffres et changer la date.
  spotify: {
    date: "2026-10-28",
    total: 67303616055, // tous ses morceaux, y compris ses apparitions en invité
    // Top morceaux. invite: true = Ye y est invité ; album = id de l'album (null si hors album)
    morceaux: [
      { titre: "Heartless",                     streams: 2148237592, album: "808s" },
      { titre: "Flashing Lights",               streams: 1952634717, album: "graduation" },
      { titre: "Ni**as in Paris",               streams: 1926341218, album: "watch-the-throne" },
      { titre: "Stronger",                      streams: 1917070644, album: "graduation" },
      { titre: "Gold Digger",                   streams: 1585697587, album: "late-registration" },
      { titre: "Father Stretch My Hands Pt. 1", streams: 1547961564, album: "tlop" },
      { titre: "Bound 2",                       streams: 1444944733, album: "yeezus" },
      { titre: "FourFiveSeconds",               streams: 1406324941, album: null, avec: "Rihanna, Paul McCartney" },
      { titre: "Runaway",                       streams: 1290248605, album: "mbdtf" },
      { titre: "Power",                         streams: 1250229178, album: "mbdtf" },
      { titre: "I Wonder",                      streams: 1247307774, album: "graduation" },
      { titre: "All Falls Down",                streams: 1179741924, album: "college-dropout" },
      { titre: "American Boy",                  streams: 1174808206, album: null, invite: true, avec: "Estelle" },
      { titre: "Homecoming",                    streams: 1167327117, album: "graduation" },
      { titre: "Can't Tell Me Nothing",         streams: 1115911814, album: "graduation" },
    ],
  },

  // Singles où Ye est artiste principal (ou co-principal) entrés dans le top 10 du Billboard Hot 100.
  // album : id de l'album (null si le single n'est sur aucun de ses albums).
  singles: [
    { titre: "All Falls Down",    avec: "Syleena Johnson",                    annee: 2004, hot100: 7, riaa: "6× Platine",  album: "college-dropout" },
    { titre: "Gold Digger",       avec: "Jamie Foxx",                         annee: 2005, hot100: 1, riaa: "13× Platine", album: "late-registration" },
    { titre: "Stronger",          avec: "",                                   annee: 2007, hot100: 1, riaa: "14× Platine", album: "graduation" },
    { titre: "Good Life",         avec: "T-Pain",                             annee: 2007, hot100: 7, riaa: "6× Platine",  album: "graduation" },
    { titre: "Love Lockdown",     avec: "",                                   annee: 2008, hot100: 3, riaa: "5× Platine",  album: "808s" },
    { titre: "Heartless",         avec: "",                                   annee: 2008, hot100: 2, riaa: "14× Platine", album: "808s" },
    { titre: "Ni**as in Paris",   avec: "Jay-Z",                              annee: 2011, hot100: 5, riaa: "12× Platine", album: "watch-the-throne" },
    { titre: "FourFiveSeconds",   avec: "Rihanna, Paul McCartney",            annee: 2015, hot100: 4, riaa: "3× Platine",  album: null },
    { titre: "Yikes",             avec: "",                                   annee: 2018, hot100: 8, riaa: "Platine",     album: "ye" },
    { titre: "I Love It",         avec: "Lil Pump",                           annee: 2018, hot100: 6, riaa: "2× Platine",  album: null },
    { titre: "Follow God",        avec: "",                                   annee: 2019, hot100: 7, riaa: "2× Platine",  album: "jik" },
    { titre: "Hurricane",         avec: "The Weeknd, Lil Baby",               annee: 2021, hot100: 6, riaa: "2× Platine",  album: "donda" },
    { titre: "Carnival",          avec: "Ty Dolla $ign, Rich the Kid, Playboi Carti", annee: 2024, hot100: 1, riaa: "2× Platine", album: "vultures-1" },
  ],
};