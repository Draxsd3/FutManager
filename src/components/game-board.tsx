"use client";
/* eslint-disable react/no-unescaped-entities, react-hooks/rules-of-hooks */

import { useMemo, useState, type CSSProperties } from "react";

type Page = "new" | "hub" | "lineup" | "match" | "pause" | "result" | "table";
type Player = {
  id: number;
  name: string;
  shirt: number;
  positions: string;
  rating: number;
  energy: number;
};

const clubs = {
  "Série A": ["Flamengo", "Palmeiras", "Corinthians", "Botafogo"],
  "Série B": ["Santos", "Cruzeiro", "Grêmio", "Bahia"],
};
const clubThemes: Record<
  string,
  { primary: string; secondary: string; text: string; short: string }
> = {
  Flamengo: {
    primary: "#c91520",
    secondary: "#161616",
    text: "#ffffff",
    short: "CRF",
  },
  Palmeiras: {
    primary: "#08783e",
    secondary: "#ffffff",
    text: "#ffffff",
    short: "SEP",
  },
  Corinthians: {
    primary: "#ece8df",
    secondary: "#111111",
    text: "#111111",
    short: "SCCP",
  },
  Botafogo: {
    primary: "#191919",
    secondary: "#f4f4f4",
    text: "#ffffff",
    short: "BFR",
  },
  Santos: {
    primary: "#f3f3ed",
    secondary: "#171717",
    text: "#111111",
    short: "SFC",
  },
  Cruzeiro: {
    primary: "#17499b",
    secondary: "#ffffff",
    text: "#ffffff",
    short: "CEC",
  },
  Grêmio: {
    primary: "#26a9e0",
    secondary: "#111111",
    text: "#ffffff",
    short: "FBPA",
  },
  Bahia: {
    primary: "#1d4e9e",
    secondary: "#d6232a",
    text: "#ffffff",
    short: "ECB",
  },
};
const team: Player[] = [
  ["Rossi", 1, "GOL", 78],
  ["Wesley", 43, "LD / ALA", 75],
  ["Léo Ortiz", 3, "ZAG / VOL", 81],
  ["Léo Pereira", 4, "ZAG / LE", 79],
  ["Ayrton Lucas", 6, "LE / ALA", 77],
  ["Pulgar", 5, "VOL / MC", 80],
  ["De la Cruz", 18, "MC / MEI", 82],
  ["Arrascaeta", 14, "MEI / MC", 84],
  ["Luiz Araújo", 7, "PD / PE", 79],
  ["Pedro", 9, "ATA / SA", 83],
  ["Bruno Henrique", 27, "PE / ATA", 80],
  ["Matheus Cunha", 25, "GOL", 73],
  ["Varela", 2, "LD / ALA", 74],
  ["Danilo", 13, "ZAG / LD", 78],
  ["Gerson", 8, "MC / MEI", 82],
  ["Plata", 45, "PE / PD", 77],
].map(([name, shirt, positions, rating], id) => ({
  id,
  name: String(name),
  shirt: Number(shirt),
  positions: String(positions),
  rating: Number(rating),
  energy: 100,
}));

