"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ManualPosition } from "@/lib/game/career";
import type { Player } from "@/lib/game/mock-data";
import type { MatchScene } from "@/lib/game/live-match";
import { visualFormation } from "@/lib/game/live-positioning";
import styles from "./match-overview-screen.module.css";

type Point = { x: number; y: number };

/** One animation loop for both teams; stops without jumping on pause. */
export function LivePlayers({ starters, formation, manualPositions, scene, minute, running, speed }: {
  starters: Player[]; formation: string; manualPositions: Record<number, ManualPosition>;
  scene?: MatchScene; minute: number; running: boolean; speed: 1 | 2 | 4;
}) {
  const nodes = useRef(new Map<string, HTMLSpanElement>());
  const positions = useRef(new Map<string, Point>());
  const players = useMemo(() => visualFormation({ starters, formation, manualPositions, scene, minute }), [starters, formation, manualPositions, scene, minute]);

  useEffect(() => {
    const ids = new Set(players.map((player) => player.key));
    for (const key of positions.current.keys()) if (!ids.has(key)) positions.current.delete(key);
    const origins = new Map<string, Point>();
    for (const player of players) {
      const node = nodes.current.get(player.key);
      const position = positions.current.get(player.key) ?? player.base;
      origins.set(player.key, { ...position });
      if (node) { node.style.left = `${position.x}%`; node.style.top = `${position.y}%`; }
      positions.current.set(player.key, position);
    }
    if (!running || !scene) return;
    const draw = (fraction: number) => {
      for (const player of players) {
        const start = origins.get(player.key)!;
        const point = { x: start.x + (player.target.x - start.x) * fraction, y: start.y + (player.target.y - start.y) * fraction };
        positions.current.set(player.key, point);
        const node = nodes.current.get(player.key);
        if (node) { node.style.left = `${point.x}%`; node.style.top = `${point.y}%`; }
      }
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { draw(1); return; }
    let frame = 0;
    let started: number | undefined;
    const step = (now: number) => {
      if (started === undefined) started = now;
      const progress = Math.min(1, (now - started) / (700 / speed));
      draw(progress * progress * (3 - 2 * progress));
      if (progress < 1) frame = window.requestAnimationFrame(step);
    };
    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [players, running, scene, speed]);

  return <>{players.map((player, index) => {
    const home = index < Math.min(starters.length, 11);
    const athlete = home ? starters[index] : undefined;
    return <span key={player.key} ref={(node) => { if (node) nodes.current.set(player.key, node); else nodes.current.delete(player.key); }} data-player-key={player.key} className={`${styles.player} ${home ? styles.homePlayer : styles.awayPlayer} ${player.active ? styles.activePlayer : ""}`} title={athlete ? `${athlete.name} · ${athlete.position}` : undefined}>{athlete && <span>{athlete.shirtNumber ?? athlete.id}</span>}</span>;
  })}</>;
}
