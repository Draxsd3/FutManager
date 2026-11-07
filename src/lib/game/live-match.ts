import { attackingProgress, chanceQuality, localPressure, opponentPlan, passUtility } from "./football-decisions";
import type { Player, PositionCode } from "./mock-data";
import type { ManualPosition } from "./career";
import { fifaPosition } from "./fifa-position";
import { formationSlotRoles, formationSlots, playerFitAtPosition } from "./formations";
import type { MatchRules } from "./match-rules";

export type MatchSide = "home" | "away";
export type LiveAction = "carry" | "pass" | "shot" | "goal" | "tackle" | "foul" | "discussion" | "offside" | "turnover";
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
  /** Optional state permits resuming saves from before the decision engine upgrade. */
  carrierId?: number;
  targetId?: number;
  ballAfter?: { x: number; y: number };
};
export type MatchEvent = {
  minute: number;
  half: 1 | 2;
  text: string;
  /** Side responsible for non-possession events such as substitutions or tactical changes. */
  team?: MatchSide;
  card?: "yellow" | "red";
  scene?: MatchScene;
  scorer?: string;
  scorerId?: number;
  actorId?: number;
  assistId?: number;
  interceptorId?: number;
  keeperId?: number;
  /** Simulated chance quality before individual finishing/keeper adjustments; not factual xG. */
  chanceQuality?: number;
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
  minutesPlayed?: Record<number, number>;
  rules?: MatchRules;
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
  dribbling: ["dri", "vel", "tec", "drible", "técnica"],
  physical: ["for", "vel", "res", "físico", "força", "velocidade"],
  stamina: ["res", "resist", "fôlego", "folego", "vigor", "físic", "fisic", "motor", "incans"],
};

export type MatchFatigueContext = {
  formation?: string;
  positions?: Record<number, ManualPosition>;
  starterIds?: number[];
  rolesByPlayerId?: Record<number, PositionCode | undefined>;
  style?: string;
  focus?: string;
};

/**
 * Physiological age multiplier for in-match energy drain.
 * Strictly increasing from 16 to 45 so older players always tire faster than younger ones.
 */
export function ageFatigueMultiplier(age: number): number {
  const safeAge = clamp(Number.isFinite(age) ? age : 26, 16, 45);
  if (safeAge <= 26) {
    return 0.82 + ((safeAge - 16) / 10) * 0.18;
  }
  const over = safeAge - 26;
  return 1 + over * 0.026 + over * over * 0.0015;
}

/**
 * Running and high-intensity sprint workload by tactical role and pitch corridor.
 * Full-backs (L) cover the entire flank and tire substantially more than center-backs (Z) and goalkeepers (G).
 */
export function roleFatigueMultiplier(role: PositionCode, wide = false): number {
  switch (role) {
    case "G":
      return 0.30;
    case "Z":
      return 0.78;
    case "A":
      return wide ? 1.05 : 0.96;
    case "M":
      return wide ? 1.15 : 1.08;
    case "L":
      return 1.24;
  }
}

export function resolveMatchPlayerRole(
  player: Player,
  index?: number,
  formation?: string,
  positions?: Record<number, ManualPosition>,
  fallbackRole?: PositionCode,
): { role: PositionCode; wide: boolean } {
  if (index !== undefined && index >= 0 && index < 11) {
    const activeFormation = formation ?? "4-3-3";
    const slots = formationSlots[activeFormation] ?? formationSlots["4-3-3"];
    const roleList = formationSlotRoles[activeFormation] ?? formationSlotRoles["4-3-3"];
    const position = (index === 10 ? slots[10] : positions?.[player.id] ?? slots[index]) ?? { left: 50, top: 50 };
    const role = playerFitAtPosition(player, activeFormation, position, index).role ?? roleList[index] ?? player.position;
    return { role, wide: role !== "G" && Math.abs(position.left - 50) >= 22 };
  }
  const role = fallbackRole ?? player.position;
  const namedFifa = fifaPosition(player);
  const wide = role === "L" || namedFifa === "LB" || namedFifa === "RB" || namedFifa === "LW" || namedFifa === "RW";
  return { role, wide };
}

