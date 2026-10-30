import type { EditorDatabase } from "./editor-data";

export type CompetitionCategory =
  "national" | "international" | "selections" | "state" | "regional";
export type CompetitionEntry = {
  id: string;
  name: string;
  category: CompetitionCategory;
  location: string;
  format: string;
  clubs: string[];
  division?: string;
};
export const competitionCategories: {
  id: CompetitionCategory;
  label: string;
}[] = [
  { id: "national", label: "Nacional" },
  { id: "international", label: "Internacional" },
  { id: "selections", label: "Seleções" },
  { id: "state", label: "Estadual" },
  { id: "regional", label: "Regional" },
];
export const brazilianStates = [
  "Acre",
  "Alagoas",
  "Amapá",
  "Amazonas",
  "Bahia",
  "Ceará",
  "Distrito Federal",
  "Espírito Santo",
  "Goiás",
  "Maranhão",
  "Mato Grosso",
  "Mato Grosso do Sul",
  "Minas Gerais",
  "Pará",
  "Paraíba",
  "Paraná",
  "Pernambuco",
  "Piauí",
  "Rio de Janeiro",
  "Rio Grande do Norte",
  "Rio Grande do Sul",
  "Rondônia",
  "Roraima",
  "Santa Catarina",
  "São Paulo",
  "Sergipe",
  "Tocantins",
];
const stateNames: Record<string, string> = {
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

/** Catalog metadata is separate from tournament registrations and actual career results. */
export function buildCompetitionCatalog(
  database: EditorDatabase,
): CompetitionEntry[] {
  const national = new Map<string, CompetitionEntry>();
  for (const club of database.clubs) {
    const id = `league:${club.country}:${club.division}`;
    if (!national.has(id))
      national.set(id, {
        id,
        name: `${club.country === "Brasil" ? "Brasileirão" : "Liga nacional"} · ${club.division}`,
        category: "national",
        location: club.country,
        division: club.division,
        format: "Liga",
        clubs: [],
      });
    national.get(id)!.clubs.push(club.name);
  }
  const extra: [CompetitionCategory, string, string, string][] = [
    ["national", "Copa do Brasil", "Brasil", "Mata-mata"],
    ["national", "Supercopa do Brasil", "Brasil", "Final"],
    [
      "international",
      "CONMEBOL Libertadores",
      "América do Sul",
      "Grupos e mata-mata",
    ],
    [
      "international",
      "CONMEBOL Sul-Americana",
      "América do Sul",
      "Grupos e mata-mata",
    ],
    ["international", "UEFA Champions League", "Europa", "Liga e mata-mata"],
    ["international", "UEFA Europa League", "Europa", "Liga e mata-mata"],
    ["international", "Mundial de Clubes", "Mundo", "Formato a cadastrar"],
    ["international", "Recopa Sul-Americana", "América do Sul", "Final"],
    ["selections", "Copa do Mundo", "Mundo", "Grupos e mata-mata"],
    ["selections", "Copa América", "América do Sul", "Grupos e mata-mata"],
    ["selections", "Eurocopa", "Europa", "Grupos e mata-mata"],
    ["regional", "Copa do Nordeste", "Nordeste", "Formato a cadastrar"],
    ["regional", "Copa Verde", "Brasil", "Formato a cadastrar"],
  ];
  const brazilianClubs = database.clubs.filter((club) => club.country.toLocaleLowerCase("pt-BR") === "brasil");
  const stateByName: Record<string, string> = {
    Flamengo: "Rio de Janeiro", Botafogo: "Rio de Janeiro",
    Palmeiras: "São Paulo", Corinthians: "São Paulo", Santos: "São Paulo",
    "Ferroviária": "São Paulo", Cruzeiro: "Minas Gerais", Grêmio: "Rio Grande do Sul",
    Bahia: "Bahia", Remo: "Pará", "Náutico": "Pernambuco", Guarani: "São Paulo",
    CSA: "Alagoas", Caxias: "Rio Grande do Sul", Brasiliense: "Distrito Federal", Anápolis: "Goiás",
  };
  return [
    ...national.values(),
    ...extra.map(([category, name, location, format]) => ({
      id: `${category}:${name}`,
      name,
      category,
      location,
      format: name === "Copa do Brasil" ? `Mata-mata · ${brazilianClubs.length} clubes cadastrados` : format,
      clubs: name === "Copa do Brasil" ? brazilianClubs.map((club) => club.name) : [],
    })),
    ...brazilianStates.map((state) => {
      const participants = brazilianClubs.filter((club) => (club.state ?? stateByName[club.name]) === state);
      return {
        id: `state:${state}`,
        name: stateNames[state] ?? `Campeonato Estadual · ${state}`,
        category: "state" as const,
        location: state,
        format: participants.length >= 2 ? `Grupo único · ${participants.length} clubes cadastrados` : "Sem participantes suficientes cadastrados",
        clubs: participants.map((club) => club.name),
      };
    }),
  ];
}
