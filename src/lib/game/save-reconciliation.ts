import { normalizeBrazilianClubIdentity } from "./club-reconciliation";
import type { CareerSave, EditorClub, EditorDatabase } from "./editor-data";
import { createManagerMarket, type ManagerMarket } from "./manager-market";
import { createCareerSeason, nextCareerFixture, type SeasonFixture } from "./season";

function findCanonicalForDuplicateName(
  database: EditorDatabase,
  canonicalNames: Set<string>,
  duplicateName: string,
  state?: string,
): EditorClub | undefined {
  // If a fixture already uses an exact canonical club name from the catalog, it is NOT a duplicate Transfermarkt club.
  if (canonicalNames.has(duplicateName)) return undefined;
  const norm = normalizeBrazilianClubIdentity(duplicateName);
  if (!norm) return undefined;
  const matches = database.clubs.filter(
    (club) =>
      normalizeBrazilianClubIdentity(club.name) === norm &&
      (!state || !club.state || club.state === state),
  );
  if (matches.length === 1) return matches[0];
  const exact = database.clubs.filter((club) => normalizeBrazilianClubIdentity(club.name) === norm);
  return exact.length === 1 ? exact[0] : undefined;
}

function pruneManagerMarket(
  market: ManagerMarket | undefined,
  duplicateIds: Set<string>,
): { market: ManagerMarket | undefined; changed: boolean } {
  if (!market || !duplicateIds.size) return { market, changed: false };
  const hasAny = [...duplicateIds].some((id) => id in market.clubs);
  if (!hasAny) return { market, changed: false };
  const clubs = Object.fromEntries(Object.entries(market.clubs).filter(([id]) => !duplicateIds.has(id)));
  const dismissals = market.dismissals.filter((item) => !duplicateIds.has(item.clubId));
  const applications = market.applications?.filter((item) => !duplicateIds.has(item.clubId));
  return {
    market: {
      ...market,
      clubs,
      dismissals,
      ...(applications ? { applications } : {}),
    },
    changed: true,
  };
}

/**
 * Repairs career saves generated while duplicate Transfermarkt clubs were present in the
 * database. Unplayed round-1 seasons are regenerated cleanly with canonical 20/20/20/96
 * divisions; in-progress seasons drop or remap only the duplicate club fixtures.
 */