function effectiveFatigueRates(rules?: MatchRules) {
  if (!rules || rules.baseFatiguePerMinute < 0.05) {
    return { base: 0.205, heavyPress: 0.085, heatPerDegree: 0.0065 };
  }
  return {
    base: rules.baseFatiguePerMinute,
    heavyPress: rules.heavyPressFatiguePerMinute,
    heatPerDegree: rules.heatFatiguePerDegree,
  };
}

export function calculatePlayerFatigueLoss(
  player: Player,
  playedMinutes: number,
  options: {
    role?: PositionCode;
    wide?: boolean;
    weather: MatchWeather;
    tactics: { marking: string; style?: string; focus?: string };
    rules?: MatchRules;
  },
): number {
  const played = clamp(Number.isFinite(playedMinutes) ? playedMinutes : 0, 0, 120);
  if (played <= 0) return 0;
  const fallback = resolveMatchPlayerRole(player, undefined, undefined, undefined, options.role);
  const role = options.role ?? fallback.role;
  const wide = options.wide ?? fallback.wide;
  const isKeeper = role === "G";
  const rates = effectiveFatigueRates(options.rules);

  const pressScale = isKeeper ? 0.15 : 1;
  const pressingRate = (options.tactics.marking === "Pesada"
    ? rates.heavyPress
    : options.tactics.marking === "Normal"
      ? rates.heavyPress * 0.45
      : 0) * pressScale;
  const lightMarkingFactor = !isKeeper && options.tactics.marking === "Leve" ? 0.93 : 1;

  const heatRate = Math.max(0, options.weather.temperatureC - 24) * rates.heatPerDegree * (isKeeper ? 0.45 : 1);
  const rainRate = Math.max(0, options.weather.rainIntensity ?? 0) * 0.018 * (isKeeper ? 0.35 : 1);

  const style = options.tactics.style ?? "Equilibrado";
  const styleFactor = style === "Ofensivo" ? (isKeeper ? 1.02 : 1.07) : style === "Defensivo" ? (isKeeper ? 1 : 0.95) : 1;

  const focus = (options.tactics.focus ?? "").toLowerCase();
  const focusFactor = isKeeper
    ? 1
    : focus.includes("later")
      ? role === "L" || wide ? 1.06 : 0.98
      : focus.includes("meio") && role === "M" && !wide
        ? 1.03
        : 1;

  const staminaFactor = traitHas(player, skillAliases.stamina) ? 0.90 : 1;
  const progressiveFactor = 1 + (Math.max(0, played - 60) / 30) * 0.10;
  const perMinute = (rates.base + pressingRate + heatRate + rainRate)
    * roleFatigueMultiplier(role, wide)
    * ageFatigueMultiplier(player.age)
    * lightMarkingFactor
    * styleFactor
    * focusFactor
    * staminaFactor;

  return played * progressiveFactor * perMinute;
}

function playerRole(player: Player, index: number, team: MatchTeamInput): PositionCode {
  return resolveMatchPlayerRole(player, index, team.formation, team.positions).role;
}

function fitPenalty(player: Player, index: number, team: MatchTeamInput) {
  const slots = formationSlots[team.formation] ?? formationSlots["4-3-3"];
  const position = (index === 10 ? slots[10] : team.positions[player.id] ?? slots[index]) ?? { left: 50, top: 50 };
  return playerFitAtPosition(player, team.formation, position, index).penalty;
}

function playerLiveEnergy(player: Player, index: number, team: MatchTeamInput, minute: number, weather: MatchWeather): number {
  const played = Math.max(0, team.minutesPlayed?.[player.id] ?? minute);
  const { role, wide } = resolveMatchPlayerRole(player, index, team.formation, team.positions);
  const loss = calculatePlayerFatigueLoss(player, played, {
    role,
    wide,
    weather,
    tactics: team.tactics,
    rules: team.rules,
  });
  return clamp(player.energy - loss, 15, 100);
}

