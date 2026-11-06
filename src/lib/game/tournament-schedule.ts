import type { EditorDatabase } from "./editor-data";
import { buildRoundRobinGroups, type SeasonFixture } from "./season";
import { resolveRegisteredClub, SERIE_D_GROUPS_2026, STATE_FORMATS_2026, type TournamentFormat } from "./tournament-formats";

export type TournamentRegistration = {
  competitionId: string;
  groups: { name: string; clubIds: string[] }[];
  format: TournamentFormat;
  incomplete: string[];
};

export function buildRegisteredTournament(database: EditorDatabase, season: number, competitionId: string, competitionName: string, state?: string) {
  const isD = !state;
  const format: TournamentFormat = isD ? { groups: SERIE_D_GROUPS_2026, pairing: "within", qualify: "four", legs: [2,2,2,2,2,2], description: "16 grupos de 6 · turno e returno · 4 classificados por grupo · 6 acessos" } : STATE_FORMATS_2026[state];
  if (!format) return null;
  const eligible = database.clubs.filter(club => isD ? club.division === "Série D" : club.state === state);
  const incomplete: string[] = [];
  const members = format.groups.map(names => names.flatMap(name => {
    const club = resolveRegisteredClub(eligible, name);
    if (!club) incomplete.push(name);
    return club ? [club] : [];
  }));
  // Miniature/custom databases keep their established simulation. Never call that an official registration.
  if (members.flat().length < Math.min(8, eligible.length) || members.some(group => !group.length)) return null;
  const registration: TournamentRegistration = { competitionId, format, incomplete, groups: members.map((clubs, index) => ({ name: isD ? `Grupo A${index + 1}` : `${format.pairing === "paulista" ? "Pote" : "Grupo"} ${String.fromCharCode(65 + index)}`, clubIds: clubs.map(club => club.id) })) };
  const base = { season, competitionId, competitionName, type: isD ? "league" as const : "state" as const, ...(state ? { state } : { division: "Série D" as const }) };
  let fixtures: SeasonFixture[] = [];
  if (format.pairing === "within") {
    fixtures = members.flatMap((clubs, index) => buildRoundRobinGroups({ ...base, clubs, doubleRoundRobin: isD }).flatMap(round => round.fixtures.map(f => ({ ...f, stage: "groups" as const, groupName: registration.groups[index].name }))));
  } else if (format.pairing === "paulista") {
    // Three internal rounds + five perfect cross-pot matchings (2+2+1 per team).
    fixtures = members.flatMap(clubs => buildRoundRobinGroups({ ...base, clubs }).flatMap(round => round.fixtures));
    const crossRounds = [[[0,1,0],[2,3,0]], [[0,1,1],[2,3,1]], [[0,2,0],[1,3,0]], [[0,2,1],[1,3,1]], [[0,3,0],[1,2,0]]];
    crossRounds.forEach((pairs, r) => pairs.forEach(([a,b,shift]) => members[a].forEach((left, i) => {
      const leftSlot = format.groups[a].indexOf(left.name);
      const right = resolveRegisteredClub(eligible, format.groups[b][((leftSlot >= 0 ? leftSlot : i) + shift) % 4]);
      if (!right) return;
      const [home, away] = (i + r) % 2 ? [right, left] : [left, right];
      fixtures.push({ ...base, id: `${season}:${competitionId}:pot:${r}:${a}:${i}`, competitionRound: r + 4, calendarRound: 0, roundLabel: `${r + 4}ª rodada`, homeClubId: home.id, home: home.name, awayClubId: away.id, away: away.name, status: "scheduled" });
    })));
    fixtures = fixtures.map(f => ({ ...f, stage: "groups" }));
  } else {
    const positions = format.groups.map(names => names.map(name => resolveRegisteredClub(eligible, name)));
    const tripartite = [
      [[0,4],[1,8],[2,5],[3,9],[6,10],[7,11]], [[0,5],[2,8],[1,6],[4,9],[3,11],[7,10]],
      [[0,6],[3,8],[1,7],[2,9],[4,10],[5,11]], [[0,7],[4,8],[2,6],[1,11],[5,9],[3,10]],
      [[0,8],[1,5],[2,10],[3,4],[6,11],[7,9]], [[0,9],[1,4],[5,10],[2,11],[6,8],[3,7]],
      [[0,10],[1,9],[3,6],[5,8],[4,11],[2,7]], [[0,11],[1,10],[2,4],[3,5],[7,8],[6,9]],
    ];
    const all = positions.flat();
    const indices = positions.length === 3 ? tripartite : Array.from({ length: 6 }, (_, r) => Array.from({ length: 6 }, (_, i) => [i,6+(i+r)%6]));
    const rounds = indices.map(pairs => pairs.flatMap(([a,b]) => all[a] && all[b] ? [[all[a]!,all[b]!] as const] : []));
    fixtures = rounds.flatMap((pairs, r) => pairs.map(([a,b], i) => {
      const [home, away] = (r + i) % 2 ? [b,a] : [a,b];
      return { ...base, id: `${season}:${competitionId}:cross:${r}:${i}`, competitionRound: r + 1, calendarRound: 0, roundLabel: `${r + 1}ª rodada`, homeClubId: home.id, home: home.name, awayClubId: away.id, away: away.name, status: "scheduled" as const, stage: "groups" as const };
    }));
  }
  if (!isD) fixtures = balanceHomeFixtures(fixtures);
  const lastGroupRound = Math.max(0, ...fixtures.map(f => f.competitionRound));
  // Reserve dates without predicting qualifiers. Slots are populated only by real standings/results.
  let count = isD ? 64 : format.qualify === "leaders-best-second" || format.qualify === "cearense" ? 4 : 8;
  let round = lastGroupRound;
  if (format.qualify === "cearense") {
    for (let r = 1; r <= 3; r++) for (let tie = 0; tie < 3; tie++) fixtures.push({ ...base, id: `${season}:${competitionId}:second:${r}:${tie}`, stage: "second-groups", tieIndex: tie, competitionRound: round+r, calendarRound: 0, roundLabel: `2ª fase · ${r}ª rodada`, homeClubId: `pending:${competitionId}:second:${r}:${tie}:h`, awayClubId: `pending:${competitionId}:second:${r}:${tie}:a`, home: "A definir", away: "A definir", status: "locked" });
    round += 3;
  }
  format.legs.forEach((legs, stage) => {
    const label = count === 2 ? "Final" : count === 4 ? "Semifinal" : count === 8 ? "Quartas de final" : count === 16 ? "Oitavas de final" : `${stage + 2}ª fase`;
    for (let leg = 1; leg <= legs; leg++) for (let tie = 0; tie < count / 2; tie++) fixtures.push({ ...base, id: `${season}:${competitionId}:ko:${stage}:${tie}:${leg}`, stage: "knockout", knockoutStage: stage, tieIndex: tie, leg, competitionRound: round + leg, calendarRound: 0, roundLabel: `${label}${legs === 2 ? ` · ${leg === 1 ? "ida" : "volta"}` : ""}`, homeClubId: `pending:${competitionId}:${stage}:${tie}:h`, awayClubId: `pending:${competitionId}:${stage}:${tie}:a`, home: "A definir", away: "A definir", status: "locked" });
    round += legs; count /= 2;
  });
  if (isD) for (let leg = 1; leg <= 2; leg++) for (let tie = 0; tie < 2; tie++) fixtures.push({ ...base, id: `${season}:${competitionId}:access:${tie}:${leg}`, stage: "access-playoff", tieIndex: tie, leg, competitionRound: lastGroupRound+8+leg, calendarRound: 0, roundLabel: `Playoff de acesso · ${leg === 1 ? "ida" : "volta"}`, homeClubId: `pending:${competitionId}:access:${tie}:h`, awayClubId: `pending:${competitionId}:access:${tie}:a`, home: "A definir", away: "A definir", status: "locked" });
  if (state && ["Rio de Janeiro","Rio Grande do Sul","Santa Catarina","Ceará","Paraná","Goiás"].includes(state)) {
    if (state === "Paraná" || state === "Goiás") {
      for (let leg = 1; leg <= 2; leg++) for (let tie = 0; tie < (state === "Goiás" ? 1 : 2); tie++) fixtures.push({ ...base, id: `${season}:${competitionId}:relegation:${tie}:${leg}`, stage: "relegation", tieIndex: tie, leg, competitionRound: lastGroupRound+leg, calendarRound: 0, roundLabel: `Permanência · ${leg === 1 ? "ida" : "volta"}`, homeClubId: `pending:${competitionId}:relegation:${tie}:h`, awayClubId: `pending:${competitionId}:relegation:${tie}:a`, home: "A definir", away: "A definir", status: "locked" });
    } else {
      const placeholders = Array.from({ length: 4 }, (_,i) => ({ id: `pending:${competitionId}:relegation:${i}`, name: "A definir" }));
      const games = buildRoundRobinGroups({ ...base, clubs: placeholders, doubleRoundRobin: state !== "Ceará" }).flatMap(g => g.fixtures);
      fixtures.push(...games.map(f => ({ ...f, stage: "relegation" as const, competitionRound: lastGroupRound+f.competitionRound, roundLabel: `Permanência · ${f.competitionRound}ª rodada`, status: "locked" as const })));
    }
  }
  return { registration, fixtures };
}

