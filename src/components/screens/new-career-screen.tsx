"use client";

import type { EditorClub } from "@/lib/game/editor-data";
import type { DivisionKey } from "@/lib/game/mock-data";

export function NewCareerScreen({
  coach,
  setCoach,
  division,
  setDivision,
  club,
  setClub,
  onStart,
  onBack,
  availableClubs,
}: {
  coach: string;
  setCoach: (value: string) => void;
  division: DivisionKey;
  setDivision: (value: DivisionKey) => void;
  club: string;
  setClub: (value: string) => void;
  onStart: () => void;
  onBack: () => void;
  availableClubs: EditorClub[];
}) {
  const divisionClubs = availableClubs.filter((item) => item.division === division);
  const selectedClub = availableClubs.find((item) => item.name === club);
  return (
    <div className="min-h-screen bg-[#14361b] bg-[linear-gradient(rgba(4,22,9,.65),rgba(4,22,9,.8)),url('/game-assets/backgrounds/stadium.jpg')] bg-cover bg-center p-4 font-[Arial] text-white">
      <section className="mx-auto mt-6 min-h-[680px] w-full max-w-[620px] border border-[#4d8657] bg-[#0b2812]/95 px-8 py-8 shadow-2xl sm:px-16">
        <button onClick={onBack} className="mb-4 rounded border border-[#e7c84d] bg-[#174c27] px-3 py-1 text-xs font-bold text-[#f1d457]">
          &lt; Voltar ao menu
        </button>
        <h1 className="text-center text-3xl font-black tracking-wide text-[#f1d457]">
          FUTMANAGER
        </h1>
        <h2 className="mt-2 text-center text-lg font-bold">
          Adicionar técnico humano
        </h2>

        <div className="mt-10 space-y-5 text-sm">
          <Field label="Treinar time do país" value="🇧🇷 Brasil" disabled />

          <label className="block font-bold">
            Divisão
            <select
              value={division}
              onChange={(e) => {
                const next = e.target.value as DivisionKey;
                setDivision(next);
                setClub(availableClubs.find((item) => item.division === next)?.name ?? "");
              }}
              className="mt-1 block w-full border border-black/20 bg-white p-2 text-black"
            >
              {(["Série A", "Série B"] as DivisionKey[]).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>

          <label className="block font-bold">
            Clube
            <select
              value={club}
              onChange={(e) => setClub(e.target.value)}
              className="mt-1 block w-full border border-black/20 bg-white p-2 text-black"
            >
              {divisionClubs.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="block border-t border-cyan-100/30 pt-5 font-bold">
            Nome do técnico
            <input
              value={coach}
              onChange={(e) => setCoach(e.target.value)}
              className="mt-1 block w-full border border-black/20 bg-white p-2 text-black"
              placeholder="Seu nome"
            />
          </label>

          <p className="border-y border-cyan-100/20 py-4 text-center">
            Time selecionado: <strong className="text-[var(--accent)]">{club}</strong>
            {selectedClub && <span className="mt-1 block text-xs text-white/70">{selectedClub.stadiumName} · {selectedClub.stadiumCapacity.toLocaleString("pt-BR")} lugares</span>}
          </p>

          <div className="grid grid-cols-1 gap-4 border-t border-cyan-100/30 pt-6 sm:grid-cols-2">
            <button
              disabled
              className="bg-gradient-to-b from-white to-slate-300 py-3 font-bold text-[#062332] opacity-40"
            >
              Adicionar e incluir outro
            </button>
            <button
              disabled={!coach.trim()}
              onClick={onStart}
              className="rounded border border-[#e7c84d] bg-[#e7c84d] py-3 font-black text-[#14391d] transition hover:bg-[#f1d457] disabled:opacity-40"
            >
              Iniciar jogo &gt;&gt;
            </button>
          </div>
        </div>
      </section>
    </div>
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
    <label className="block font-bold">
      {label}
      <input
        value={value}
        disabled={disabled}
        readOnly
        className="mt-1 block w-full border border-black/20 bg-white p-2 text-black"
      />
    </label>
  );
}
