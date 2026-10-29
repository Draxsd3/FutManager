import type { CSSProperties } from "react";
import { clubThemes } from "@/lib/game/mock-data";
import { TopNav, type NavItem } from "./top-nav";

export function AppShell({
  nav,
  teamName,
  clubColors,
  date,
  hideNav = false,
  children,
}: {
  nav: NavItem[];
  teamName: string;
  clubColors?: { primaryColor: string; secondaryColor: string };
  date: string;
  hideNav?: boolean;
  children: React.ReactNode;
}) {
  const fallback = clubThemes[teamName] ?? clubThemes.Palmeiras;
  const primary = clubColors?.primaryColor ?? fallback.primary;
  const rgb = [1, 3, 5].map((offset) => parseInt(primary.slice(offset, offset + 2), 16));
  const theme = { ...fallback, primary, secondary: clubColors?.secondaryColor ?? fallback.secondary,
    text: rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114 > 145 ? "#111111" : "#ffffff" };
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
    <div style={style} className="flex h-dvh flex-col overflow-hidden bg-[#f7f7f2] bg-[linear-gradient(rgba(247,247,242,.91),rgba(247,247,242,.95)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-fixed font-[Arial] text-[12px] text-[#243229]">
      {!hideNav && <TopNav items={nav} date={date} />}
      <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
