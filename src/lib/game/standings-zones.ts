/** Base 2026 Série A bands only. Projections, not actual qualification or relegation.
 * CBF REC Série A 2026, arts. 6–8: https://stcbfsiteprdimgbrs.blob.core.windows.net/img-site/cdn/REC_Brasileiro_SA_rie_A_2026_v15_12_2025_final_02692c1077.pdf
 */
export type StandingsZone = "libertadores-grupos" | "libertadores-preliminar" | "sul-americana" | "rebaixamento";
export const SERIES_A_2026_ZONES: { id: StandingsZone; label: string }[] = [
  { id: "libertadores-grupos", label: "Libertadores · fase de grupos" },
  { id: "libertadores-preliminar", label: "Libertadores · fase preliminar" },
  { id: "sul-americana", label: "Sul-Americana" },
  { id: "rebaixamento", label: "Rebaixamento" },
];
export function standingsZone(competitionId: string, season: number | undefined, teamCount: number, hasResults: boolean, position: number): StandingsZone | undefined {
  if (competitionId !== "league:Brasil:Série A" || season !== 2026 || teamCount !== 20 || !hasResults || !Number.isInteger(position)) return undefined;
  if (position >= 1 && position <= 4) return "libertadores-grupos";
  if (position === 5) return "libertadores-preliminar";
  if (position >= 6 && position <= 11) return "sul-americana";
  if (position >= 17 && position <= 20) return "rebaixamento";
  return undefined;
}
