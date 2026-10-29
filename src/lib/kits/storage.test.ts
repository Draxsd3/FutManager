import "fake-indexeddb/auto";
import { expect, it } from "vitest";
import { readKitProject, writeKitProject } from "./storage";
import { emptyKitProject } from "./design";
it("keeps sponsor settings and custom kits independent for each account and club", async () => {
  const project = {
    sponsors: ["Minha marca"],
    noSponsors: false,
    kits: [
      {
        id: "kit-1",
        name: "Conceito",
        image: "data:image/webp;base64,test",
        source: "ai" as const,
        prompt: "Clube A + Minha marca",
        createdAt: "2026-10-29",
      },
    ],
  };
  await writeKitProject("alice", "club-a", project);
  expect(await readKitProject("alice", "club-a")).toEqual(project);
  expect(await readKitProject("bob", "club-a")).toEqual(emptyKitProject());
  expect(await readKitProject("alice", "club-b")).toEqual(emptyKitProject());
  await writeKitProject("alice", "club-a", { ...project, kits: [] });
  expect((await readKitProject("alice", "club-a")).kits).toHaveLength(0);
  await expect(readKitProject("", "club-a")).rejects.toThrow("Conta");
});
