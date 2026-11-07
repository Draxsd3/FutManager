import type { PositionCode, Player } from "./mock-data";
import type { EditorClub } from "./editor-data";

export type YouthPlayer = { birthYear?: number; id: string; name: string; age: number; position: PositionCode; overall: number; nationality: string | null; origin: "simulado" | "transfermarkt"; positionEstimated?: boolean; ageEstimated?: boolean; externalId?: string };
export type YouthTeam = { season?: number;cpuPromotedIn?:number; players: YouthPlayer[]; origin: "simulado" | "transfermarkt"; note: string; collectedAt?: string; promoted?: string[] };
const firstNames = ["João", "Pedro", "Lucas", "Gabriel", "Matheus", "Rafael", "Gustavo", "Felipe", "Bruno", "Daniel", "Caio", "Arthur", "Leonardo", "Davi", "Enzo", "Igor", "André", "Murilo", "Vitor", "Thiago", "Nicolas", "Eduardo", "Vinícius", "Miguel", "Samuel", "Henrique", "Anderson", "Júlio", "Paulo", "Diego"];
const surnames = ["Silva", "Santos", "Oliveira", "Souza", "Pereira", "Lima", "Costa", "Rodrigues", "Almeida", "Ferreira", "Ribeiro", "Carvalho", "Martins", "Rocha", "Gomes", "Dias", "Nunes", "Moraes", "Cardoso", "Barbosa", "Freitas", "Azevedo", "Moreira", "Melo", "Barros", "Mendes"];
const roles: PositionCode[] = ["G", "G", "L", "L", "L", "L", "Z", "Z", "Z", "Z", "M", "M", "M", "M", "M", "M", "A", "A", "A", "A"];
function hash(text: string) { let h = 2166136261; for (const char of text) h = Math.imul(h ^ char.charCodeAt(0), 16777619); return h >>> 0; }
/** Generated on demand for every club, stable within a career; not real athletes. */
export function generateYouthTeam(club: EditorClub, careerId: string, note = "Base simulada: dados reais indisponíveis."): YouthTeam {
  let state = hash(`${careerId}:${club.id}`) || 1;
  const random = (max: number) => { state ^= state << 13; state ^= state >>> 17; state ^= state << 5; return (state >>> 0) % max; };
  const used = new Set<string>();
  const players = roles.map((position, index): YouthPlayer => {
    let name = "";
    do { name = `${firstNames[random(firstNames.length)]} ${surnames[random(surnames.length)]}`; } while (used.has(name));
    used.add(name);
    return { id: `simulado:${club.id}:${index}`, name, position, age: 15 + random(5), overall: Math.min(75, Math.max(35, 35 + club.level + random(12))), nationality: "Brasil", origin: "simulado" };
  });
  return { origin: "simulado", note, players };
}
export function promoteYouth(player: YouthPlayer, squad: Player[], reservedIds: number[]): Player | null {
  if (squad.some(member => member.youthId === player.id)) return null;
  const id = Math.max(0, ...squad.map(member => member.id), ...reservedIds) + 1;
  return { id, youthId: player.id, name: player.name, position: player.position, age: player.age, foot: "D", overall: player.overall, energy: 100, salary: 2, passValue: .1, marketValue: .1, goals: 0, assists: 0, ownGoals: 0, traits: "Base", avgRating: null, contractUntil: "2027-12-31", marketAvailability: "normal" };
}
