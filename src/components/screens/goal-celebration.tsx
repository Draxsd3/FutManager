"use client";

import { useEffect, useRef, useState } from "react";
import type { MatchEvent } from "@/lib/game/live-match";
import styles from "./match-overview-screen.module.css";

/** Only new goals trigger the celebration; restoring a save never replays old goals. */
export function GoalCelebration({ events, club, opponent }: { events: MatchEvent[]; club: string; opponent: string }) {
  const seen = useRef(events.length);
  const [goal, setGoal] = useState<MatchEvent | null>(null);

  useEffect(() => {
    const added = events.slice(seen.current);
    seen.current = events.length;
    const next = added.filter((event) => event.scene?.action === "goal").at(-1);
    if (!next) return;
    const show = window.setTimeout(() => setGoal(next), 0);
    return () => window.clearTimeout(show);
  }, [events]);

  useEffect(() => {
    if (!goal) return;
    const timer = window.setTimeout(() => setGoal(null), 2500);
    return () => window.clearTimeout(timer);
  }, [goal]);

  if (!goal) return null;
  const scorer = goal.scorer ?? goal.text.replace(/^gol\s+(de|do|da)\s+/i, "").replace(/[!]+$/, "");
  return <div className={styles.goalCelebration} role="status" aria-live="assertive">
    <span className={styles.goalIcon} aria-hidden="true">⚽</span>
    <strong>GOOOL!</strong>
    <span className={styles.goalScorer}>{scorer || "Autor não informado"}</span>
    <span className={styles.goalTeam}>{goal.scene?.team === "home" ? club : opponent} · {goal.minute}&apos;</span>
  </div>;
}
