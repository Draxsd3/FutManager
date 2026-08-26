import { clubThemes, clubs, squad, type DivisionKey, type Player, type PositionCode } from "./mock-data";
import type { ManualPosition, PlayerCareerRecord } from "./career";

export type EditorClub = {
  id: string;
  name: string;
  shortName: string;
  division: DivisionKey;
  foundedYear: number;
  primaryColor: string;
  secondaryColor: string;
  stadiumName: string;
  stadiumCapacity: number;
  country: string;
  level: number;
  coachName: string;
  kitStyle: "lisa" | "listrada" | "faixa";
};

export type EditorPlayer = {
  id: string;
  clubId: string;
  name: string;
  shirtNumber: number;
  primaryPosition: PositionCode;
  secondaryPosition: PositionCode | null;
  overall: number;
  age: number;
  preferredFoot: "E" | "D" | "A";
  starRating: number;
  qualityPrimary: string;
  qualitySecondary: string;
  energy: number;
  salaryMonthlyBrl: number;
  marketValueBrl: number;
  goals: number;
  assists: number;
  ownGoals: number;
  averageRating: number | null;
  contractEndsOn: string;
};

export type EditorDatabase = {
  clubs: EditorClub[];
  players: EditorPlayer[];
};

// FIFA Club World Cup 2025: final club lists may contain up to 35 players.
export const MAX_CLUB_SQUAD_SIZE = 35;

export function enforceEditorSquadLimit(players: EditorPlayer[]) {
  const counts = new Map<string, number>();
  return players.filter((player) => {
    const count = counts.get(player.clubId) ?? 0;
    if (count >= MAX_CLUB_SQUAD_SIZE) return false;
    counts.set(player.clubId, count + 1);
    return true;
  });
}

export type CareerSave = {
  id: string;
  name: string;
  managerName: string;
  clubId: string;
  clubName: string;
  division: DivisionKey;
  round: number;
  budget: number;
  inGameDate: string;
  updatedAt: string;
  playerCareers?: Record<number, PlayerCareerRecord>;
  manualPositions?: Record<number, ManualPosition>;
};

const stadiums: Record<string, [string, number]> = {
  Flamengo: ["Maracanã", 78838],
  Palmeiras: ["Allianz Parque", 43713],
  Corinthians: ["Neo Química Arena", 49205],
  Botafogo: ["Nilton Santos", 44661],
  Santos: ["Vila Belmiro", 16068],
  Cruzeiro: ["Mineirão", 61846],
  Grêmio: ["Arena do Grêmio", 55662],
  Bahia: ["Arena Fonte Nova", 47907],
};

const reserveNames = [
  "Caio Souza", "Murilo Alves", "Rafael Lima", "Bruno Santos", "João Vitor",
  "Lucas Freitas", "Matheus Rocha", "André Luiz", "Felipe Nunes", "Diego Costa",
  "Thiago Martins", "Gabriel Silva", "Renato Oliveira", "Paulo Henrique",
  "Vinícius Melo", "Eduardo Ramos", "Gustavo Pereira", "Henrique Dias", "Igor Gomes",
];

function id() {
  return crypto.randomUUID();
}

