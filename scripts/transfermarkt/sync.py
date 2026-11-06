"""Transfermarkt API v4 collector. No third-party Python dependencies.
Legacy club sync uses approved links; competition sync includes missing Brazilian senior clubs.
"""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
CATALOG = ROOT / 'src/data/brazil-clubs.json'
MAPPING = ROOT / 'scripts/transfermarkt/clubs.json'
SNAPSHOT = ROOT / 'src/data/transfermarkt-snapshot.json'


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def now():
    return dt.datetime.now(dt.timezone.utc).isoformat()


class Client:
    def __init__(self, base_url, cache, refresh=False, interval=1.6):
        url = urllib.parse.urlsplit(base_url)
        if url.scheme not in ('https', 'http') or not url.netloc or url.query or url.fragment or url.username:
            raise ValueError('Invalid API base URL')
        self.base = base_url.rstrip('/')
        self.cache = Path(cache)
        self.refresh = refresh
        self.interval = max(1.6, interval)
        self.last = 0

    def get(self, path):
        import hashlib
        url = self.base + path
        target = self.cache / (hashlib.sha256(url.encode()).hexdigest() + '.json')
        if not self.refresh and target.exists() and time.time() - target.stat().st_mtime < 600:
            return read(target)
        for attempt in range(3):
            time.sleep(max(0, self.interval - (time.monotonic() - self.last)))
            self.last = time.monotonic()
            try:
                request = urllib.request.Request(url, headers={'Accept': 'application/json', 'User-Agent': 'FutManager-importer/1.0'})
                with urllib.request.urlopen(request, timeout=40) as response:
                    if int(response.headers.get('Content-Length', 0)) > 10_000_000:
                        raise ValueError('Oversized response')
                    payload = response.read(10_000_001)
                    if len(payload) > 10_000_000:
                        raise ValueError('Oversized response')
                    value = json.loads(payload)
                write(target, value)
                return value
            except urllib.error.HTTPError as error:
                if error.code not in (429, 502, 503, 504) or attempt == 2:
                    raise
                # Respect bounded Retry-After without flooding the public test service.
                retry = error.headers.get('Retry-After', '')
                delay = min(120, max(3 * 2 ** attempt, int(retry) if retry.isdigit() else 0))
                time.sleep(delay)
        raise RuntimeError('Request failed')


POSITIONS = {
    'Goalkeeper': 'G', 'Centre-Back': 'Z', 'Sweeper': 'Z',
    'Left-Back': 'L', 'Right-Back': 'L', 'Left Wing-Back': 'L', 'Right Wing-Back': 'L',
    'Defensive Midfield': 'M', 'Central Midfield': 'M', 'Attacking Midfield': 'M',
    'Left Midfield': 'M', 'Right Midfield': 'M',
    'Left Winger': 'A', 'Right Winger': 'A', 'Second Striker': 'A', 'Centre-Forward': 'A',
}


def number(value, minimum, maximum, optional=False):
    if optional and value is None:
        return None
    if type(value) is not int or not minimum <= value <= maximum:
        raise ValueError(f'Invalid numeric value: {value!r}')
    return value


def text(value):
    if not isinstance(value, str) or not value.strip() or len(value) > 250:
        raise ValueError('Missing or invalid text')
    return value.strip()


def entity_id(value):
    if not isinstance(value, str) or not value.isascii() or not value.isdigit() or int(value) <= 0:
        raise ValueError('Invalid Transfermarkt ID')
    return value


