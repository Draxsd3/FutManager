import { describe, expect, it } from "vitest";
import { createDefaultDatabase, type EditorClub, type EditorPlayer } from "./editor-data";
import { applyStructuralDatabaseUpdates, createCareerUniverseSnapshot, isClubRosterPlayable } from "./career-universe";

describe("career universe isolation and structural updates", () => {
  it("freezes team edits, roster changes, division moves and API player refreshes away from an existing career", () => {
    const base = createDefaultDatabase();
    const careerUniverse = createCareerUniverseSnapshot(base);
    const originalPalmeiras = careerUniverse.clubs.find((club) => club.name === "Palmeiras")!;
    const originalFirstPlayer = careerUniverse.players.find((player) => player.clubId === originalPalmeiras.id)!;

    const editedGlobalCatalog = {
      clubs: [
        ...base.clubs.map((club) =>
          club.id === originalPalmeiras.id
            ? {
                ...club,
                name: "Palmeiras Editado",
                division: "Série D" as const,
                level: 2,
                coachName: "Técnico Novo",
                stadiumName: "Arena Nova",
                stadiumCapacity: 99000,
              }
            : club,
        ),
        {
          id: "custom-new-club",
          name: "Clube Novo Editor",
          shortName: "CNE",
          division: "Série A" as const,
          foundedYear: 2026,
          primaryColor: "#112233",
          secondaryColor: "#ffffff",
          stadiumName: "Estádio Novo",
          stadiumCapacity: 12000,
          country: "Brasil",
          level: 10,
          coachName: "Treinador",
          kitStyle: "lisa" as const,
        },
      ],
      players: base.players.map((player) =>
        player.id === originalFirstPlayer.id
          ? { ...player, name: `Atualizado API ${player.name}`, overall: 99, age: 18 }
          : player,
      ),
    };

    const result = applyStructuralDatabaseUpdates(careerUniverse, editedGlobalCatalog);
    expect(result.changed).toBe(false);
    const palmeirasAfter = result.database.clubs.find((club) => club.id === originalPalmeiras.id)!;
    expect(palmeirasAfter.name).toBe("Palmeiras");
    expect(palmeirasAfter.division).toBe(originalPalmeiras.division);
    expect(palmeirasAfter.level).toBe(originalPalmeiras.level);
    expect(palmeirasAfter.coachName).toBe(originalPalmeiras.coachName);
    expect(result.database.clubs.some((club) => club.id === "custom-new-club")).toBe(false);
    const playerAfter = result.database.players.find((player) => player.id === originalFirstPlayer.id)!;
    expect(playerAfter.name).toBe(originalFirstPlayer.name);
    expect(playerAfter.overall).toBe(originalFirstPlayer.overall);
  });

  it("allows structural updates: missing UF/shortName/Transfermarkt linkage, duplicate club merge, and repairing an unplayable <11-player roster", () => {
    const base = createDefaultDatabase();
    const targetClub = base.clubs[0];
    const brokenClub: EditorClub = {
      ...targetClub,
      state: undefined,
      shortName: "   ",
      transfermarkt: undefined,
    };
    // Only 4 outfield players and 0 goalkeepers -> structurally unplayable!
    const brokenRoster = base.players
      .filter((player) => player.clubId === targetClub.id && player.primaryPosition !== "G")
      .slice(0, 4);
    expect(isClubRosterPlayable(brokenRoster, targetClub.id)).toBe(false);

    const careerWithStructuralDefects = {
      clubs: [brokenClub, ...base.clubs.slice(1)],
      players: [...brokenRoster, ...base.players.filter((player) => player.clubId !== targetClub.id)],
    };

    const healthyCatalog = {
      clubs: [
        {
          ...targetClub,
          state: "SP",
          shortName: "COR",
          name: "Nome Não Estrutural Ignorado",
          level: 1,
          transfermarkt: { id: "199", season: "2026", collectedAt: "2026-11-05T00:00:00Z" },
        },
        ...base.clubs.slice(1),
      ],
      players: base.players,
    };

    const result = applyStructuralDatabaseUpdates(careerWithStructuralDefects, healthyCatalog);
    expect(result.changed).toBe(true);
    const repairedClub = result.database.clubs.find((club) => club.id === targetClub.id)!;
    expect(repairedClub.state).toBe("SP");
    expect(repairedClub.shortName).toBe("COR");
    expect(repairedClub.transfermarkt?.id).toBe("199");
    // Non-structural fields on the repaired club remain untouched!
    expect(repairedClub.name).toBe(targetClub.name);
    expect(repairedClub.level).toBe(targetClub.level);
    expect(isClubRosterPlayable(result.database.players, targetClub.id)).toBe(true);
  });

  it("merges duplicate uncrested Transfermarkt clubs structurally inside an older career universe", () => {
    const base = createDefaultDatabase();
    const atletico: EditorClub = { ...base.clubs[0], id: "canonical-galo", name: "Atlético Mineiro", state: "Minas Gerais" };
    base.clubs.push(atletico);
    const duplicateClub: EditorClub = {
      ...atletico,
      id: "dup-galo",
      name: "Clube Atlético Mineiro",
      transfermarkt: { id: "330", season: "2026", collectedAt: "2026-11-04T00:00:00Z" },
    };
    const dupPlayers: EditorPlayer[] = base.players
      .filter((player) => player.clubId === atletico.id)
      .map((player, index) => ({
        ...player,
        id: `dup-p-${index}`,
        clubId: "dup-galo",
        transfermarkt: { id: `tm-${index}`, season: "2026", collectedAt: "2026-11-04T00:00:00Z" },
      }));

    const legacyUniverse = {
      clubs: [...base.clubs, duplicateClub],
      players: [...base.players, ...dupPlayers],
    };
    const result = applyStructuralDatabaseUpdates(legacyUniverse, base);
    expect(result.changed).toBe(true);
    expect(result.database.clubs.some((club) => club.id === "dup-galo")).toBe(false);
    expect(result.database.clubs.filter((club) => club.name === "Atlético Mineiro")).toHaveLength(1);
  });
});
