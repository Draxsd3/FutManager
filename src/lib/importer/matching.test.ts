import { describe, expect, it } from "vitest";
import { normalizeName, playerMatchScore } from "./matching";

describe("cruzamento de jogadores", () => {
  it("normaliza acentos e pontuação", () => expect(normalizeName("Gabriel Bárbosa!")).toBe("gabriel barbosa"));
  it("pontua nome, nascimento e clube equivalentes", () => expect(playerMatchScore({ fullName: "Gabriel Barbosa", birthDate: "1996-08-30", club: "Flamengo" }, { fullName: "Gabriel Barbosa", birthDate: "1996-08-30", club: "Flamengo" })).toBe(75));
});