def normalize(source, club_id, profile, squad):
    """Reject an entire incomplete club, never partially replace its roster."""
    if not isinstance(profile, dict) or not isinstance(squad, dict) or not isinstance(squad.get('players'), list):
        raise ValueError('Invalid API response shape')
    if len(squad['players']) > 200:
        raise ValueError('Oversized roster')
    if profile.get('id') != club_id or squad.get('id') != club_id:
        raise ValueError('Profile/squad ID mismatch')
    # Brazil is the allowlisted country; missing country needs manual upstream resolution.
    if (profile.get('league') or {}).get('countryName') not in ('Brazil', 'Brasil'):
        raise ValueError('Club country is not Brazil or cannot be verified')
    players = []
    seen = set()
    for raw in squad['players']:
        if not isinstance(raw, dict):
            raise ValueError('Invalid player shape')
        player_id = entity_id(raw.get('id'))
        if player_id in seen:
            raise ValueError('Duplicate player ID in squad')
        seen.add(player_id)
        position = POSITIONS.get(raw.get('position'))
        if not position:
            raise ValueError(f'Unknown position: {raw.get("position")!r}')
        contract = raw.get('contract')
        if contract is not None:
            if not isinstance(contract, str) or len(contract) != 10:
                raise ValueError('Invalid contract date')
            dt.date.fromisoformat(contract)
        nationalities = raw.get('nationalities') or raw.get('citizenship') or raw.get('nationality') or []
        if isinstance(nationalities, str):
            nationalities = [nationalities]
        if not isinstance(nationalities, list) or any(not isinstance(n, str) for n in nationalities):
            raise ValueError('Invalid nationality data')
        players.append({
            'nationalities': list(dict.fromkeys(n.strip() for n in nationalities if n.strip())),
            'id': player_id, 'name': text(raw.get('name')),
            'position': position, 'age': number(raw.get('age'), 14, 65),
            'shirtNumber': number(raw.get('shirtNumber'), 1, 999, True),
            'foot': {'left': 'E', 'right': 'D', 'both': 'A'}.get(raw.get('foot')),
            'contractEndsOn': contract,
            'marketValueEur': number(raw.get('marketValue'), 0, 10_000_000_000, True),
        })
    if len(players) < 11 or not any(p['position'] == 'G' for p in players):
        raise ValueError('Incomplete roster: need 11 players and a goalkeeper')
    # Keep all source rows in the snapshot; application enforces its 35-player limit.
    stadium = profile.get('stadium') or {}
    return {
        'source': source, 'id': club_id, 'name': text(profile.get('name')),
        'fetchedAt': now(), 'updatedAt': squad.get('updatedAt'),
        'stadiumName': text(stadium.get('name') or profile.get('stadiumName')) if stadium.get('name') or profile.get('stadiumName') else None,
        'stadiumCapacity': number(stadium.get('capacity') or profile.get('stadiumSeats'), 0, 500_000, True),
        'coachName': text(profile['coach']['name']) if (profile.get('coach') or {}).get('name') else None, 'players': players,
    }


def approved_links(catalog, mapping):
    allowed = {c['source'] for c in catalog}
    seen = set()
    links = []
    for source, entry in mapping.items():
        if source not in allowed:
            raise ValueError(f'Club outside registered catalog: {source}')
        if not entry.get('approved'):
            continue
        club_id = entity_id(entry.get('transfermarktId'))
        if club_id in seen:
            raise ValueError('Same Transfermarkt club linked more than once')
        if not entry.get('evidenceUrl'):
            raise ValueError(f'Approval requires evidenceUrl: {source}')
        seen.add(club_id)
        links.append((source, club_id))
    return links


def synchronize(client, catalog, mapping, previous, season=None, selected=None):
    links = approved_links(catalog, mapping)
    if selected:
        links = [link for link in links if link[0] in selected]
        if set(selected) != {source for source, _ in links}:
            raise ValueError('Selected club is not approved/registered')
    if not links:
        raise ValueError('No approved links. Run discover and review clubs.json first.')
    if previous.get('seasonId') != season and previous.get('clubs'):
        raise ValueError('Use a separate snapshot for a different season')
    allowed_ids = dict(approved_links(catalog, mapping))
    records = {c['source']: c for c in previous.get('clubs', []) if allowed_ids.get(c['source']) == c['id']}
    report = {'fetchedAt': now(), 'updated': [], 'errors': [], 'unmapped': [c['source'] for c in catalog if c['source'] not in allowed_ids]}
    for source, club_id in links:
        try:
            profile = client.get(f'/clubs/{club_id}/profile')
            query = '?season_id=' + urllib.parse.quote(season) if season else ''
            squad = client.get(f'/clubs/{club_id}/players{query}')
            records[source] = normalize(source, club_id, profile, squad)
            report['updated'].append(source)
        except (ValueError, KeyError, TypeError, OSError) as error:
            report['errors'].append({'source': source, 'error': str(error)[:300], 'preservedPrevious': source in records})
    # Transfers must not create duplicated identities across clubs in the same snapshot.
    seen = set()
    for club in records.values():
        for player in club['players']:
            if player['id'] in seen:
                raise ValueError('Player appears in multiple clubs; refresh all affected clubs before publishing')
            seen.add(player['id'])
    return {'version': 1, 'generatedAt': now(), 'seasonId': season, 'clubs': sorted(records.values(), key=lambda c: c['source'])}, report



