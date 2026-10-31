import type { EditorDatabase, EditorPlayer } from "./editor-data";
import type { DivisionKey } from "./mock-data";
import { otherScore, seededRandom } from "./live-match";

export type SeasonCompetitionType = "league" | "state" | "cup";
export type SeasonFixtureStatus = "scheduled" | "locked" | "played" | "cancelled";

export type SeasonPlayerContribution = {
  playerId: string;
  playerName: string;
  clubId: string;
  goals: number;
  assists: number;
  rating: number | null;
  minutes: number;
};

export type SeasonFixture = {
  id: string;
  competitionId: string;
  competitionName: string;
  type: SeasonCompetitionType;
  division?: DivisionKey;
  state?: string;
  season: number;
  competitionRound: number;
  calendarRound: number;
  roundLabel: string;
  homeClubId: string;
  home: string;
  awayClubId: string;
  away: string;
  status: SeasonFixtureStatus;
  homeScore?: number;
  awayScore?: number;
  /** Winner decided by a shootout when a knockout tie is level. */
  winnerClubId?: string;
  playerContributions?: SeasonPlayerContribution[];
};

export type CareerSeason = {
  version: 1;
  season: number;
  clubId: string;
  clubName: string;
  division: DivisionKey;
  state?: string;
  fixtures: SeasonFixture[];
};

export type CompetitionStanding = {
  club: string;
  clubId: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
};

const stateByClubName: Record<string, string> = {
  Flamengo: "Rio de Janeiro",
  Botafogo: "Rio de Janeiro",
  Palmeiras: "São Paulo",
  Corinthians: "São Paulo",
  Santos: "São Paulo",
  Cruzeiro: "Minas Gerais",
  Grêmio: "Rio Grande do Sul",
  Bahia: "Bahia",
};

export function resolveClubState(club: { name: string; state?: string | null }): string | undefined {
  const explicit = club.state?.trim();
  return explicit || stateByClubName[club.name];
}

function fixtureId(season: number, competitionId: string, round: number, homeId: string, awayId: string) {
  return `${season}:${competitionId}:${round}:${homeId}:${awayId}`;
}

type FixtureGroup = { type: SeasonCompetitionType; competitionId: string; round: number; fixtures: SeasonFixture[] };

function makeFixture(input: Omit<SeasonFixture, "id" | "status">): SeasonFixture {
  return {
    ...input,
    id: fixtureId(input.season, input.competitionId, input.competitionRound, input.homeClubId, input.awayClubId),
    status: "scheduled",
  };
}

