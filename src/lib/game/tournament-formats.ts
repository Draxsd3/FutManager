import type { EditorClub } from "./editor-data";

export type TournamentFormat = {
  groups: string[][];
  pairing: "within" | "cross" | "paulista";
  qualify: "four" | "leaders-best-second" | "top-eight" | "cearense";
  legs: number[];
  description: string;
};
// Names are catalog identities, NOT roster seeds. Never change players to register a competition.
export const STATE_FORMATS_2026: Record<string, TournamentFormat> = {
  "Rio de Janeiro": { groups: [["Fluminense", "Vasco da Gama", "Volta Redonda", "Sampaio Corrêa - RJ", "Portuguesa RJ", "Bangu"], ["Flamengo", "Botafogo", "Madureira", "Maricá", "Boavista", "Nova Iguaçu"]], pairing: "cross", qualify: "four", legs: [1,2,1], description: "2 grupos de 6 · confrontos entre grupos · 4 por grupo às quartas" },
  "Minas Gerais": { groups: [["Atlético Mineiro", "Democrata GV", "Uberlândia", "URT"], ["América Mineiro", "Betim", "Pouso Alegre", "Tombense"], ["Cruzeiro", "Athletic Club", "Itabirito-MG", "North"]], pairing: "cross", qualify: "leaders-best-second", legs: [2,1], description: "3 grupos de 4 · confrontos entre grupos · líderes e melhor segundo às semifinais" },
  "Rio Grande do Sul": { groups: [["Internacional", "Juventude", "Avenida", "São José", "Guarany Bagé", "São Luiz"], ["Grêmio", "Caxias", "Novo Hamburgo", "Monsoon", "Inter de Santa Maria", "Ypiranga-RS"]], pairing: "cross", qualify: "four", legs: [1,2,2], description: "2 grupos de 6 · confrontos entre grupos · quartas dentro do grupo" },
  "Paraná": { groups: [["Athlético Paranaense", "Maringá", "Londrina", "São Joseense", "Cascavel", "Foz do Iguaçu"], ["Coritiba", "Operário PR", "Azuriz", "Cianorte", "Andraus", "Galo Maringá"]], pairing: "cross", qualify: "four", legs: [2,2,2], description: "2 grupos de 6 · confrontos entre grupos · mata-mata em ida e volta" },
  "Santa Catarina": { groups: [["Avaí", "Camboriú", "Concórdia", "Marcílio Dias", "Joinville", "Brusque"], ["Chapecoense", "Carlos Renaux", "Barra-SC", "Figueirense", "Criciúma", "Santa Catarina"]], pairing: "cross", qualify: "four", legs: [2,2,2], description: "2 grupos de 6 · confrontos entre grupos · quartas dentro do grupo" },
  "Goiás": { groups: [["Vila Nova", "CRAC", "Inhumas", "Goiatuba"], ["Anápolis", "Goiás", "Jataiense", "Aparecidense"], ["Atlético Goianiense", "ABECAT", "Centro Oeste", "Anapolina"]], pairing: "cross", qualify: "top-eight", legs: [2,2,2], description: "3 grupos de 4 · confrontos entre grupos · 8 melhores da classificação geral" },
  "Ceará": { groups: [["Fortaleza", "Ferroviário", "Maracanã", "Horizonte", "Quixadá"], ["Ceará", "Floresta", "Iguatu", "Tirol", "Maranguape"]], pairing: "within", qualify: "cearense", legs: [2,2], description: "2 grupos de 5 · jogos no grupo · 3 por grupo à segunda fase cruzada" },
  "São Paulo": { groups: [["Corinthians", "Palmeiras", "São Paulo", "Santos"], ["São Bernardo", "Grêmio Novorizontino", "Red Bull Bragantino", "Mirassol"], ["Ponte Preta", "Guarani", "Velo Clube", "Portuguesa"], ["Botafogo SP", "Noroeste", "Capivariano", "Primavera-SP"]], pairing: "paulista", qualify: "top-eight", legs: [1,1,2], description: "Potes, não grupos classificatórios · 8 jogos · tabela única · 8 às quartas" },
};

export const SERIE_D_GROUPS_2026 = [
  ["Nacional - AM", "Manaus", "Manauara", "GAS", "Monte Roraima", "São Raimundo - RR"],
  ["Independência", "Galvez", "Humaitá", "Porto Velho-RO", "Guaporé", "Araguaína"],
  ["Gama", "Brasiliense", "Luverdense", "Primavera-MT", "Inhumas", "Aparecidense"],
  ["Capital", "Ceilândia", "Mixto", "Operário - MT", "União Rondonópolis", "Goiatuba"],
  ["Trem", "Oratório Recreativo", "Tuna Luso", "Águia", "Tocantinópolis", "Imperatriz"],
  ["Sampaio Corrêa", "Moto Club", "IAPE", "Maracanã", "Iguatu", "Parnahyba"],
  ["Ferroviário", "Tirol", "Atlético Cearense", "Altos", "Piauí", "Fluminense - PI"],
  ["ABC", "América RN", "Laguna", "Sousa", "Maguary", "Central - PE"],
  ["Retrô", "Decisão", "Serra Branca", "Treze", "Lagarto", "Sergipe"],
  ["ASA", "CSA", "CSE", "Jacuipense", "Atlético Alagoinhas", "Juazeirense"],
  ["Uberlândia", "Betim", "CRAC", "ABECAT", "Operário - MS", "Ivinhema"],
  ["Porto Sport Clube", "Rio Branco - ES", "Vitória - ES", "Real Noroeste", "Tombense", "Democrata GV"],
  ["Madureira", "Portuguesa RJ", "America RJ", "Portuguesa", "Água Santa", "Pouso Alegre"],
  ["Nova Iguaçu", "Sampaio Corrêa - RJ", "Maricá", "XV de Piracicaba", "Noroeste", "Velo Clube"],
  ["Cianorte", "Cascavel", "Santa Catarina", "Joinville", "Guarany Bagé", "São Luiz"],
  ["Blumenau", "Marcílio Dias", "São Joseense", "Azuriz", "São José", "Brasil de Pelotas"],
];
const aliases: Record<string, string[]> = {
  "North": ["North Esporte Clube", "North EC"], "Monsoon": ["Monsoon FC"], "Galo Maringá": ["Galo Maringa", "Aruko Sports Brasil"],
  "ABECAT": ["Abecat Ouvidorense"], "Tirol": ["Pague Menos", "Grêmio Pague Menos"], "Centro Oeste": ["Centro-Oeste"],
  "Primavera-MT": ["Primavera - MT"], "Primavera-SP": ["Primavera"], "Real Noroeste": ["Real Noroeste-ES"],
};
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
export function resolveRegisteredClub(clubs: EditorClub[], name: string): EditorClub | undefined {
  return clubs.find(club => club.name === name) ?? clubs.find(club => [name, ...(aliases[name] ?? [])].some(alias => normalize(alias) === normalize(club.name)));
}
