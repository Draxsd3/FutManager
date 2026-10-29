import { expect, it } from "vitest";
import { buildKitPrompt, kitRequestSchema, manualKitSvg } from "./design";
const input = {
  club: {
    name: "Corinthians",
    shortName: "SCCP",
    primaryColor: "#ffffff",
    secondaryColor: "#000000",
    kitStyle: "lisa" as const,
  },
  sponsors: ["Marca A — peito", "Marca B — mangas"],
  noSponsors: false,
  brief: "Textura contemporânea",
};
it("always sends the full club identity, all sponsors and a fixed silhouette template", () => {
  const prompt = buildKitPrompt(kitRequestSchema.parse(input));
  for (const term of [
    "Corinthians",
    "SCCP",
    "#ffffff",
    "#000000",
    "Marca A — peito",
    "Marca B — mangas",
    "1024x1536",
    "gola em V",
    "0,86",
  ])
    expect(prompt).toContain(term);
  expect(prompt).toContain('"Textura contemporânea"');
});
it("requires explicit sponsor information and validates colors and bounded instructions", () => {
  expect(kitRequestSchema.safeParse({ ...input, sponsors: [] }).success).toBe(
    false,
  );
  expect(
    kitRequestSchema.safeParse({ ...input, noSponsors: true }).success,
  ).toBe(false);
  const clean = kitRequestSchema.parse({
    ...input,
    sponsors: [],
    noSponsors: true,
  });
  expect(buildKitPrompt(clean)).toContain("Sem patrocinadores");
  expect(
    kitRequestSchema.safeParse({
      ...input,
      club: { ...input.club, primaryColor: "url(evil)" },
    }).success,
  ).toBe(false);
  expect(
    kitRequestSchema.safeParse({ ...input, brief: "x".repeat(1201) }).success,
  ).toBe(false);
});
it("manual SVG previews escape sponsor/club markup and retain the same proportions", () => {
  const svg = manualKitSvg(
    { ...input.club, shortName: "<svg>" },
    "#fff000",
    "#000000",
    "listrada",
    ["<script>alert(1)</script>"],
  );
  expect(svg).toContain('viewBox="0 0 870 1000"');
  expect(svg).not.toContain("<script>");
  expect(svg).toContain("&lt;");
});
it("uses a photographic mold and the first/second colors for unregistered home/away shirts", async () => {
  const { automaticKitSvg } = await import("./design");
  const club = {
    ...input.club,
    primaryColor: "#cc0000",
    secondaryColor: "#000000",
    kitStyle: "listrada" as const,
  };
  const home = automaticKitSvg(club, 1),
    away = automaticKitSvg(club, 2);
  expect(home).toContain('flood-color="#cc0000"');
  expect(away).toContain('flood-color="#000000"');
  for (const svg of [home, away]) {
    expect(svg).toContain('viewBox="0 0 870 1000"');
    expect(svg).toContain("data:image/png;base64,");
    expect(svg).not.toContain("<g clip-path");
  }
});
