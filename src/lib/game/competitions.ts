import type { EditorDatabase } from "./editor-data";

export type CompetitionCategory =
  "national" | "state" | "regional";
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
  { id: "state", label: "Estadual" },
  { id: "regional", label: "Regional" },
];
const states = [
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
  Acre: "Campeonato Acreano",
  Alagoas: "Campeonato Alagoano",
  Amapá: "Campeonato Amapaense",
  Amazonas: "Campeonato Amazonense",
  "Distrito Federal": "Campeonato Brasiliense",
  "Espírito Santo": "Campeonato Capixaba",
  Goiás: "Campeonato Goiano",
  Maranhão: "Campeonato Maranhense",
  "Mato Grosso": "Campeonato Mato-Grossense",
  "Mato Grosso do Sul": "Campeonato Sul-Mato-Grossense",
  Pará: "Campeonato Paraense",
  Paraíba: "Campeonato Paraibano",
  Piauí: "Campeonato Piauiense",
  "Rio Grande do Norte": "Campeonato Potiguar",
  Rondônia: "Campeonato Rondoniense",
  Roraima: "Campeonato Roraimense",
  Sergipe: "Campeonato Sergipano",
  Tocantins: "Campeonato Tocantinense",

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
  const national: CompetitionEntry[] = ["Série A", "Série B", "Série C", "Série D"].map((division) => ({
    id: `league:Brasil:${division}`,
    name: `Brasileirão · ${division}`,
    category: "national",
    location: "Brasil",
    division,
    format: division === "Série A" || division === "Série B" ? "Liga" : "Fases e grupos a cadastrar",
    clubs: database.clubs
      .filter((club) => club.country === "Brasil" && club.division === division)
      .map((club) => club.name),
  }));
  const extra: [CompetitionCategory, string, string, string][] = [
    ["national", "Copa do Brasil", "Brasil", "Mata-mata"],
    ["regional", "Copa do Nordeste", "Nordeste", "Formato a cadastrar"],
    ["regional", "Copa Verde", "Brasil", "Formato a cadastrar"],
  ];
  return [
    ...national,
    ...extra.map(([category, name, location, format]) => ({
      id: `${category}:${name}`,
      name,
      category,
      location,
      format,
      clubs: [],
    })),
    ...states.map((state) => ({
      id: `state:${state}`,
      name: stateNames[state] ?? `Estadual · ${state}`,
      category: "state" as const,
      location: state,
      format: "Formato a cadastrar",
      clubs: [],
    })),
  ];
}
