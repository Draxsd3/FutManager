import { InterfaceIcon } from "./interface-icon";

export type ClassicIconName =
  | "accept_button" | "add" | "arrow_refresh" | "award_star_gold_blue"
  | "book" | "bullet_green" | "bullet_yellow" | "calendar" | "cancel"
  | "chart_bar" | "clock_history_frame" | "data_table" | "delete" | "door_out"
  | "find" | "flag_red_dull" | "group" | "house" | "magnifier" | "medal_award_gold"
  | "money" | "pencil" | "sport" | "sport_soccer" | "star" | "t_shirt_print"
  | "user_add" | "user_delete" | "user_edit" | "user_green" | "user_suit";

/** Compatibility entry point: every existing screen uses the same SVG icon family. */
export function ClassicIcon({ name, size = 16, className = "" }: { name: ClassicIconName; size?: number; className?: string }) {
  return <InterfaceIcon name={name} size={size} className={`inline-block shrink-0 align-middle ${className}`} />;
}
