import Image from "next/image";

export type ClassicIconName =
  | "accept_button" | "add" | "arrow_refresh" | "award_star_gold_blue"
  | "book" | "bullet_green" | "bullet_yellow" | "calendar" | "cancel"
  | "chart_bar" | "clock_history_frame" | "data_table" | "delete" | "door_out"
  | "find" | "flag_red_dull" | "group" | "house" | "magnifier" | "medal_award_gold"
  | "money" | "pencil" | "sport" | "sport_soccer" | "star" | "t_shirt_print"
  | "user_add" | "user_delete" | "user_edit" | "user_green" | "user_suit";

const iconByName: Record<ClassicIconName, string> = {
  accept_button: "football.svg", add: "football-free-kick.svg", arrow_refresh: "stopwatch.svg", award_star_gold_blue: "medal.svg",
  book: "strategy.svg", bullet_green: "football.svg", bullet_yellow: "penalty-card.svg", calendar: "game-schedule.svg", cancel: "whistle.svg",
  chart_bar: "strategy.svg", clock_history_frame: "digital-stopwatch.svg", data_table: "game-schedule.svg", delete: "penalty-card.svg",
  door_out: "corner-flag.svg", find: "goalkeeper-gloves.svg", flag_red_dull: "offside-flag.svg", group: "team.svg", house: "football-club-flag.svg",
  magnifier: "goalkeeper-gloves.svg", medal_award_gold: "medal.svg", money: "football-club-flag.svg", pencil: "strategy.svg",
  sport: "stadium.svg", sport_soccer: "football.svg", star: "medal.svg", t_shirt_print: "football-studs.svg", user_add: "team.svg",
  user_delete: "penalty-card.svg", user_edit: "player-field-position.svg", user_green: "player-field-position.svg", user_suit: "referee.svg",
};

export function ClassicIcon({ name, size = 16, className = "" }: { name: ClassicIconName; size?: 16 | 32; className?: string }) {
  return <Image src={`/football-icons/${encodeURIComponent(iconByName[name])}`} width={size} height={size} unoptimized alt="" aria-hidden="true" className={`inline-block shrink-0 object-contain ${className}`} />;
}
