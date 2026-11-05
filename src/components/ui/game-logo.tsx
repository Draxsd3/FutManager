import Image from "next/image";
import styles from "./game-logo.module.css";

/** User-supplied identity with its original transparent background. */
export function GameLogo({ variant = "symbol", className = "" }: { variant?: "symbol" | "full"; className?: string }) {
  return <span aria-hidden="true" className={`${styles.logo} ${variant === "full" ? styles.full : styles.symbol} ${className}`}>
    <Image src={variant === "full" ? "/game-assets/branding/logo-completa.png" : "/game-assets/branding/logo-simbolo.png"} alt="" width={variant === "full" ? 955 : 977} height={variant === "full" ? 537 : 482} unoptimized />
  </span>;
}
