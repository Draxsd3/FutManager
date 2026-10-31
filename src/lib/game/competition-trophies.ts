import type { CompetitionEntry } from "./competitions";

/** The filenames come from arquivos/trofeus; unknown competitions intentionally have no image. */
const states: Record<string, string> = {
  "Acre": "AC", "Alagoas": "AL", "Amapá": "AP", "Amazonas": "AM", "Bahia": "BA", "Ceará": "CE",
  "Distrito Federal": "DF", "Espírito Santo": "ES", "Goiás": "GO", "Maranhão": "MA", "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS", "Minas Gerais": "MG", "Pará": "PA", "Paraíba": "PB", "Paraná": "PR",
  "Pernambuco": "PE", "Piauí": "PI", "Rio de Janeiro": "RJ", "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS", "Rondônia": "RO", "Roraima": "RR", "Santa Catarina": "SC",
  "São Paulo": "SP", "Sergipe": "SE", "Tocantins": "TO",
};
const named: Record<string, string> = {
  "national:Copa do Brasil": "tr_copa_BRA.png",
  "national:Supercopa do Brasil": "tr_supercopa_BRA.png",
  "international:CONMEBOL Libertadores": "tr_libertadores.png",
  "international:CONMEBOL Sul-Americana": "tr_sulamericana.png",
  "international:UEFA Champions League": "tr_ligacampeoes.png",
  "international:UEFA Europa League": "tr_ligaeuropa.png",
  "international:Mundial de Clubes": "tr_mundial.png",
  "international:Recopa Sul-Americana": "tr_recopasulamaericana.png",
  "selections:Copa do Mundo": "tr_copamundo.png",
  "selections:Copa América": "tr_copaamerica.png",
  "selections:Eurocopa": "tr_eurocopa.png",
  "regional:Copa do Nordeste": "tr_copanordeste.png",
  "regional:Copa Verde": "tr_copaverde.png",
};
const divisions: Record<string, string> = { "Série A": "d1", "Série B": "d2", "Série C": "d3", "Série D": "d4" };

export function competitionTrophyAsset(entry: CompetitionEntry): string | null {
  let file = named[entry.id];
  if (!file && entry.category === "state" && states[entry.location]) file = `tr_estadual_${states[entry.location]}.png`;
  if (!file && entry.id.startsWith("league:") && entry.location === "Brasil" && entry.division && divisions[entry.division]) file = `tr_nacional_BRA_${divisions[entry.division]}.png`;
  return file ? `/game-assets/trophies/catalog/${file}` : null;
}
