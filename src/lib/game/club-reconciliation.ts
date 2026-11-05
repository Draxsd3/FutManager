import { clubCrestAsset } from "./assets";
import type { EditorClub, EditorDatabase, EditorPlayer } from "./editor-data";

export type NewNationalClubSpec = {
  rawNames: readonly string[];
  name: string;
  shortName: string;
  state: string;
  primaryColor: string;
  secondaryColor: string;
};

/**
 * The 37 Brazilian clubs whose official Transfermarkt display names previously failed
 * to match the existing catalog and produced duplicate crestless rows.
 */
export const CANONICAL_TM_CLUB_TARGETS: Record<string, readonly [name: string, state: string]> = {
  "330": ["Atlético Mineiro", "Minas Gerais"],
  "3876": ["Mirassol", "São Paulo"],
  "2863": ["América Mineiro", "Minas Gerais"],
  "15172": ["Atlético Goianiense", "Goiás"],
  "2029": ["Ceará", "Ceará"],
  "28022": ["Cuiabá", "Mato Grosso"],
  "1693": ["Londrina", "Paraná"],
  "9141": ["Caxias", "Rio Grande do Sul"],
  "65477": ["Floresta", "Ceará"],
  "1785": ["Santa Cruz", "Pernambuco"],
  "45176": ["Água Santa", "São Paulo"],
  "27642": ["Águia", "Pará"],
  "25229": ["Atlético Alagoinhas", "Bahia"],
  "27837": ["Atlético Cearense", "Ceará"],
  "98702": ["Betim", "Minas Gerais"],
  "10560": ["Brasil de Pelotas", "Rio Grande do Sul"],
  "3973": ["Brasiliense", "Distrito Federal"],
  "38023": ["Capital", "Distrito Federal"],
  "28621": ["Cascavel", "Paraná"],
  "21409": ["Central - PE", "Pernambuco"],
  "12602": ["CRAC", "Goiás"],
  "52513": ["CSE", "Alagoas"],
  "87822": ["GAS", "Roraima"],
  "33050": ["Jacuipense", "Bahia"],
  "32991": ["Juazeirense", "Bahia"],
  "21599": ["Luverdense", "Mato Grosso"],
  "11900": ["Mixto", "Mato Grosso"],
  "12009": ["Moto Club", "Maranhão"],
  "16108": ["Nova Iguaçu", "Rio de Janeiro"],
  "60520": ["Operário - MT", "Mato Grosso"],
  "53471": ["Oratório Recreativo", "Amapá"],
  "121518": ["Porto Sport Clube", "Bahia"],
  "72477": ["Porto Velho-RO", "Rondônia"],
  "3319": ["Sampaio Corrêa", "Maranhão"],
  "40120": ["Sampaio Corrêa - RJ", "Rio de Janeiro"],
  "28199": ["União Rondonópolis", "Mato Grosso"],
  "32037": ["Velo Clube", "São Paulo"],
};

/**
 * The 8 clubs in the 2026 Brasileirão Série D absent from legacy .ban files,
 * normalized to clean Brazilian names backed by official crest/kit assets.
 */
export const NEW_2026_SERIE_D_SPECS: Record<string, NewNationalClubSpec> = {
  "115027": {
    rawNames: ["ABECAT Ouvidorense"],
    name: "ABECAT Ouvidorense",
    shortName: "ABE",
    state: "Goiás",
    primaryColor: "#f16500",
    secondaryColor: "#ffffff",
  },
  "94170": {
    rawNames: ["CEFAT Tirol", "Tirol"],
    name: "Tirol",
    shortName: "TIR",
    state: "Ceará",
    primaryColor: "#003b9f",
    secondaryColor: "#ffffff",
  },
  "36962": {
    rawNames: ["Ivinhema FC", "Ivinhema"],
    name: "Ivinhema",
    shortName: "IVI",
    state: "Mato Grosso do Sul",
    primaryColor: "#0092dd",
    secondaryColor: "#ffffff",
  },
  "108000": {
    rawNames: ["Clube Laguna (RN)", "Clube Laguna", "Laguna"],
    name: "Laguna",
    shortName: "LAG",
    state: "Rio Grande do Norte",
    primaryColor: "#00205b",
    secondaryColor: "#ff99ff",
  },
  "119625": {
    rawNames: ["Monte Roraima FC", "Monte Roraima"],
    name: "Monte Roraima",
    shortName: "MTR",
    state: "Roraima",
    primaryColor: "#edc011",
    secondaryColor: "#1f6b3a",
  },
  "64925": {
    rawNames: ["Piauí EC (PI)", "Piauí EC", "Piauí"],
    name: "Piauí",
    shortName: "PIA",
    state: "Piauí",
    primaryColor: "#444691",
    secondaryColor: "#d62828",
  },
  "98845": {
    rawNames: ["Primavera AC", "Primavera-MT", "Primavera - MT"],
    name: "Primavera - MT",
    shortName: "PMT",
    state: "Mato Grosso",
    primaryColor: "#642b91",
    secondaryColor: "#ffffff",
  },
  "36478": {
    rawNames: ["Real Noroeste CFC", "Real Noroeste"],
    name: "Real Noroeste",
    shortName: "RNO",
    state: "Espírito Santo",
    primaryColor: "#d70707",
    secondaryColor: "#ffffff",
  },
};