def search_competitions(client, query):
    results = []
    page = 1
    while True:
        response = client.get('/competitions/search/' + urllib.parse.quote(query, safe='') + f'?page_number={page}')
        results.extend(response['results'])
        last = number(response.get('lastPageNumber'), 1, 1000)
        if page >= last:
            return results
        page += 1


def collect_competition(client, competition_id, division, season, previous):
    if division not in ('Série A', 'Série B', 'Série C', 'Série D'):
        raise ValueError('Only Brazilian national senior divisions A/B/C/D are supported')
    if not competition_id or not competition_id.isalnum():
        raise ValueError('Invalid competition ID; use the search result')
    if previous.get('clubs') and previous.get('version') != 2:
        raise ValueError('Use a separate v2 snapshot, do not mix with the legacy club import')
    if previous.get('clubs') and previous.get('seasonId') != season:
        raise ValueError('Do not mix seasons')
    query = '?season_id=' + urllib.parse.quote(season) if season else ''
    listing = client.get(f'/competitions/{competition_id}/clubs{query}')
    if listing.get('id') != competition_id or not isinstance(listing.get('clubs'), list) or not listing['clubs']:
        raise ValueError('Invalid or empty competition listing')
    if season and listing.get('seasonId') != season:
        raise ValueError('Competition season mismatch')
    ids = [entity_id(c.get('id')) for c in listing['clubs']]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate club in competition')
    import unicodedata
    title = ''.join(c for c in unicodedata.normalize('NFD', text(listing.get('name')).lower()) if not unicodedata.combining(c))
    expected = ''.join(c for c in unicodedata.normalize('NFD', division.lower()) if not unicodedata.combining(c))
    if expected not in title or not any(term in title for term in ('brasileiro', 'brasileirao')) or any(term in title for term in ('u20', 'u-20', 'sub-20', 'playoff')):
        raise ValueError('Competition title does not match the selected Brazilian senior division')
    competition = {'id': competition_id, 'name': text(listing.get('name')), 'division': division,
                   'seasonId': text(listing.get('seasonId'))}
    records = {c['id']: c for c in previous.get('clubs', [])}
    competitions = {c['id']: c for c in previous.get('competitions', [])}
    competitions[competition_id] = competition
    report = {'fetchedAt': now(), 'competition': competition, 'expectedClubs': len(ids), 'updated': [], 'errors': []}
    for club_id in ids:
        try:
            profile = client.get(f'/clubs/{club_id}/profile')
            squad = client.get(f'/clubs/{club_id}/players{query}')
            record = normalize('tm-' + club_id, club_id, profile, squad)
            record.update({'competitionId': competition_id, 'division': division, 'country': 'Brasil'})
            records[club_id] = record
            report['updated'].append(club_id)
        except (ValueError, KeyError, TypeError, OSError) as error:
            report['errors'].append({'id': club_id, 'error': str(error)[:300], 'preservedPrevious': club_id in records})
    # Refuse an inconsistent published snapshot rather than silently drop transferred players.
    seen = set()
    for club in records.values():
        for player in club['players']:
            if player['id'] in seen:
                raise ValueError('Player appears in multiple clubs; refresh affected competitions together')
            seen.add(player['id'])
    return {'version': 2, 'generatedAt': now(), 'seasonId': season,
            'competitions': list(competitions.values()), 'clubs': list(records.values())}, report

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['discover', 'sync', 'competitions', 'competition-sync'])
    parser.add_argument('--base-url', default=os.getenv('TRANSFERMARKT_API_URL', 'https://transfermarkt-api.fly.dev'))
    parser.add_argument('--mapping', type=Path, default=MAPPING)
    parser.add_argument('--output', type=Path, default=SNAPSHOT)
    parser.add_argument('--work-dir', type=Path, default=ROOT / '.cache/transfermarkt')
    parser.add_argument('--query', default='brasileirão', help='Competition search text')
    parser.add_argument('--competition', help='Competition ID from search, never a club ID')
    parser.add_argument('--division', choices=['Série A', 'Série B', 'Série C', 'Série D'])
    parser.add_argument('--club', action='append', help='Existing catalog source key; repeatable')
    parser.add_argument('--season', help='Omit for current roster; e.g. 2026 for historical season')
    parser.add_argument('--refresh', action='store_true')
    parser.add_argument('--apply', action='store_true', help='Atomically publish output; otherwise dry run')
    args = parser.parse_args()
    if args.season and (not args.season.isdigit() or len(args.season) != 4):
        parser.error('Invalid season')
    catalog = read(CATALOG)
    mapping = read(args.mapping)
    client = Client(args.base_url, args.work_dir / 'cache', args.refresh)
    if args.command == 'competitions':
        results = search_competitions(client, args.query)
        write(args.work_dir / 'competitions.json', results)
        print(json.dumps(results, ensure_ascii=False, indent=2))
        return
    if args.command == 'competition-sync':
        if not args.competition or not args.division:
            parser.error('--competition and --division are required')
        previous = read(args.output) if args.output.exists() else {'version': 2, 'clubs': [], 'competitions': [], 'seasonId': args.season}
        # An empty v1 bootstrap can be replaced by the competition-based format.
        snapshot, report = collect_competition(client, args.competition, args.division, args.season, previous)
        write(args.work_dir / 'report.json', report)
        write(args.work_dir / 'preview.json', snapshot)
        # Competition publication is all-or-nothing: missing teams must not look complete.
        applied = bool(args.apply and not report['errors'])
        if applied:
            write(args.output, snapshot)
        print(json.dumps({'clubs': len(report['updated']), 'players': sum(len(c['players']) for c in snapshot['clubs']), 'errors': report['errors'], 'applied': applied}, ensure_ascii=False))
        if report['errors']:
            raise SystemExit(2)
        return
    if args.command == 'discover':
        result = []
        selected = set(args.club or [c['source'] for c in catalog])
        if selected - {c['source'] for c in catalog}:
            parser.error('Club is not registered')
        for club in catalog:
            if club['source'] not in selected or mapping.get(club['source'], {}).get('approved'):
                continue
            try:
                query = urllib.parse.quote(club['name'], safe='')
                candidates = client.get('/clubs/search/' + query + '?page_number=1')
                result.append({'source': club['source'], 'name': club['name'], 'state': club['state'], 'candidates': candidates})
            except (OSError, ValueError) as error:
                result.append({'source': club['source'], 'error': str(error)[:300]})
        write(args.work_dir / 'candidates.json', result)
        print(f'{len(result)} searches recorded; manually review candidates (including country/state/senior team) before approval.')
        return
    previous = read(args.output) if args.output.exists() else {'seasonId': args.season, 'clubs': []}
    snapshot, report = synchronize(client, catalog, mapping, previous, args.season, set(args.club or []))
    write(args.work_dir / 'report.json', report)
    write(args.work_dir / 'preview.json', snapshot)
    if args.apply and report['updated']:
        write(args.output, snapshot)
    print(json.dumps({'updated': len(report['updated']), 'errors': len(report['errors']), 'unmapped': len(report['unmapped']), 'applied': bool(args.apply and report['updated'])}))
    if report['errors']:
        raise SystemExit(2)


if __name__ == '__main__':
    main()
