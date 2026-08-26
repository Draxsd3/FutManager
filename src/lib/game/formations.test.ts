import { describe, expect, it } from "vitest";
import { nearestFormationSlot, tacticalFit } from "./formations";
import { buildStartingXI, squad } from "./mock-data";

describe("grade tática", () => {
  it("encaixa jogadores de linha no slot padronizado mais próximo", () => {
    expect(nearestFormationSlot("4-3-3", { left: 77, top: 12 }, false)).toBe(2);
  });

  it("mantém o goleiro restrito ao slot do gol", () => {
    expect(nearestFormationSlot("4-3-3", { left: 10, top: 10 }, true)).toBe(10);
  });

  it("aplica força integral, adaptação e improvisação", () => {
    const lateral = squad.find((player) => player.position === "L")!;
    expect(tacticalFit(lateral, "L").penalty).toBe(0);
    expect(tacticalFit(lateral, "Z").penalty).toBe(4);
    expect(tacticalFit(lateral, "A").penalty).toBe(10);
  });

  it("a seleção automática preenche as funções naturais antes de adaptar", () => {
    const ids = buildStartingXI("4-3-3", squad);
    const selected = ids.map((id) => squad.find((player) => player.id === id)!);
    expect(selected[6].position).toBe("L");
    expect(selected[7].position).toBe("Z");
    expect(selected[8].position).toBe("Z");
    expect(selected[9].position).toBe("L");
    expect(selected[10].position).toBe("G");
  });
});
