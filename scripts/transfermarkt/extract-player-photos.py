"""Extract trusted portrait URLs by Transfermarkt ID from the supplied November source.

Run from the repository root: python3 scripts/transfermarkt/extract-player-photos.py
The six original parts contain one base64-encoded gzipped JSON document.
"""
import base64
import gzip
import json
from pathlib import Path
from urllib.parse import urlsplit

parts = sorted(Path("dados-originais/transfermarkt-2026-11").glob("parte-*.txt"))
if len(parts) != 6:
    raise RuntimeError("Expected six original source parts")
source = json.loads(gzip.decompress(base64.b64decode("".join(part.read_text().strip() for part in parts))))
photos = {}
for player_id, player in source["playersById"].items():
    profile = player.get("details", {}).get("profile") or {}
    candidates = [profile.get("imageUrl")] + [entry.get("data", {}).get("imageUrl") for entry in player.get("squadEntries", [])]
    for url in candidates:
        if not isinstance(url, str):
            continue
        parsed = urlsplit(url)
        if parsed.scheme == "https" and parsed.netloc == "img.a.transfermarkt.technology" and parsed.path.startswith("/portrait/"):
            photos[player_id] = url
            break
Path("src/data/transfermarkt/player-photos-novembro.json").write_text(json.dumps(photos, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"Extracted {len(photos)} photo URLs")
