import type { CSSProperties } from "react";
import { clubThemes } from "@/lib/game/mock-data";
import { TopNav, type NavItem } from "./top-nav";
import styles from "./app-shell.module.css";

export function AppShell({
  nav,
  teamName,
  clubColors,
  date,
  hideNav = false,
  classicNav = false,
  children,
}: {
  nav: NavItem[];
  teamName: string;
  clubColors?: { primaryColor: string; secondaryColor: string };
  date: string;
  hideNav?: boolean;
  classicNav?: boolean;
  children: React.ReactNode;
}) {
  const style = clubThemeStyle(teamName, clubColors);
  return (
    <div data-fm-game="true" style={style} className={styles.shell}>
      {!hideNav && <TopNav items={nav} date={date} classic={classicNav} />}
      <main className={styles.main}>{children}</main>
    </div>
  );
}

/** Shared with portaled career windows, which do not inherit the shell DOM styles. */
export function clubThemeStyle(teamName: string, clubColors?: { primaryColor: string; secondaryColor: string }): CSSProperties {
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
  return {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-text": theme.text,
    "--team-accent": accent.color,
    "--team-accent-text": accent.text,
  } as CSSProperties;
}
