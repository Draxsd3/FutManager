import unittest
from sync import normalize, approved_links, synchronize, Client


def data(club='123'):
    return ({'id': club, 'name': 'Registered club', 'league': {'countryName': 'Brazil'}},
            {'id': club, 'updatedAt': '2026-11-03T10:00:00', 'players': [
                {'id': str(i+1), 'name': f'Player {i}', 'position': 'Goalkeeper' if i == 0 else 'Centre-Back',
                 'age': 25, 'marketValue': None, 'shirtNumber': i+1} for i in range(11)]})


class ImportTests(unittest.TestCase):
    def test_camel_case_v4_contract(self):
        profile, squad = data()
        row = normalize('local', '123', profile, squad)
        self.assertEqual(len(row['players']), 11)
        self.assertEqual(row['players'][0]['position'], 'G')
        self.assertIsNone(row['players'][0]['marketValueEur'])

    def test_incomplete_unknown_and_duplicate_rejected(self):
        for bad in ('empty', 'position', 'duplicate', 'country', 'mismatch'):
            p, s = data()
            if bad == 'empty': s['players'] = []
            if bad == 'position': s['players'][0]['position'] = 'Unknown'
            if bad == 'duplicate': s['players'][1]['id'] = '1'
            if bad == 'country': p['league']['countryName'] = 'Portugal'
            if bad == 'mismatch': s['id'] = '999'
            with self.subTest(bad=bad), self.assertRaises(ValueError): normalize('local', '123', p, s)

    def test_only_registered_approved_unique_clubs(self):
        catalog = [{'source': 'local'}]
        self.assertEqual(approved_links(catalog, {'local': {'approved': False}}), [])
        with self.assertRaises(ValueError): approved_links(catalog, {'foreign': {'approved': True}})
        with self.assertRaises(ValueError): approved_links(catalog, {'local': {'approved': True, 'transfermarktId': '123'}})

    def test_failure_preserves_last_good_snapshot(self):
        p, s = data()
        previous = {'seasonId': None, 'clubs': [normalize('local', '123', p, s)]}
        class FailingClient:
            def get(self, path): raise OSError('503 blocked')
        snapshot, report = synchronize(FailingClient(), [{'source': 'local'}],
            {'local': {'approved': True, 'transfermarktId': '123', 'evidenceUrl': 'reviewed'}}, previous)
        self.assertEqual(snapshot['clubs'], previous['clubs'])
        self.assertEqual(len(report['errors']), 1)
        self.assertTrue(report['errors'][0]['preservedPrevious'])

    def test_current_and_explicit_season_paths(self):
        for season in (None, '2026'):
            paths = []
            class FakeClient:
                def get(self, path):
                    paths.append(path)
                    return data()[0 if path.endswith('/profile') else 1]
            snapshot, report = synchronize(FakeClient(), [{'source': 'local'}],
                {'local': {'approved': True, 'transfermarktId': '123', 'evidenceUrl': 'reviewed'}}, {'clubs': [], 'seasonId': season}, season)
            self.assertEqual(report['errors'], [])
            self.assertEqual(len(snapshot['clubs']), 1)
            self.assertEqual(paths[-1], '/clubs/123/players' + ('?season_id=2026' if season else ''))

    def test_malformed_base_url_rejected(self):
        with self.assertRaises(ValueError): Client('file:///etc/passwd', '/tmp/unused')


if __name__ == '__main__': unittest.main()


class CompetitionTests(unittest.TestCase):
    def test_search_reads_all_pages(self):
        from sync import search_competitions
        class Client:
            def get(self, path):
                return {'results': [{'id': path[-1]}], 'lastPageNumber': 2}
        self.assertEqual(len(search_competitions(Client(), 'brasileirão')), 2)

    def test_visits_each_club_and_keeps_forty_players(self):
        from sync import collect_competition
        paths = []
        class Client:
            def get(self, path):
                paths.append(path)
                if path.startswith('/competitions/'):
                    return {'id': 'TEST', 'name': 'Campeonato Brasileiro Série A', 'seasonId': '2026', 'clubs': [{'id': '123'}]}
                p, s = data()
                s['players'] = [dict(s['players'][i % 11], id=str(i+1)) for i in range(40)]
                return p if '/profile' in path else s
        snapshot, report = collect_competition(Client(), 'TEST', 'Série A', '2026', {'clubs': []})
        self.assertEqual(report['errors'], [])
        self.assertEqual(len(snapshot['clubs'][0]['players']), 40)
        self.assertEqual(snapshot['version'], 2)
        self.assertEqual(len(paths), 3)
        self.assertIn('season_id=2026', paths[-1])

    def test_rejects_wrong_division_and_empty_listing(self):
        from sync import collect_competition
        for clubs in ([], [{'id': '123'}]):
            class Client:
                def get(self, path):
                    return {'id': 'TEST', 'name': 'CBF Brasileiro U20', 'seasonId': '2026', 'clubs': clubs}
            with self.assertRaises(ValueError):
                collect_competition(Client(), 'TEST', 'Série A', '2026', {'clubs': []})

    def test_reports_failed_club_instead_of_publishing_a_fake_success(self):
        from sync import collect_competition
        class Client:
            def get(self, path):
                if '/competitions/' in path:
                    return {'id': 'TEST', 'name': 'Campeonato Brasileiro Série D', 'seasonId': '2026', 'clubs': [{'id': '123'}]}
                raise OSError('503')
        snapshot, report = collect_competition(Client(), 'TEST', 'Série D', '2026', {'clubs': []})
        self.assertEqual(len(report['errors']), 1)
        self.assertEqual(snapshot['clubs'], [])
