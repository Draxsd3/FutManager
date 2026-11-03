import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { buildStartingXI, squad } from "./mock-data";
import { calculateMatchStatistics, createMinuteRandom, simulateAction, type MatchEvent, type MatchTactics } from "./live-match";
import { parseMatchRules } from "./match-rules";

const rules = parseMatchRules(readFileSync("public/game-assets/match-engine-rules.md", "utf8"));
const xi = buildStartingXI("4-3-3", squad).map((id) => squad.find((player) => player.id === id)!);
const weather = { id: "dry", label: "Tempo firme", temperatureC: 24, rainIntensity: 0, windKmh: 3 };
const balanced = { style: "Equilibrado", marking: "Normal", focus: "Pelo meio" };

function simulateFixture(key: string, strengthHome = 76, strengthAway = 76, tactics: MatchTactics = balanced) {
  const homePlayers = xi.map((player) => ({ ...player, overall: strengthHome, energy: 95, traits: "" }));
  const awayPlayers = xi.map((player) => ({ ...player, id: player.id + 1000, overall: strengthAway, energy: 95, traits: "" }));
  const events: MatchEvent[] = [];
  const score = { home: 0, away: 0 };
  const red = { home: [] as number[], away: [] as number[] };
  const yellows: number[] = [];
  for (let minute = 1; minute <= 90; minute++) {
    const event = simulateAction({ minute, starters: homePlayers, opponentStarters: awayPlayers,
      formation: "4-3-3", opponentFormation: "4-3-3", positions: {}, opponent: "Rival", previous: events.at(-1)?.scene,
      score, rules, weather, tactics, motivationHome: 65, motivationAway: 65,
      sentOffHomeIds: red.home, sentOffAwayIds: red.away, yellowCardIds: yellows,
      random: createMinuteRandom(key, minute) });
    events.push(event);
    if (event.scene?.action === "goal") score[event.scene.team]++;
    if (event.card === "yellow" && event.actorId !== undefined) yellows.push(event.actorId);
    if (event.card === "red" && event.actorId !== undefined && event.scene) red[event.scene.team].push(event.actorId);
  }
  return { score, events, stats: calculateMatchStatistics(events) };
}

it("calibrates 1,000 seeded fixtures without score/statistic contradictions", () => {
  let goals = 0, shots = 0, offsides = 0, completed = 0, attempts = 0, homeWins = 0, awayWins = 0, scoreless = 0;
  let strongWins = 0, weakWins = 0, attackShots = 0, balancedShots = 0, heavyFouls = 0, normalFouls = 0;
  const perScenario = 250;
  for (let index = 0; index < perScenario; index++) {
    const normal = simulateFixture(`calibration-${index}`);
    const stronger = simulateFixture(`strength-${index}`, index % 2 ? 65 : 88, index % 2 ? 88 : 65);
    const attacking = simulateFixture(`calibration-${index}`, 76, 76, { ...balanced, style: "Ofensivo" });
    const pressing = simulateFixture(`calibration-${index}`, 76, 76, { ...balanced, marking: "Pesada" });
    for (const result of [normal, stronger, attacking, pressing]) {
      const { score, events, stats } = result;
      expect(events.filter((event) => event.scene?.action === "goal" && event.scene.team === "home")).toHaveLength(score.home);
      expect(events.filter((event) => event.scene?.action === "goal" && event.scene.team === "away")).toHaveLength(score.away);
      expect(stats.home.possession + stats.away.possession).toBe(100);
      expect(stats.home.shotsOnTarget).toBeLessThanOrEqual(stats.home.shots);
      expect(stats.away.shotsOnTarget).toBeLessThanOrEqual(stats.away.shots);
      expect(stats.home.shotsOnTarget).toBeGreaterThanOrEqual(score.home);
      expect(stats.away.shotsOnTarget).toBeGreaterThanOrEqual(score.away);
      goals += score.home + score.away;
      shots += stats.home.shots + stats.away.shots;
      offsides += stats.home.offsides + stats.away.offsides;
      completed += stats.home.passesCompleted + stats.away.passesCompleted;
      attempts += stats.home.passes + stats.away.passes;
    }
    if (normal.score.home > normal.score.away) homeWins++;
    if (normal.score.away > normal.score.home) awayWins++;
    if (!normal.score.home && !normal.score.away) scoreless++;
    const strongScore = index % 2 ? stronger.score.away : stronger.score.home;
    const weakScore = index % 2 ? stronger.score.home : stronger.score.away;
    if (strongScore > weakScore) strongWins++;
    if (weakScore > strongScore) weakWins++;
    balancedShots += normal.stats.home.shots;
    attackShots += attacking.stats.home.shots;
    normalFouls += normal.stats.home.fouls;
    heavyFouls += pressing.stats.home.fouls;
  }
  const report = { matches: 1000, goalsPerMatch: goals / 1000, shotsPerMatch: shots / 1000,
    offsidesPerMatch: offsides / 1000, passCompletion: completed / attempts, balancedHomeWins: homeWins,
    balancedAwayWins: awayWins, balancedScoreless: scoreless, strongWins, weakWins,
    balancedShots, attackShots, normalFouls, heavyFouls };
  console.info("FOOTBALL_CALIBRATION", JSON.stringify(report));
  // Broad game-balance regression bands, not claims of validation against a real league dataset.
  expect(report.goalsPerMatch).toBeGreaterThan(1.5);
  expect(report.goalsPerMatch).toBeLessThan(3.8);
  expect(report.shotsPerMatch).toBeGreaterThan(10);
  expect(report.shotsPerMatch).toBeLessThan(35);
  expect(strongWins).toBeGreaterThan(weakWins);
  expect(weakWins).toBeGreaterThan(0);
  expect(attackShots).toBeGreaterThan(balancedShots);
  expect(heavyFouls).toBeGreaterThan(normalFouls);
}, 60000);