/** Circle scheduling gives every club one match per round and one home/away game per pair. */
export function buildRoundRobinGroups(input: {
  clubs: { id: string; name: string }[];
  season: number;
  competitionId: string;
  competitionName: string;
  type: "league" | "state";
  division?: DivisionKey;
  state?: string;
  doubleRoundRobin?: boolean;
}): FixtureGroup[] {
  const teams = [...input.clubs].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  if (teams.length < 2) return [];
  const hasBye = teams.length % 2 === 1;
  const rotating: ({ id: string; name: string } | null)[] = hasBye ? [...teams, null] : [...teams];
  const firstLeg: SeasonFixture[][] = [];
  const rounds = rotating.length - 1;
  for (let roundIndex = 0; roundIndex < rounds; roundIndex += 1) {
    const fixtures: SeasonFixture[] = [];
    for (let pair = 0; pair < rotating.length / 2; pair += 1) {
      const left = rotating[pair];
      const right = rotating[rotating.length - 1 - pair];
      if (!left || !right) continue;
      const swap = (roundIndex + pair) % 2 === 1;
      const home = swap ? right : left;
      const away = swap ? left : right;
      const round = roundIndex + 1;
      fixtures.push(makeFixture({
        competitionId: input.competitionId,
        competitionName: input.competitionName,
        type: input.type,
        ...(input.division ? { division: input.division } : {}),
        ...(input.state ? { state: input.state } : {}),
        season: input.season,
        competitionRound: round,
        calendarRound: 0,
        roundLabel: `${round}ª rodada`,
        homeClubId: home.id,
        home: home.name,
        awayClubId: away.id,
        away: away.name,
      }));
    }
    firstLeg.push(fixtures);
    const fixed = rotating[0];
    const tail = rotating.slice(1);
    tail.unshift(tail.pop()!);
    rotating.splice(0, rotating.length, fixed, ...tail);
  }
  const groups: FixtureGroup[] = firstLeg.map((fixtures, index) => ({
    type: input.type,
    competitionId: input.competitionId,
    round: index + 1,
    fixtures,
  }));
  if (input.doubleRoundRobin) {
    firstLeg.forEach((fixtures, index) => {
      const round = rounds + index + 1;
      groups.push({
        type: input.type,
        competitionId: input.competitionId,
        round,
        fixtures: fixtures.map((fixture) => makeFixture({
          competitionId: fixture.competitionId,
          competitionName: fixture.competitionName,
          type: fixture.type,
          ...(fixture.division ? { division: fixture.division } : {}),
          ...(fixture.state ? { state: fixture.state } : {}),
          season: fixture.season,
          competitionRound: round,
          calendarRound: 0,
          roundLabel: `${round}ª rodada`,
          homeClubId: fixture.awayClubId,
          home: fixture.away,
          awayClubId: fixture.homeClubId,
          away: fixture.home,
        })),
      });
    });
  }
  return groups;
}

function clubStrength(database: EditorDatabase, clubId: string) {
  const players = database.players.filter((player) => player.clubId === clubId);
  return players.length ? players.reduce((sum, player) => sum + player.overall, 0) / players.length : 65;
}

function selectScorers(database: EditorDatabase, fixture: SeasonFixture, homeGoals: number, awayGoals: number): SeasonPlayerContribution[] {
  const random = seededRandom(`${fixture.id}|players`);
  const contributions = new Map<string, SeasonPlayerContribution>();
  const scoreSide = (clubId: string, goals: number) => {
    const squad = database.players.filter((player) => player.clubId === clubId);
    if (!squad.length) return;
    const lineup = [...squad].sort((a, b) => b.overall - a.overall).slice(0, 11);
    const goalkeeper = squad.filter((player) => player.primaryPosition === "G").sort((a, b) => b.overall - a.overall)[0];
    if (goalkeeper && !lineup.some((player) => player.primaryPosition === "G")) lineup[lineup.length - 1] = goalkeeper;
    for (const player of lineup) contributionFor(contributions, player, clubId);
    const attack = [...lineup].filter((player) => player.primaryPosition !== "G")
      .sort((a, b) => (b.overall + (b.primaryPosition === "A" ? 8 : b.primaryPosition === "M" ? 4 : 0)) - (a.overall + (a.primaryPosition === "A" ? 8 : a.primaryPosition === "M" ? 4 : 0)));
    if (!attack.length) return;
    for (let index = 0; index < goals; index += 1) {
      const scorer = attack[Math.floor(random() * Math.min(attack.length, Math.max(3, Math.ceil(attack.length / 2))))] ?? attack[0];
      const scorerContribution = contributionFor(contributions, scorer, clubId);
      scorerContribution.goals += 1;
      if (squad.length > 1 && random() < 0.72) {
        const eligible = lineup.filter((player) => player.id !== scorer.id);
        const assister = eligible[Math.floor(random() * eligible.length)];
        if (assister) contributionFor(contributions, assister, clubId).assists += 1;
      }
    }
  };
  scoreSide(fixture.homeClubId, homeGoals);
  scoreSide(fixture.awayClubId, awayGoals);
  return [...contributions.values()];
}

function contributionFor(map: Map<string, SeasonPlayerContribution>, player: EditorPlayer, clubId: string) {
  const key = `${clubId}:${player.id}`;
  let contribution = map.get(key);
  if (!contribution) {
    contribution = { playerId: player.id, playerName: player.name, clubId, goals: 0, assists: 0, rating: null, minutes: 90 };
    map.set(key, contribution);
  }
  return contribution;
}

