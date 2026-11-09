// Historique des streams Spotify : un relevé par ligne, le plus ancien en premier.
// Une ligne est ajoutée chaque lundi par scripts/update_streams.py (GitHub Actions).
// total : streams de toute la carrière ; albums : streams de chaque album (mêmes ids que data/albums.js).
// Sert aux courbes de la section Stats et des fiches album.

window.STREAMS_HISTORY = [
  { date: "2026-10-28", total: 67303616055, albums: {"college-dropout":3567649931,"late-registration":3499958864,"graduation":9716349813,"808s":3253883748,"mbdtf":6096483004,"watch-the-throne":3932108304,"yeezus":3362912156,"tlop":6209825212,"ye":3091865248,"ksg":1154469662,"jik":1668351405,"donda":3588192572,"donda-2":157915685,"vultures-1":2395381105,"vultures-2":552895604,"bully":711373393} },
  { date: "2026-11-02", total: 67432019054, albums: {"college-dropout":3575442009,"late-registration":3506317445,"graduation":9741052235,"808s":3260737642,"mbdtf":6111227744,"watch-the-throne":3941591016,"yeezus":3368584963,"tlop":6216831406,"ye":3096809544,"ksg":1154469662,"jik":1670227377,"donda":3591643039,"donda-2":158786053,"vultures-1":2399310547,"vultures-2":552895604,"bully":715759927} },
  { date: "2026-11-09", total: 67602696201, albums: {"college-dropout":3586082229,"late-registration":3514861127,"graduation":9774059153,"808s":3269794629,"mbdtf":6130104668,"watch-the-throne":3953383485,"yeezus":3376264332,"tlop":6226181031,"ye":3103540649,"ksg":1154469662,"jik":1672705425,"donda":3596397578,"donda-2":159989724,"vultures-1":2404643002,"vultures-2":552895604,"bully":721645115} },
];
