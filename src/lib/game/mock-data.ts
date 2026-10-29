export type PositionCode = "G" | "L" | "Z" | "M" | "A";

export type Player = {
  id: number;
  sourceId?: string;
  shirtNumber?: number;
  name: string;
  position: PositionCode;
  secondaryPosition?: PositionCode | null;
  foot: "E" | "D";
  overall: number;
  energy: number;
  salary: number; // em mil
  passValue: number; // em milhões
  goals: number;
  assists: number;
  ownGoals: number;
  traits: string;
  age: number;
  avgRating: number | null;
  contractUntil: string;
  marketValue: number; // em milhões
  photoDataUrl?: string | null;
};

export type ClubTheme = {
  primary: string;
  secondary: string;
  text: string;
  short: string;
};

export const clubThemes: Record<string, ClubTheme> = {
  Flamengo: { primary: "#c91520", secondary: "#161616", text: "#ffffff", short: "CRF" },
  Palmeiras: { primary: "#08783e", secondary: "#0a1f14", text: "#ffffff", short: "SEP" },
  Corinthians: { primary: "#ece8df", secondary: "#111111", text: "#111111", short: "SCCP" },
  Botafogo: { primary: "#191919", secondary: "#f4f4f4", text: "#ffffff", short: "BFR" },
  Santos: { primary: "#f3f3ed", secondary: "#171717", text: "#111111", short: "SFC" },
  Cruzeiro: { primary: "#17499b", secondary: "#0b2352", text: "#ffffff", short: "CEC" },
  Grêmio: { primary: "#1c9fda", secondary: "#111111", text: "#ffffff", short: "FBPA" },
  Bahia: { primary: "#1d4e9e", secondary: "#791f24", text: "#ffffff", short: "ECB" },
};

export const clubs = {
  "Série A": ["Flamengo", "Palmeiras", "Corinthians", "Botafogo"],
  "Série B": ["Santos", "Cruzeiro", "Grêmio", "Bahia"],
} as const;

export type DivisionKey = keyof typeof clubs;

type RawPlayer = {
  name: string;
  position: PositionCode;
  foot: "E" | "D";
  overall: number;
  traits: string;
  age: number;
  salary: number;
  passValue: number;
  marketValue: number;
};

const rawSquad: RawPlayer[] = [
  { name: "Rossi", position: "G", foot: "D", overall: 78, traits: "Col/SGo", age: 27, salary: 92, passValue: 3.2, marketValue: 3.2 },
  { name: "Matheus Cunha", position: "G", foot: "D", overall: 73, traits: "DPe/Ref", age: 24, salary: 80, passValue: 2.8, marketValue: 2.8 },
  { name: "Wesley", position: "L", foot: "D", overall: 75, traits: "Mar/Fin", age: 21, salary: 88, passValue: 4.1, marketValue: 4.1 },
  { name: "Varela", position: "L", foot: "D", overall: 74, traits: "Mar/Vel", age: 25, salary: 84, passValue: 3.4, marketValue: 3.4 },
  { name: "Danilo", position: "L", foot: "E", overall: 78, traits: "Cru/Mar", age: 24, salary: 105, passValue: 4.3, marketValue: 5.1 },
  { name: "Ayrton Lucas", position: "L", foot: "E", overall: 77, traits: "Cru/Vel", age: 26, salary: 101, passValue: 4.5, marketValue: 4.7 },
  { name: "Léo Pereira", position: "Z", foot: "D", overall: 79, traits: "Des/Cab", age: 28, salary: 107, passValue: 5.1, marketValue: 5.3 },
  { name: "Léo Ortiz", position: "Z", foot: "D", overall: 81, traits: "Des/Res", age: 30, salary: 110, passValue: 5.5, marketValue: 5.9 },
  { name: "Fabrício Bruno", position: "Z", foot: "D", overall: 77, traits: "Des/Mar", age: 27, salary: 100, passValue: 4.6, marketValue: 4.4 },
  { name: "Pulgar", position: "M", foot: "D", overall: 80, traits: "Fin/Pas", age: 31, salary: 110, passValue: 4.2, marketValue: 3.9 },
  { name: "De la Cruz", position: "M", foot: "E", overall: 82, traits: "Arm/Fin", age: 25, salary: 110, passValue: 5.5, marketValue: 6.2 },
  { name: "Gerson", position: "M", foot: "D", overall: 82, traits: "Fin/Pas", age: 27, salary: 108, passValue: 4.3, marketValue: 5.8 },
  { name: "Allan", position: "M", foot: "D", overall: 76, traits: "Des/Cab", age: 29, salary: 93, passValue: 3.7, marketValue: 3.1 },
  { name: "Arrascaeta", position: "M", foot: "D", overall: 84, traits: "Pas/Fin", age: 30, salary: 110, passValue: 5.4, marketValue: 6.8 },
  { name: "Everton Ribeiro", position: "M", foot: "D", overall: 75, traits: "Fin/Pas", age: 36, salary: 86, passValue: 1.7, marketValue: 1.4 },
  { name: "Luiz Araújo", position: "A", foot: "E", overall: 79, traits: "Fin/Cab", age: 27, salary: 102, passValue: 5.2, marketValue: 5.6 },
  { name: "Pedro", position: "A", foot: "D", overall: 83, traits: "Fin/Vel", age: 27, salary: 108, passValue: 6.1, marketValue: 7.4 },
  { name: "Bruno Henrique", position: "A", foot: "D", overall: 80, traits: "Fin/Cab", age: 34, salary: 78, passValue: 1.9, marketValue: 1.6 },
  { name: "Plata", position: "A", foot: "D", overall: 77, traits: "Fin/Vel", age: 24, salary: 83, passValue: 3.1, marketValue: 3.4 },
];

