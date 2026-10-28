// Historique des streams Spotify : un relevé par ligne, le plus ancien en premier.
// Une ligne est ajoutée chaque lundi par scripts/update_streams.py (GitHub Actions).
// total : streams de toute la carrière ; albums : streams de chaque album (mêmes ids que data/albums.js).
// Sert aux courbes de la section Stats et des fiches album.

window.STREAMS_HISTORY = [
  { date: "2026-10-24", total: 67453089471, albums: {"college-dropout":3563449766,"late-registration":3499732967,"graduation":9702556720,"808s":3249950919,"mbdtf":6088128196,"watch-the-throne":3926971894,"yeezus":3359823193,"tlop":6206021126,"ye":3089239564,"ksg":1154469662,"jik":1667268112,"donda":3586308549,"donda-2":157472959,"vultures-1":2393292672,"vultures-2":552895604,"bully":708890822} },
  { date: "2026-10-28", total: 67303616055, albums: {"college-dropout":3567649931,"late-registration":3499958864,"graduation":9716349813,"808s":3253883748,"mbdtf":6096483004,"watch-the-throne":3932108304,"yeezus":3362912156,"tlop":6209825212,"ye":3091865248,"ksg":1154469662,"jik":1668351405,"donda":3588192572,"donda-2":157915685,"vultures-1":2395381105,"vultures-2":552895604,"bully":711373393} },
];
