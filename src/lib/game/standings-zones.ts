/** Base bands for Brazilian 2026 leagues, not confirmed outcomes in the game.
 * Série A: CBF REC 2026, arts. 6–8:
 * https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_SA_rie_A_2026_v15_12_2025_final_02692c1077.pdf
 * Série B: https://www.cbf.com.br/futebol-brasileiro/noticias/supercopa/sub20/brasileirao-serie-b-comeca-com-novo-formato
 */
export type StandingsZone = "libertadores-grupos" | "libertadores-preliminar" | "sul-americana" | "acesso" | "playoff-acesso" | "rebaixamento";
type ZoneInfo = { id: StandingsZone; label: string };
export const SERIES_A_2026_ZONES: ZoneInfo[] = [
  { id: "libertadores-grupos", label: "Libertadores · fase de grupos" },
  { id: "libertadores-preliminar", label: "Libertadores · fase preliminar" },
  { id: "sul-americana", label: "Sul-Americana" },
  { id: "rebaixamento", label: "Rebaixamento" },
];
export const SERIES_B_2026_ZONES: ZoneInfo[] = [
  { id: "acesso", label: "Acesso direto à Série A" },
  { id: "playoff-acesso", label: "Playoff de acesso à Série A" },
  { id: "rebaixamento", label: "Rebaixamento" },
];
export function standingsZones(competitionId: string, season: number | undefined, teamCount: number): ZoneInfo[] {
  if (season !== 2026 || teamCount !== 20) return [];
  if (competitionId === "league:Brasil:Série A") return SERIES_A_2026_ZONES;
  if (competitionId === "league:Brasil:Série B") return SERIES_B_2026_ZONES;
  return [];
}
export function standingsZone(competitionId: string, season: number | undefined, teamCount: number, position: number): StandingsZone | undefined {
  if (!standingsZones(competitionId, season, teamCount).length || !Number.isInteger(position) || position < 1 || position > 20) return undefined;
  if (position >= 17) return "rebaixamento";
  if (competitionId === "league:Brasil:Série B") {
    if (position <= 2) return "acesso";
    if (position <= 6) return "playoff-acesso";
    return undefined;
  }
  if (position <= 4) return "libertadores-grupos";
  if (position === 5) return "libertadores-preliminar";
  if (position <= 11) return "sul-americana";
  return undefined;
}
