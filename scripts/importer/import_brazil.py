"""Read Java serialization as data, never execute Java/classes. Run from repository root.
python -m pip install -r scripts/importer/requirements.txt (in a virtualenv)
python scripts/importer/import_brazil.py
"""
import collections
import hashlib
import json
import logging
from pathlib import Path
import shutil
import javaobj

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "arquivos/teams"
CONFIG = json.loads((ROOT / "scripts/importer/brazil-2026.json").read_text())
STATES = ["Acre", "Alagoas", "Amazonas", "Amapá", "Bahia", "Ceará", "Distrito Federal", "Espírito Santo", "Goiás", "Maranhão", "Minas Gerais", "Mato Grosso do Sul", "Mato Grosso", "Pará", "Paraíba", "Pernambuco", "Piauí", "Paraná", "Rio de Janeiro", "Rio Grande do Norte", "Rondônia", "Roraima", "Rio Grande do Sul", "Santa Catarina", "Sergipe", "São Paulo", "Tocantins"]
DIVISIONS = {key: division for division, keys in CONFIG["divisions"].items() for key in keys}
logging.disable(logging.CRITICAL)
records, failures = [], []
for path in sorted(SOURCE.glob("*.ban")):
    try:
        team = javaobj.loads(path.read_bytes())
        if team.a != 29:  # Country stored in the record, not guessed from filename.
            continue
        if not 0 <= team.b < len(STATES):
            raise ValueError("unknown Brazilian state")
        players = []
        for index, player in enumerate(team.l):
            if not 0 <= player.e <= 4 or not 10 <= player.d <= 65:
                raise ValueError("invalid player position/age")
            players.append({"name": str(player.a).strip(), "age": player.d,
                            "position": "GLZMA"[player.e], "foot": "E" if player.i == 1 else "D",
                            "qualities": [player.g, player.h], "star": bool(player.b)})
        records.append({"source": path.stem, "name": str(team.e).strip(), "state": STATES[team.b],
                        "division": DIVISIONS.get(path.stem, "Sem divisão nacional"),
                        "primaryColor": str(team.cor1), "secondaryColor": str(team.cor2),
                        "stadium": str(team.f).strip(), "capacity": team.g, "coach": str(team.h).strip(),
                        "level": max(1, min(20, team.c)), "players": players})
    except Exception as error:
        failures.append({"file": path.name, "reason": str(error)[:180]})
# Identical club/state labels are alternate files, not additional participants.
# Prefer explicitly matched 2026 files, otherwise the largest senior roster; report the choice.
groups = collections.defaultdict(list)
for record in records:
    groups[(record["name"], record["state"])].append(record)
records, duplicates = [], []
for group in groups.values():
    group.sort(key=lambda item: (item["source"] in DIVISIONS, len(item["players"]), item["level"], item["source"]), reverse=True)
    records.append(group[0])
    for dropped in group[1:]:
        duplicates.append({"kept": group[0]["source"], "skipped": dropped["source"], "name": dropped["name"]})
# Distinct clubs sharing a name across states must not share assets, rosters or saves.
names = collections.Counter(record["name"] for record in records)
for record in records:
    if names[record["name"]] > 1 and record["source"] not in DIVISIONS:
        record["name"] += " · " + record["state"]
records.sort(key=lambda item: (item["division"] == "Sem divisão nacional", item["division"], item["name"]))
assets = {}
counts = collections.Counter()
for record in records:
    slug = "br-" + hashlib.sha256(record["source"].encode()).hexdigest()[:16]
    target = ROOT / "public/game-assets/clubs" / slug
    entry = {"slug": slug, "crest": False, "kits": []}
    for folder, filename, kit in [("escudos", "crest.png", None), ("camisas", "kit-1.png", 1), ("camisas2", "kit-2.png", 2), ("camisas3", "kit-3.png", 3)]:
        path = SOURCE / folder / (record["source"] + ".png")
        if path.exists() and path.read_bytes().startswith(b"\x89PNG\r\n\x1a\n"):
            target.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target / filename)
            if kit is None:
                entry["crest"] = True
                shutil.copyfile(path, target / "crest-mini.png")
                counts["crests"] += 1
            else:
                entry["kits"].append(kit)
                counts["kits"] += 1
    assets[record["name"]] = entry
    # Runtime/FIFA roster limit: preserve the full senior roster in the source bundle/report.
    # Selection takes at most 35, prioritizing GK and retaining file order otherwise.
    if len(record["players"]) > 35:
        counts["overLimitRosters"] += 1
found = {record["source"] for record in records}
missing_keys = sorted(set(DIVISIONS) - found)
report = {"season": 2026, "sources": CONFIG["sources"], "clubs": len(records),
          "seniorPlayersInSource": sum(len(t["players"]) for t in records),
          "activePlayers": sum(min(35, len(t["players"])) for t in records),
          "divisions": dict(collections.Counter(t["division"] for t in records)),
          **counts, "duplicates": duplicates, "unreadableFiles": failures,
          "missingMappedFiles": missing_keys, "missing2026Participants": CONFIG["missing2026"],
          "withoutCrest": [name for name, a in assets.items() if not a["crest"]],
          "withoutPrimaryKit": [name for name, a in assets.items() if 1 not in a["kits"]],
          "notes": ["Source senior squads only; youth lists not substituted for missing seniors.", "No 2026 roster refresh. Player shirt numbers, overall, salary, value, energy and contract are simulation defaults, not source facts.", "Unknown years of foundation are zero. Missing images use existing generated fallbacks. No additional Copa/regional registrations inferred."]}
for relative, data in [("src/data/brazil-clubs.json", records), ("src/data/brazil-assets.json", assets), ("docs/import-brazil-2026-report.json", report)]:
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n")
print(json.dumps({k: v for k,v in report.items() if k not in ["withoutCrest","withoutPrimaryKit","unreadableFiles"]},ensure_ascii=False,indent=2))
