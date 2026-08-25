import type { CSSProperties } from "react";
import { clubThemes } from "@/lib/game/mock-data";
import { TopNav, type NavItem } from "./top-nav";

export function AppShell({
  nav,
  teamName,
  date,
  children,
}: {
  nav: NavItem[];
  teamName: string;
  date: string;
  children: React.ReactNode;
}) {
  const theme = clubThemes[teamName] ?? clubThemes.Palmeiras;
  const style = {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-text": theme.text,
  } as CSSProperties;
  return (
    <div style={style} className="min-h-screen bg-[#071a0d] bg-[linear-gradient(rgba(4,20,9,.88),rgba(4,20,9,.92)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-fixed font-[Arial] text-[12px] text-[#eff7ef]">
      <TopNav items={nav} date={date} />
      <main>{children}</main>
    </div>
  );
}
