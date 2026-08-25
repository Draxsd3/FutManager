import type { ReactNode } from "react";

export type ClassicIconName =
  | "accept_button" | "add" | "arrow_refresh" | "award_star_gold_blue"
  | "book" | "bullet_green" | "bullet_yellow" | "calendar" | "cancel"
  | "chart_bar" | "clock_history_frame" | "data_table" | "delete" | "door_out"
  | "find" | "flag_red_dull" | "group" | "house" | "magnifier" | "medal_award_gold"
  | "money" | "pencil" | "sport" | "sport_soccer" | "star" | "t_shirt_print"
  | "user_add" | "user_delete" | "user_edit" | "user_green" | "user_suit";

export function ClassicIcon({ name, size = 16, className = "" }: { name: ClassicIconName; size?: 16 | 32; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`inline-block shrink-0 ${className}`}>
      <IconGraphic name={name} />
    </svg>
  );
}

function IconGraphic({ name }: { name: ClassicIconName }): ReactNode {
  switch (name) {
    case "accept_button": return <><circle cx="12" cy="12" r="8.5" /><path d="m8.3 12.1 2.3 2.3 5-5" /></>;
    case "add": return <><circle cx="12" cy="12" r="8.5" /><path d="M12 8v8M8 12h8" /></>;
    case "arrow_refresh": return <><path d="M19 8a7.5 7.5 0 0 0-13.1-1.8L4.5 8.5M5 4.5v4h4" /><path d="M5 16a7.5 7.5 0 0 0 13.1 1.8l1.4-2.3M19 19.5v-4h-4" /></>;
    case "award_star_gold_blue": return <><circle cx="12" cy="10" r="6" /><path d="m12 6.5 1.1 2.2 2.4.3-1.8 1.7.4 2.4-2.1-1.1-2.1 1.1.4-2.4-1.8-1.7 2.4-.3zM9 15.2l-1 5 4-2 4 2-1-5" /></>;
    case "book": return <><path d="M4.5 5.5A2.5 2.5 0 0 1 7 3h5v16H7a2.5 2.5 0 0 0-2.5 2.5z" /><path d="M19.5 5.5A2.5 2.5 0 0 0 17 3h-5v16h5a2.5 2.5 0 0 1 2.5 2.5z" /></>;
    case "bullet_green": return <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />;
    case "bullet_yellow": return <><circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none" /><path d="M8.5 12h7" stroke="#fff" /></>;
    case "calendar": return <><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3.5v4M16 3.5v4M4 9.5h16M8 13h.01M12 13h.01M16 13h.01M8 16h.01M12 16h.01" /></>;
    case "cancel": return <><circle cx="12" cy="12" r="8.5" /><path d="m9 9 6 6m0-6-6 6" /></>;
    case "chart_bar": return <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /><path d="M4 10h2M10 4h2M16 13h2" /></>;
    case "clock_history_frame": return <><circle cx="13" cy="12" r="7" /><path d="M13 8v4l2.8 1.7M5 7H2v-3M2.2 7A9.5 9.5 0 1 1 4 17.5" /></>;
    case "data_table": return <><rect x="3" y="4" width="18" height="16" rx="1" /><path d="M3 9h18M3 14h18M9 4v16M15 4v16" /></>;
    case "delete": return <><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>;
    case "door_out": return <><path d="M4 4h9v16H4zM13 12h7M17 9l3 3-3 3" /></>;
    case "find": case "magnifier": return <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4.5 4.5" /></>;
    case "flag_red_dull": return <><path d="M6 21V4M6 5c4-2 6 2 11 0v8c-5 2-7-2-11 0" /><path d="M6 18h8" /></>;
    case "group": return <><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.3" /><path d="M3.5 20c.4-3.5 2.4-5.3 5.5-5.3s5.1 1.8 5.5 5.3M14 15.4c3 .1 4.9 1.7 5.2 4.6" /></>;
    case "house": return <><path d="m3 11 9-7 9 7v9H3zM9 20v-5h6v5" /></>;
    case "medal_award_gold": return <><path d="m8 3 3 5M16 3l-3 5" /><circle cx="12" cy="14" r="5.5" /><path d="m12 10.5 1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3z" /></>;
    case "money": return <><circle cx="12" cy="12" r="8.5" /><path d="M14.5 9.5c-.5-.7-1.4-1.1-2.5-1.1-1.4 0-2.5.7-2.5 1.8 0 2.8 5 1.1 5 3.7 0 1.1-1.1 1.8-2.5 1.8-1.1 0-2.1-.5-2.7-1.3M12 7v10" /></>;
    case "pencil": return <><path d="m4 20 3.8-.8L19 8l-3-3L4.8 16.2zM14.5 6.5l3 3" /></>;
    case "sport": return <><path d="M4 18V9l8-5 8 5v9l-8 3zM4 10h16M12 4v17M8 20v-5h8v5" /></>;
    case "sport_soccer": return <><circle cx="12" cy="12" r="8.5" /><path d="m12 7 3 2.2-1.1 3.5h-3.8L9 9.2zM9 9.2 6 11M15 9.2l3 1.8M10.1 12.7 8 16.5M13.9 12.7l2.1 3.8M8 16.5l4 2.2 4-2.2" /></>;
    case "star": return <path d="m12 3 2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8-4.2-4.1 5.9-.9z" />;
    case "t_shirt_print": return <><path d="m8 5 2.5 2h3L16 5l4 2.5-2.2 4-2.3-1.2V20H8.5v-9.7l-2.3 1.2-2.2-4z" /><path d="M10.5 7h3" /></>;
    case "user_add": return <><circle cx="10" cy="8" r="3" /><path d="M4 20c.5-3.7 2.5-5.5 6-5.5 1.5 0 2.7.3 3.7 1M18 15v6M15 18h6" /></>;
    case "user_delete": return <><circle cx="10" cy="8" r="3" /><path d="M4 20c.5-3.7 2.5-5.5 6-5.5 1.5 0 2.7.3 3.7 1M15 18h6" /></>;
    case "user_edit": return <><circle cx="9" cy="8" r="3" /><path d="M3.5 20c.5-3.7 2.4-5.5 5.5-5.5 1.3 0 2.4.3 3.3.8M14.5 20l1.2-3.7 4.6-4.6 2.3 2.3-4.6 4.6zM19 13l2.3 2.3" /></>;
    case "user_green": return <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.5-4.1 2.8-6.2 7-6.2s6.5 2.1 7 6.2" /></>;
    case "user_suit": return <><circle cx="12" cy="7" r="3" /><path d="M5 20v-3.2c0-2.1 1.8-3.8 4-3.8h6c2.2 0 4 1.7 4 3.8V20M10 13l2 3 2-3M12 16v4" /></>;
  }
}
