import type { EditorDatabase, EditorPlayer } from "./editor-data";
import { askingFeeBrl } from "./transfers";

export type MarketAvailability = "all" | "available" | "sale" | "loan" | "free";
export const searchText = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
import { isFreeAgent } from "./player-contract";
export { isFreeAgent } from "./player-contract";
export function playerNationalities(player: EditorPlayer): string[] {
  return [...new Set((player.nationalities ?? []).map(n => n.trim()).filter(Boolean))];
}
export type MarketSearch = { query: string; availability: MarketAvailability; country: string; nationality: string; division: string; position: string; maxAge: string; maxFee: string; minOverall: string; maxSalary: string };
export function searchMarket(database: EditorDatabase, club: string, hired: Set<string | undefined>, filters: MarketSearch) {
  const clubs = new Map(database.clubs.map(c => [c.id,c]));
  const positions: Record<string,string> = { G: "goleiro", L: "lateral", Z: "zagueiro", M: "meio-campo meia volante", A: "atacante ponta centroavante" };
  const tokens = searchText(filters.query).split(/\s+/).filter(Boolean);
  return database.players.filter(p => {
    const team = clubs.get(p.clubId), free = isFreeAgent(p);
    if ((!team && !free) || team?.name === club || hired.has(p.id)) return false;
    const listed = p.marketStatus === "sale" || p.marketStatus === "loan";
    if (filters.availability === "free" ? !free : filters.availability === "available" ? !listed && !free : filters.availability !== "all" && (free || p.marketStatus !== filters.availability)) return false;
    const nationalities = playerNationalities(p);
    const fee = free ? 0 : askingFeeBrl(p.marketStatus === "loan" ? "loan" : "sale", p.marketValueBrl);
    const haystack = searchText([p.name,team?.name,team?.country,...nationalities,positions[p.primaryPosition],positions[p.secondaryPosition ?? ""],free ? "sem clube sem contrato livre" : ""].join(" "));
    return (!filters.country || team?.country === filters.country)
      && (!filters.division || team?.division === filters.division)
      && (!filters.nationality || (filters.nationality === "__unknown" ? !nationalities.length : nationalities.includes(filters.nationality)))
      && (!filters.position || p.primaryPosition === filters.position || p.secondaryPosition === filters.position)
      && (!filters.maxAge || p.age <= Number(filters.maxAge))
      && (!filters.maxFee || fee <= Number(filters.maxFee)*1e6)
      && (!filters.minOverall || p.overall >= Number(filters.minOverall))
      && (!filters.maxSalary || p.salaryMonthlyBrl <= Number(filters.maxSalary)*1000)
      && tokens.every(token => haystack.includes(token));
  }).sort((a,b) => b.overall-a.overall || a.name.localeCompare(b.name,"pt-BR"));
}