function athleteSkill(player: Player, index: number, team: MatchTeamInput, skill: keyof typeof skillAliases, minute: number, weather: MatchWeather) {
  const tags = skillAliases[skill];
  const tagged = traitHas(player, tags);
  const secondary = traitHas(player, ["secundária", "secondary"]);
  const bonus = tagged ? (secondary ? 3 : 6) : 0;
  const played = Math.max(0, team.minutesPlayed?.[player.id] ?? minute);
  const { role, wide } = resolveMatchPlayerRole(player, index, team.formation, team.positions);
  const effectiveEnergy = playerLiveEnergy(player, index, team, minute, weather);
  const skillFatigueSensitivity = skill === "defending" ? 1.28 : skill === "finishing" ? 0.72 : skill === "goalkeeping" ? 0.55 : 1;
  const freshness = (effectiveEnergy - 80) * 0.07;
  const acuteWear = (played / 90) * 2.4 * roleFatigueMultiplier(role, wide) * ageFatigueMultiplier(player.age);
  const energyPenalty = Math.max(0, 74 - effectiveEnergy) * 0.16 + Math.max(0, 55 - effectiveEnergy) * 0.14;
  const fatigue = (acuteWear + energyPenalty) * skillFatigueSensitivity;
  return clamp(player.overall - fitPenalty(player, index, team) + bonus + ((player.condition?.morale ?? 50)-50)*.03 + (team.motivation - 65) * .12 + freshness - fatigue, 1, 100);
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
  outfieldEnergy: number;
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
  const energies = entries.map(({ player, index }) => playerLiveEnergy(player, index, team, minute, weather));
  const manpowerPenalty = (11 - entries.length) * 2.4;
  const overall = weightedMean(entries.map(({ player, index }, rowIndex) => {
    const energy = energies[rowIndex];
    const fatigue = Math.max(0, 75 - energy) * 0.16 + Math.max(0, 55 - energy) * 0.14;
    return { value: clamp(player.overall - fitPenalty(player, index, team) + (energy - 75) * .055 - fatigue, 25, 100), weight: 1 };
  }), 68) - manpowerPenalty;
  const outfieldEnergy = weightedMean(
    entries.map((_, rowIndex) => ({ value: energies[rowIndex], weight: roles[rowIndex] === "G" ? 0 : 1 })),
    80,
  );
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
  return { overall, technique, attack, defense, midfield, keeper, marking: defense, passer: midfield, shooter: attack, keeperIndex, outfieldEnergy };
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

function chooseTarget(team: MatchTeamInput, fromIndex: number, from: Point, snapshot: KickSnapshot | undefined, side: MatchSide, defenders: Point[], random: () => number) {
  const candidates = activePlayers(team).filter(({ index }) => index !== fromIndex);
  if (!candidates.length) return fromIndex;
  const rows = candidates.map(({ index }) => {
    const target = simulatedPoint(index, team, side, snapshot);
    return { index, weight: passUtility(from, target, side, localPressure(target, defenders), team.tactics)
      * (team.positions[team.players[index].id] && isOffsideAtPass(side, target, from, defenders) ? .08 : 1) };
  });
  let selection = random() * rows.reduce((sum, row) => sum + row.weight, 0);
  return rows.find((row) => (selection -= row.weight) < 0)?.index ?? rows.at(-1)!.index;
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
  previous, snapshot, rules, weather, tactics, opponentTactics, score = { home: 0, away: 0 }, managedIsHome = true, kickoffSide = "home", minutesPlayedHome, minutesPlayedAway, motivationHome, motivationAway, sentOffHomeIds = [], sentOffAwayIds = [], yellowCardIds = [], random }: {
  minute: number;
  score?: { home: number; away: number };
  managedIsHome?: boolean;
  kickoffSide?: MatchSide;
  minutesPlayedHome?: Record<number, number>;
  minutesPlayedAway?: Record<number, number>;
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
  const home: MatchTeamInput = { players: starters, formation, positions, tactics, motivation: motivationHome, sentOffIds: sentOffHomeIds, minutesPlayed: minutesPlayedHome, rules };
  const away: MatchTeamInput = {
    players: opponentStarters ?? [], formation: opponentFormation ?? formation, positions: {},
    tactics: opponentPlan(opponentTactics ?? { style: "Equilibrado", marking: "Normal", focus: "Pelo meio" }, minute, score.away - score.home, sentOffAwayIds.length), motivation: motivationAway, sentOffIds: sentOffAwayIds, minutesPlayed: minutesPlayedAway, rules,
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
  // Possession only changes through recorded events, never a silent minute-level reroll.
  const possession = minute === 1 ? kickoffSide : minute === 46 ? opposite(kickoffSide) : previousPossession ?? sideAtRandom;
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

  const continuing = minute !== 46 && previousPossession === possession;
  const previousCarrier = continuing ? activePlayers(attackTeam).find(({ player }) => player.id === previous?.carrierId) : undefined;
  const actorIndex = previousCarrier?.index ?? choosePlayer(attackTeam, minute, weather, random, "passing", ["M", "A"]);
  const actor = attackTeam.players[actorIndex];
  const passerName = playerName(attackTeam, actorIndex, possession === "away" ? opponent : "");
  const baseFrom = continuing ? previous?.action === "goal" ? { x: 50, y: 50 } : previous?.ballAfter ?? previous?.to : undefined;
  const from = baseFrom ?? (previous?.action === "goal" || minute === 46 ? { x: 50, y: 50 } : simulatedPoint(actorIndex, attackTeam, possession, snapshot));
  const defenders = activePlayers(defenseTeam).map(({ player, index }) => {
    const point = simulatedPoint(index, defenseTeam, defenseSide, snapshot);
    const line = player.position === "G" ? 0 : (defenseTeam.tactics.marking === "Pesada" ? 7 : 0)
      + (defenseTeam.tactics.style === "Ofensivo" ? 4 : defenseTeam.tactics.style === "Defensivo" ? -5 : 0);
    return { x: clamp(point.x + (defenseSide === "home" ? line : -line), 5, 95), y: point.y };
  });
  const pressure = localPressure(from, defenders);
  const progress = attackingProgress(from, possession);
  const targetIndex = chooseTarget(attackTeam, actorIndex, from, snapshot, possession, defenders, random);
  const targetName = playerName(attackTeam, targetIndex, possession === "away" ? opponent : "");
  const targetPoint = { ...simulatedPoint(targetIndex, attackTeam, possession, snapshot) };
  // Automatic runs try to stay level with the second-last defender; mistimed runs remain possible.
  // Manual tactical coordinates are never clamped to a role or overwritten.
  if (!attackTeam.positions[attackTeam.players[targetIndex]?.id] && defenders.length >= 2
    && isOffsideAtPass(possession, targetPoint, from, defenders) && random() < .90) {
    const line = defenders.map((point) => point.x).sort((a, b) => possession === "home" ? b - a : a - b)[1];
    targetPoint.x = clamp(line + (possession === "home" ? -1 : 1) * (1 + random() * 3), 5, 95);
  }
  const to = { x: clamp(targetPoint.x, 5, 95), y: clamp(targetPoint.y, 5, 95) };

  const shotRate = progress < 45 ? 0 : clamp(clamp(
    rules.shotBaseRate
      + (attackProfile.attack - 70) * rules.shotAttackWeight
      - (defenseProfile.defense - 70) * rules.shotDefenseWeight
      + (isAttackStyle ? rules.offensiveStyleShotBonus : 0)
      - (isDefenseStyle ? rules.defensiveStyleShotPenalty : 0)
      - weatherShotEffect,
    .06, .30,
  ) * clamp((progress - 40) / 30, .05, 1.8) * 2.2, 0, .55);
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
  let quality: number | undefined;
  let outcome: MatchEvent["outcome"];
  let card: MatchEvent["card"];
  let possessionAfter: MatchSide = possession;
  let eventFrom = from;
  let eventTo = to;

  if (actionRoll < shotRate) {
    action = "shot";
    const shooterIndex = actorIndex;
    const shooter = attackTeam.players[shooterIndex];
    const shooterName = playerName(attackTeam, shooterIndex, possession === "away" ? opponent : "");
    const keeperIndex = defenseProfile.keeperIndex;
    const keeper = defenseTeam.players[keeperIndex];
    const finish = athleteSkill(shooter, shooterIndex, attackTeam, "finishing", minute, weather);
    const keeperSkill = keeper ? athleteSkill(keeper, keeperIndex, defenseTeam, "goalkeeping", minute, weather) : defenseProfile.keeper;
    const homeEdge = (possession === "home") === managedIsHome ? rules.homeAdvantage * .001 : 0;
    quality = chanceQuality(from, possession, pressure);
    const defensiveWear = Math.max(0, 88 - defenseProfile.outfieldEnergy) * 0.0011;
    const goalChance = clamp(
      quality * (rules.goalBaseChance / .115)
        + (finish - 70) * rules.finishingWeight
        + (attackProfile.attack - defenseProfile.defense) * .0012
        - (keeperSkill - 70) * rules.keeperWeight
        + (attackMotivation - defenseMotivation) * rules.motivationWeight
        + defensiveWear
        + homeEdge - weatherShotEffect,
      Math.min(rules.goalMinChance, quality * .35), rules.goalMaxChance,
    );
    const shotRoll = random();
    eventFrom = from;
    eventTo = { x: possession === "home" ? 95 : 5, y: clamp(48 + (random() - .5) * 22, 28, 72) };
    actingIndex = shooterIndex;
    actedAgainstIndex = keeperIndex;
    actorId = shooter?.id;
    if (shotRoll < goalChance) {
      action = "goal";
      outcome = "goal";
      scorer = shooterName;
      scorerId = shooter?.id;
      if (previous?.action === "pass" && previous.team === possession && previous.targetId === shooter?.id && previous.actorId !== shooter?.id) assistId = previous.actorId;
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
    const defenseFatigue = Math.max(0, 74 - defenseProfile.outfieldEnergy);
    const turnoverRate = clamp(.075 + (isHeavyPress ? rules.heavyPressTurnoverBonus : 0) + (defenseProfile.defense - 70) * .0008, .04, .22);
    const foulRate = clamp(.045 + (isHeavyPress ? rules.heavyPressFoulBonus : 0) + defenseFatigue * .0007, .025, .16);
    const tackleRate = clamp(.09 + (defenseProfile.defense - attackProfile.midfield) * .0015
      - (attackMotivation - defenseMotivation) * .001, .025, .20);
    const choice = (actionRoll - shotRate) / (1 - shotRate);
    const carryRate = clamp(.20 + (isAttackStyle ? .09 : 0) - pressure * .10, .08, .32);
    if (choice > turnoverRate + tackleRate + foulRate && choice < turnoverRate + tackleRate + foulRate + carryRate) {
      const defenderIndex = choosePlayer(defenseTeam, minute, weather, random, "defending", ["Z", "L", "M"]);
      const dribble = athleteSkill(actor, actorIndex, attackTeam, "dribbling", minute, weather);
      const defending = defenseTeam.players[defenderIndex] ? athleteSkill(defenseTeam.players[defenderIndex], defenderIndex, defenseTeam, "defending", minute, weather) : 65;
      const success = clamp(.88 + (dribble - defending) * .004 - pressure * .20, .35, .96);
      if (random() < success) {
        action = "carry";
        eventTo = { x: clamp(from.x + (possession === "home" ? 1 : -1) * (10 + random() * 12), 5, 95), y: clamp(from.y + (random() - .5) * 12, 5, 95) };
        text = `${passerName} conduz a bola e avança pelo ${Math.abs(eventTo.y - 50) > 22 ? "lado do campo" : "meio"}.`;
      } else {
        action = "tackle";
        team = defenseSide;
        actingIndex = defenderIndex;
        actorId = defenseTeam.players[defenderIndex]?.id;
        actedAgainstIndex = actorIndex;
        eventFrom = from;
        text = `${playerName(defenseTeam, defenderIndex, defenseSide === "away" ? opponent : "o time da casa")} desarma ${passerName} na tentativa de avanço.`;
        possessionAfter = defenseSide;
      }
    } else if (choice < turnoverRate) {
      const interceptorIndex = choosePlayer(defenseTeam, minute, weather, random, "defending", ["Z", "L", "M"]);
      const interceptor = defenseTeam.players[interceptorIndex];
      const interceptorName = playerName(defenseTeam, interceptorIndex, defenseSide === "away" ? opponent : "o time da casa");
      const passerSkill = athleteSkill(actor, actorIndex, attackTeam, "passing", minute, weather);
      const passingBonus = tacticalFocusBonus(attackTeam, actorIndex);
      const accuracy = clamp(rules.passBaseAccuracy + (passerSkill - 70) * rules.passSkillWeight
        - (defenseProfile.marking - 70) * rules.markingWeight + passingBonus * .003
        - rainPassEffect - windPassEffect - pressure * .06
          - Math.max(0, Math.hypot(to.x - from.x, to.y - from.y) - 25) * .0015, .45, .97);
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
      eventFrom = from;
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
      eventFrom = from;
    } else {
      action = "pass";
      if (isOffsideAtPass(possession, to, from, defenders)) {
        action = "offside";
        text = `Impedimento de ${targetName}. Tiro livre indireto para ${defenseSide === "home" ? "o time da casa" : opponent}.`;
        possessionAfter = defenseSide;
      } else {
        const passerSkill = athleteSkill(actor, actorIndex, attackTeam, "passing", minute, weather);
        const accuracy = clamp(rules.passBaseAccuracy + (passerSkill - 70) * rules.passSkillWeight
          - (defenseProfile.marking - 70) * rules.markingWeight + tacticalFocusBonus(attackTeam, actorIndex) * .003
          - rainPassEffect - windPassEffect - pressure * .06
          - Math.max(0, Math.hypot(to.x - from.x, to.y - from.y) - 25) * .0015, .45, .97);
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

  if (action === "pass" && isOffsideAtPass(possession, to, from, defenders)) {
    action = "offside";
    outcome = undefined;
    text = `Impedimento de ${targetName}. Tiro livre indireto para ${defenseSide === "home" ? "o time da casa" : opponent}.`;
    possessionAfter = defenseSide;
  }
  const nextCarrierId = action === "pass" ? attackTeam.players[targetIndex]?.id
    : action === "carry" || action === "foul" ? actor?.id
    : action === "tackle" ? actorId : action === "turnover" ? interceptorId
    : action === "shot" ? defenseTeam.players[defenseProfile.keeperIndex]?.id : undefined;
  const nextCarrierTeam = teams[possessionAfter];
  const nextCarrierIndex = nextCarrierTeam.players.findIndex((player) => player.id === nextCarrierId);
  const ballAfter = action === "goal" ? { x: 50, y: 50 }
    : action === "pass" || action === "carry" ? eventTo
    : action === "offside" ? to
    : action === "foul" || action === "tackle" ? from
    : action === "turnover" ? { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
    : nextCarrierIndex >= 0 ? simulatedPoint(nextCarrierIndex, nextCarrierTeam, possessionAfter, snapshot)
    : { x: possessionAfter === "home" ? 12 : 88, y: 50 };

  return {
    minute,
    half: minute <= 45 ? 1 : 2,
    text,
    ...(quality !== undefined ? { chanceQuality: quality } : {}),
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
      ...(nextCarrierId !== undefined ? { carrierId: nextCarrierId } : {}),
      ...(action === "pass" ? { targetId: attackTeam.players[targetIndex]?.id } : {}),
      ballAfter,
    },
  };
}

export function matchEnergyAfter(
  players: Player[],
  participation: Record<number, number>,
  minute: number,
  weather: MatchWeather,
  marking: string,
  rules: MatchRules,
  context?: MatchFatigueContext,
) {
  return players.map((player) => {
    const played = Math.min(minute, Math.max(0, participation[player.id] ?? 0));
    if (!played) return player;
    const starterSlotIndex = context?.starterIds ? context.starterIds.indexOf(player.id) : -1;
    const { role, wide } = resolveMatchPlayerRole(
      player,
      starterSlotIndex >= 0 ? starterSlotIndex : undefined,
      context?.formation,
      context?.positions,
      context?.rolesByPlayerId?.[player.id],
    );
    const loss = calculatePlayerFatigueLoss(player, played, {
      role,
      wide,
      weather,
      tactics: { marking, style: context?.style, focus: context?.focus },
      rules,
    });
    return { ...player, energy: clamp(Math.round(player.energy - loss), 15, 100) };
  });
}

/**
 * Passive physiological recovery between career calendar dates.
 * Younger players recover faster per rest day than veterans, preserving meaningful rotation on tight midweek turnarounds.
 */
export function recoverSquadBetweenMatches(players: Player[], previousDate: string, nextDate: string): Player[] {
  const startMs = Date.parse(`${previousDate.slice(0, 10)}T00:00:00Z`);
  const endMs = Date.parse(`${nextDate.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return players;
  const elapsedDays = clamp(Math.round((endMs - startMs) / 86_400_000), 0, 21);
  if (elapsedDays <= 0) return players;
  return players.map((player) => {
    if (player.energy >= 100) return player.energy === 100 ? player : { ...player, energy: 100 };
    const safeAge = clamp(Number.isFinite(player.age) ? player.age : 26, 16, 45);
    const ageRecoveryFactor = safeAge <= 26
      ? 1 + ((26 - safeAge) / 10) * 0.20
      : Math.max(0.58, 1 - (safeAge - 26) * 0.026);
    const staminaBonus = traitHas(player, skillAliases.stamina) ? 1.08 : 1;
    const recovery = Math.max(1, Math.round(elapsedDays * 4.8 * ageRecoveryFactor * staminaBonus));
    return { ...player, energy: clamp(player.energy + recovery, 0, 100) };
  });
}

export type MatchTeamStatistics = {
  possession: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  passesCompleted: number;
  tackles: number;
  fouls: number;
  offsides: number;
  yellowCards: number;
  redCards: number;
};
export type MatchStatistics = { home: MatchTeamStatistics; away: MatchTeamStatistics };

/** Derives both teams' match-center statistics from the same saved event stream as the score. */
export function calculateMatchStatistics(events: MatchEvent[]): MatchStatistics {
  const stats: MatchStatistics = {
    home: { possession: 50, shots: 0, shotsOnTarget: 0, passes: 0, passesCompleted: 0, tackles: 0, fouls: 0, offsides: 0, yellowCards: 0, redCards: 0 },
    away: { possession: 50, shots: 0, shotsOnTarget: 0, passes: 0, passesCompleted: 0, tackles: 0, fouls: 0, offsides: 0, yellowCards: 0, redCards: 0 },
  };
  const scenes = events.flatMap((event) => event.scene ? [{ event, scene: event.scene }] : []);
  if (!scenes.length) return stats;
  let homePossessions = 0;
  for (const { event, scene } of scenes) {
    let after = scene.possessionAfter;
    if (!after) {
      after = ["goal", "offside", "turnover", "foul"].includes(scene.action)
        ? scene.team === "home" ? "away" : "home"
        : scene.team;
    }
    if (after === "home") homePossessions++;
    const side = stats[scene.team];
    if (scene.action === "shot" || scene.action === "goal") {
      side.shots++;
      if (scene.action === "goal" || event.outcome === "saved") side.shotsOnTarget++;
    }
    if (scene.action === "pass" || scene.action === "turnover") side.passes++;
    if (scene.action === "pass") side.passesCompleted++;
    if (scene.action === "tackle") side.tackles++;
    if (scene.action === "foul") side.fouls++;
    if (scene.action === "offside") side.offsides++;
    if (event.card === "yellow") side.yellowCards++;
    if (event.card === "red") side.redCards++;
  }
  stats.home.possession = Math.round(homePossessions / scenes.length * 100);
  stats.away.possession = 100 - stats.home.possession;
  return stats;
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
  return !!event.card || !event.scene || !["pass", "carry", "tackle"].includes(event.scene.action);
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
