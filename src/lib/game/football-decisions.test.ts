import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { attackingProgress, chanceQuality, localPressure, opponentPlan, passUtility } from "./football-decisions";
import { buildStartingXI, squad } from "./mock-data";
import { createMinuteRandom, simulateAction, type MatchEvent, type MatchScene } from "./live-match";
import { parseMatchRules } from "./match-rules";

const balanced = { style: "Equilibrado", marking: "Normal", focus: "Pelo meio" };
const rules = parseMatchRules(readFileSync("public/game-assets/match-engine-rules.md", "utf8"));
const home = buildStartingXI("4-3-3", squad).map((id) => ({ ...squad.find((player) => player.id === id)!, overall: 76, energy: 95 }));
const away = home.map((player) => ({ ...player, id: player.id + 1000 }));
const input = { starters: home, opponentStarters: away, formation: "4-3-3", positions: {}, opponent: "Rival", rules,
  weather: { id: "dry", label: "Firme", temperatureC: 24, rainIntensity: 0, windKmh: 3 }, tactics: balanced, motivationHome: 65, motivationAway: 65 };

function run(key: string, prefix: MatchEvent[] = [], end = 90) {
  const events = JSON.parse(JSON.stringify(prefix)) as MatchEvent[];
  const score = { home: 0, away: 0 };
  for (const event of events) if (event.scene?.action === "goal") score[event.scene.team]++;
  for (let minute = events.length + 1; minute <= end; minute++) {
    const event = simulateAction({ ...input, minute, previous: events.at(-1)?.scene, score,
      sentOffHomeIds: events.filter((item) => item.card === "red" && item.scene?.team === "home").map((item) => item.actorId!),
      sentOffAwayIds: events.filter((item) => item.card === "red" && item.scene?.team === "away").map((item) => item.actorId!),
      yellowCardIds: events.filter((item) => item.card === "yellow").map((item) => item.actorId!),
      random: createMinuteRandom(key, minute) });
    events.push(event);
    if (event.scene?.action === "goal") score[event.scene.team]++;
  }
  return events;
}