function fixtureSeed(fixture: SeasonFixture) {
  let seed = 2166136261;
  for (const character of `${fixture.season}|${fixture.id}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

function simulateFixture(database: EditorDatabase, fixture: SeasonFixture): SeasonFixture {
  const [homeScore, awayScore] = otherScore(
    fixture.home,
    fixture.away,
    fixtureSeed(fixture),
    90,
    clubStrength(database, fixture.homeClubId),
    clubStrength(database, fixture.awayClubId),
  );
  const winnerClubId = fixture.type === "cup"
    ? homeScore > awayScore ? fixture.homeClubId : awayScore > homeScore ? fixture.awayClubId : seededRandom(`${fixture.id}|penalties`)() < 0.5 ? fixture.homeClubId : fixture.awayClubId
    : undefined;
  return {
    ...fixture,
    status: "played",
    homeScore,
    awayScore,
    ...(winnerClubId ? { winnerClubId } : {}),
    playerContributions: selectScorers(database, fixture, homeScore, awayScore),
  };
}

function cupRoundLabel(participantCount: number, round: number) {
  if (participantCount === 2) return "Final";
  if (participantCount === 4) return "Semifinal";
  if (participantCount === 8) return "Quartas de final";
  if (participantCount === 16) return "Oitavas de final";
  if (participantCount === 32) return "16 avos de final";
  if (participantCount === 64) return "32 avos de final";
  return `${round}ª fase`;
}

function buildCupGroups(database: EditorDatabase, managerClubId: string, season: number): FixtureGroup[] {
  const clubs = database.clubs
    .filter((club) => club.country.toLocaleLowerCase("pt-BR") === "brasil")
    .sort((a, b) => b.level - a.level || a.name.localeCompare(b.name, "pt-BR"));
  if (clubs.length < 2) return [];
  const cupId = "national:Copa do Brasil";
  const groups: FixtureGroup[] = [];
  let round = 1;
  let participants = clubs.map((club) => ({ id: club.id, name: club.name }));
  while (participants.length > 1) {
    const power = 2 ** Math.floor(Math.log2(participants.length));
    const byeCount = participants.length === power ? 0 : 2 * power - participants.length;
    const byeTeams = participants.slice(0, byeCount);
    const playing = participants.slice(byeCount);
    const fixtures: SeasonFixture[] = [];
    const winners = [...byeTeams];
    for (let index = 0; index + 1 < playing.length; index += 2) {
      const home = playing[index];
      const away = playing[index + 1];
      const fixture = makeFixture({
        competitionId: cupId,
        competitionName: "Copa do Brasil",
        type: "cup",
        season,
        competitionRound: round,
        calendarRound: 0,
        roundLabel: cupRoundLabel(participants.length, round),
        homeClubId: home.id,
        home: home.name,
        awayClubId: away.id,
        away: away.name,
      });
      const isManagerMatch = home.id === managerClubId || away.id === managerClubId;
      if (isManagerMatch) {
        fixture.status = "locked";
        // A próxima fase é montada como uma projeção; só fica disponível se o clube vencer.
        winners.push({ id: managerClubId, name: home.id === managerClubId ? home.name : away.name });
      } else {
        // Simulated privately only to seed the bracket. The result is published when its round is played.
        const played = simulateFixture(database, fixture);
        const winner = played.winnerClubId === home.id ? home : away;
        fixture.status = "locked";
        winners.push(winner);
      }
      fixtures.push(fixture);
    }
    const managerFixture = fixtures.find((fixture) => fixture.homeClubId === managerClubId || fixture.awayClubId === managerClubId);
    if (managerFixture) {
      const earlier = groups.flatMap((group) => group.fixtures).some((fixture) => fixture.homeClubId === managerClubId || fixture.awayClubId === managerClubId);
      managerFixture.status = earlier ? "locked" : "scheduled";
    }
    groups.push({ type: "cup", competitionId: cupId, round, fixtures });
    participants = winners.sort((a, b) => clubs.findIndex((club) => club.id === a.id) - clubs.findIndex((club) => club.id === b.id));
    round += 1;
  }
  return groups;
}

export function createCareerSeason(database: EditorDatabase, clubId: string, season: number): CareerSeason | null {
  const managedClub = database.clubs.find((club) => club.id === clubId);
  if (!managedClub) return null;
  const state = resolveClubState(managedClub);
  const leagueId = `league:${managedClub.country}:${managedClub.division}`;
  const leagueGroups = buildRoundRobinGroups({
    clubs: database.clubs.filter((club) => club.country.toLocaleLowerCase("pt-BR") === "brasil" && club.division === managedClub.division).map(({ id, name }) => ({ id, name })),
    season,
    competitionId: leagueId,
    competitionName: `Brasileirão ${managedClub.division}`,
    type: "league",
    division: managedClub.division,
    doubleRoundRobin: true,
  });
  const stateClubs = state ? database.clubs.filter((club) => club.country.toLocaleLowerCase("pt-BR") === "brasil" && resolveClubState(club) === state).map(({ id, name }) => ({ id, name })) : [];
  const stateId = state ? `state:${state}` : "";
  const stateGroups = state && stateClubs.length > 1 ? buildRoundRobinGroups({
    clubs: stateClubs,
    season,
    competitionId: stateId,
    competitionName: stateCompetitionName(state),
    type: "state",
    state,
  }) : [];
  const cupGroups = buildCupGroups(database, clubId, season);
  const groups = [...leagueGroups, ...stateGroups, ...cupGroups].sort((a, b) => a.round - b.round || typePriority(a.type) - typePriority(b.type));
  const fixtures: SeasonFixture[] = [];
  const firstManagerCupRound = cupGroups.flatMap((group) => group.fixtures)
    .filter((fixture) => fixture.homeClubId === clubId || fixture.awayClubId === clubId)
    .reduce((earliest, fixture) => Math.min(earliest, fixture.competitionRound), Number.POSITIVE_INFINITY);
  let calendarRound = 0;
  let previousKey = "";
  for (const group of groups) {
    const key = `${group.type}:${group.competitionId}:${group.round}`;
    if (key !== previousKey) calendarRound += 1;
    previousKey = key;
    for (const fixture of group.fixtures) {
      let scheduled = { ...fixture, calendarRound };
      if (group.type === "cup") {
        const userTie = fixture.homeClubId === clubId || fixture.awayClubId === clubId;
        if (group.round < firstManagerCupRound) {
          // A bye may mean the initial cup matches are already resolved before the manager enters.
          scheduled = simulateFixture(database, scheduled);
        } else if (group.round === firstManagerCupRound) {
          scheduled.status = "scheduled";
        } else {
          scheduled.status = "locked";
        }
        if (userTie && group.round > firstManagerCupRound) scheduled.status = "locked";
      }
      fixtures.push(scheduled);
    }
  }
  return { version: 1, season, clubId, clubName: managedClub.name, division: managedClub.division, ...(state ? { state } : {}), fixtures };
}

function typePriority(type: SeasonCompetitionType) {
  return type === "league" ? 0 : type === "state" ? 1 : 2;
}

export function stateCompetitionName(state: string) {
  const names: Record<string, string> = {
    "São Paulo": "Campeonato Paulista",
    "Rio de Janeiro": "Campeonato Carioca",
    "Minas Gerais": "Campeonato Mineiro",
    "Rio Grande do Sul": "Campeonato Gaúcho",
    Bahia: "Campeonato Baiano",
    Paraná: "Campeonato Paranaense",
    "Santa Catarina": "Campeonato Catarinense",
    Pernambuco: "Campeonato Pernambucano",
    Ceará: "Campeonato Cearense",
  };
  return names[state] ?? `Campeonato Estadual · ${state}`;
}

export function nextCareerFixture(season: CareerSeason | null | undefined): SeasonFixture | null {
  if (!season) return null;
  return season.fixtures
    .filter((fixture) => fixture.status === "scheduled" && (fixture.homeClubId === season.clubId || fixture.awayClubId === season.clubId))
    .sort((a, b) => a.calendarRound - b.calendarRound || a.competitionRound - b.competitionRound)[0] ?? null;
}

export function completeCareerFixture(
  season: CareerSeason,
  fixtureId: string,
  score: { home: number; away: number; winnerClubId?: string; playerContributions?: SeasonPlayerContribution[] },
  database: EditorDatabase,
): CareerSeason {
  const fixture = season.fixtures.find((item) => item.id === fixtureId);
  if (!fixture || fixture.status !== "scheduled") return season;
  const winnerClubId = fixture.type === "cup"
    ? score.winnerClubId ?? (score.home > score.away ? fixture.homeClubId : score.away > score.home ? fixture.awayClubId : seededRandom(`${fixture.id}|penalties`)() < 0.5 ? fixture.homeClubId : fixture.awayClubId)
    : undefined;
  const settled = season.fixtures.map((item) => {
    if (item.id === fixtureId) return { ...item, status: "played" as const, homeScore: score.home, awayScore: score.away, ...(winnerClubId ? { winnerClubId } : {}), playerContributions: score.playerContributions ?? [] };
    const dueCupBackground = item.type === "cup" && item.status === "locked" && item.homeClubId !== season.clubId && item.awayClubId !== season.clubId && item.calendarRound <= fixture.calendarRound;
    const dueScheduled = item.status === "scheduled" && item.calendarRound <= fixture.calendarRound;
    if (dueCupBackground || dueScheduled) return simulateFixture(database, item);
    return item;
  });
  if (fixture.type === "cup") {
    const managerWon = winnerClubId === season.clubId;
    if (!managerWon) {
      for (let index = 0; index < settled.length; index += 1) {
        const item = settled[index];
        if (item.competitionId === fixture.competitionId && item.competitionRound > fixture.competitionRound && (item.homeClubId === season.clubId || item.awayClubId === season.clubId) && item.status !== "played") settled[index] = { ...item, status: "cancelled" };
      }
    } else {
      const nextRound = fixture.competitionRound + 1;
      for (let index = 0; index < settled.length; index += 1) {
        const item = settled[index];
        if (item.competitionId === fixture.competitionId && item.competitionRound === nextRound && item.status === "locked") {
          settled[index] = { ...item, status: "scheduled" };
        }
      }
    }
  }
  return { ...season, fixtures: settled };
}

export function getCompetitionStandings(fixtures: SeasonFixture[], competitionId: string): CompetitionStanding[] {
  const rows = new Map<string, CompetitionStanding>();
  const ensure = (clubId: string, club: string) => {
    let row = rows.get(clubId);
    if (!row) {
      row = { club, clubId, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
      rows.set(clubId, row);
    }
    return row;
  };
  for (const fixture of fixtures.filter((item) => item.competitionId === competitionId)) {
    ensure(fixture.homeClubId, fixture.home);
    ensure(fixture.awayClubId, fixture.away);
    if (fixture.status !== "played" || fixture.homeScore === undefined || fixture.awayScore === undefined) continue;
    const home = ensure(fixture.homeClubId, fixture.home);
    const away = ensure(fixture.awayClubId, fixture.away);
    home.played += 1;
    away.played += 1;
    home.goalsFor += fixture.homeScore;
    home.goalsAgainst += fixture.awayScore;
    away.goalsFor += fixture.awayScore;
    away.goalsAgainst += fixture.homeScore;
    if (fixture.homeScore > fixture.awayScore) { home.wins += 1; home.points += 3; away.losses += 1; }
    else if (fixture.homeScore < fixture.awayScore) { away.wins += 1; away.points += 3; home.losses += 1; }
    else { home.draws += 1; away.draws += 1; home.points += 1; away.points += 1; }
  }
  return [...rows.values()].sort((a, b) => b.points - a.points || b.wins - a.wins || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor || a.club.localeCompare(b.club, "pt-BR"));
}

export function getCompetitionPlayerStats(fixtures: SeasonFixture[], competitionId: string) {
  const stats = new Map<string, SeasonPlayerContribution & { club: string; played: number; ratingTotal: number; ratedGames: number }>();
  const clubNames = new Map<string, string>();
  for (const fixture of fixtures) {
    clubNames.set(fixture.homeClubId, fixture.home);
    clubNames.set(fixture.awayClubId, fixture.away);
    if (fixture.competitionId !== competitionId || fixture.status !== "played") continue;
    for (const contribution of fixture.playerContributions ?? []) {
      const key = `${contribution.clubId}:${contribution.playerId}`;
      const row = stats.get(key) ?? { ...contribution, goals: 0, assists: 0, minutes: 0, rating: null, club: clubNames.get(contribution.clubId) ?? "Clube", played: 0, ratingTotal: 0, ratedGames: 0 };
      row.goals += contribution.goals;
      row.assists += contribution.assists;
      row.minutes += contribution.minutes;
      if (contribution.minutes > 0) row.played += 1;
      if (contribution.rating !== null) { row.ratingTotal += contribution.rating; row.ratedGames += 1; }
      stats.set(key, row);
    }
  }
  return [...stats.values()].map((row) => ({ ...row, rating: row.ratedGames ? row.ratingTotal / row.ratedGames : null }))
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists || a.playerName.localeCompare(b.playerName, "pt-BR"));
}

export function playerContributionsFromMatch(input: {
  database: EditorDatabase;
  clubId: string;
  squad: { id: number; sourceId?: string; name: string }[];
  events: { scorerId?: number; assistId?: number; scene?: { team: "home" | "away" }; card?: string }[];
  participation: Record<number, { entered: number; left?: number }>;
  ratings: Record<number, number>;
}): SeasonPlayerContribution[] {
  const clubPlayers = input.database.players.filter((player) => player.clubId === input.clubId);
  const bySourceId = new Map(clubPlayers.map((player) => [player.id, player]));
  const result = new Map<string, SeasonPlayerContribution>();
  const add = (playerId: number, field: "goals" | "assists") => {
    const player = input.squad.find((item) => item.id === playerId);
    if (!player) return;
    const source = player.sourceId ? bySourceId.get(player.sourceId) : undefined;
    const key = source?.id ?? `${input.clubId}:${player.id}`;
    const current = result.get(key) ?? {
      playerId: source?.id ?? String(player.id), playerName: player.name, clubId: input.clubId,
      goals: 0, assists: 0, rating: input.ratings[player.id] ?? null,
      minutes: Math.max(0, (input.participation[player.id]?.left ?? 90) - (input.participation[player.id]?.entered ?? 90)),
    };
    current[field] += 1;
    result.set(key, current);
  };
  for (const event of input.events) {
    if (event.scene?.team !== "home") continue;
    if (event.scorerId !== undefined) add(event.scorerId, "goals");
    if (event.assistId !== undefined) add(event.assistId, "assists");
  }
  for (const [idText, stint] of Object.entries(input.participation)) {
    const id = Number(idText);
    const player = input.squad.find((item) => item.id === id);
    if (!player) continue;
    const source = player.sourceId ? bySourceId.get(player.sourceId) : undefined;
    const key = source?.id ?? `${input.clubId}:${id}`;
    const current = result.get(key) ?? { playerId: source?.id ?? String(id), playerName: player.name, clubId: input.clubId, goals: 0, assists: 0, rating: input.ratings[id] ?? null, minutes: 0 };
    current.minutes = Math.max(0, (stint.left ?? 90) - stint.entered);
    current.rating = input.ratings[id] ?? current.rating;
    result.set(key, current);
  }
  return [...result.values()];
}