export function GameBoard() {
  const [page, setPage] = useState<Page>("new");
  const [coach, setCoach] = useState("");
  const [division, setDivision] = useState<keyof typeof clubs>("Série A");
  const [club, setClub] = useState(clubs["Série A"][0]);
  const [formation, setFormation] = useState("4-3-3");
  const [starters, setStarters] = useState(
    team.slice(0, 11).map((player) => player.id),
  );
  const [minute, setMinute] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [events, setEvents] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<number | null>(null);
  const [substitutions, setSubstitutions] = useState(5);
  const opponent = clubs[division].find((name) => name !== club) ?? "Palmeiras";
  const startersData = team.filter((player) => starters.includes(player.id));
  const bench = team.filter((player) => !starters.includes(player.id));
  const strength = Math.round(
    startersData.reduce(
      (sum, player) => sum + player.rating * (player.energy / 100),
      0,
    ) / startersData.length,
  );
  const table = useMemo(
    () =>
      clubs[division]
        .map((name, index) => ({
          name,
          pts:
            name === club
              ? page === "result"
                ? homeScore > awayScore
                  ? 3
                  : homeScore === awayScore
                    ? 1
                    : 0
                : 0
              : index === 1
                ? 3
                : 0,
          gp: page === "result" ? 1 : 0,
        }))
        .sort((a, b) => b.pts - a.pts || a.name.localeCompare(b.name)),
    [awayScore, club, division, homeScore, page],
  );
  function beginCareer() {
    if (coach.trim()) setPage("hub");
  }
  function swap(id: number) {
    if (selectedPlayer === null) return setSelectedPlayer(id);
    if (starters.includes(selectedPlayer) === starters.includes(id))
      return setSelectedPlayer(id);
    setStarters((current) =>
      current.map((player) =>
        player === selectedPlayer
          ? id
          : player === id
            ? selectedPlayer
            : player,
      ),
    );
    setSelectedPlayer(null);
  }
  function advanceMatch() {
    const next = Math.min(90, minute + 15);
    const chance = (strength - 70) / 35;
    const homeGoal = Math.random() + chance > 0.92;
    const awayGoal = Math.random() > 0.92 + chance / 3;
    const story = homeGoal
      ? `${next}' GOL de ${startersData[9]?.name ?? "seu atacante"}!`
      : awayGoal
        ? `${next}' ${opponent} marca em contra-ataque.`
        : `${next}' jogo disputado no meio-campo.`;
    setMinute(next);
    if (homeGoal) setHomeScore((score) => score + 1);
    if (awayGoal) setAwayScore((score) => score + 1);
    setEvents((current) => [...current, story]);
    if (next === 90) setPage("result");
  }
  function makeSubstitution(id: number) {
    if (
      selectedPlayer === null ||
      substitutions === 0 ||
      !starters.includes(selectedPlayer)
    )
      return;
    setStarters((current) =>
      current.map((player) => (player === selectedPlayer ? id : player)),
    );
    setSubstitutions((value) => value - 1);
    setSelectedPlayer(null);
    setEvents((current) => [...current, `${minute}' substituição realizada.`]);
  }
  const useSub = makeSubstitution;
  const theme = clubThemes[club] ?? clubThemes.Palmeiras;
  const teamStyle = {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-text": theme.text,
  } as CSSProperties;
  const nav: Array<[string, string, () => void]> = [
    ["▦", "Agenda", () => setPage("hub")],
    ["▤", "Tabelas", () => setPage("table")],
    ["⌂", "Estádio", () => setPage("hub")],
    ["♟", "Juniores", () => setPage("hub")],
    ["♜", "Times", () => setPage("hub")],
    ["⌕", "Procura", () => setPage("hub")],
    ["♙", "Técnicos", () => setPage("hub")],
    ["◴", "História", () => setPage("hub")],
    ["⚙", "Opções", () => setPage("hub")],
  ];

  if (page === "new")
    return (
      <div className="min-h-screen bg-[#072a38] bg-[url('/stadium-bg.png')] bg-cover bg-center p-4 font-[Arial] text-white">
        <section className="mx-auto mt-1 min-h-[720px] max-w-[700px] bg-[#061f2a] px-28 py-8 shadow-2xl">
          <h1 className="text-center text-2xl font-black text-[#f4eb39]">
            FUTMANAGER
          </h1>
          <h2 className="mt-1 text-center text-lg font-bold">
            Adicionar técnico humano
          </h2>
          <div className="mt-10 space-y-5 text-sm">
            <Field label="Treinar time do país" value="🇧🇷 Brasil" disabled />
            <label className="block text-sm font-bold">
              1ª divisão
              <select
                value={division}
                onChange={(e) => {
                  const next = e.target.value as keyof typeof clubs;
                  setDivision(next);
                  setClub(clubs[next][0]);
                }}
                className="mt-1 block w-full bg-white p-2 text-black"
              >
                {Object.keys(clubs).map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-bold">
              Clube selecionado
              <select
                value={club}
                onChange={(e) => setClub(e.target.value)}
                className="mt-1 block w-full bg-white p-2 text-black"
              >
                {clubs[division].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block border-t border-cyan-100/70 pt-5 text-sm font-bold">
              Nome do técnico
              <input
                value={coach}
                onChange={(e) => setCoach(e.target.value)}
                className="mt-1 block w-full bg-white p-2 text-black"
                placeholder="Seu nome"
              />
            </label>
            <p className="border-y border-cyan-100/30 py-4 text-center text-sm">
              Time selecionado:{" "}
              <strong className="text-[#f4eb39]">{club}</strong>
            </p>
            <div className="grid grid-cols-2 gap-5 border-t border-cyan-100/70 pt-6">
              <button className="bg-gradient-to-b from-white to-slate-300 py-3 font-bold text-[#062332]">
                Adicionar e incluir outro
              </button>
              <button
                disabled={!coach.trim()}
                onClick={beginCareer}
                className="bg-gradient-to-b from-white to-slate-300 py-3 font-black text-[#062332] disabled:opacity-40"
              >
                Iniciar jogo &gt;&gt;
              </button>
            </div>
          </div>
        </section>
      </div>
    );

  if (page === "lineup")
    return (
      <AppShell nav={nav} teamName={club}>
        <div className="grid lg:grid-cols-[320px_1fr]">
          <Side
            club={club}
            coach={coach}
            opponent={opponent}
            onGame={() => setPage("match")}
          />
          <section className="border-2 border-[var(--team-secondary)] bg-[#90a08e]">
            <h2 className="bg-[var(--team-secondary)] px-3 py-1 text-sm font-bold text-white">
              ESCALAR TIME · {formation}
            </h2>
            <div className="grid grid-cols-3 gap-4 bg-[linear-gradient(#316f2e,#1d5524)] p-5 text-center">
              {startersData.map((player) => (
                <button
                  key={player.id}
                  onClick={() => swap(player.id)}
                  className={
                    selectedPlayer === player.id ? "ring-2 ring-yellow-300" : ""
                  }
                >
                  <Shirt player={player} />
                </button>
              ))}
            </div>
            <div className="bg-[#536451] p-3">
              <p className="text-sm font-bold">
                Jogadores disponíveis — clique em um titular e depois em um
                reserva para trocar
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                {bench.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => swap(player.id)}
                    className={
                      selectedPlayer === player.id
                        ? "ring-2 ring-yellow-300"
                        : ""
                    }
                  >
                    <Shirt player={player} />
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-2 bg-[#c8d1c5] p-3 text-black sm:grid-cols-4">
              <label>
                Formação
                <select
                  value={formation}
                  onChange={(e) => setFormation(e.target.value)}
                  className="block w-full border p-1"
                >
                  <option>4-3-3</option>
                  <option>4-4-2</option>
                  <option>3-5-2</option>
                  <option>Personalizada</option>
                </select>
              </label>
              <label>
                Estilo
                <select className="block w-full border p-1">
                  <option>Equilibrado</option>
                  <option>Ofensivo</option>
                  <option>Defensivo</option>
                </select>
              </label>
              <label>
                Marcação
                <select className="block w-full border p-1">
                  <option>Normal</option>
                  <option>Pesada</option>
                  <option>Leve</option>
                </select>
              </label>
              <button
                onClick={() => setPage("match")}
                className="mt-5 bg-white font-bold shadow"
              >
                ⚽ Jogar &gt;&gt;
              </button>
            </div>
          </section>
        </div>
      </AppShell>
    );

  if (page === "match" || page === "pause")
    return (
      <div
        style={teamStyle}
        className="min-h-screen bg-[#072a38] bg-[url('/stadium-bg.png')] bg-cover bg-center p-3 font-[Arial] text-white"
      >
        <section className="mx-auto max-w-[1005px] border border-black bg-[#154a22]">
          <header className="flex items-center justify-between bg-[#174c1b] px-4 py-3">
            <b>Campeonato {division}</b>
            <b>
              {minute || 1}' ·{" "}
              {minute < 45 ? "1º tempo" : minute < 90 ? "2º tempo" : "fim"}
            </b>
          </header>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-[repeating-linear-gradient(0deg,#197126_0_5px,#19651f_5px_9px)] p-5 text-center">
            <b>{club}</b>
            <strong className="text-4xl">
              {homeScore} × {awayScore}
            </strong>
            <b>{opponent}</b>
          </div>
          <div className="grid gap-3 p-4 lg:grid-cols-[1.3fr_.7fr]">
            <div className="min-h-[640px] border-2 border-[#c4db94] bg-[repeating-linear-gradient(0deg,#347f2d_0_58px,#2a7027_58px_116px)] p-5">
              <div className="grid grid-cols-3 gap-y-9 text-center">
                {startersData.map((player) => (
                  <button
                    key={player.id}
                    onClick={() => {
                      setSelectedPlayer(player.id);
                      setPage("pause");
                    }}
                  >
                    <Shirt player={player} />
                  </button>
                ))}
              </div>
            </div>
            <aside className="border border-[#d1bf59] bg-[#203e14] p-4">
              <h2 className="font-black text-[#f4eb39]">PARTIDA</h2>
              <p className="mt-2 text-sm">
                Posse de bola: {Math.min(78, 50 + strength - 74)}% ·
                Finalizações: {Math.max(1, Math.floor(minute / 10))}
              </p>
              <div className="mt-4 min-h-52 space-y-2 border-t border-[#d1bf59] pt-3 text-sm">
                {events.length ? (
                  events.map((event) => <p key={event}>⚽ {event}</p>)
                ) : (
                  <p>Apito inicial.</p>
                )}
              </div>
              {page === "pause" ? (
                <div className="border-t border-[#d1bf59] pt-3">
                  <p className="text-sm font-bold">
                    Pausa: selecione reserva ({substitutions} trocas)
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bench.map((player) => (
                      <button key={player.id} onClick={() => useSub(player.id)}>
                        <Shirt player={player} />
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setPage("match")}
                    className="mt-3 w-full bg-white py-2 font-bold text-black"
                  >
                    Voltar ao jogo
                  </button>
                </div>
              ) : (
                <button
                  onClick={advanceMatch}
                  className="mt-4 w-full bg-white py-3 font-black text-black"
                >
                  {minute >= 90 ? "Ver resultado" : "Avançar 15 minutos"}
                </button>
              )}
            </aside>
          </div>
        </section>
      </div>
    );

  if (page === "result")
    return (
      <div className="min-h-screen bg-[#072a38] bg-[url('/stadium-bg.png')] bg-cover bg-center p-4 font-[Arial] text-white">
        <section className="mx-auto mt-2 max-w-[990px] bg-[#06405b] p-5">
          <h1 className="text-center text-xl font-black">
            RESULTADO DA RODADA
          </h1>
          <div className="mt-5 grid grid-cols-3 items-center rounded-lg bg-gradient-to-r from-[#087fbc] via-[#082234] to-[#a4151a] p-6 text-center">
            <b>{club}</b>
            <strong className="text-5xl">
              {homeScore} × {awayScore}
            </strong>
            <b>{opponent}</b>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Panel title={club}>
              {startersData.map((p) => (
                <p key={p.id}>
                  {p.positions.split(" / ")[0]} · {p.name}{" "}
                  <span className="float-right">
                    {(6 + p.rating / 30).toFixed(1)}
                  </span>
                </p>
              ))}
            </Panel>
            <Panel title="Gols e cartões">
              {events.map((e) => (
                <p key={e}>⚽ {e}</p>
              ))}
            </Panel>
            <Panel title={opponent}>
              <p>Posse: {100 - Math.min(78, 50 + strength - 74)}%</p>
              <p>Finalizações: {Math.max(2, Math.floor(minute / 12))}</p>
            </Panel>
          </div>
          <button
            onClick={() => setPage("table")}
            className="mt-6 bg-white px-5 py-3 font-black text-[#062332]"
          >
            CONTINUAR &gt;&gt;
          </button>
        </section>
      </div>
    );

  if (page === "table")
    return (
      <AppShell nav={nav} teamName={club}>
        <section className="mx-auto mt-20 max-w-[830px] border border-black bg-[#074b68] p-5 shadow-2xl">
          <h1 className="text-lg font-black">
            CLASSIFICAÇÃO · {division.toUpperCase()}
          </h1>
          <table className="mt-4 w-full border-collapse bg-[#e6e6e6] text-left text-black">
            <thead className="bg-[#09283a] text-white">
              <tr>
                <th className="p-2">#</th>
                <th>Clube</th>
                <th>PG</th>
                <th>J</th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, index) => (
                <tr
                  key={row.name}
                  className={row.name === club ? "bg-[#ebd42f]" : "border-b"}
                >
                  <td className="p-2">{index + 1}</td>
                  <td>{row.name}</td>
                  <td>{row.pts}</td>
                  <td>{row.gp}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button
            onClick={() => setPage("hub")}
            className="mt-5 bg-white px-5 py-2 font-bold text-black"
          >
            Voltar ao clube
          </button>
        </section>
      </AppShell>
    );

  return (
    <AppShell nav={nav} teamName={club}>
      <div className="grid gap-3 lg:grid-cols-[290px_1fr]">
        <Side
          club={club}
          coach={coach}
          opponent={opponent}
          onGame={() => setPage("lineup")}
        />
        <section className="overflow-auto border border-slate-400 bg-white text-black">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th>P</th>
                <th>Nome</th>
                <th>Posições</th>
                <th>FOR</th>
                <th>Energia</th>
                <th>Salário</th>
              </tr>
            </thead>
            <tbody>
              {team.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-2">{starters.includes(p.id) ? "T" : "R"}</td>
                  <td>{p.name}</td>
                  <td>{p.positions}</td>
                  <td>{p.rating}</td>
                  <td>
                    <span className="inline-block bg-emerald-500 px-2 font-bold">
                      {p.energy}%
                    </span>
                  </td>
                  <td>R$ {(55 + p.rating * 0.8).toFixed(0)} mil</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}

function AppShell({
  nav,
  teamName,
  children,
}: {
  nav: Array<[string, string, () => void]>;
  teamName: string;
  children: React.ReactNode;
}) {
  const theme = clubThemes[teamName] ?? clubThemes.Palmeiras;
  const style = {
    "--team-primary": theme.primary,
    "--team-secondary": theme.secondary,
    "--team-text": theme.text,
  } as CSSProperties;
  return (
    <div
      style={style}
      className="min-h-screen bg-[var(--team-primary)] font-[Arial] text-[12px] text-[var(--team-text)]"
    >
      <header className="flex h-[70px] items-center gap-8 bg-black px-6 py-2">
        {nav.map(([icon, label, action]) => (
          <button
            onClick={action}
            key={label}
            className="min-w-14 text-center text-xs font-bold text-white"
          >
            <span className="block text-2xl">{icon}</span>
            {label}
          </button>
        ))}
        <b className="ml-auto">22/01/2026</b>
      </header>
      <main>{children}</main>
    </div>
  );
}
function Side({
  club,
  coach,
  opponent,
  onGame,
}: {
  club: string;
  coach: string;
  opponent: string;
  onGame: () => void;
}) {
  return (
    <aside className="min-h-[calc(100vh-70px)] bg-[var(--team-primary)] p-5 text-[var(--team-text)]">
      <div className="flex items-center gap-4">
        <Crest club={club} />
        <div>
          <h1 className="text-xl font-black">{club}</h1>
          <p className="mt-1 font-bold">{coach}</p>
        </div>
      </div>
      <p className="mt-5 font-bold">💵 R$ 25 milhões</p>
      <div className="mt-5 grid grid-cols-2 gap-3 text-xs font-bold">
        <Meter title="Confiança diretoria" value="95%" />
        <Meter title="Confiança torcida" value="85%" />
      </div>
      <div className="mt-5 bg-[var(--team-secondary)] p-3 text-white">
        <b>Próximo jogo · Casa</b>
        <p className="mt-3 text-lg">{opponent}</p>
        <p className="text-sm">Campeonato · 1ª rodada</p>
      </div>
      <button
        onClick={onGame}
        className="mt-5 w-full bg-gradient-to-b from-white to-slate-300 py-3 font-black"
      >
        ⚽ Escalar time
      </button>
      <div className="mt-4 border border-current p-2 text-sm">
        <b>Jogador selecionado</b>
        <p className="mt-2">Rossi · GOL</p>
        <p>Valor: R$ 3,2M</p>
      </div>
    </aside>
  );
}
function Meter({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p>{title}</p>
      <b className="mt-1 block border border-current bg-[var(--team-secondary)] p-1 text-center text-white">
        {value}
      </b>
    </div>
  );
}
function Crest({ club }: { club: string }) {
  const theme = clubThemes[club] ?? clubThemes.Palmeiras;
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${theme.primary} 0 52%, ${theme.secondary} 52%)`,
        color: theme.text,
        clipPath: "polygon(8% 0,92% 0,100% 68%,50% 100%,0 68%)",
      }}
      className="flex h-20 w-16 items-center justify-center border-2 border-white text-[11px] font-black drop-shadow-lg"
    >
      {theme.short}
    </div>
  );
}
function Shirt({ player }: { player: Player }) {
  return (
    <span className="inline-flex w-16 flex-col items-center text-center text-[10px] font-bold">
      <i className="flex h-10 w-9 items-center justify-center rounded-t-lg border-2 border-black bg-[linear-gradient(90deg,var(--team-primary)_0_42%,var(--team-secondary)_42%_58%,var(--team-primary)_58%)] text-[var(--team-text)] not-italic">
        {player.shirt}
      </i>
      <span className="mt-1 truncate">{player.name}</span>
      <small>
        {player.positions.split(" / ")[0]} · {player.rating}
      </small>
    </span>
  );
}
function Field({
  label,
  value,
  disabled,
}: {
  label: string;
  value: string;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm font-bold">
      {label}
      <input
        value={value}
        disabled={disabled}
        className="mt-1 block w-full bg-white p-2 text-black"
      />
    </label>
  );
}
function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#083d58] p-3 text-sm">
      <h2 className="border-b border-[#f4eb39] pb-2 font-black text-[#f4eb39]">
        {title}
      </h2>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}
