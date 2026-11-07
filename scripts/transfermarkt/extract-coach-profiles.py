"""Extract November 2026 coach facts linked by explicit club/coach IDs.

Run from the repository root; the six original parts form one base64 gzipped JSON.
"""
import base64
import gzip
import json
from pathlib import Path

parts = sorted(Path("dados-originais/transfermarkt-2026-11").glob("parte-*.txt"))
if len(parts) != 6:
    raise RuntimeError("Expected six original parts")
original = json.loads(gzip.decompress(base64.b64decode("".join(p.read_text().strip() for p in parts))))
projection = json.loads(Path("src/data/transfermarkt/brasileirao-2026-novembro.json").read_text())
profiles = {}
for competition in projection["competitions"]:
    for club in competition["clubs"]:
        coach = club["profile"].get("coach")
        if not coach:
            continue
        profile = original["coachesById"].get(coach["id"])
        if not profile or profile.get("id") != coach["id"]:
            continue
        profiles[club["id"]] = {
            "id": coach["id"], "name": coach["name"], "since": coach.get("since"),
            "dateOfBirth": profile.get("dateOfBirth"), "placeOfBirth": profile.get("placeOfBirth"),
            "citizenship": profile.get("citizenship") or [],
            "license": profile.get("license") if profile.get("license") not in (None, "none") else None,
        }
Path("src/data/transfermarkt/coach-profiles-novembro.json").write_text(json.dumps(profiles, ensure_ascii=False, separators=(",", ":")) + "\n")
print(f"Extracted {len(profiles)} club-linked coach profiles")
