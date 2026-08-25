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
    <div style={style} className="min-h-screen bg-[#071a0d] bg-[linear-gradient(rgba(4,20,9,.88),rgba(4,20,9,.92)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-fixed font-[Arial] text-[12px] text-[#eff7ef]">
      <TopNav items={nav} date={date} />
      <main>{children}</main>
    </div>
  );
}
