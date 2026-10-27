#!/usr/bin/env python3
"""Met à jour les streams Spotify du site à partir de kworb.net.

Fichiers modifiés :
  data/track-streams.js  streams de chaque morceau
  data/stats.js          streams de chaque album, total de la carrière, top morceaux, date du relevé

Usage :
  python scripts/update_streams.py              # télécharge kworb et met à jour les fichiers
  python scripts/update_streams.py --dry-run    # affiche les changements sans rien écrire
  python scripts/update_streams.py --songs page_songs.html --albums page_albums.html
                                                # utilise des pages déjà enregistrées (tests)

Principe : on ne rajoute jamais de morceau, on met à jour ceux déjà présents. Comme un nombre de
streams ne fait qu'augmenter, quand un titre apparaît plusieurs fois sur kworb (rééditions,
versions deluxe…), on garde la valeur la plus proche au-dessus de l'ancienne. Une valeur qui
baisse ou qui explose (plus du double) est ignorée et signalée.
Aucune dépendance : bibliothèque standard Python 3.9+.
"""

from __future__ import annotations

import argparse
import datetime as dt
import html
import re
import sys
import unicodedata
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TRACKS_JS = ROOT / "data" / "track-streams.js"
STATS_JS = ROOT / "data" / "stats.js"

ARTIST_ID = "5K4W6rqBFWDnAN6FQUkS6x"  # Kanye West sur Spotify
SONGS_URL = f"https://kworb.net/spotify/artist/{ARTIST_ID}_songs.html"
ALBUMS_URL = f"https://kworb.net/spotify/artist/{ARTIST_ID}_albums.html"

# Albums dont le chiffre n'est pas sur la page de Kanye (publiés sous un autre nom d'artiste)
ALBUM_TITLES = {
    "college-dropout": "The College Dropout",
    "late-registration": "Late Registration",
    "graduation": "Graduation",
    "808s": "808s & Heartbreak",
    "mbdtf": "My Beautiful Dark Twisted Fantasy",
    "watch-the-throne": "Watch The Throne",
    "yeezus": "Yeezus",
    "tlop": "The Life Of Pablo",
    "ye": "ye",
    "jik": "JESUS IS KING",
    "donda": "Donda",
    "donda-2": "Donda 2",
    "vultures-1": "VULTURES 1",
    "vultures-2": "VULTURES 2",
    "bully": "BULLY",
    # "ksg" (Kids See Ghosts) : page kworb de l'artiste KIDS SEE GHOSTS, à mettre à jour à la main
}

MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
        "septembre", "octobre", "novembre", "décembre"]


# ---------------------------------------------------------------- lecture des pages kworb
class TableParser(HTMLParser):
    """Récupère toutes les tables d'une page : liste de tables, table = liste de lignes de cellules."""

    def __init__(self):
        super().__init__()
        self.tables: list[list[list[str]]] = []
        self._row: list[str] | None = None
        self._cell: list[str] | None = None

    def handle_starttag(self, tag, attrs):
        if tag == "table":
            self.tables.append([])
        elif tag == "tr" and self.tables:
            self._row = []
        elif tag in ("td", "th") and self._row is not None:
            self._cell = []

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self._cell is not None and self._row is not None:
            self._row.append(" ".join("".join(self._cell).split()))
            self._cell = None
        elif tag == "tr" and self._row is not None:
            if self._row:
                self.tables[-1].append(self._row)
            self._row = None

    def handle_data(self, data):
        if self._cell is not None:
            self._cell.append(data)


def tables_of(page: str) -> list[list[list[str]]]:
    p = TableParser()
    p.feed(page)
    return p.tables


def to_int(s: str) -> int | None:
    digits = re.sub(r"[^\d]", "", s)
    return int(digits) if digits else None


def norm(s: str) -> str:
    """Titre comparable : sans accents, parenthèses, ponctuation ni casse."""
    s = unicodedata.normalize("NFD", html.unescape(s))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"\(.*?\)|\[.*?\]", "", s)
    s = re.sub(r"\bfeat\..*$", "", s)
    s = s.replace("&", "and")
    return re.sub(r"[^a-z0-9]", "", s)


def parse_songs(page: str) -> tuple[int | None, dict[str, list[int]]]:
    """Total de la carrière + { titre normalisé: [streams, ...] } (un titre peut apparaître plusieurs fois)."""
    total = None
    songs: dict[str, list[int]] = {}
    for table in tables_of(page):
        header = [c.lower() for c in table[0]] if table else []
        if "total" in header:  # tableau récapitulatif : ligne « Streams »
            for row in table[1:]:
                if row and row[0].lower().startswith("streams"):
                    total = to_int(row[1])
        elif header and header[0].startswith("song"):
            for row in table[1:]:
                if len(row) < 2:
                    continue
                title = row[0].lstrip("*^ ").strip()  # « * » = Kanye en invité
                n = to_int(row[1])
                if title and n:
                    songs.setdefault(norm(title), []).append(n)
    return total, songs


def parse_albums(page: str) -> dict[str, list[int]]:
    out: dict[str, list[int]] = {}
    for table in tables_of(page):
        if not table or not table[0] or not table[0][0].lower().startswith("album"):
            continue
        for row in table[1:]:
            if len(row) < 2:
                continue
            title = row[0].lstrip("*^ ").strip()
            n = to_int(row[1])
            if title and n:
                out.setdefault(norm(title), []).append(n)
    return out


