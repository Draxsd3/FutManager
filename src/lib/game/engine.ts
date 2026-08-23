export type Club = { id: string; name: string; overall: number; points: number; played: number; goalsFor: number; goalsAgainst: number };
export type Fixture = { id: string; date: string; home: string; away: string; homeScore?: number; awayScore?: number };

export type SquadMember = { id: string; name: string; number: number; positions: string[]; overall: number; form: number };

export function calculateTeamRating(players: SquadMember[]) {
  if (players.length !== 11) return 0;
  return Math.round(players.reduce((total, player) => total + player.overall + player.form, 0) / players.length);
}

export type MatchInstructions = { mentality: "defensiva" | "equilibrada" | "ofensiva"; focus: "meio" | "laterais"; marking: "leve" | "normal" | "pesada" };

export function tacticalAdjustment(instructions: MatchInstructions) {
  const mentality = { defensiva: -3, equilibrada: 0, ofensiva: 3 }[instructions.mentality];
  const marking = { leve: -1, normal: 0, pesada: 1 }[instructions.marking];
  return mentality + marking;
}

export function positionFit(players: SquadMember[], slots: string[]) {
  if (players.length !== slots.length) return 0;
  const adaptable = (slot: string, positions: string[]) => positions.includes(slot) || (slot === "DEF" && positions.some((position) => ["LD", "LE", "ZAG", "ALA"].includes(position))) || (slot === "MEI" && positions.some((position) => ["VOL", "MC", "MEI", "PD", "PE"].includes(position))) || (slot === "ATA" && positions.some((position) => ["ATA", "SA", "PD", "PE"].includes(position)));
  return players.reduce((score, player, index) => score + (adaptable(slots[index], player.positions) ? 0 : -4), 0);
}

export function matchReport(home: string, away: string, homeScore: number, awayScore: number, focus: MatchInstructions["focus"]) {
  const moments = [
    `12' ${home} pressiona ${focus === "laterais" ? "pelos lados" : "pelo meio"}.`,
    `33' grande defesa evita o gol do ${away}.`,
    homeScore + awayScore > 0 ? `58' gol! O placar muda no confronto.` : "58' partida truncada no meio-campo.",
    `90' fim de jogo: ${home} ${homeScore} × ${awayScore} ${away}.`,
  ];
  return moments;
}

export function simulateMatch(fixture: Fixture, clubs: Club[], random = Math.random) {
  const home = clubs.find((club) => club.id === fixture.home)!;
  const away = clubs.find((club) => club.id === fixture.away)!;
  const goals = (rating: number, advantage = 0) => Math.max(0, Math.round((rating - 55 + advantage) / 18 + random() * 2));
  const homeScore = goals(home.overall, 4);
  const awayScore = goals(away.overall);
  const update = (club: Club, scored: number, conceded: number): Club => ({ ...club, played: club.played + 1, goalsFor: club.goalsFor + scored, goalsAgainst: club.goalsAgainst + conceded, points: club.points + (scored > conceded ? 3 : scored === conceded ? 1 : 0) });
  return { fixture: { ...fixture, homeScore, awayScore }, clubs: clubs.map((club) => club.id === home.id ? update(club, homeScore, awayScore) : club.id === away.id ? update(club, awayScore, homeScore) : club) };
}

export const sortTable = (clubs: Club[]) => [...clubs].sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
