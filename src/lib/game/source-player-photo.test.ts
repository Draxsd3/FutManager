import { expect, it } from "vitest";
import { createDefaultDatabase } from "./editor-data";
import { squad } from "./mock-data";
import { sourcePlayerPhoto, trustedPlayerPhoto } from "./source-player-photo";

it("resolve fotos históricas por identidade externa sem mudar o save ou usar nomes", () => {
  const database = createDefaultDatabase();
  const source = database.players[0];
  source.transfermarkt = { id: "641458", collectedAt: "2026-11-04T00:00:00Z", season: "2026" };
  const player = { ...squad[0], sourceId: source.id, photoDataUrl: "data:image/png;base64,manual" };
  const before = structuredClone({ database, player });
  expect(sourcePlayerPhoto(player, database)).toBe("https://img.a.transfermarkt.technology/portrait/big/641458-1718990783.jpg");
  expect({ database, player }).toEqual(before);
  expect(sourcePlayerPhoto({ ...player, sourceId: "outro" }, database)).toBeUndefined();
  source.transfermarkt.id = "999999999";
  expect(sourcePlayerPhoto(player, database)).toBeUndefined();
});

it("aceita somente retratos HTTPS da fonte conhecida", () => {
  expect(trustedPlayerPhoto("https://img.a.transfermarkt.technology/portrait/big/1.jpg")).toBeTruthy();
  for (const url of ["http://img.a.transfermarkt.technology/portrait/x", "https://img.a.transfermarkt.technology.evil.com/portrait/x", "https://example.com/portrait/x", "javascript:alert(1)"]) expect(trustedPlayerPhoto(url)).toBeUndefined();
});