export function normalizeBrazilianClubIdentity(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\([a-z]{2}\)\s*$/g, " ")
    .replace(/(?:\s*-\s*|\s+)(ac|al|am|ap|ba|ce|df|es|go|ma|mg|ms|mt|pa|pb|pe|pi|pr|rj|rn|ro|rr|rs|sc|se|sp|to)\s*$/g, " ")
    .replace(/[-()/·.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /^(sociedade esportiva e recreativa|sociedade esportiva|sociedade desportiva|clube recreativo e atletico|clube de regatas do|clube de regatas|clube sociedade|associacao atletica|associacao olimpica de|associacao|agremiacao esportiva|gremio esportivo|centro esportivo|esporte clube|sport club do|sport club|futebol clube|atletico clube|clube|club|ser|sd|se|cr|sc|ec|aa|ad|ae|ce|fc|ge|ga)\s+/,
      "",
    )
    .replace(
      /\s+(de futebol e regatas|futebol e esporte|foot ball porto alegrense|foot ball club|football club|sporting club|sport clube|sport club|futebol clube|esporte clube|futebol|cfc|fbpa|ec|fc|fr|sc|ac|rc|cf)$/,
      "",
    )
    .trim();
}

function isMeaningfulText(value?: string | null): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== "Não informado" && trimmed !== "Técnico interino";
}

function normalizeNewNationalClub(club: EditorClub): EditorClub {
  const tmId = club.transfermarkt?.id;
  if (!tmId) return club;
  const spec = NEW_2026_SERIE_D_SPECS[tmId];
  if (!spec) return club;
  const hasRawName = spec.rawNames.includes(club.name);
  const hasDefaultShort = !club.shortName || club.shortName === club.name.slice(0, 3).toUpperCase();
  const hasDefaultColors = club.primaryColor.toLowerCase() === "#246e43" && club.secondaryColor.toLowerCase() === "#ffffff";
  return {
    ...club,
    name: hasRawName ? spec.name : club.name,
    shortName: hasRawName && hasDefaultShort ? spec.shortName : club.shortName,
    state: club.state || spec.state,
    primaryColor: hasDefaultColors ? spec.primaryColor : club.primaryColor,
    secondaryColor: hasDefaultColors ? spec.secondaryColor : club.secondaryColor,
  };
}

/**
 * Idempotently merges duplicate Transfermarkt-created crestless clubs onto their
 * canonical catalog clubs (preserving API-synced rosters, loans, honours, and custom kits)
 * and normalizes the 8 new 2026 Série D clubs so every national club resolves its crest.
 */
