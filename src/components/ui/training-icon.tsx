"use client";

import { useId } from "react";
import type { TrainingDrillId } from "@/lib/game/training";

/** Small sculpted SVG illustrations: local, scalable and decorative; no remote assets. */
export function TrainingIcon({ name, size = 44 }: { name: TrainingDrillId; size?: number }) {
  const id = useId().replace(/:/g, "");
  const green = `url(#${id}-green)`;
  const ivory = `url(#${id}-ivory)`;
  const gold = `url(#${id}-gold)`;
  return <svg width={size} height={size} viewBox="0 0 72 72" fill="none" aria-hidden="true" focusable="false" data-training-icon={name}>
    <defs>
      <linearGradient id={`${id}-green`} x1="18" y1="14" x2="56" y2="62" gradientUnits="userSpaceOnUse"><stop stopColor="#a4dec1" /><stop offset=".42" stopColor="#499c77" /><stop offset="1" stopColor="#19573c" /></linearGradient>
      <linearGradient id={`${id}-ivory`} x1="21" y1="13" x2="51" y2="57" gradientUnits="userSpaceOnUse"><stop stopColor="#ffffff" /><stop offset=".6" stopColor="#e9eee9" /><stop offset="1" stopColor="#9cafa5" /></linearGradient>
      <linearGradient id={`${id}-gold`} x1="25" y1="12" x2="45" y2="59" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe1a4" /><stop offset=".5" stopColor="#e8aa51" /><stop offset="1" stopColor="#ac6a2b" /></linearGradient>
      <radialGradient id={`${id}-ball`} cx=".3" cy=".23" r=".8"><stop stopColor="#fff" /><stop offset=".65" stopColor="#e2e9e4" /><stop offset="1" stopColor="#8da395" /></radialGradient>
    </defs>
    <ellipse cx="37" cy="61" rx="25" ry="5" fill="#153e2b" opacity=".09" />
    {name === "finalizacao" && <>
      <path d="m14 47 5-27 39-5 5 28-5 5-39 6Z" fill="#b1c5b8" />
      <path d="m18 46 4-24 34-4 4 25-4 4-34 4Z" fill={green} />
      <path d="m23 24 30-3 3 23-30 4Z" fill="#174c36" />
      <path d="m31 23 2 24m10-25 2 24m-20-14 29-4m-27 13 29-4" stroke="#a5d6b6" strokeWidth="1.5" opacity=".6" />
      <circle cx="25" cy="48" r="12" fill={`url(#${id}-ball)`} />
      <path d="m25 41 6 4-2 7h-7l-2-7Z" fill="#2c4e3d" /><path d="m15 45 5 1m10-1 5-2m-8 9 2 7m-7-7-5 5" stroke="#597363" strokeWidth="1.5" />
    </>}
    {name === "passe" && <>
      <path d="m11 43 32-17 18 11-32 19Z" fill="#21573e" /><path d="m11 39 32-17 18 11-32 19Z" fill={green} />
      <path d="m23 38 19-10 8 5-19 11Z" stroke="#e0f1df" strokeWidth="1.4" />
      <path d="M22 26q14-15 30 0" stroke="#c89243" strokeWidth="3" strokeLinecap="round" /><path d="m48 20 5 7-8-1" stroke="#c89243" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="22" cy="42" r="10" fill={`url(#${id}-ball)`} /><path d="m22 36 5 4-2 6h-6l-2-6Z" fill="#294c3a" />
      <path d="m48 42 5-14 6 12-5 4Z" fill={gold} />
    </>}
    {name === "marcacao" && <>
      <path d="m39 10 22 9-3 24q-5 13-19 20L19 51 14 22Z" fill="#164c34" />
      <path d="m34 8 23 10-4 24Q48 55 34 61 20 52 17 40l-4-22Z" fill={green} />
      <path d="m34 15 16 7-3 18q-3 9-13 15-10-7-12-17l-2-16Z" stroke="#d8edcf" strokeWidth="2" />
      <path d="m25 34 7 8 13-16" stroke="#eff5df" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </>}
    {name === "posicionamento" && <>
      <path d="m10 39 34-22 19 18v7L28 63 10 47Z" fill="#20553c" /><path d="m10 39 34-22 19 18-35 22Z" fill={green} />
      <path d="m17 39 26-16 13 12-27 16Z" stroke="#e2f0d8" strokeWidth="1.5" /><path d="m30 31 13 12m-12-7q8-6 12-1t-6 8q-8 3-6-7Z" stroke="#d7eaca" strokeWidth="1.3" />
      <path d="m25 32 1 11m20-18 1 10m-5 7 1 10" stroke="#174b32" strokeWidth="3" strokeLinecap="round" />
      <circle cx="25" cy="31" r="5" fill={gold} /><circle cx="46" cy="24" r="5" fill={ivory} /><circle cx="42" cy="41" r="5" fill={gold} />
    </>}
    {name === "resistencia" && <>
      <g transform="rotate(-25 36 36)"><rect x="17" y="32" width="38" height="9" rx="3" fill={ivory} /><rect x="13" y="22" width="13" height="31" rx="4" fill="#1a5138" /><rect x="10" y="19" width="12" height="31" rx="4" fill={green} /><rect x="49" y="22" width="13" height="31" rx="4" fill="#1a5138" /><rect x="45" y="19" width="12" height="31" rx="4" fill={green} /><path d="M14 24v19m35-19v19" stroke="#b4ddbd" strokeWidth="2" strokeLinecap="round" opacity=".7" /></g>
    </>}
    {name === "recuperacao" && <>
      <path d="m19 25 27-8 14 12v25l-28 9-13-11Z" fill="#a0b7a8" /><path d="m15 24 28-8 14 11-28 9Z" fill="#fff" /><path d="m15 24 14 12v25L15 50Z" fill="#c8d7cb" /><path d="m29 36 28-9v25l-28 9Z" fill={ivory} />
      <path d="m37 34 9-3v7l7-2v9l-7 2v7l-9 3v-8l-6 2v-9l6-2Z" fill={green} /><path d="M26 19v-5l12-4 7 5v5" stroke="#659178" strokeWidth="4" strokeLinejoin="round" />
    </>}
  </svg>;
}