export function reconcileCareerSaveWithDatabase(
  save: CareerSave,
  database: EditorDatabase,
): { save: CareerSave; changed: boolean } {
  if (!save.progress || !database.clubs.length) return { save, changed: false };

  const clubById = new Map(database.clubs.map((club) => [club.id, club]));
  const canonicalNames = new Set(database.clubs.map((club) => club.name));
  const season = save.progress.competitionSeason;
  const duplicateToCanonical = new Map<string, EditorClub>();

  if (season) {
    for (const fixture of season.fixtures) {
      if (!clubById.has(fixture.homeClubId) && !duplicateToCanonical.has(fixture.homeClubId)) {
        const canonical = findCanonicalForDuplicateName(database, canonicalNames, fixture.home, fixture.state);
        if (canonical && canonical.id !== fixture.homeClubId) {
          duplicateToCanonical.set(fixture.homeClubId, canonical);
        }
      }
      if (!clubById.has(fixture.awayClubId) && !duplicateToCanonical.has(fixture.awayClubId)) {
        const canonical = findCanonicalForDuplicateName(database, canonicalNames, fixture.away, fixture.state);
        if (canonical && canonical.id !== fixture.awayClubId) {
          duplicateToCanonical.set(fixture.awayClubId, canonical);
        }
      }
    }
  }

  // Also check if the human's own club was a duplicate Transfermarkt row (e.g. "Clube Atlético Mineiro")
  const managedDuplicateCanonical = !clubById.has(save.clubId)
    ? findCanonicalForDuplicateName(database, canonicalNames, save.clubName)
    : undefined;
  if (managedDuplicateCanonical && managedDuplicateCanonical.id !== save.clubId) {
    duplicateToCanonical.set(save.clubId, managedDuplicateCanonical);
  }

  // Also detect extra duplicate entries in a 751-club managerMarket when database has been reconciled to 714 clubs
  const extraMarketIds = new Set<string>(duplicateToCanonical.keys());
  if (
    save.progress.managerMarket &&
    database.clubs.length >= 700 &&
    Object.keys(save.progress.managerMarket.clubs).length > database.clubs.length
  ) {
    for (const id of Object.keys(save.progress.managerMarket.clubs)) {
      if (!clubById.has(id)) extraMarketIds.add(id);
    }
  }

  if (!duplicateToCanonical.size && !extraMarketIds.size) {
    // Sync display names only when club IDs match the current database and a new Série D club was canonicalized
    if (season) {
      let namesUpdated = false;
      const renamedFixtures = season.fixtures.map((fixture) => {
        const canonHome = clubById.get(fixture.homeClubId)?.name ?? fixture.home;
        const canonAway = clubById.get(fixture.awayClubId)?.name ?? fixture.away;
        if (canonHome !== fixture.home || canonAway !== fixture.away) {
          namesUpdated = true;
          return { ...fixture, home: canonHome, away: canonAway };
        }
        return fixture;
      });
      if (namesUpdated) {
        return {
          save: {
            ...save,
            progress: { ...save.progress, competitionSeason: { ...season, fixtures: renamedFixtures } },
          },
          changed: true,
        };
      }
    }
    return { save, changed: false };
  }

  const managedClub =
    managedDuplicateCanonical ??
    clubById.get(save.clubId) ??
    database.clubs.find((club) => club.name === save.clubName);
  if (!managedClub) return { save, changed: false };

  let nextSeason = season;
  let seasonChanged = false;

  if (season && duplicateToCanonical.size > 0) {
    const hasPlayedFixtures = season.fixtures.some((fixture) => fixture.status === "played");
    const hasDuplicateFixtures = season.fixtures.some(
      (fixture) => duplicateToCanonical.has(fixture.homeClubId) || duplicateToCanonical.has(fixture.awayClubId),
    );

    if (hasDuplicateFixtures && !hasPlayedFixtures) {
      const rebuilt = createCareerSeason(database, managedClub.id, season.season || 2026);
      if (rebuilt) {
        nextSeason = rebuilt;
        seasonChanged = true;
      }
    } else if (hasDuplicateFixtures) {
      const clubsInComp = new Map<string, Set<string>>();
      for (const fixture of season.fixtures) {
        const set = clubsInComp.get(fixture.competitionId) ?? new Set<string>();
        set.add(fixture.homeClubId);
        set.add(fixture.awayClubId);
        clubsInComp.set(fixture.competitionId, set);
      }

      const cleanedFixtures: SeasonFixture[] = [];
      for (const fixture of season.fixtures) {
        const homeDup = duplicateToCanonical.get(fixture.homeClubId);
        const awayDup = duplicateToCanonical.get(fixture.awayClubId);
        if (!homeDup && !awayDup) {
          const canonHome = clubById.get(fixture.homeClubId)?.name ?? fixture.home;
          const canonAway = clubById.get(fixture.awayClubId)?.name ?? fixture.away;
          if (canonHome !== fixture.home || canonAway !== fixture.away) {
            cleanedFixtures.push({ ...fixture, home: canonHome, away: canonAway });
            seasonChanged = true;
          } else {
            cleanedFixtures.push(fixture);
          }
          continue;
        }
        const compSet = clubsInComp.get(fixture.competitionId);
        const homeAlreadyInComp = homeDup ? compSet?.has(homeDup.id) ?? false : false;
        const awayAlreadyInComp = awayDup ? compSet?.has(awayDup.id) ?? false : false;
        if (homeAlreadyInComp || awayAlreadyInComp) {
          seasonChanged = true;
          continue;
        }
        const newHomeId = homeDup?.id ?? fixture.homeClubId;
        const newAwayId = awayDup?.id ?? fixture.awayClubId;
        if (newHomeId === newAwayId) {
          seasonChanged = true;
          continue;
        }
        cleanedFixtures.push({
          ...fixture,
          homeClubId: newHomeId,
          home: homeDup?.name ?? fixture.home,
          awayClubId: newAwayId,
          away: awayDup?.name ?? fixture.away,
          ...(fixture.winnerClubId && duplicateToCanonical.has(fixture.winnerClubId)
            ? { winnerClubId: duplicateToCanonical.get(fixture.winnerClubId)!.id }
            : {}),
        });
        seasonChanged = true;
      }
      nextSeason = {
        ...season,
        clubId: managedClub.id,
        clubName: managedClub.name,
        fixtures: cleanedFixtures,
      };
    }
  }

  let nextMarket = save.progress.managerMarket;
  let marketChanged = false;

  if (seasonChanged && nextSeason && !nextSeason.fixtures.some((f) => f.status === "played")) {
    const freshMarket = createManagerMarket(database, nextSeason);
    const humanEntry = freshMarket.clubs[managedClub.id];
    if (humanEntry) {
      const payroll = (save.progress.careerSquad ?? []).reduce(
        (sum, player) => sum + (save.progress?.playerCareers?.[player.id]?.salary ?? player.salary),
        0,
      );
      freshMarket.clubs[managedClub.id] = {
        ...humanEntry,
        coach: save.managerName,
        budget: save.budget,
        startingBudget: save.progress.confidenceStartBudget ?? save.budget,
        payroll: payroll || humanEntry.payroll,
      };
    }
    nextMarket = freshMarket;
    marketChanged = true;
  } else {
    const pruned = pruneManagerMarket(save.progress.managerMarket, extraMarketIds);
    nextMarket = pruned.market;
    marketChanged = pruned.changed;
  }

  let snapshotsChanged = false;
  let nextSnapshots = save.progress.jobClubSnapshots;
  if (nextSnapshots && extraMarketIds.size > 0) {
    const filteredEntries = Object.entries(nextSnapshots).filter(([id]) => !extraMarketIds.has(id));
    if (filteredEntries.length !== Object.keys(nextSnapshots).length) {
      nextSnapshots = Object.fromEntries(filteredEntries);
      snapshotsChanged = true;
    }
  }

  const clubIdentityChanged = Boolean(managedDuplicateCanonical) && (save.clubId !== managedClub.id || save.clubName !== managedClub.name);
  if (!seasonChanged && !marketChanged && !snapshotsChanged && !clubIdentityChanged) {
    return { save, changed: false };
  }

  const existingActive =
    save.progress.activeFixtureId && nextSeason?.fixtures.some((f) => f.id === save.progress?.activeFixtureId)
      ? save.progress.activeFixtureId
      : nextCareerFixture(nextSeason)?.id;

  const firstScheduled = nextCareerFixture(nextSeason);
  const nextDate =
    seasonChanged && !nextSeason?.fixtures.some((f) => f.status === "played") && firstScheduled?.scheduledDate
      ? firstScheduled.scheduledDate
      : save.inGameDate;

  const updatedSave: CareerSave = {
    ...save,
    ...(clubIdentityChanged ? { clubId: managedClub.id, clubName: managedClub.name } : {}),
    inGameDate: nextDate,
    progress: {
      ...save.progress,
      ...(clubIdentityChanged ? { club: managedClub.name } : {}),
      competitionSeason: nextSeason,
      managerMarket: nextMarket,
      ...(nextSnapshots ? { jobClubSnapshots: nextSnapshots } : {}),
      activeFixtureId: existingActive,
    },
  };

  return { save: updatedSave, changed: true };
}
