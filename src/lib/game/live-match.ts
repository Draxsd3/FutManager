import type { Player, PositionCode } from "./mock-data";
import type { ManualPosition } from "./career";
import { formationSlotRoles, formationSlots, playerFitAtPosition } from "./formations";
import type { MatchRules } from "./match-rules";

export type MatchSide = "home" | "away";
export type LiveAction = "pass" | "shot" | "goal" | "tackle" | "foul" | "discussion" | "offside" | "turnover";
export type MatchTactics = { style: string; marking: string; focus: string };
export type MatchWeather = {
  id: string;
  label: string;
  temperatureC: number;
  rainIntensity: number;
  windKmh: number;
};
export type MatchScene = {
  action: LiveAction;
  team: MatchSide;
  actorIndex: number;
  actorId?: number;
  targetIndex: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  /** Team in possession after this event. Optional for saves created by older versions. */
  possessionAfter?: MatchSide;
};
export type MatchEvent = {
  minute: number;
  half: 1 | 2;
  text: string;
  card?: "yellow" | "red";
  scene?: MatchScene;
  scorer?: string;
  scorerId?: number;
  actorId?: number;
  assistId?: number;
  interceptorId?: number;
  keeperId?: number;
  outcome?: "goal" | "saved" | "missed" | "complete" | "intercepted";
};

