import type { ReactNode } from "react";
import type { ClassicIconName } from "./classic-icon";

type Name = ClassicIconName | "chevron_right" | "search" | "shield" | "arrow_up_right" | "activity" | "arrow_right" | "trophy" | "tactics";
const paths: Record<string, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 4v2"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18m-13 4h1m6 0h1m-8 3h1"/></>,
  chart: <><path d="M4 3v18h17M8 16v-4m5 4V7m5 9v-6"/></>,
  stadium: <><ellipse cx="12" cy="7" rx="9" ry="4"/><path d="M3 7v10c0 2 4 4 9 4s9-2 9-4V7M7 11v8m5-8v10m5-10v8M8 5h8"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  trophy: <><path d="M8 3h8v6a4 4 0 0 1-8 0ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4m-4 1v6m-4 2h8"/></>,
  wallet: <><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 8V5a2 2 0 0 1 2-2h12m4 9h-6v5h6m-3-2.5h.01"/></>,
  tactics: <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 12h18M12 3v18m-9-6h4V9H3m18 6h-4V9h4"/><circle cx="12" cy="12" r="3"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  coach: <><circle cx="12" cy="7" r="3"/><path d="M5 21v-2a7 7 0 0 1 14 0v2m-10-7 3 3 3-3m-3 3v4"/></>,
  exit: <><path d="M10 4H4v16h6m5-12 4 4-4 4m-8-4h12"/></>,
  arrow: <path d="m7 17 10-10M7 7h10v10"/>,
  chevron: <path d="m9 5 7 7-7 7"/>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z"/><path d="m8 12 3 3 5-6"/></>,
  activity: <path d="M3 12h4l3-8 4 16 3-8h4"/>,
  add: <path d="M12 5v14M5 12h14"/>,
  cancel: <path d="m6 6 12 12M6 18 18 6"/>,
  delete: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></>,
  refresh: <><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 6a8 8 0 0 1 13.4 3M4.5 15A8 8 0 0 0 18 18"/></>,
  flag: <><path d="M5 21V3m0 1h14l-3 4 3 4H5"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>,
  star: <path d="m12 3 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4L12 17.6l-5.7 3 1.1-6.4L2.8 9.7l6.4-.9Z"/>,
  pencil: <><path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z"/></>,
  shirt: <path d="m8 3-6 4 3 5 3-2v11h8V10l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/>,
  user_add: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m3-14v6m-3-3h6"/></>,
  user_delete: <><circle cx="9" cy="7" r="3"/><path d="M2 21v-2a7 7 0 0 1 14 0v2m0-11h6"/></>,
  arrow_right: <path d="M4 12h16m-6-6 6 6-6 6"/>,
  ball: <><circle cx="12" cy="12" r="9"/><path d="m12 8 4 3-2 5h-4l-2-5Zm0-5v5m9 4-5-1m1 9-3-4m-7 4 3-4M3 12l5-1"/></>,
};
const aliases: Record<string, string> = {
  house: "home", group: "users", user_green: "users", user_edit: "coach", user_suit: "coach",
  data_table: "chart", chart_bar: "chart", sport: "stadium", find: "search", magnifier: "search", money: "wallet",
  medal_award_gold: "trophy", award_star_gold_blue: "trophy", book: "tactics",
  clock_history_frame: "clock", arrow_refresh: "refresh", door_out: "exit", sport_soccer: "ball", t_shirt_print: "shirt",
  chevron_right: "chevron", arrow_up_right: "arrow", accept_button: "check", flag_red_dull: "flag", bullet_green: "dot", bullet_yellow: "dot",
};
/** A single 24px monoline system for the career interface. Decorative; controls supply labels. */
export function InterfaceIcon({ name, size = 20, className }: { name: Name; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>{paths[aliases[name] ?? name] ?? paths.shield}</svg>;
}
