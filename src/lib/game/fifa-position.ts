import type { Player } from "./mock-data";

const namedPositions: Record<string, string> = {
  "Ayrton Lucas": "LB", Wesley: "RB", Varela: "RB", Danilo: "RB",
  Pulgar: "CDM", Allan: "CDM", "De la Cruz": "CM", Gerson: "CM", Arrascaeta: "CAM", "Everton Ribeiro": "CAM",
  "Luiz Araújo": "RW", Pedro: "ST", "Bruno Henrique": "LW", Plata: "RW",
};

export function fifaPosition(player: Player) {
  return namedPositions[player.name] ?? ({ G: "GK", L: player.foot === "E" ? "LB" : "RB", Z: "CB", M: "CM", A: "ST" } as const)[player.position];
}

export function fifaPositionOrder(player: Player) {
  const order = ["GK", "RB", "LB", "CB", "CDM", "CM", "CAM", "RW", "LW", "ST"];
  return order.indexOf(fifaPosition(player));
}