def best_match(old: int, candidates: list[int] | None) -> int | None:
    """Valeur la plus proche au-dessus de l'ancienne (les streams ne baissent pas)."""
    if not candidates:
        return None
    ok = [c for c in candidates if old * 0.999 <= c <= old * 2 + 1_000_000]
    return min(ok, key=lambda c: c - old) if ok else None


# ---------------------------------------------------------------- réécriture des fichiers JS
def date_fr(d: dt.date) -> str:
    return f"{d.day} {MOIS[d.month - 1]} {d.year}"


def update_tracks(text: str, songs: dict[str, list[int]], today: dt.date, report: list[str]) -> str:
    out = []
    album = None
    changed = missing = 0
    for line in text.splitlines(keepends=True):
        m_album = re.match(r'^\s*"?([\w-]+)"?\s*:\s*\{\s*$', line)
        if m_album:
            album = m_album.group(1)
        m = re.match(r'^(\s*)"((?:[^"\\]|\\.)*)"(\s*:\s*)(\d+)(,?.*)$', line.rstrip("\n"))
        if album and m:
            title, old = m.group(2), int(m.group(4))
            new = best_match(old, songs.get(norm(title)))
            if new is None:
                missing += 1
                report.append(f"  ? {album} / {title} : introuvable ou incohérent, valeur gardée")
            elif new != old:
                changed += 1
                line = f"{m.group(1)}\"{title}\"{m.group(3)}{new}{m.group(5)}" + ("\n" if line.endswith("\n") else "")
        out.append(line)
    text = "".join(out)
    text = re.sub(r"relevé kworb\.net du \d{1,2} \S+ \d{4}", f"relevé kworb.net du {date_fr(today)}", text, count=1)
    report.insert(0, f"track-streams.js : {changed} morceaux mis à jour, {missing} gardés tels quels")
    return text


def update_stats(text: str, total: int | None, songs: dict[str, list[int]], album_streams: dict[str, list[int]],
                 today: dt.date, report: list[str]) -> str:
    # Albums : « id: { ..., spotify: 123 } »
    def album_line(m: re.Match) -> str:
        aid, old = m.group(2), int(m.group(4))
        title = ALBUM_TITLES.get(aid)
        if not title:
            return m.group(0)
        new = best_match(old, album_streams.get(norm(title)))
        if new is None:
            report.append(f"  ? album {aid} : introuvable ou incohérent, valeur gardée")
            return m.group(0)
        return m.group(1) + m.group(3) + str(new)

    text = re.sub(r'^(\s*"?([\w-]+)"?\s*:\s*\{[^}\n]*?)(spotify:\s*)(\d+)', album_line, text, flags=re.M)

    # Top morceaux : met à jour puis retrie le bloc « morceaux: [ ... ] »
    def top_block(m: re.Match) -> str:
        lines = m.group(2).splitlines(keepends=True)
        entries, others = [], []
        for ln in lines:
            mm = re.search(r'titre:\s*"((?:[^"\\]|\\.)*)"\s*,\s*streams:\s*(\d+)', ln)
            if not mm:
                others.append(ln)
                continue
            old = int(mm.group(2))
            new = best_match(old, songs.get(norm(mm.group(1)))) or old
            entries.append((new, ln[: mm.start(2)] + str(new) + ln[mm.end(2):]))
        entries.sort(key=lambda e: -e[0])
        return m.group(1) + "".join(others) + "".join(ln for _, ln in entries) + m.group(3)

    text = re.sub(r"(morceaux:\s*\[\r?\n)(.*?)(^\s*\],)", top_block, text, flags=re.S | re.M)

    if total:
        text = re.sub(r"(total:\s*)\d+", lambda m: m.group(1) + str(total), text, count=1)
    text = re.sub(r'(spotify:\s*\{\s*\n\s*date:\s*")[\d-]+(")', lambda m: m.group(1) + today.isoformat() + m.group(2), text, count=1)
    report.append(f"stats.js : albums, total ({total or 'inchangé'}) et top morceaux mis à jour")
    return text


# ---------------------------------------------------------------- programme principal
def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "ye-discographie (projet perso, mise a jour hebdomadaire)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode("utf-8", errors="replace")


# newline="" : on garde les fins de ligne du fichier telles quelles (CRLF sous Windows, LF sur GitHub)
def read(path: Path) -> str:
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def write(path: Path, text: str) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(text)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true", help="n'écrit rien, affiche le rapport")
    ap.add_argument("--songs", help="page kworb des morceaux déjà téléchargée")
    ap.add_argument("--albums", help="page kworb des albums déjà téléchargée")
    args = ap.parse_args()

    songs_page = Path(args.songs).read_text(encoding="utf-8") if args.songs else fetch(SONGS_URL)
    albums_page = Path(args.albums).read_text(encoding="utf-8") if args.albums else fetch(ALBUMS_URL)
    total, songs = parse_songs(songs_page)
    album_streams = parse_albums(albums_page)

    # Garde-fou : si kworb a changé de format, on n'écrit rien
    if len(songs) < 50 or not album_streams:
        print(f"Format kworb inattendu ({len(songs)} morceaux, {len(album_streams)} albums lus) : rien n'est modifié.")
        return 1

    today = dt.date.today()
    report: list[str] = []
    new_tracks = update_tracks(read(TRACKS_JS), songs, today, report)
    new_stats = update_stats(read(STATS_JS), total, songs, album_streams, today, report)
    print("\n".join(report))

    if args.dry_run:
        print("(--dry-run : aucun fichier modifié)")
        return 0
    write(TRACKS_JS, new_tracks)
    write(STATS_JS, new_stats)
    print("Fichiers écrits.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