/** Euler orientation balances home/away on every even-degree first-phase schedule. */
function balanceHomeFixtures(fixtures: SeasonFixture[]): SeasonFixture[] {
  const edges = fixtures.map(f => [f.homeClubId,f.awayClubId]);
  const names = new Map(fixtures.flatMap(f => [[f.homeClubId,f.home],[f.awayClubId,f.away]] as [string,string][]));
  const vertices = [...names.keys()];
  const degree = (id: string) => edges.filter(pair => pair.includes(id)).length;
  const odd = vertices.filter(id => degree(id)%2);
  for (const id of odd) edges.push([id,"__balance__"]);
  const used = new Set<number>(), oriented = new Map<number,string[]>();
  const adjacency = new Map<string,number[]>();
  edges.forEach(([a,b],i) => { adjacency.set(a,[...(adjacency.get(a) ?? []),i]); adjacency.set(b,[...(adjacency.get(b) ?? []),i]); });
  for (const start of vertices) {
    const stack = [start];
    while (stack.length) {
      const at = stack.at(-1)!;
      const list = adjacency.get(at) ?? [];
      while (list.length && used.has(list.at(-1)!)) list.pop();
      const index = list.pop();
      if (index === undefined) { stack.pop(); continue; }
      used.add(index);
      const other = edges[index][0] === at ? edges[index][1] : edges[index][0];
      oriented.set(index,[at,other]); stack.push(other);
    }
  }
  return fixtures.map((f,i) => { const [h,a] = oriented.get(i)!; return { ...f, homeClubId: h, home: names.get(h)!, awayClubId: a, away: names.get(a)! }; });
}
