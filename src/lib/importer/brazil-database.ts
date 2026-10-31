import type { EditorClub, EditorDatabase, EditorPlayer } from "@/lib/game/editor-data";
import type { DivisionKey, PositionCode } from "@/lib/game/mock-data";

const aliases: Record<string, string> = { vasco: "vasco da gama", "sport": "sport recife", "novorizontino": "gremio novorizontino", "america-mg": "america mineiro", "atletico-mg": "atletico mineiro" };
function normalized(name: string) {
  const value = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
  return aliases[value] ?? value;
}

/** Account-local UUIDs: imported IDs must never collide across Supabase owners. */
export async function importBrazilDatabase(existing?: EditorDatabase): Promise<EditorDatabase> {
  const { default: source } = await import("@/data/brazil-clubs.json");
  const clubs: EditorClub[] = [], players: EditorPlayer[] = [];
  const replaced = new Set<string>();
  for (const team of source) {
    const match = existing?.clubs.find(club => club.country.toLocaleLowerCase("pt-BR") === "brasil" && normalized(club.name) === normalized(team.name) && (!club.state || club.state === team.state));
    const clubId = match?.id ?? crypto.randomUUID();
    if (match) replaced.add(match.id);
    clubs.push({ id: clubId, name: team.name, shortName: team.name.slice(0, 3).toUpperCase(),
      division: team.division as DivisionKey, state: team.state, foundedYear: 0,
      primaryColor: team.primaryColor, secondaryColor: team.secondaryColor,
      stadiumName: team.stadium, stadiumCapacity: team.capacity, country: "Brasil",
      level: team.level, coachName: team.coach, kitStyle: "lisa" });
    // The application limit is 35. Keep goalkeeper(s) before truncation, stable within each group.
    const senior = [...team.players].sort((a,b) => Number(b.position === "G") - Number(a.position === "G")).slice(0,35);
    for (const [index, player] of senior.entries()) {
      // Explicit simulation defaults, not factual Brasfoot/2026 financial or ability measurements.
      const overall = Math.min(95, Math.max(35, 40 + team.level * 2 + (player.star ? 6 : 0)));
      players.push({ id: crypto.randomUUID(), clubId, name: player.name, age: player.age,
        shirtNumber: index + 1, primaryPosition: player.position as PositionCode, secondaryPosition: null,
        preferredFoot: player.foot as "E" | "D", overall, starRating: player.star ? 4 : 2,
        qualityPrimary: `Importada (cód. ${player.qualities[0]})`, qualitySecondary: `Importada (cód. ${player.qualities[1]})`,
        energy: 100, salaryMonthlyBrl: Math.round(overall * overall * 8), marketValueBrl: Math.round(overall ** 3 * 5),
        goals: 0, assists: 0, ownGoals: 0, averageRating: null, contractEndsOn: "2027-12-31", marketStatus: "normal" });
    }
  }
  return { clubs: [...(existing?.clubs.filter(club => !replaced.has(club.id)) ?? []), ...clubs],
    players: [...(existing?.players.filter(player => !replaced.has(player.clubId)) ?? []), ...players] };
}
