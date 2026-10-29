import type { ReactNode } from "react";
import type { ClassicIconName } from "./classic-icon";

type Name = ClassicIconName | "chevron_right" | "search" | "shield" | "arrow_up_right" | "activity";
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
  ball: <><circle cx="12" cy="12" r="9"/><path d="m12 8 4 3-2 5h-4l-2-5Zm0-5v5m9 4-5-1m1 9-3-4m-7 4 3-4M3 12l5-1"/></>,
};
const aliases: Record<string, string> = {
  house: "home", group: "users", user_green: "users", user_add: "users", user_delete: "users", user_edit: "coach", user_suit: "coach",
  data_table: "chart", chart_bar: "chart", sport: "stadium", find: "search", magnifier: "search", money: "wallet",
  medal_award_gold: "trophy", award_star_gold_blue: "trophy", star: "trophy", book: "tactics", pencil: "tactics",
  clock_history_frame: "clock", arrow_refresh: "clock", door_out: "exit", sport_soccer: "ball", t_shirt_print: "activity",
  chevron_right: "chevron", arrow_up_right: "arrow", accept_button: "shield",
};
/** A single 24px monoline system for the career interface. Decorative; controls supply labels. */
export function InterfaceIcon({ name, size = 20, className }: { name: Name; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" className={className}>{paths[aliases[name] ?? name] ?? paths.shield}</svg>;
}
