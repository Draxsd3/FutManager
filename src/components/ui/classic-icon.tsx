import {
  Award, BookOpen, CalendarDays, ChartColumn, Circle, CircleCheck, CircleDollarSign,
  Flag, Goal, History, House, LogOut, Medal, Pencil, Plus, RefreshCw, Search,
  Shirt, Star, Table2, Trash2, UserMinus, UserPen, UserPlus, UserRound,
  UserRoundCog, UsersRound, X, type LucideIcon,
} from "lucide-react";

export type ClassicIconName =
  | "accept_button" | "add" | "arrow_refresh" | "award_star_gold_blue"
  | "book" | "bullet_green" | "bullet_yellow" | "calendar" | "cancel"
  | "chart_bar" | "clock_history_frame" | "data_table" | "delete" | "door_out"
  | "find" | "flag_red_dull" | "group" | "house" | "magnifier" | "medal_award_gold"
  | "money" | "pencil" | "sport" | "sport_soccer" | "star" | "t_shirt_print"
  | "user_add" | "user_delete" | "user_edit" | "user_green" | "user_suit";

const iconByName: Record<ClassicIconName, LucideIcon> = {
  accept_button: CircleCheck, add: Plus, arrow_refresh: RefreshCw, award_star_gold_blue: Award,
  book: BookOpen, bullet_green: Circle, bullet_yellow: Circle, calendar: CalendarDays, cancel: X,
  chart_bar: ChartColumn, clock_history_frame: History, data_table: Table2, delete: Trash2,
  door_out: LogOut, find: Search, flag_red_dull: Flag, group: UsersRound, house: House,
  magnifier: Search, medal_award_gold: Medal, money: CircleDollarSign, pencil: Pencil,
  sport: Goal, sport_soccer: Goal, star: Star, t_shirt_print: Shirt, user_add: UserPlus,
  user_delete: UserMinus, user_edit: UserPen, user_green: UserRound, user_suit: UserRoundCog,
};

export function ClassicIcon({ name, size = 16, className = "" }: { name: ClassicIconName; size?: 16 | 32; className?: string }) {
  const Icon = iconByName[name];
  return <Icon size={size} strokeWidth={1.9} aria-hidden="true" className={`inline-block shrink-0 ${className}`} />;
}
