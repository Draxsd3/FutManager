import { seededRandom } from "./live-match";
import type { EditorDatabase } from "./editor-data";
import { getCompetitionStandings, type CareerSeason, type SeasonFixture } from "./season";

/** Aggregate score, never away-goals. First legs do not produce a tie winner. */
export function knockoutWinner(fixtures: SeasonFixture[]): string | undefined {
  if (!fixtures.length || fixtures.some(f => f.status !== "played")) return undefined;
  const last = fixtures.slice().sort((a,b) => (a.leg ?? 1) - (b.leg ?? 1)).at(-1)!;
  let home = 0, away = 0;
  for (const f of fixtures) {
    home += f.homeClubId === last.homeClubId ? f.homeScore ?? 0 : f.awayScore ?? 0;
    away += f.homeClubId === last.homeClubId ? f.awayScore ?? 0 : f.homeScore ?? 0;
  }
  return home > away ? last.homeClubId : away > home ? last.awayClubId : last.winnerClubId;
}

export function advanceTournaments(season: CareerSeason, database: EditorDatabase): CareerSeason {
  if (!season.tournaments?.length) return season;
  const fixtures = season.fixtures.map(f => ({ ...f }));
  const clubs = new Map(database.clubs.map(c => [c.id, c]));
  for (const last of fixtures.filter(f => (f.stage === "knockout" || f.stage === "access-playoff" || (f.stage === "relegation" && f.leg)) && f.status === "played")) {
    const tie = fixtures.filter(f => f.competitionId === last.competitionId && f.stage === last.stage && f.knockoutStage === last.knockoutStage && f.tieIndex === last.tieIndex);
    if (tie.some(f => f.status !== "played") || last.leg !== Math.max(...tie.map(f => f.leg ?? 1))) continue;
    // A stored shootout is only meaningful on the deciding leg. Aggregate goals override it.
    const aggregate = tie.reduce((sum,f) => sum + (f.homeClubId === last.homeClubId ? (f.homeScore ?? 0)-(f.awayScore ?? 0) : (f.awayScore ?? 0)-(f.homeScore ?? 0)), 0);
    if (aggregate) last.winnerClubId = aggregate > 0 ? last.homeClubId : last.awayClubId;
    else if (last.stage === "access-playoff") last.winnerClubId = last.homeClubId; // REC art. 21 §5: best campaign, not a shootout.
    else if (!last.winnerClubId) last.winnerClubId = seededRandom(`${last.id}|penalties`)() < .5 ? last.homeClubId : last.awayClubId;
  }
  for (const tournament of season.tournaments) {
    const { competitionId, format } = tournament;
    const games = () => fixtures.filter(f => f.competitionId === competitionId);
    const first = games().filter(f => f.stage === "groups");
    if (!first.length || first.some(f => f.status !== "played")) continue;
    const isD = first[0].division === "Série D";
    const rank = (ids?: string[], cumulative = false) => getCompetitionStandings(cumulative ? games().filter(f => f.status === "played").map(f => ({ ...f, stage: undefined })) : fixtures, competitionId, ids).map(row => row.clubId);
    const grouped = tournament.groups.map(g => rank(g.clubIds));
    const byRank = (ids: string[], cumulative = false) => rank(ids, cumulative);
    const pairRanked = (ids: string[]) => Array.from({ length: Math.floor(ids.length / 2) }, (_, i) => [ids[i], ids[ids.length - i - 1]]);
    const endangered = byRank(grouped.flatMap(g => g.slice(-2)));
    for (const slot of games().filter(f => f.stage === "relegation" && f.status === "locked")) {
      if (first[0].state === "Paraná" || first[0].state === "Goiás") {
        const pair = first[0].state === "Goiás" ? rank().slice(9,11) : [[endangered[0],endangered[3]],[endangered[1],endangered[2]]][slot.tieIndex ?? 0];
        if (!pair[0] || !pair[1]) continue;
        const [h,a] = slot.leg === 1 ? [pair[1],pair[0]] : pair;
        Object.assign(slot, { homeClubId: h, home: clubs.get(h)!.name, awayClubId: a, away: clubs.get(a)!.name, status: "scheduled" });
      } else {
        const h = endangered[Number(slot.homeClubId.split(":").at(-1))], a = endangered[Number(slot.awayClubId.split(":").at(-1))];
        if (!h || !a) continue;
        Object.assign(slot, { homeClubId: h, home: clubs.get(h)!.name, awayClubId: a, away: clubs.get(a)!.name, status: "scheduled" });
      }
    }
    let pairs: string[][] = [];
    if (format.qualify === "cearense") {
      const qualified = grouped.map(g => g.slice(0,3));
      if (qualified.some(g => g.length < 3)) continue;
      const bestSecond = byRank([qualified[0][1],qualified[1][1]])[0];
      const homeQuotas = qualified.map(ids => ids.map((id,i) => i === 0 || id === bestSecond ? 2 : 1));
      // Nine cross-group games: precisely three clubs receive two home games, the rest one.
      const mask = Array.from({ length: 512 }, (_,i) => i).find(mask =>
        homeQuotas[0].every((quota,i) => [0,1,2].filter(j => mask & (1 << (i*3+j))).length === quota) &&
        homeQuotas[1].every((quota,j) => [0,1,2].filter(i => !(mask & (1 << (i*3+j)))).length === quota)) ?? 0;
      for (const slot of games().filter(f => f.stage === "second-groups" && f.status === "locked")) {
        const r = slot.competitionRound - Math.max(...first.map(f => f.competitionRound)) - 1;
        const i = slot.tieIndex ?? 0;
        const a = clubs.get(qualified[0][i])!, b = clubs.get(qualified[1][(i+r)%3])!;
        const [home, away] = mask & (1 << (i*3+(i+r)%3)) ? [a,b] : [b,a];
        Object.assign(slot, { homeClubId: home.id, home: home.name, awayClubId: away.id, away: away.name, status: "scheduled" });
      }
      const second = games().filter(f => f.stage === "second-groups");
      if (second.some(f => f.status !== "played")) continue;
      pairs = qualified.map(ids => getCompetitionStandings(fixtures, competitionId, ids, "second-groups").slice(0,2).map(r => r.clubId));
    } else if (format.qualify === "leaders-best-second") {
      pairs = pairRanked([...byRank(grouped.map(g => g[0]).filter(Boolean)), ...byRank(grouped.map(g => g[1]).filter(Boolean)).slice(0,1)]);
    } else if (format.qualify === "top-eight") pairs = pairRanked(rank().slice(0,8));
    else if (isD) {
      for (let g = 0; g < grouped.length; g += 2) {
        const a = grouped[g], b = grouped[g+1];
        if (!b || a.length < 4 || b.length < 4) continue;
        pairs.push([a[0], b[3]], [b[1], a[2]], [b[0], a[3]], [a[1], b[2]]);
      }
    } else pairs = grouped.flatMap(g => pairRanked(g.slice(0,4)));
    for (let stage = 0; stage < format.legs.length; stage++) {
      const slots = games().filter(f => f.stage === "knockout" && f.knockoutStage === stage);
      if (!slots.length) continue;
      if (stage > 0) {
        const previous = games().filter(f => f.stage === "knockout" && f.knockoutStage === stage-1);
        const ties = [...new Set(previous.map(f => f.tieIndex))].sort((a,b) => a!-b!);
        const winners = ties.map(tie => knockoutWinner(previous.filter(f => f.tieIndex === tie)));
        if (winners.some(w => !w)) break;
        const qualified = winners as string[];
        if (isD && stage < 3) {
          // Annex B: each consecutive block of eight ties crosses 1x6,2x5,3x8,4x7.
          pairs = [];
          for (let i = 0; i < qualified.length; i += 8) for (const [a,b] of [[0,5],[1,4],[2,7],[3,6]]) pairs.push([qualified[i+a],qualified[i+b]]);
        } else if (isD && stage === 3) {
          const ordered = byRank(qualified, true);
          pairs = [[ordered[0],ordered[7]],[ordered[3],ordered[4]],[ordered[1],ordered[6]],[ordered[2],ordered[5]]];
        } else if (first[0].state === "Santa Catarina" && stage === 1) pairs = [[qualified[0],qualified[3]],[qualified[2],qualified[1]]];
        else if (first[0].state === "Rio de Janeiro" && stage === 1) {
          const random = seededRandom(`${season.season}:${competitionId}:semifinal-draw`);
          const shuffled = qualified.map(id => ({ id, draw: random() })).sort((a,b) => a.draw-b.draw).map(v => v.id);
          pairs = [shuffled.slice(0,2),shuffled.slice(2,4)];
        } else if (!isD && format.qualify === "top-eight") pairs = pairRanked(byRank(qualified, true));
        else if (first[0].state === "Rio Grande do Sul") pairs = pairRanked(byRank(qualified, true));
        else pairs = Array.from({ length: qualified.length/2 }, (_, i) => qualified.slice(i*2,i*2+2));
      }
      for (const slot of slots) {
        if (slot.status !== "locked") continue;
        const pair = pairs[slot.tieIndex ?? 0];
        if (!pair?.[0] || !pair[1]) continue;
        // Best seed hosts return leg, or the single match.
        const cumulative = stage > 0 && first[0].state !== "Minas Gerais";
        const seed = cumulative ? byRank(pair, true) : pair;
        const [h,a] = format.legs[stage] === 2 && slot.leg === 1 ? [seed[1],seed[0]] : seed;
        const home = clubs.get(h), away = clubs.get(a);
        if (!home || !away) continue;
        Object.assign(slot, { homeClubId: h, home: home.name, awayClubId: a, away: away.name, status: "scheduled" });
      }
      if (slots.some(f => f.status !== "played")) break;
    }
  }  // Four quarterfinal winners plus two playoff winners earn Série C places.
  for (const tournament of season.tournaments.filter(t => t.competitionId === "league:Brasil:Série D")) {
    const games = fixtures.filter(f => f.competitionId === tournament.competitionId);
    const quarters = games.filter(f => f.stage === "knockout" && f.knockoutStage === 3);
    if (!quarters.length || quarters.some(f => f.status !== "played")) continue;
    const losers = [...new Set(quarters.map(f => f.tieIndex))].flatMap(tie => {
      const pair = quarters.filter(f => f.tieIndex === tie), winner = knockoutWinner(pair);
      return winner ? [pair[0].homeClubId === winner ? pair[0].awayClubId : pair[0].homeClubId] : [];
    });
    const ranked = getCompetitionStandings(games.filter(f => f.status === "played").map(f => ({ ...f, stage: undefined })), tournament.competitionId, losers).map(row => row.clubId);
    const pairs = [[ranked[0],ranked[3]],[ranked[1],ranked[2]]];
    for (const slot of games.filter(f => f.stage === "access-playoff" && f.status === "locked")) {
      const pair = pairs[slot.tieIndex ?? 0];
      if (!pair[0] || !pair[1]) continue;
      const [h,a] = slot.leg === 1 ? [pair[1],pair[0]] : pair;
      Object.assign(slot, { homeClubId: h, home: clubs.get(h)?.name, awayClubId: a, away: clubs.get(a)?.name, status: "scheduled" });
    }
  }

  const divisionD = fixtures.filter(f => f.competitionId === "league:Brasil:Série D");
  const retained = [...new Set(divisionD.filter(f => f.stage === "knockout" && f.knockoutStage === 1 && !f.homeClubId.startsWith("pending:")).flatMap(f => [f.homeClubId,f.awayClubId]))];
  const promoted = new Set<string>();
  for (const stage of ["knockout", "access-playoff"] as const) {
    const games = divisionD.filter(f => f.stage === stage && (stage === "access-playoff" || f.knockoutStage === 3));
    for (const tie of new Set(games.map(f => f.tieIndex))) {
      const winner = knockoutWinner(games.filter(f => f.tieIndex === tie));
      if (winner) promoted.add(winner);
    }
  }
  const stateRelegated = new Set<string>();
  for (const tournament of season.tournaments.filter(t => t.competitionId.startsWith("state:"))) {
    const games = fixtures.filter(f => f.competitionId === tournament.competitionId);
    const state = games[0]?.state;
    const first = games.filter(f => f.stage === "groups");
    if (!first.length || first.some(f => f.status !== "played")) continue;
    const table = getCompetitionStandings(fixtures,tournament.competitionId);
    const relegation = games.filter(f => f.stage === "relegation");
    if (relegation.some(f => f.status !== "played")) continue;
    if (state === "Paraná" || state === "Goiás") {
      if (state === "Goiás" && table[11]) stateRelegated.add(table[11].clubId);
      for (const tie of new Set(relegation.map(f => f.tieIndex))) {
        const games = relegation.filter(f => f.tieIndex === tie), winner = knockoutWinner(games);
        if (winner) stateRelegated.add(games[0].homeClubId === winner ? games[0].awayClubId : games[0].homeClubId);
      }
    } else if (relegation.length) {
      const standings = getCompetitionStandings(fixtures,tournament.competitionId,undefined,"relegation");
      if (state === "Santa Catarina") {
        const fifths = tournament.groups.flatMap(g => getCompetitionStandings(fixtures,tournament.competitionId,g.clubIds).slice(4,5).map(r => r.clubId));
        const bestFifth = table.find(r => fifths.includes(r.clubId))?.clubId;
        standings.sort((a,b) => (b.points+Number(b.clubId === bestFifth))-(a.points+Number(a.clubId === bestFifth)) || b.wins-a.wins || (b.goalsFor-b.goalsAgainst)-(a.goalsFor-a.goalsAgainst) || b.goalsFor-a.goalsFor);
      }
      const count = state === "Rio de Janeiro" ? 1 : state === "Santa Catarina" ? 3 : 2;
      standings.slice(-count).forEach(r => stateRelegated.add(r.clubId));
    } else if (state === "São Paulo") table.slice(-2).forEach(r => stateRelegated.add(r.clubId));
    else if (state === "Minas Gerais") {
      const last = tournament.groups.flatMap(g => getCompetitionStandings(fixtures,tournament.competitionId,g.clubIds).slice(-1).map(r => r.clubId));
      table.filter(r => last.includes(r.clubId)).slice(-2).forEach(r => stateRelegated.add(r.clubId));
    }
  }
  return { ...season, fixtures, stateRelegatedClubIds: [...stateRelegated], promotedClubIds: [...promoted], serieDRetainedClubIds: retained.filter(id => !promoted.has(id)) };
}
