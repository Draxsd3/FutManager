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
      {!hideNav && <TopNav items={nav} date={date} classic={classicNav} teamName={teamName} />}
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
  const accent = teamAccent(theme.primary);
  return {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-text": theme.text,
    "--team-accent": accent.color,
    "--team-accent-text": accent.text,
    "--game-accent": accent.color,
  } as CSSProperties;
}

function teamAccent(primary: string) {
  const rgb = [1, 3, 5].map((offset) => parseInt(primary.slice(offset, offset + 2), 16));
  const luminance = rgb[0] * .299 + rgb[1] * .587 + rgb[2] * .114;
  const chroma = Math.max(...rgb) - Math.min(...rgb);
  if (chroma < 34) return { color: "#c5cad4", text: "#15161b" };

  // Lift darker club colors so the crest color stays legible on a night-stadium UI.
  const lift = luminance < 88 ? .32 : luminance < 125 ? .16 : 0;
  const color = `#${rgb.map((channel) => Math.round(channel + (255 - channel) * lift).toString(16).padStart(2, "0")).join("")}`;
  const lifted = rgb.map((channel) => channel + (255 - channel) * lift);
  const contrast = lifted[0] * .299 + lifted[1] * .587 + lifted[2] * .114 > 155 ? "#15161b" : "#ffffff";
  return { color, text: contrast };
}
