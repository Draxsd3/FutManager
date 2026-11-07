"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Crest } from "@/components/ui/club-sidebar";
import type { EditorClub, EditorDatabase } from "@/lib/game/editor-data";
import type { ManagerMarket } from "@/lib/game/manager-market";
import profiles from "@/data/transfermarkt/coach-profiles-novembro.json";
import styles from "./coaches-screen.module.css";

type CoachProfile = { id: string; name: string; since: string | null; dateOfBirth: string | null; placeOfBirth: { city: string | null; country: string | null } | null; citizenship: string[]; license: string | null };
const sourceProfiles: Record<string, CoachProfile> = profiles;
const countries: Record<string, string> = { Brazil: "Brasil", Portugal: "Portugal", Argentina: "Argentina", Uruguay: "Uruguai", Spain: "Espanha", Italy: "Itália", Germany: "Alemanha", France: "França", Chile: "Chile", Paraguay: "Paraguai", Colombia: "Colômbia", Ecuador: "Equador", Venezuela: "Venezuela" };
const countryName = (name: string) => countries[name] ?? name;
const dateLabel = (date?: string | null) => date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split("-").reverse().join("/") : "Não informado";
const normalize = (value: string) => value.trim().toLocaleLowerCase("pt-BR");
const searchText = (value: string) => normalize(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** The bundle is a dated club/coach observation, not a global name directory. */
export function sourceCoachProfile(team: EditorClub, name: string, isHuman: boolean): CoachProfile | undefined {
  if (isHuman || !team.transfermarkt?.id) return undefined;
  const profile = sourceProfiles[team.transfermarkt.id];
  return profile && normalize(profile.name) === normalize(name) ? profile : undefined;
}

export function CoachesScreen({ database, club, coach, managerMarket, date }: { database: EditorDatabase; club: string; coach: string; managerMarket?: ManagerMarket; date?: string }) {
  const [query, setQuery] = useState("");
  const [division, setDivision] = useState("");
  const [selected, setSelected] = useState("");
  const all = useMemo(() => database.clubs.flatMap(team => {
    const isHuman = team.name === club;
    const simulated = managerMarket?.clubs[team.id];
    const name = isHuman ? coach : simulated ? simulated.coach : team.coachName;
    return name?.trim() ? [{ team, name: name.trim(), isHuman, simulated }] : [];
  }).sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || a.team.name.localeCompare(b.team.name, "pt-BR")), [database.clubs, club, coach, managerMarket]);
  const divisions = [...new Set(all.map(item => item.team.division))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const term = searchText(query);
  const filtered = all.filter(item => (!division || item.team.division === division) && (!term || searchText(`${item.name} ${item.team.name}`).includes(term)));
  const active = filtered.find(item => item.team.id === selected) ?? filtered[0];
  const profile = active && !(active.simulated?.vacancyVersion) ? sourceCoachProfile(active.team, active.name, active.isHuman) : undefined;
  const history = active?.simulated && active.simulated.coach === active.name ? active.simulated.history : undefined;
  const games = history?.filter(result => result.clubId === active?.team.id && [0, 1, 3].includes(result.points)) ?? [];
  const wins = games.filter(result => result.points === 3).length;
  const draws = games.filter(result => result.points === 1).length;
  const defeats = games.filter(result => result.points === 0).length;
  const birth = profile?.dateOfBirth;
  const age = birth && date && /^\d{4}-\d{2}-\d{2}$/.test(birth) && /^\d{4}-\d{2}-\d{2}$/.test(date) && birth <= date
    ? Number(date.slice(0, 4)) - Number(birth.slice(0, 4)) - Number(date.slice(5) < birth.slice(5)) : null;
  const squadCount = active ? database.players.filter(player => player.clubId === active.team.id).length : 0;
  // A visual game-only reference based solely on club level. It is not a wage, contract, market price or actionable transfer fee.
  const reference = active && Number.isFinite(active.team.level) && active.team.level > 0 ? Math.round(active.team.level * 100_000) : null;

  return <section className={styles.screen} aria-label="Diretório de técnicos">
    <header className={styles.hero}><div><span className={styles.kicker}>GESTÃO DO FUTEBOL</span><h2>Diretório de técnicos</h2><p>Conheça os treinadores do seu universo e acompanhe seus clubes.</p></div><div className={styles.total}><small>NO UNIVERSO</small><strong>{all.length}</strong><span>treinadores</span></div><Image src="/icons/navigation/tecnicos.webp" width={100} height={100} alt="" className={styles.heroIcon} unoptimized /></header>
    <div className={styles.filters}><label><span>Buscar técnico ou clube</span><input type="search" aria-label="Buscar técnico" placeholder="Nome do técnico ou clube..." value={query} onChange={event => setQuery(event.target.value)} /></label><label><span>Divisão</span><select aria-label="Filtrar divisão dos técnicos" value={division} onChange={event => setDivision(event.target.value)}><option value="">Todas as divisões</option>{divisions.map(item => <option key={item} value={item}>{item}</option>)}</select></label><div className={styles.resultCount}><b>{filtered.length}</b> encontrado{filtered.length === 1 ? "" : "s"}</div></div>
    <div className={styles.content}><div className={styles.listPanel}><div className={styles.heading}><div><span className={styles.kicker}>TREINADORES</span><h3>Escolha um técnico</h3></div><span>{filtered.length}</span></div><div className={styles.list} role="region" aria-label="Lista de técnicos" tabIndex={0}>{filtered.length ? filtered.map(item => <button type="button" key={item.team.id} className={styles.coach} aria-pressed={active?.team.id === item.team.id} onClick={() => setSelected(item.team.id)}><span className={styles.crest}><Crest club={item.team.name} size="sm" /></span><span className={styles.coachName}><b>{item.name}</b><small>{item.team.name} · {item.team.division}</small></span><span className={styles.arrow} aria-hidden="true">→</span></button>) : <p className={styles.empty}>Nenhum técnico encontrado. Experimente outra busca ou divisão.</p>}</div></div>
      <article className={styles.profile} aria-label="Perfil do técnico">{active ? <>
        <div className={styles.profileHero}><div className={styles.profileCrest}><Crest club={active.team.name} size="sm" /></div><div><span className={styles.kicker}>{active.isHuman ? "SEU TREINADOR" : "PERFIL DO TREINADOR"}</span><h3>{active.name}</h3><p>{active.team.name} <span>·</span> {active.team.division}</p></div></div>
        <div className={styles.reference}><div><span>VALOR DE REFERÊNCIA <b>SIMULADO</b></span><strong>{reference === null ? "Indisponível" : `R$ ${reference.toLocaleString("pt-BR")}`}</strong></div><p>Estimativa visual baseada no nível do clube: R$ 100 mil por nível. Não é salário, preço real ou taxa de contratação.</p></div>
        <div className={styles.sectionTitle}><div><span className={styles.kicker}>INFORMAÇÕES</span><h4>Perfil e vínculo</h4></div></div>
        <div className={styles.details}><Detail label="Nacionalidade" value={profile?.citizenship.length ? profile.citizenship.map(countryName).join(" / ") : "Não informada"}/><Detail label="Nascimento" value={dateLabel(profile?.dateOfBirth)}/><Detail label="Idade na carreira" value={age === null ? "Não informada" : `${age} anos`}/><Detail label="Naturalidade" value={profile?.placeOfBirth ? [profile.placeOfBirth.city, profile.placeOfBirth.country ? countryName(profile.placeOfBirth.country) : null].filter(Boolean).join(", ") || "Não informada" : "Não informada"}/><Detail label="Licença" value={profile?.license ?? "Não informada"}/><Detail label="Clube" value={active.team.name}/><Detail label="País do clube" value={active.team.country || "Não informado"}/><Detail label="Nível do clube" value={Number.isFinite(active.team.level) ? String(active.team.level) : "Não informado"}/><Detail label="Atletas cadastrados" value={String(squadCount)}/><Detail label="Salário e contrato" value="Não informados"/></div>
        {profile && <p className={styles.source}>Dados biográficos da coleta Transfermarkt de 04/11/2026. Vínculo registrado na fonte {profile.since ? `desde ${dateLabel(profile.since)}` : "sem data de início"}; é uma referência da coleta, não uma afirmação sobre a data simulada da carreira.</p>}
        <div className={styles.sectionTitle}><div><span className={styles.kicker}>DADOS DA CARREIRA</span><h4>Desempenho no clube</h4></div></div>
        {games.length ? <><div className={styles.results}><Metric label="JOGOS" value={games.length}/><Metric label="VITÓRIAS" value={wins}/><Metric label="EMPATES" value={draws}/><Metric label="DERROTAS" value={defeats}/><Metric label="APROVEITAMENTO" value={`${Math.round((wins * 3 + draws) / (games.length * 3) * 100)}%`}/></div><p className={styles.source}>Resultados registrados nesta carreira para o vínculo atual; não representam o histórico real completo.</p></> : <p className={styles.noResults}>Ainda não há partidas registradas para este vínculo nesta carreira.</p>}
      </> : <div className={styles.empty}>Nenhum perfil para mostrar. Ajuste os filtros para encontrar um treinador.</div>}</article></div>
  </section>;
}
function Detail({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function Metric({ label, value }: { label: string; value: string | number }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
