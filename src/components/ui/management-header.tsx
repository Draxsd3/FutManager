import type { ComponentProps, ReactNode } from "react";
import { InterfaceIcon } from "./interface-icon";
import styles from "./management-surface.module.css";

export type ManagementIconName = ComponentProps<typeof InterfaceIcon>["name"];

/** Decorative sculpted badge; text, not an icon, remains the accessible label. */
export function ManagementIcon({ name }: { name: ManagementIconName }) {
  return <span className={styles.icon} aria-hidden="true" data-management-icon={name}><InterfaceIcon name={name} size={26} /></span>;
}

export function ManagementHeader({ title, eyebrow, description, icon, actions, id, level = 1 }: {
  title: string; eyebrow: string; description?: string; icon: ManagementIconName;
  actions?: ReactNode; id?: string; level?: 1 | 2;
}) {
  const Heading = level === 1 ? "h1" : "h2";
  return <header className={styles.header} data-management-header>
    <div className={styles.identity}><ManagementIcon name={icon} /><div>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <Heading id={id} className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
    </div></div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>;
}