export function reconcileEditorDatabase(database: EditorDatabase): {
  database: EditorDatabase;
  mergedDuplicateToCanonicalId: Map<string, string>;
} {
  const mergedDuplicateToCanonicalId = new Map<string, string>();
  if (!database.clubs.length) return { database, mergedDuplicateToCanonicalId };

  const claimedCanonicalIds = new Set<string>();
  const duplicateByCanonicalId = new Map<string, EditorClub>();

  for (const club of database.clubs) {
    const tmId = club.transfermarkt?.id;
    if (!tmId) continue;

    let canonical: EditorClub | undefined;
    const explicitTarget = CANONICAL_TM_CLUB_TARGETS[tmId];
    if (explicitTarget) {
      const [targetName, targetState] = explicitTarget;
      canonical = database.clubs.find(
        (candidate) =>
          candidate.id !== club.id &&
          !claimedCanonicalIds.has(candidate.id) &&
          !candidate.transfermarkt &&
          candidate.name === targetName &&
          (!candidate.state || candidate.state === targetState),
      );
    }

    if (!canonical && !clubCrestAsset(club.name)) {
      const normName = normalizeBrazilianClubIdentity(club.name);
      const candidates = database.clubs.filter(
        (candidate) =>
          candidate.id !== club.id &&
          !claimedCanonicalIds.has(candidate.id) &&
          !candidate.transfermarkt &&
          Boolean(clubCrestAsset(candidate.name)) &&
          (candidate.division === club.division || candidate.division === "Sem divisão nacional") &&
          (!club.state || !candidate.state || candidate.state === club.state) &&
          normalizeBrazilianClubIdentity(candidate.name) === normName,
      );
      if (candidates.length === 1) canonical = candidates[0];
    }

    if (canonical) {
      claimedCanonicalIds.add(canonical.id);
      mergedDuplicateToCanonicalId.set(club.id, canonical.id);
      duplicateByCanonicalId.set(canonical.id, club);
    }
  }

  const normalizedClubs = database.clubs
    .filter((club) => !mergedDuplicateToCanonicalId.has(club.id))
    .map((club) => {
      const dup = duplicateByCanonicalId.get(club.id);
      if (!dup) return normalizeNewNationalClub(club);
      const explicitState = dup.transfermarkt?.id ? CANONICAL_TM_CLUB_TARGETS[dup.transfermarkt.id]?.[1] : undefined;
      return {
        ...club,
        division: dup.division || club.division,
        state: club.state || explicitState || dup.state,
        transfermarkt: dup.transfermarkt ?? club.transfermarkt,
        honours: dup.honours ?? dup.transfermarkt?.honours ?? club.honours,
        stadiumName: isMeaningfulText(dup.stadiumName) ? dup.stadiumName : club.stadiumName,
        stadiumCapacity: dup.stadiumCapacity > 0 ? dup.stadiumCapacity : club.stadiumCapacity,
        coachName: isMeaningfulText(dup.coachName) ? dup.coachName : club.coachName,
      } satisfies EditorClub;
    });

  if (!mergedDuplicateToCanonicalId.size) {
    const clubsChanged = normalizedClubs.some((club, idx) => club !== database.clubs[idx]);
    return {
      database: clubsChanged ? { ...database, clubs: normalizedClubs } : database,
      mergedDuplicateToCanonicalId,
    };
  }

  // Drop stale non-Transfermarkt static players from canonical clubs receiving an API roster
  const canonicalsWithIncomingTmRoster = new Set<string>();
  for (const player of database.players) {
    const mappedClubId = mergedDuplicateToCanonicalId.get(player.clubId);
    if (mappedClubId && player.transfermarkt) {
      canonicalsWithIncomingTmRoster.add(mappedClubId);
    }
  }

  const seenTmPlayerByClub = new Set<string>();
  const reconciledPlayers: EditorPlayer[] = [];

  // Process players from duplicate clubs after canonical Transfermarkt players? No: prefer Transfermarkt players first.
  const orderedPlayers = [...database.players].sort(
    (a, b) => Number(Boolean(b.transfermarkt)) - Number(Boolean(a.transfermarkt)),
  );

  for (const player of orderedPlayers) {
    const targetClubId = mergedDuplicateToCanonicalId.get(player.clubId) ?? player.clubId;
    if (!mergedDuplicateToCanonicalId.has(player.clubId) && canonicalsWithIncomingTmRoster.has(targetClubId) && !player.transfermarkt) {
      continue;
    }
    if (player.transfermarkt?.id) {
      const dedupKey = `${targetClubId}:${player.transfermarkt.id}`;
      if (seenTmPlayerByClub.has(dedupKey)) continue;
      seenTmPlayerByClub.add(dedupKey);
    }
    const remappedLoan = player.loan
      ? {
          ...player.loan,
          owner: {
            ...player.loan.owner,
            ...(player.loan.owner.clubId
              ? { clubId: mergedDuplicateToCanonicalId.get(player.loan.owner.clubId) ?? player.loan.owner.clubId }
              : {}),
          },
          borrower: {
            ...player.loan.borrower,
            ...(player.loan.borrower.clubId
              ? { clubId: mergedDuplicateToCanonicalId.get(player.loan.borrower.clubId) ?? player.loan.borrower.clubId }
              : {}),
          },
        }
      : undefined;

    if (targetClubId !== player.clubId || remappedLoan !== player.loan) {
      reconciledPlayers.push({
        ...player,
        clubId: targetClubId,
        ...(remappedLoan ? { loan: remappedLoan } : {}),
      });
    } else {
      reconciledPlayers.push(player);
    }
  }

  return {
    database: { clubs: normalizedClubs, players: reconciledPlayers },
    mergedDuplicateToCanonicalId,
  };
}
