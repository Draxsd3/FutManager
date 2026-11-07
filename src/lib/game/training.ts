import { playerEligible } from "./simulation/players";
import type { Player } from "./mock-data";

export const TRAINING_DAYS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"] as const;
export type TrainingDay = (typeof TRAINING_DAYS)[number];
export type TrainingIntensity = "Leve" | "Moderada" | "Intensa";
export type TrainingCategory = "Técnico" | "Tático" | "Físico" | "Recuperação";

export const TRAINING_DRILLS = [
  { id: "finalizacao", name: "Finalização", category: "Técnico", description: "Precisão, movimentação e conclusão de jogadas." },
  { id: "passe", name: "Passe e posse", category: "Técnico", description: "Qualidade do passe, apoio e circulação da bola." },
  { id: "marcacao", name: "Marcação", category: "Tático", description: "Compactação, cobertura e pressão coordenada." },
  { id: "posicionamento", name: "Posicionamento", category: "Tático", description: "Leitura de espaços e organização entre setores." },
  { id: "resistencia", name: "Resistência", category: "Físico", description: "Condicionamento com carga física controlada." },
  { id: "recuperacao", name: "Recuperação ativa", category: "Recuperação", description: "Mobilidade, soltura muscular e recuperação de energia." },
] as const satisfies readonly { id: string; name: string; category: TrainingCategory; description: string }[];
export type TrainingDrillId = (typeof TRAINING_DRILLS)[number]["id"];

export type TrainingSessionInput = {
  season: number;
  week: number;
  day: TrainingDay;
  drill: TrainingDrillId;
  intensity: TrainingIntensity;
  playerIds: number[];
};

export type TrainingSessionRecord = TrainingSessionInput & {
  id: string;
  energySpent: number;
  energyRecovered: number;
  overallImprovements: number;
};

export type TrainingResult = {
  squad: Player[];
  record: TrainingSessionRecord | null;
  error?: string;
};

export function sessionEnergyDelta(drill: TrainingDrillId, intensity: TrainingIntensity) {
  const intensityIndex = intensity === "Leve" ? 0 : intensity === "Moderada" ? 1 : 2;
  if (drill === "recuperacao") return [-6, -10, -14][intensityIndex];
  const category = TRAINING_DRILLS.find((item) => item.id === drill)?.category;
  if (category === "Físico") return [2, 3, 5][intensityIndex];
  if (category === "Tático") return [1, 2, 3][intensityIndex];
  return [1, 2, 4][intensityIndex];
}

export function canJoinTraining(player: Player, drill: TrainingDrillId, intensity: TrainingIntensity) {
  if(!playerEligible(player)) return false;
  if (drill === "recuperacao") return player.energy < 99;
  return player.energy >= (intensity === "Intensa" ? 25 : 15);
}

export function applyTrainingSession(
  squad: Player[],
  input: TrainingSessionInput,
  random: () => number = Math.random,
): TrainingResult {
  const drill = TRAINING_DRILLS.find((item) => item.id === input.drill);
  if (!drill) return { squad, record: null, error: "Escolha um treino válido." };

  const uniqueIds = [...new Set(input.playerIds)];
  const participants = squad.filter((player) => uniqueIds.includes(player.id) && canJoinTraining(player, input.drill, input.intensity));
  if (participants.length === 0) {
    return { squad, record: null, error: input.drill === "recuperacao" ? "Selecione atletas que precisem recuperar energia." : "Os atletas selecionados precisam de mais energia para treinar." };
  }

  const energyChange = sessionEnergyDelta(input.drill, input.intensity);
  let overallImprovements = 0;
  const participantIds = new Set(participants.map((player) => player.id));
  const nextSquad = squad.map((player) => {
    if (!participantIds.has(player.id)) return player;
    if (input.drill === "recuperacao") {
      return { ...player, energy: Math.min(100, player.energy - energyChange) };
    }
    const intensityBonus = input.intensity === "Intensa" ? 0.07 : input.intensity === "Moderada" ? 0.04 : 0.02;
    const ageBonus = player.age <= 22 ? 0.025 : player.age >= 30 ? -0.015 : 0;
    const improve = player.overall < 99 && random() < Math.max(0.01, intensityBonus + ageBonus);
    if (improve) overallImprovements += 1;
    return { ...player, energy: Math.max(0, player.energy - energyChange), overall: player.overall + (improve ? 1 : 0) };
  });

  const energySpent = energyChange > 0 ? energyChange * participants.length : 0;
  const energyRecovered = energyChange < 0 ? -energyChange * participants.length : 0;
  return {
    squad: nextSquad,
    record: {
      ...input,
      id: crypto.randomUUID(),
      playerIds: participants.map((player) => player.id),
      energySpent,
      energyRecovered,
      overallImprovements,
    },
  };
}

export function trainingWeekSessions(records: TrainingSessionRecord[], season: number, week: number) {
  return records.filter((record) => record.season === season && record.week === week);
}

export function trainingDrillLabel(drill: TrainingDrillId) {
  return TRAINING_DRILLS.find((item) => item.id === drill)?.name ?? "Treino";
}
