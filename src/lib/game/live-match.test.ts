import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildStartingXI, squad } from "./mock-data";
import { calculateMatchStatistics, createMatchWeather, createMinuteRandom, matchEnergyAfter, otherScore, calculatePlayerRatings, simulateAction } from "./live-match";
import { parseMatchRules } from "./match-rules";

const rules = parseMatchRules(readFileSync("public/game-assets/match-engine-rules.md", "utf8"));
const strongIds = buildStartingXI("4-3-3", squad);
const strong = strongIds.map((id) => squad.find((player) => player.id === id)!).filter(Boolean);
const weak = strong.map((player) => ({ ...player, overall: 70, energy: 70, traits: "" }));
const dryWeather = { id: "seco", label: "Tempo firme", temperatureC: 24, rainIntensity: 0, windKmh: 3 };
const tactics = { style: "Equilibrado", marking: "Normal", focus: "Pelo meio" };

type Sim = { home: number; away: number; events: ReturnType<typeof simulateAction>[] };
function simulateMatch(key: string, homePlayers: typeof strong, awayPlayers: typeof strong, homeTactics = tactics, weather = dryWeather, motivationHome = 68, motivationAway = 62, opponentTactics = tactics, sentOffHomeIds: number[] = []): Sim {
  let home = 0, away = 0;
  let previous: ReturnType<typeof simulateAction>["scene"];
  const events = [] as Sim["events"];
  for (let minute = 1; minute <= 90; minute++) {
    const event = simulateAction({
      minute, starters: homePlayers, opponentStarters: awayPlayers, formation: "4-3-3", opponentFormation: "4-3-3",
      positions: {}, opponent: "Rival", previous, rules, weather, tactics: homeTactics,
      motivationHome, motivationAway, opponentTactics, sentOffHomeIds, random: createMinuteRandom(key, minute),
    });
    events.push(event);
    if (event.scene?.action === "goal") {
      if (event.scene.team === "home") home++;
      else away++;
    }
    previous = event.scene;
  }
  return { home, away, events };
}