type Point = { x: number; y: number };
export type KickSnapshot = { home: Point[]; away: Point[] };
export type MatchTeamInput = {
  players: Player[];
  formation: string;
  positions: Record<number, ManualPosition>;
  tactics: MatchTactics;
  motivation: number;
  sentOffIds?: number[];
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const opposite = (side: MatchSide): MatchSide => side === "home" ? "away" : "home";

export function fieldPoint(position: ManualPosition, away: boolean): Point {
  return { x: clamp(away ? position.top : 100 - position.top, 5, 95), y: clamp(away ? 100 - position.left : position.left, 5, 95) };
}

/** Stable FNV-1a + mulberry32 stream, so reloads never reroll an already scheduled minute. */
export function seededRandom(seed: string | number): () => number {
  const source = String(seed);
  let state = 2166136261;
  for (const char of source) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  return () => {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createMinuteRandom(matchKey: string, minute: number): () => number {
  return seededRandom(`${matchKey}|minute:${minute}`);
}

export function createMatchWeather(matchKey: string, rules: MatchRules): MatchWeather {
  const random = seededRandom(`${matchKey}|weather|v${rules.version}`);
  const totalWeight = rules.weatherOptions.reduce((total, weather) => total + weather.weight, 0);
  let selection = random() * totalWeight;
  const condition = rules.weatherOptions.find((weather) => (selection -= weather.weight) < 0) ?? rules.weatherOptions[0];
  const between = (minimum: number, maximum: number) => Math.round(minimum + random() * (maximum - minimum));
  return {
    id: condition.id,
    label: condition.label,
    temperatureC: between(condition.tempMinC, condition.tempMaxC),
    rainIntensity: condition.rainIntensity,
    windKmh: between(condition.windMinKmh, condition.windMaxKmh),
  };
}

/** Simplified Law 11 check retained for the text engine's pass events and legacy positioning data. */
export function isOffsideAtPass(team: MatchSide, receiver: Point, ball: Point, opponents: Point[], exempt = false): boolean {
  if (exempt || opponents.length < 2) return false;
  const xs = opponents.map((point) => point.x).sort((a, b) => team === "home" ? b - a : a - b);
  return team === "home"
    ? receiver.x > 50 && receiver.x > ball.x && receiver.x > xs[1]
    : receiver.x < 50 && receiver.x < ball.x && receiver.x < xs[1];
}

function traitHas(player: Player, aliases: string[]) {
  const tokens = (player.traits ?? "").toLocaleLowerCase("pt-BR").split(/[\s/,;+|]+/).filter(Boolean);
  return tokens.some((token) => aliases.some((alias) => token === alias || token.startsWith(alias)));
}

const skillAliases: Record<string, string[]> = {
  passing: ["pas", "arm", "cru", "vis", "passe", "armação", "cruzamento"],
  finishing: ["fin", "cab", "vel", "dri", "finalização", "cabeceio", "drible"],
  defending: ["des", "mar", "cab", "pos", "defesa", "desarme", "marcação"],
  goalkeeping: ["ref", "col", "sgo", "dpe", "goleiro", "reflexo", "colocação"],
  physical: ["for", "vel", "res", "físico", "força", "velocidade"],
};

function playerRole(player: Player, index: number, team: MatchTeamInput): PositionCode {
  const slots = formationSlots[team.formation] ?? formationSlots["4-3-3"];
  const roleList = formationSlotRoles[team.formation] ?? formationSlotRoles["4-3-3"];
  const position = team.positions[player.id] ?? slots[index] ?? { left: 50, top: 50 };
  return playerFitAtPosition(player, team.formation, position, index).role ?? roleList[index] ?? player.position;
}

function fitPenalty(player: Player, index: number, team: MatchTeamInput) {
  const slots = formationSlots[team.formation] ?? formationSlots["4-3-3"];
  const position = team.positions[player.id] ?? slots[index] ?? { left: 50, top: 50 };
  return playerFitAtPosition(player, team.formation, position, index).penalty;
}

function athleteSkill(player: Player, index: number, team: MatchTeamInput, skill: keyof typeof skillAliases, minute: number, weather: MatchWeather) {
  const tags = skillAliases[skill];
  const tagged = traitHas(player, tags);
  const secondary = traitHas(player, ["secundária", "secondary"]);
  const bonus = tagged ? (secondary ? 3 : 6) : 0;
  const fatigue = Math.max(0, 70 - player.energy) * 0.08 + Math.max(0, weather.temperatureC - 28) * 0.22 + minute / 90 * 5;
  return clamp(player.overall - fitPenalty(player, index, team) + bonus + (player.energy - 70) * 0.06 - fatigue, 1, 100);
}

type TeamProfile = {
  overall: number;
  technique: number;
  attack: number;
  defense: number;
  midfield: number;
  keeper: number;
  marking: number;
  passer: number;
  shooter: number;
  keeperIndex: number;
};

function weightedMean(values: Array<{ value: number; weight: number }>, fallback: number) {
  const total = values.reduce((sum, row) => sum + row.weight, 0);
  return total ? values.reduce((sum, row) => sum + row.value * row.weight, 0) / total : fallback;
}

function activePlayers(team: MatchTeamInput) {
  return team.players.slice(0, 11).map((player, index) => ({ player, index }))
    .filter(({ player }) => !team.sentOffIds?.includes(player.id));
}

function profile(team: MatchTeamInput, minute: number, weather: MatchWeather): TeamProfile {
  const entries = activePlayers(team);
  const players = entries.map((entry) => entry.player);
  const roles = entries.map(({ player, index }) => playerRole(player, index, team));
  const manpowerPenalty = (11 - entries.length) * 2.4;
  const overall = weightedMean(entries.map(({ player, index }) => ({
    value: clamp(player.overall - fitPenalty(player, index, team) + (player.energy - 70) * .045, 25, 100), weight: 1,
  })), 68) - manpowerPenalty;
  const passing = entries.map(({ player, index }) => athleteSkill(player, index, team, "passing", minute, weather));
  const finishing = entries.map(({ player, index }) => athleteSkill(player, index, team, "finishing", minute, weather));
  const defending = entries.map(({ player, index }) => athleteSkill(player, index, team, "defending", minute, weather));
  const goalkeeping = entries.map(({ player, index }) => athleteSkill(player, index, team, "goalkeeping", minute, weather));
  const attack = weightedMean(players.map((_, index) => ({
    value: finishing[index], weight: roles[index] === "A" ? 1 : roles[index] === "M" ? .62 : roles[index] === "G" ? .08 : .2,
  })), overall) - manpowerPenalty;
  const defense = weightedMean(players.map((_, index) => ({
    value: defending[index], weight: roles[index] === "Z" ? 1 : roles[index] === "L" ? .86 : roles[index] === "M" ? .48 : roles[index] === "A" ? .18 : .1,
  })), overall) - manpowerPenalty * .65;
  const midfield = weightedMean(players.map((_, index) => ({
    value: passing[index], weight: roles[index] === "M" ? 1 : roles[index] === "L" || roles[index] === "Z" ? .38 : roles[index] === "A" ? .55 : .12,
  })), overall) - manpowerPenalty;
  const keeperRow = entries.findIndex(({ player }, index) => roles[index] === "G" && player.position === "G");
  const keeperIndex = keeperRow >= 0 ? entries[keeperRow].index : entries.at(-1)?.index ?? 0;
  const keeper = keeperRow >= 0 ? goalkeeping[keeperRow] : (goalkeeping.at(-1) ?? overall) - manpowerPenalty * .35;
  const technique = weightedMean([...passing, ...finishing, ...defending].map((value) => ({ value, weight: 1 })), overall);
  return { overall, technique, attack, defense, midfield, keeper, marking: defense, passer: midfield, shooter: attack, keeperIndex };
}

function choosePlayer(team: MatchTeamInput, minute: number, weather: MatchWeather, random: () => number, purpose: "passing" | "finishing" | "defending" | "goalkeeping", restrict?: PositionCode[]) {
  const entries = activePlayers(team);
  if (entries.length <= 1) return entries[0]?.index ?? 0;
  const rows = entries.map(({ player, index }) => {
    const role = playerRole(player, index, team);
    const roleFit = !restrict ? 0 : restrict.includes(role) ? 12 : -8;
    return { index, weight: Math.max(1, athleteSkill(player, index, team, purpose, minute, weather) + roleFit) ** 2 };
  });
  const total = rows.reduce((sum, row) => sum + row.weight, 0);
  let selection = random() * total;
  return rows.find((row) => (selection -= row.weight) < 0)?.index ?? rows.at(-1)!.index;
}

function chooseTarget(team: MatchTeamInput, fromIndex: number, snapshot: KickSnapshot | undefined, side: MatchSide, random: () => number) {
  const candidates = activePlayers(team).map((entry) => entry.index).filter((index) => index !== fromIndex);
  if (!candidates.length) return fromIndex;
  const points = snapshot?.[side];
  if (!points?.[fromIndex]) return candidates[Math.floor(random() * candidates.length)] ?? fromIndex;
  const nearest = candidates.sort((a, b) => Math.hypot(points[a].x - points[fromIndex].x, points[a].y - points[fromIndex].y)
    - Math.hypot(points[b].x - points[fromIndex].x, points[b].y - points[fromIndex].y)).slice(0, 4);
  return nearest[Math.floor(random() * nearest.length)] ?? fromIndex;
}

function playerName(team: MatchTeamInput, index: number, opponent: string) {
  return team.players[index]?.name ?? `jogador do ${opponent}`;
}

function simulatedPoint(index: number, team: MatchTeamInput, side: MatchSide, snapshot?: KickSnapshot): Point {
  const live = snapshot?.[side]?.[index];
  if (live) return live;
  const slots = formationSlots[team.formation] ?? formationSlots["4-3-3"];
  return fieldPoint(team.positions[team.players[index]?.id] ?? slots[index] ?? { left: 50, top: 50 }, side === "away");
}

function possessionShare(home: TeamProfile, away: TeamProfile, homeMotivation: number, awayMotivation: number, rules: MatchRules) {
  const midpoint = .5 + (home.midfield - away.midfield + (homeMotivation - awayMotivation) * .25) * rules.possessionStrengthWeight;
  return clamp(midpoint, rules.possessionMin, rules.possessionMax);
}

function tacticalFocusBonus(team: MatchTeamInput, index: number) {
  const role = playerRole(team.players[index], index, team);
  if (team.tactics.focus.toLowerCase().includes("later") && (role === "L" || role === "A")) return 2.5;
  if (team.tactics.focus.toLowerCase().includes("meio") && role === "M") return 2.5;
  return 0;
}

/** Simulates one coherent minute: actor, commentary, event type, possession, score and stats share one outcome. */
export function simulateAction({ minute, starters, formation, positions, opponent, opponentStarters, opponentFormation,
  previous, snapshot, rules, weather, tactics, opponentTactics, motivationHome, motivationAway, sentOffHomeIds = [], sentOffAwayIds = [], yellowCardIds = [], random }: {
  minute: number;
  starters: Player[];
  formation: string;
  positions: Record<number, ManualPosition>;
  opponent: string;
  opponentStarters?: Player[];
  opponentFormation?: string;
  previous?: MatchScene;
  snapshot?: KickSnapshot;
  rules: MatchRules;
  weather: MatchWeather;
  tactics: MatchTactics;
  opponentTactics?: MatchTactics;
  motivationHome: number;
  motivationAway: number;
  sentOffHomeIds?: number[];
  sentOffAwayIds?: number[];
  yellowCardIds?: number[];
  random: () => number;
}): MatchEvent {
  const home: MatchTeamInput = { players: starters, formation, positions, tactics, motivation: motivationHome, sentOffIds: sentOffHomeIds };
  const away: MatchTeamInput = {
    players: opponentStarters ?? [], formation: opponentFormation ?? formation, positions: {},
    tactics: opponentTactics ?? { style: "Equilibrado", marking: "Normal", focus: "Pelo meio" }, motivation: motivationAway, sentOffIds: sentOffAwayIds,
  };
  const teams = { home, away };
  const homeProfile = profile(home, minute, weather);
  const awayProfile = profile(away, minute, weather);
  const profiles = { home: homeProfile, away: awayProfile };
  const share = possessionShare(homeProfile, awayProfile, motivationHome, motivationAway, rules);
  const sideAtRandom = random() < share ? "home" : "away";
  const previousPossession = previous?.possessionAfter
    ?? (previous?.action === "goal" || previous?.action === "offside" ? opposite(previous.team)
      : previous?.action === "pass" || previous?.action === "foul" || previous?.action === "turnover" ? previous.team : undefined);
  const previousTeam = previousPossession ? profiles[previousPossession] : undefined;
  const otherTeam = previousPossession ? profiles[opposite(previousPossession)] : undefined;
  const previousMotivation = previousPossession === "home" ? motivationHome : motivationAway;
  const otherMotivation = previousPossession === "home" ? motivationAway : motivationHome;
  const retentionChance = previousTeam && otherTeam
    ? clamp(.64 + (previousTeam.midfield - otherTeam.midfield) * .002 + (previousMotivation - otherMotivation) * .001, .48, .84)
    : 0;
  const possession = previousPossession && random() < retentionChance ? previousPossession : sideAtRandom;
  const defenseSide = opposite(possession);
  const attackTeam = teams[possession];
  const defenseTeam = teams[defenseSide];
  const attackProfile = profiles[possession];
  const defenseProfile = profiles[defenseSide];
  const attackMotivation = possession === "home" ? motivationHome : motivationAway;
  const defenseMotivation = defenseSide === "home" ? motivationHome : motivationAway;
  const isHeavyPress = defenseTeam.tactics.marking === "Pesada";
  const isAttackStyle = attackTeam.tactics.style === "Ofensivo";
  const isDefenseStyle = attackTeam.tactics.style === "Defensivo";
  const longWind = Math.max(0, weather.windKmh - 10);
  const rainPassEffect = weather.rainIntensity * rules.rainPassPenalty;
  const windPassEffect = longWind * rules.windPassPenaltyPerKmh;
  const weatherShotEffect = weather.rainIntensity * rules.rainShotPenalty + longWind * rules.windShotPenaltyPerKmh;

  const basePoint = previous?.action === "goal" ? { x: 50, y: 50 } : previous?.to;
  const actorIndex = choosePlayer(attackTeam, minute, weather, random, "passing", ["M", "A"]);
  const actor = attackTeam.players[actorIndex];
  const passerName = playerName(attackTeam, actorIndex, possession === "away" ? opponent : "");
  const baseFrom = basePoint ?? simulatedPoint(actorIndex, attackTeam, possession, snapshot);
  const targetIndex = chooseTarget(attackTeam, actorIndex, snapshot, possession, random);
  const targetName = playerName(attackTeam, targetIndex, possession === "away" ? opponent : "");
  const targetPoint = simulatedPoint(targetIndex, attackTeam, possession, snapshot);
  const from = { x: clamp(baseFrom.x, 5, 95), y: clamp(baseFrom.y, 5, 95) };
  const to = { x: clamp(targetPoint.x, 5, 95), y: clamp(targetPoint.y, 5, 95) };

  const shotRate = clamp(
    rules.shotBaseRate
      + (attackProfile.attack - 70) * rules.shotAttackWeight
      - (defenseProfile.defense - 70) * rules.shotDefenseWeight
      + (isAttackStyle ? rules.offensiveStyleShotBonus : 0)
      - (isDefenseStyle ? rules.defensiveStyleShotPenalty : 0)
      - weatherShotEffect,
    .06, .30,
  );
  const actionRoll = random();
  let action: LiveAction;
  let team = possession;
  let actingIndex = actorIndex;
  let actedAgainstIndex = targetIndex;
  let text = "";
  let actorId = actor?.id;
  let scorer: string | undefined;
  let scorerId: number | undefined;
  let assistId: number | undefined;
  let interceptorId: number | undefined;
  let keeperId: number | undefined;
  let outcome: MatchEvent["outcome"];
  let card: MatchEvent["card"];
  let possessionAfter: MatchSide = possession;
  let eventFrom = from;
  let eventTo = to;

  if (actionRoll < shotRate) {
    action = "shot";
    const shooterIndex = choosePlayer(attackTeam, minute, weather, random, "finishing", ["A", "M"]);
    const shooter = attackTeam.players[shooterIndex];
    const shooterName = playerName(attackTeam, shooterIndex, possession === "away" ? opponent : "");
    const keeperIndex = choosePlayer(defenseTeam, minute, weather, random, "goalkeeping", ["G"]);
    const keeper = defenseTeam.players[keeperIndex];
    const finish = athleteSkill(shooter, shooterIndex, attackTeam, "finishing", minute, weather);
    const keeperSkill = keeper ? athleteSkill(keeper, keeperIndex, defenseTeam, "goalkeeping", minute, weather) : defenseProfile.keeper;
    const homeEdge = possession === "home" ? rules.homeAdvantage * .001 : 0;
    const goalChance = clamp(
      rules.goalBaseChance
        + (finish - 70) * rules.finishingWeight
        + (attackProfile.attack - defenseProfile.defense) * .0012
        - (keeperSkill - 70) * rules.keeperWeight
        + (attackMotivation - defenseMotivation) * rules.motivationWeight
        + homeEdge - weatherShotEffect,
      rules.goalMinChance, rules.goalMaxChance,
    );
    const shotRoll = random();
    eventFrom = simulatedPoint(shooterIndex, attackTeam, possession, snapshot);
    eventTo = { x: possession === "home" ? 95 : 5, y: clamp(48 + (random() - .5) * 22, 28, 72) };
    actingIndex = shooterIndex;
    actedAgainstIndex = keeperIndex;
    actorId = shooter?.id;
    if (shotRoll < goalChance) {
      action = "goal";
      outcome = "goal";
      scorer = shooterName;
      scorerId = shooter?.id;
      if (previous?.action === "pass" && previous.team === possession) assistId = previous.actorId ?? teams[possession].players[previous.actorIndex]?.id;
      text = `GOL! ${shooterName} coloca a bola no fundo da rede para ${possession === "home" ? "o time da casa" : opponent}.`;
      possessionAfter = defenseSide;
    } else if (random() < .43) {
      outcome = "saved";
      keeperId = keeper?.id;
      text = `${shooterName} finaliza; ${keeper?.name ?? (possession === "home" ? `goleiro do ${opponent}` : "goleiro da casa")} defende.`;
      possessionAfter = defenseSide;
    } else {
      outcome = "missed";
      text = `${shooterName} arrisca a finalização, mas manda para fora.`;
      possessionAfter = defenseSide;
    }
  } else {
    const turnoverRate = clamp(.075 + (isHeavyPress ? rules.heavyPressTurnoverBonus : 0) + (defenseProfile.defense - 70) * .0008, .04, .22);
    const foulRate = clamp(.045 + (isHeavyPress ? rules.heavyPressFoulBonus : 0), .025, .16);
    const tackleRate = clamp(.09 + (defenseProfile.defense - 70) * .001, .04, .20);
    const choice = (actionRoll - shotRate) / (1 - shotRate);
    if (choice < turnoverRate) {
      const interceptorIndex = choosePlayer(defenseTeam, minute, weather, random, "defending", ["Z", "L", "M"]);
      const interceptor = defenseTeam.players[interceptorIndex];
      const interceptorName = playerName(defenseTeam, interceptorIndex, defenseSide === "away" ? opponent : "o time da casa");
      const passerSkill = athleteSkill(actor, actorIndex, attackTeam, "passing", minute, weather);
      const passingBonus = tacticalFocusBonus(attackTeam, actorIndex);
      const accuracy = clamp(rules.passBaseAccuracy + (passerSkill - 70) * rules.passSkillWeight
        - (defenseProfile.marking - 70) * rules.markingWeight + passingBonus * .003
        - rainPassEffect - windPassEffect, .52, .97);
      if (random() < accuracy) {
        action = "pass";
        outcome = "complete";
        text = `${passerName} troca passes com ${targetName}.`;
        possessionAfter = possession;
      } else {
        action = "turnover";
        outcome = "intercepted";
        interceptorId = interceptor?.id;
        actedAgainstIndex = interceptorIndex;
        text = `Passe de ${passerName} é interceptado por ${interceptorName}.`;
        possessionAfter = defenseSide;
      }
    } else if (choice < turnoverRate + tackleRate) {
      action = "tackle";
      team = defenseSide;
      const defenderIndex = choosePlayer(defenseTeam, minute, weather, random, "defending", ["Z", "L", "M"]);
      const defenderName = playerName(defenseTeam, defenderIndex, defenseSide === "away" ? opponent : "o time da casa");
      actingIndex = defenderIndex;
      actorId = defenseTeam.players[defenderIndex]?.id;
      actedAgainstIndex = actorIndex;
      text = `${defenderName} desarma ${passerName} e recupera a posse.`;
      possessionAfter = defenseSide;
      eventFrom = simulatedPoint(defenderIndex, defenseTeam, defenseSide, snapshot);
    } else if (choice < turnoverRate + tackleRate + foulRate) {
      action = "foul";
      team = defenseSide;
      const defenderIndex = choosePlayer(defenseTeam, minute, weather, random, "defending", ["Z", "L", "M"]);
      const defender = defenseTeam.players[defenderIndex];
      const defenderName = playerName(defenseTeam, defenderIndex, defenseSide === "away" ? opponent : "o time da casa");
      actingIndex = defenderIndex;
      actorId = defender?.id;
      actedAgainstIndex = actorIndex;
      const cardChance = rules.yellowCardBaseChanceOnFoul + (defenseTeam.tactics.marking === "Pesada" ? rules.heavyMarkingCardBonus : 0);
      const cardRoll = random();
      const alreadyBooked = !!defender?.id && yellowCardIds.includes(defender.id);
      if (alreadyBooked && cardRoll < cardChance) card = "red";
      else if (!alreadyBooked && cardRoll < cardChance) card = "yellow";
      else if (!alreadyBooked && cardRoll < cardChance + .008 && minute > 10) card = "red";
      text = `Falta de ${defenderName} em ${passerName}${card === "yellow" ? " — cartão amarelo." : card === "red" ? alreadyBooked ? " — segundo amarelo, expulso." : " — cartão vermelho, expulso." : "."}`;
      possessionAfter = possession;
      eventFrom = simulatedPoint(defenderIndex, defenseTeam, defenseSide, snapshot);
    } else {
      action = "pass";
      const receiver = snapshot?.[possession]?.[targetIndex];
      const defenders = snapshot?.[defenseSide];
      const attackingRole = playerRole(attackTeam.players[targetIndex], targetIndex, attackTeam);
      const hasOffsideRisk = attackingRole === "A" && random() < .13;
      if (receiver && defenders && hasOffsideRisk && isOffsideAtPass(possession, receiver, from, defenders)) {
        action = "offside";
        text = `Impedimento de ${targetName}. Tiro livre indireto para ${defenseSide === "home" ? "o time da casa" : opponent}.`;
        possessionAfter = defenseSide;
      } else {
        const passerSkill = athleteSkill(actor, actorIndex, attackTeam, "passing", minute, weather);
        const accuracy = clamp(rules.passBaseAccuracy + (passerSkill - 70) * rules.passSkillWeight
          - (defenseProfile.marking - 70) * rules.markingWeight + tacticalFocusBonus(attackTeam, actorIndex) * .003
          - rainPassEffect - windPassEffect, .52, .97);
        if (random() < accuracy) {
          outcome = "complete";
          text = `${passerName} toca para ${targetName}.`;
          possessionAfter = possession;
        } else {
          action = "turnover";
          outcome = "intercepted";
          const interceptorIndex = choosePlayer(defenseTeam, minute, weather, random, "defending", ["Z", "L", "M"]);
          const interceptor = defenseTeam.players[interceptorIndex];
          interceptorId = interceptor?.id;
          actedAgainstIndex = interceptorIndex;
          text = `Passe de ${passerName} sai errado; ${playerName(defenseTeam, interceptorIndex, defenseSide === "away" ? opponent : "o time da casa")} recupera a bola.`;
          possessionAfter = defenseSide;
        }
      }
    }
  }

  return {
    minute,
    half: minute <= 45 ? 1 : 2,
    text,
    ...(card ? { card } : {}),
    ...(scorer ? { scorer, scorerId } : {}),
    ...(actorId !== undefined ? { actorId } : {}),
    ...(assistId !== undefined ? { assistId } : {}),
    ...(interceptorId !== undefined ? { interceptorId } : {}),
    ...(keeperId !== undefined ? { keeperId } : {}),
    ...(outcome ? { outcome } : {}),
    scene: {
      action,
      team,
      actorIndex: actingIndex,
      ...(actorId !== undefined ? { actorId } : {}),
      targetIndex: actedAgainstIndex,
      from: eventFrom,
      to: eventTo,
      possessionAfter,
    },
  };
}

export function matchEnergyAfter(players: Player[], participation: Record<number, number>, minute: number, weather: MatchWeather, marking: string, rules: MatchRules) {
  const heatFatigue = Math.max(0, weather.temperatureC - 24) * rules.heatFatiguePerDegree;
  const pressingFatigue = marking === "Pesada" ? rules.heavyPressFatiguePerMinute : marking === "Normal" ? rules.heavyPressFatiguePerMinute * .45 : 0;
  return players.map((player) => {
    const played = Math.min(minute, participation[player.id] ?? 0);
    if (!played) return player;
    const loss = played * (rules.baseFatiguePerMinute + pressingFatigue + heatFatigue);
    return { ...player, energy: Math.max(15, Math.round(player.energy - loss)) };
  });
}

export type MatchPlayerRating = { playerId: number; rating: number; goals: number; assists: number; shots: number; tackles: number; saves: number; passes: number; errors: number; cards: number };

export function calculatePlayerRatings(players: Player[], events: MatchEvent[], side: MatchSide): MatchPlayerRating[] {
  return players.map((player) => {
    let goals = 0, assists = 0, shots = 0, tackles = 0, saves = 0, passes = 0, errors = 0, cards = 0;
    for (const event of events) {
      const scene = event.scene;
      if (!scene) continue;
      if (scene.action === "goal" && event.scorerId === player.id && side === scene.team) goals++;
      if (event.assistId === player.id && side === scene.team) assists++;
      if (scene.action === "shot" || scene.action === "goal") {
        if (event.actorId === player.id && side === scene.team) shots++;
      }
      if (scene.action === "tackle" && event.actorId === player.id && side === scene.team) tackles++;
      if (scene.action === "pass" && event.actorId === player.id && side === scene.team) passes++;
      if (scene.action === "turnover" && event.actorId === player.id && side === scene.team) errors++;
      if (event.card && event.actorId === player.id && side === scene.team) cards++;
      if (event.keeperId === player.id && side !== scene.team) saves++;
    }
    const contribution = goals * 1.5 + assists * .8 + shots * .08 + tackles * .16 + saves * .26 + passes * .012 - errors * .2 - cards * .65;
    const rating = clamp(5.6 + (player.overall - 70) * .025 + (player.energy - 70) * .008 + contribution, 3, 10);
    return { playerId: player.id, rating: Math.round(rating * 10) / 10, goals, assists, shots, tackles, saves, passes, errors, cards };
  });
}

/** Routine actions stay in the model; match recaps can show only decisive moments. */
export function isHighlight(event: MatchEvent): boolean {
  return !!event.card || !event.scene || !["pass", "tackle"].includes(event.scene.action);
}

/** Stable background results; relative club strength changes the long-run scoring edge. */
export function otherScore(home: string, away: string, round: number, minute: number, homeStrength = 70, awayStrength = 70): [number, number] {
  const random = seededRandom(`${round}|${home}|${away}`);
  let homeScore = 0, awayScore = 0;
  const homeGoalChance = clamp(.012 + (homeStrength - awayStrength) * .00022 + .0015, .004, .035);
  const awayGoalChance = clamp(.012 + (awayStrength - homeStrength) * .00022, .004, .035);
  for (let currentMinute = 1; currentMinute <= Math.min(90, minute); currentMinute++) {
    const value = random();
    if (value < homeGoalChance) homeScore++;
    else if (value < homeGoalChance + awayGoalChance) awayScore++;
  }
  return [homeScore, awayScore];
}