export const squad: Player[] = rawSquad.map((player, index) => ({
  id: index + 1,
  sourceId: undefined,
  name: player.name,
  position: player.position,
  secondaryPosition: player.position === "G" ? null : player.position === "L" ? "Z" : player.position === "Z" ? "L" : player.position === "M" ? "A" : "M",
  foot: player.foot,
  overall: player.overall,
  energy: 100,
  salary: player.salary,
  passValue: player.passValue,
  goals: 0,
  assists: 0,
  ownGoals: 0,
  traits: player.traits,
  age: player.age,
  avgRating: null,
  contractUntil: "18/ago/2027",
  marketValue: player.marketValue,
}));

export const positionLabel: Record<PositionCode, string> = {
  G: "Goleiro",
  L: "Lateral",
  Z: "Zagueiro",
  M: "Meia",
  A: "Atacante",
};

export type TableRow = {
  club: string;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type TopScorer = { name: string; club: string; goals: number; played: number };
export type TopRating = { name: string; club: string; rating: number; played: number; role: "G" | "L" | "Z" | "M" | "A" };

export type RoundFixture = {
  stadium: string;
  attendance: number;
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
  live?: boolean;
};

const formationRoles: Record<string, PositionCode[]> = {
  "4-3-3": ["A", "A", "A", "M", "M", "M", "L", "Z", "Z", "L", "G"],
  "4-4-2": ["A", "A", "M", "M", "M", "M", "L", "Z", "Z", "L", "G"],
  "3-5-2": ["A", "A", "M", "M", "M", "M", "M", "Z", "Z", "Z", "G"],
};

// Preenche cada slot pela função natural, depois pela secundária e só então improvisa.
export function buildStartingXI(formation: string, players: Player[]): number[] {
  const roles = formationRoles[formation] ?? formationRoles["4-3-3"];
  const available = [...players];
  return roles.map((role) => {
    const ranked = available
      .filter((player) => role === "G" ? player.position === "G" : player.position !== "G")
      .sort((a, b) => {
        const fitA = a.position === role ? 0 : a.secondaryPosition === role ? 4 : 10;
        const fitB = b.position === role ? 0 : b.secondaryPosition === role ? 4 : 10;
        return fitA - fitB || b.overall - a.overall;
      });
    const selected = ranked[0] ?? available.sort((a, b) => b.overall - a.overall)[0];
    if (!selected) return -1;
    available.splice(available.findIndex((player) => player.id === selected.id), 1);
    return selected.id;
  }).filter((id) => id >= 0);
}

export function buildRoundFixtures(
  division: DivisionKey,
  club: string,
  opponent: string,
  homeScore: number,
  awayScore: number,
): RoundFixture[] {
  const others = clubs[division === "Série A" ? "Série B" : "Série A"];
  return [
    { stadium: "Independência", attendance: 13567, home: club, away: opponent, homeScore, awayScore, live: true },
    { stadium: "Arena Central", attendance: 24067, home: others[0], away: others[1], homeScore: 1, awayScore: 0 },
    { stadium: "Estádio Municipal", attendance: 4979, home: others[2], away: others[3], homeScore: 2, awayScore: 1 },
  ];
}