describe("text-first match engine", () => {
  it("derives two-sided possession, shooting, passing, discipline and defensive statistics from events", () => {
    const point = { x: 50, y: 50 };
    const events = [
      { minute: 1, half: 1 as const, text: "Passe completo", outcome: "complete" as const, scene: { action: "pass" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: point, to: point, possessionAfter: "home" as const } },
      { minute: 2, half: 1 as const, text: "Passe interceptado", outcome: "intercepted" as const, scene: { action: "turnover" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: point, to: point, possessionAfter: "away" as const } },
      { minute: 3, half: 1 as const, text: "Gol", outcome: "goal" as const, scene: { action: "goal" as const, team: "away" as const, actorIndex: 0, targetIndex: 1, from: point, to: point, possessionAfter: "home" as const } },
      { minute: 4, half: 1 as const, text: "Desarme", scene: { action: "tackle" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: point, to: point, possessionAfter: "home" as const } },
      { minute: 5, half: 1 as const, text: "Falta e amarelo", card: "yellow" as const, scene: { action: "foul" as const, team: "away" as const, actorIndex: 0, targetIndex: 1, from: point, to: point, possessionAfter: "home" as const } },
    ];
    const stats = calculateMatchStatistics(events);
    expect(stats.home.possession).toBe(80);
    expect(stats.away.possession).toBe(20);
    expect(stats.home.passes).toBe(2);
    expect(stats.home.passesCompleted).toBe(1);
    expect(stats.away.shots).toBe(1);
    expect(stats.away.shotsOnTarget).toBe(1);
    expect(stats.home.tackles).toBe(1);
    expect(stats.away.fouls).toBe(1);
    expect(stats.away.yellowCards).toBe(1);
  });

  it("uses the same seeded minute for the same match, lineup, weather, and rules", () => {
    const first = simulateMatch("save-1|round-1", strong, weak);
    const second = simulateMatch("save-1|round-1", strong, weak);
    expect(second).toEqual(first);
    expect(first.events).toHaveLength(90);
  });

  it("gives the stronger team a meaningful statistical advantage without guaranteeing a win", () => {
    let strongPoints = 0, weakPoints = 0, upsets = 0;
    const matches = 72;
    for (let index = 0; index < matches; index++) {
      const strongAtHome = index % 2 === 0;
      const result = strongAtHome
        ? simulateMatch(`balance-${index}`, strong, weak)
        : simulateMatch(`balance-${index}`, weak, strong);
      const strongScore = strongAtHome ? result.home : result.away;
      const weakScore = strongAtHome ? result.away : result.home;
      strongPoints += strongScore > weakScore ? 3 : strongScore === weakScore ? 1 : 0;
      weakPoints += weakScore > strongScore ? 3 : weakScore === strongScore ? 1 : 0;
      if (weakScore > strongScore) upsets++;
    }
    expect(strongPoints).toBeGreaterThan(weakPoints);
    expect(upsets).toBeGreaterThan(0);
  });

  it("keeps commentary, goal authorship, and score events on the same record", () => {
    let goal: ReturnType<typeof simulateAction> | undefined;
    for (let index = 0; index < 40 && !goal; index++) {
      goal = simulateMatch(`scorer-${index}`, strong, strong).events.find((event) => event.scene?.action === "goal");
    }
    expect(goal).toBeDefined();
    expect(goal?.scorer).toBeTruthy();
    expect(goal?.actorId).toBe(goal?.scorerId);
    expect(goal?.text).toContain(goal?.scorer);
    expect(goal?.scene?.possessionAfter).not.toBe(goal?.scene?.team);
  });

  it("models passes, interceptions, tackles and possession changes as linked events", () => {
    const events = simulateMatch("actions", strong, weak).events;
    expect(events.some((event) => event.scene?.action === "pass" && event.scene.possessionAfter === event.scene.team)).toBe(true);
    expect(events.some((event) => event.scene?.action === "turnover" && event.outcome === "intercepted" && event.scene.possessionAfter !== event.scene.team)).toBe(true);
    expect(events.some((event) => event.scene?.action === "tackle" && event.scene.possessionAfter === event.scene.team)).toBe(true);
    expect(events.every((event) => event.text.length > 0 && event.scene?.possessionAfter)).toBe(true);
  });

  it("removes a dismissed player from later actions and preserves the numerical disadvantage", () => {
    const onlyPlayerLeft = strong[10];
    const dismissed = strong.slice(0, 10).map((player) => player.id);
    const result = simulateMatch("dismissal", strong, strong, tactics, dryWeather, 68, 62, tactics, dismissed);
    const homeActions = result.events.filter((event) => event.scene?.team === "home");
    expect(homeActions.length).toBeGreaterThan(0);
    expect(homeActions.every((event) => event.actorId === onlyPlayerLeft.id)).toBe(true);
  });

  it("makes tactical choices and motivation change match outcomes measurably", () => {
    let balancedShots = 0, attackingShots = 0;
    let highWillPossession = 0, lowWillPossession = 0;
    let normalPressFouls = 0, heavyPressFouls = 0;
    for (let index = 0; index < 24; index++) {
      const key = `tactics-${index}`;
      const balanced = simulateMatch(key, strong, strong);
      const attacking = simulateMatch(key, strong, strong, { ...tactics, style: "Ofensivo" });
      const highWill = simulateMatch(key, strong, strong, tactics, dryWeather, 90, 40);
      const lowWill = simulateMatch(key, strong, strong, tactics, dryWeather, 40, 90);
      const normalPress = simulateMatch(key, strong, strong, tactics);
      const heavyPress = simulateMatch(key, strong, strong, { ...tactics, marking: "Pesada" });
      balancedShots += balanced.events.filter((event) => event.scene?.team === "home" && ["shot", "goal"].includes(event.scene.action)).length;
      attackingShots += attacking.events.filter((event) => event.scene?.team === "home" && ["shot", "goal"].includes(event.scene.action)).length;
      highWillPossession += highWill.events.filter((event) => event.scene?.possessionAfter === "home").length;
      lowWillPossession += lowWill.events.filter((event) => event.scene?.possessionAfter === "home").length;
      normalPressFouls += normalPress.events.filter((event) => event.scene?.action === "foul" && event.scene.team === "home").length;
      heavyPressFouls += heavyPress.events.filter((event) => event.scene?.action === "foul" && event.scene.team === "home").length;
    }
    expect(attackingShots).toBeGreaterThan(balancedShots);
    expect(highWillPossession).toBeGreaterThan(lowWillPossession);
    expect(heavyPressFouls).toBeGreaterThan(normalPressFouls);
  });

  it("reduces pass completion under rain and wind while preserving deterministic conditions", () => {
    const rainWind = { id: "chuva-vento", label: "Chuva e vento", temperatureC: 19, rainIntensity: .9, windKmh: 24 };
    let dryCompleted = 0, dryAttempts = 0, wetCompleted = 0, wetAttempts = 0;
    for (let index = 0; index < 20; index++) {
      for (const [weather, total] of [[dryWeather, "dry"], [rainWind, "wet"]] as const) {
        const events = simulateMatch(`weather-effect-${index}`, strong, strong, tactics, weather).events;
        const passes = events.filter((event) => event.scene?.action === "pass" || event.scene?.action === "turnover");
        if (total === "dry") {
          dryAttempts += passes.length;
          dryCompleted += passes.filter((event) => event.scene?.action === "pass").length;
        } else {
          wetAttempts += passes.length;
          wetCompleted += passes.filter((event) => event.scene?.action === "pass").length;
        }
      }
    }
    expect(wetAttempts).toBeGreaterThan(0);
    expect(wetCompleted / wetAttempts).toBeLessThan(dryCompleted / dryAttempts);
  });

  it("makes weather deterministic and applies climate/pressing fatigue to match condition", () => {
    expect(createMatchWeather("weather-key", rules)).toEqual(createMatchWeather("weather-key", rules));
    const hotWeather = { ...dryWeather, temperatureC: 36 };
    const staminaSquad = strong.map((player) => ({ ...player, energy: 80 }));
    const lightPress = matchEnergyAfter(staminaSquad, Object.fromEntries(staminaSquad.map((player) => [player.id, 90])), 90, dryWeather, "Leve", rules);
    const hotPress = matchEnergyAfter(staminaSquad, Object.fromEntries(staminaSquad.map((player) => [player.id, 90])), 90, hotWeather, "Pesada", rules);
    expect(hotPress[0].energy).toBeLessThan(lightPress[0].energy);
    expect(hotPress[0].energy).toBeLessThan(80);
  });

  it("calculates match ratings from contributions rather than a static overall-only value", () => {
    const player = strong[0];
    const events = [{
      minute: 10, half: 1 as const, text: `GOL! ${player.name}`, scorer: player.name, scorerId: player.id, actorId: player.id,
      scene: { action: "goal" as const, team: "home" as const, actorIndex: 0, targetIndex: 1, from: { x: 40, y: 40 }, to: { x: 95, y: 50 }, possessionAfter: "away" as const },
    }];
    const rating = calculatePlayerRatings([player], events, "home")[0];
    expect(rating.goals).toBe(1);
    expect(rating.rating).toBeGreaterThan(6);
  });

  it("keeps background scores stable and gives better clubs a long-run edge", () => {
    expect(otherScore("A", "B", 1, 0)).toEqual([0, 0]);
    const a = otherScore("A", "B", 1, 45);
    expect(otherScore("A", "B", 1, 45)).toEqual(a);
    const b = otherScore("A", "B", 1, 90);
    expect(b[0]).toBeGreaterThanOrEqual(a[0]); expect(b[1]).toBeGreaterThanOrEqual(a[1]);
    expect(otherScore("A", "B", 1, 200)).toEqual(b);
    let advantagedGoals = 0, underdogGoals = 0;
    for (let round = 1; round <= 100; round++) {
      const [home, away] = otherScore("Strong", "Underdog", round, 90, 90, 50);
      advantagedGoals += home; underdogGoals += away;
    }
    expect(advantagedGoals).toBeGreaterThan(underdogGoals);
  });
});