describe("free local football decisions", () => {
  it("values close, central, unpressured chances over distant, narrow, pressured shots", () => {
    expect(chanceQuality({ x: 88, y: 50 }, "home", 0)).toBeGreaterThan(chanceQuality({ x: 62, y: 50 }, "home", 0));
    expect(chanceQuality({ x: 88, y: 50 }, "home", 0)).toBeGreaterThan(chanceQuality({ x: 88, y: 90 }, "home", 0));
    expect(chanceQuality({ x: 80, y: 50 }, "home", 0)).toBeGreaterThan(chanceQuality({ x: 80, y: 50 }, "home", 1));
    expect(localPressure({ x: 50, y: 50 }, [{ x: 51, y: 50 }])).toBeGreaterThan(localPressure({ x: 50, y: 50 }, [{ x: 80, y: 90 }]));
  });

  it("mirrors geometry for the opposition and avoids invalid chance probabilities", () => {
    for (let x = 0; x <= 100; x += 5) {
      expect(attackingProgress({ x, y: 50 }, "home")).toBe(attackingProgress({ x: 100 - x, y: 50 }, "away"));
      const value = chanceQuality({ x, y: 65 }, "home", .4);
      expect(value).toBe(chanceQuality({ x: 100 - x, y: 65 }, "away", .4));
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("weighs open progressive passes and the chosen flank without making them mandatory", () => {
    const from = { x: 50, y: 50 }, forward = { x: 70, y: 50 };
    expect(passUtility(from, forward, "home", 0, balanced)).toBeGreaterThan(passUtility(from, { x: 30, y: 50 }, "home", 0, balanced));
    expect(passUtility(from, forward, "home", 0, balanced)).toBeGreaterThan(passUtility(from, forward, "home", 1, balanced));
    expect(passUtility(from, { x: 60, y: 85 }, "home", 0, { ...balanced, focus: "Pelas laterais" }))
      .toBeGreaterThan(passUtility(from, { x: 60, y: 85 }, "home", 0, balanced));
  });

  it("reacts to score, clock and dismissals without modifying the manager's instructions", () => {
    expect(opponentPlan(balanced, 50, -1, 0)).toEqual(balanced);
    expect(opponentPlan(balanced, 65, -1, 0).style).toBe("Ofensivo");
    expect(opponentPlan(balanced, 80, -1, 0).marking).toBe("Pesada");
    expect(opponentPlan(balanced, 80, 1, 0).style).toBe("Defensivo");
    expect(opponentPlan(balanced, 20, 0, 1).style).toBe("Defensivo");
    expect(balanced).toEqual({ style: "Equilibrado", marking: "Normal", focus: "Pelo meio" });
  });

  it("resumes identically from a JSON snapshot including score and carrier state", () => {
    const full = run("resume-ai");
    expect(run("resume-ai", full.slice(0, 58))).toEqual(full);
    expect(full.some((event) => event.scene?.action === "carry")).toBe(true);
    for (let index = 1; index < full.length; index++) {
      const previous = full[index - 1].scene!, current = full[index].scene!;
      if (full[index].minute === 46) continue;
      const defensive = current.action === "tackle" || current.action === "foul";
      expect(current.team === previous.possessionAfter).toBe(!defensive);
      if (!defensive && previous.carrierId !== undefined) expect(current.actorId).toBe(previous.carrierId);
      if (current.action === "carry") {
        expect(current.possessionAfter).toBe(current.team);
        expect(current.carrierId).toBe(current.actorId);
        expect(current.ballAfter).toEqual(current.to);
      }
      if (full[index].assistId !== undefined) {
        expect(previous.action).toBe("pass");
        expect(previous.targetId).toBe(full[index].scorerId);
        expect(full[index].assistId).not.toBe(full[index].scorerId);
      }
    }
  });

  it("uses opposite kickoffs at the interval and accepts legacy scenes without new fields", () => {
    for (const kickoffSide of ["home", "away"] as const) {
      const first = simulateAction({ ...input, kickoffSide, minute: 1, random: () => .99 });
      const second = simulateAction({ ...input, kickoffSide, minute: 46, previous: first.scene, random: () => .99 });
      expect(first.scene?.team).toBe(kickoffSide);
      expect(second.scene?.team).not.toBe(kickoffSide);
      expect(second.scene?.from).toEqual({ x: 50, y: 50 });
    }
    const previous: MatchScene = { action: "pass", team: "home", actorIndex: 3, targetIndex: 4, from: { x: 40, y: 50 }, to: { x: 50, y: 50 } };
    const event = simulateAction({ ...input, previous, minute: 25, random: createMinuteRandom("legacy", 25) });
    expect(event.text).toBeTruthy();
    expect(event.scene?.ballAfter).toBeDefined();
  });

  it("keeps source players and snapshots immutable and considers fresh substitute minutes", () => {
    const source = JSON.stringify(input);
    const previous: MatchScene = { action: "carry", team: "home", possessionAfter: "home", carrierId: home[7].id,
      actorIndex: 7, targetIndex: 8, from: { x: 76, y: 50 }, to: { x: 80, y: 50 }, ballAfter: { x: 80, y: 50 } };
    const snapshot = { home: home.map(() => ({ x: 60, y: 50 })), away: away.map(() => ({ x: 20, y: 50 })) };
    const initialSnapshot = JSON.stringify(snapshot);
    let differences = 0;
    for (let index = 0; index < 200; index++) {
      const args = { ...input, previous, snapshot, minute: 85 };
      const tired = simulateAction({ ...args, minutesPlayedHome: { [home[7].id]: 85 }, random: createMinuteRandom(`fatigue-${index}`, 85) });
      const fresh = simulateAction({ ...args, minutesPlayedHome: { [home[7].id]: 5 }, random: createMinuteRandom(`fatigue-${index}`, 85) });
      if (JSON.stringify(tired) !== JSON.stringify(fresh)) differences++;
    }
    expect(differences).toBeGreaterThan(0);
    expect(JSON.stringify(snapshot)).toBe(initialSnapshot);
    expect(JSON.stringify(input)).toBe(source);
  });
});
