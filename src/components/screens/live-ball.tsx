"use client";

import { useEffect, useRef } from "react";
import styles from "./match-overview-screen.module.css";

type Point = { x: number; y: number };

/** Interpolates from the current screen position, never from a remounted action origin. */
export function LiveBall({ target, running, speed }: { target: Point | undefined; running: boolean; speed: 1 | 2 | 4 }) {
  const node = useRef<HTMLSpanElement>(null);
  const position = useRef<Point>(target ?? { x: 50, y: 50 });
  const x = target?.x, y = target?.y;

  useEffect(() => {
    if (node.current) {
      node.current.style.left = `${position.current.x}%`;
      node.current.style.top = `${position.current.y}%`;
    }
  }, []);

  useEffect(() => {
    if (!running || x === undefined || y === undefined || !node.current) return;
    const element = node.current;
    const origin = { ...position.current };
    const destination = { x, y };
    const apply = (point: Point) => {
      position.current = point;
      element.style.left = `${point.x}%`;
      element.style.top = `${point.y}%`;
    };
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      apply(destination);
      return;
    }
    let frame = 0;
    let start: number | undefined;
    const tick = (now: number) => {
      if (start === undefined) start = now;
      const progress = Math.min(1, (now - start) / (700 / speed));
      // Ease gently at the end of a pass to make the receiver's control legible.
      const eased = 1 - (1 - progress) ** 2;
      apply({ x: origin.x + (destination.x - origin.x) * eased, y: origin.y + (destination.y - origin.y) * eased });
      if (progress < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [x, y, running, speed]);

  return <span ref={node} className={styles.ball} data-testid="live-ball" aria-hidden="true" />;
}
