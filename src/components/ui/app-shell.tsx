import type { CSSProperties } from "react";
import { clubThemes } from "@/lib/game/mock-data";
import { TopNav, type NavItem } from "./top-nav";

export function AppShell({
  nav,
  teamName,
  date,
  hideNav = false,
  children,
}: {
  nav: NavItem[];
  teamName: string;
  date: string;
  hideNav?: boolean;
  children: React.ReactNode;
}) {
  const theme = clubThemes[teamName] ?? clubThemes.Palmeiras;
  const safeAccentByClub: Record<string, { color: string; text: string }> = {
    Flamengo: { color: "#c9474e", text: "#ffffff" },
    Palmeiras: { color: "#168249", text: "#ffffff" },
    Corinthians: { color: "#61736d", text: "#ffffff" },
    Botafogo: { color: "#55726c", text: "#ffffff" },
    Santos: { color: "#5d7c73", text: "#ffffff" },
    Cruzeiro: { color: "#2864b2", text: "#ffffff" },
    Grêmio: { color: "#318fc0", text: "#ffffff" },
    Bahia: { color: "#3565b3", text: "#ffffff" },
  };
  const accent = safeAccentByClub[teamName] ?? { color: theme.primary, text: theme.text };
  const style = {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-text": theme.text,
    "--team-accent": accent.color,
    "--team-accent-text": accent.text,
  } as CSSProperties;
  return (
    <div style={style} className="min-h-screen bg-[#f7f7f2] bg-[linear-gradient(rgba(247,247,242,.91),rgba(247,247,242,.95)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-fixed font-[Arial] text-[12px] text-[#243229]">
      {!hideNav && <TopNav items={nav} date={date} />}
      <main>{children}</main>
    </div>
  );
}