export function createDefaultDatabase(): EditorDatabase {
  const editorClubs: EditorClub[] = [];
  const editorPlayers: EditorPlayer[] = [];

  (Object.entries(clubs) as [DivisionKey, readonly string[]][]).forEach(([division, names]) => {
    names.forEach((name, clubIndex) => {
      const theme = clubThemes[name];
      const clubId = id();
      const stadium = stadiums[name] ?? ["Estádio Municipal", 15000];
      editorClubs.push({
        id: clubId,
        name,
        shortName: theme?.short ?? name.slice(0, 3).toUpperCase(),
        division,
        foundedYear: 1900 + clubIndex * 3,
        primaryColor: theme?.primary ?? "#08783e",
        secondaryColor: theme?.secondary ?? "#ffffff",
        stadiumName: stadium[0],
        stadiumCapacity: stadium[1],
        country: "Brasil",
        level: division === "Série A" ? 14 - clubIndex : 10 - clubIndex,
        coachName: "Técnico interino",
        kitStyle: clubIndex % 3 === 0 ? "listrada" : clubIndex % 3 === 1 ? "faixa" : "lisa",
      });

      squad.forEach((base, playerIndex) => {
        editorPlayers.push({
          id: id(),
          clubId,
          name: name === "Flamengo" ? base.name : reserveNames[(playerIndex + clubIndex * 3) % reserveNames.length],
          shirtNumber: playerIndex + 1,
          primaryPosition: base.position,
          secondaryPosition: base.position === "G" ? null : base.position === "L" ? "Z" : base.position === "Z" ? "L" : base.position === "M" ? "A" : "M",
          overall: Math.max(58, base.overall - clubIndex),
          age: base.age,
          preferredFoot: base.foot,
          starRating: base.overall >= 82 ? 4 : base.overall >= 76 ? 3 : 2,
          qualityPrimary: base.traits.split("/")[0] ?? "Passe",
          qualitySecondary: base.traits.split("/")[1] ?? "Marcação",
          energy: base.energy,
          salaryMonthlyBrl: base.salary * 1000,
          marketValueBrl: base.marketValue * 1_000_000,
          goals: base.goals,
          assists: base.assists,
          ownGoals: base.ownGoals,
          averageRating: base.avgRating,
          contractEndsOn: "2027-12-31",
        });
      });
    });
  });

  return { clubs: editorClubs, players: editorPlayers };
}

export function upgradeEditorDatabase(database: EditorDatabase): EditorDatabase {
  return {
    clubs: database.clubs.map((club, index) => ({
      ...club,
      country: club.country ?? "Brasil",
      level: club.level ?? (club.division === "Série A" ? 14 - (index % 4) : 10 - (index % 4)),
      coachName: club.coachName ?? "Técnico interino",
      kitStyle: club.kitStyle ?? "listrada",
    })),
    players: enforceEditorSquadLimit(database.players.map((player) => ({
      ...player,
      starRating: player.starRating ?? (player.overall >= 82 ? 4 : player.overall >= 76 ? 3 : 2),
      qualityPrimary: !player.qualityPrimary || (player.qualityPrimary === "Passe" && player.qualitySecondary === "Marcação") ? ({ G: "Colocação", L: "Cruzamento", Z: "Desarme", M: "Armação", A: "Finalização" } as const)[player.primaryPosition] : player.qualityPrimary,
      qualitySecondary: !player.qualitySecondary || (player.qualityPrimary === "Passe" && player.qualitySecondary === "Marcação") ? ({ G: "Reflexo", L: "Velocidade", Z: "Cabeceio", M: "Passe", A: "Velocidade" } as const)[player.primaryPosition] : player.qualitySecondary,
      energy: player.energy ?? 100,
      salaryMonthlyBrl: player.salaryMonthlyBrl ?? player.overall * 1000,
      marketValueBrl: player.marketValueBrl ?? Math.round((player.overall / 18) * 1_000_000),
      goals: player.goals ?? 0,
      assists: player.assists ?? 0,
      ownGoals: player.ownGoals ?? 0,
      averageRating: player.averageRating ?? null,
      contractEndsOn: player.contractEndsOn ?? "2027-12-31",
    }))),
  };
}

export function buildSquadFromDatabase(database: EditorDatabase, clubName: string): Player[] | null {
  const selectedClub = database.clubs.find((club) => club.name === clubName);
  const players = database.players.filter((player) => player.clubId === selectedClub?.id).slice(0, MAX_CLUB_SQUAD_SIZE);
  if (players.length < 11) return null;
  return players.map((player, index) => ({
    id: index + 1,
    sourceId: player.id,
    name: player.name,
    position: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    foot: player.preferredFoot === "A" ? "D" : player.preferredFoot,
    overall: player.overall,
    energy: player.energy,
    salary: Math.round(player.salaryMonthlyBrl / 1000),
    passValue: Number((player.marketValueBrl / 1_000_000).toFixed(1)),
    goals: player.goals,
    assists: player.assists,
    ownGoals: player.ownGoals,
    traits: `${player.qualityPrimary.slice(0, 3)}/${player.qualitySecondary.slice(0, 3)}`,
    age: player.age,
    avgRating: player.averageRating,
    contractUntil: player.contractEndsOn,
    marketValue: Number((player.marketValueBrl / 1_000_000).toFixed(1)),
  }));
}
