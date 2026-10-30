export type WeatherCondition = {
  id: string;
  label: string;
  weight: number;
  tempMinC: number;
  tempMaxC: number;
  rainIntensity: number;
  windMinKmh: number;
  windMaxKmh: number;
};

export type MatchRules = {
  version: number;
  durationMinutes: number;
  homeAdvantage: number;
  possessionStrengthWeight: number;
  possessionMin: number;
  possessionMax: number;
  shotBaseRate: number;
  shotAttackWeight: number;
  shotDefenseWeight: number;
  offensiveStyleShotBonus: number;
  defensiveStyleShotPenalty: number;
  passBaseAccuracy: number;
  passSkillWeight: number;
  markingWeight: number;
  heavyPressTurnoverBonus: number;
  heavyPressFoulBonus: number;
  goalBaseChance: number;
  finishingWeight: number;
  keeperWeight: number;
  motivationWeight: number;
  goalMinChance: number;
  goalMaxChance: number;
  rainPassPenalty: number;
  rainShotPenalty: number;
  windPassPenaltyPerKmh: number;
  windShotPenaltyPerKmh: number;
  heatFatiguePerDegree: number;
  baseFatiguePerMinute: number;
  heavyPressFatiguePerMinute: number;
  yellowCardBaseChanceOnFoul: number;
  heavyMarkingCardBonus: number;
  weatherOptions: WeatherCondition[];
};

export class MatchRulesError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MatchRulesError";
  }
}

const numberFields: Array<keyof Omit<MatchRules, "weatherOptions">> = [
  "version", "durationMinutes", "homeAdvantage", "possessionStrengthWeight", "possessionMin", "possessionMax",
  "shotBaseRate", "shotAttackWeight", "shotDefenseWeight", "offensiveStyleShotBonus", "defensiveStyleShotPenalty",
  "passBaseAccuracy", "passSkillWeight", "markingWeight", "heavyPressTurnoverBonus", "heavyPressFoulBonus",
  "goalBaseChance", "finishingWeight", "keeperWeight", "motivationWeight", "goalMinChance", "goalMaxChance",
  "rainPassPenalty", "rainShotPenalty", "windPassPenaltyPerKmh", "windShotPenaltyPerKmh", "heatFatiguePerDegree",
  "baseFatiguePerMinute", "heavyPressFatiguePerMinute", "yellowCardBaseChanceOnFoul", "heavyMarkingCardBonus",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function parseMatchRules(markdown: string): MatchRules {
  const match = markdown.match(/<!-- MATCH_ENGINE_JSON_START -->\s*```json\s*([\s\S]*?)```\s*<!-- MATCH_ENGINE_JSON_END -->/);
  if (!match) throw new MatchRulesError("O bloco de configuração do motor não foi encontrado no arquivo de regras.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[1]);
  } catch {
    throw new MatchRulesError("A configuração JSON do motor de partidas está inválida.");
  }
  if (!isRecord(parsed)) throw new MatchRulesError("A configuração do motor precisa ser um objeto JSON.");

  for (const field of numberFields) {
    if (typeof parsed[field] !== "number" || !Number.isFinite(parsed[field])) {
      throw new MatchRulesError(`A regra “${field}” não contém um número válido.`);
    }
  }
  if (!Array.isArray(parsed.weatherOptions) || parsed.weatherOptions.length === 0) {
    throw new MatchRulesError("A configuração precisa incluir pelo menos uma condição climática.");
  }
  const weatherOptions = parsed.weatherOptions.map((weather, index): WeatherCondition => {
    if (!isRecord(weather)
      || typeof weather.id !== "string" || typeof weather.label !== "string"
      || ["weight", "tempMinC", "tempMaxC", "rainIntensity", "windMinKmh", "windMaxKmh"]
        .some((key) => typeof weather[key] !== "number" || !Number.isFinite(weather[key]))) {
      throw new MatchRulesError(`A condição climática ${index + 1} está incompleta ou inválida.`);
    }
    const condition = weather as unknown as WeatherCondition;
    if (!condition.id.trim() || !condition.label.trim() || condition.weight <= 0
      || condition.tempMinC < -10 || condition.tempMaxC > 50 || condition.tempMinC > condition.tempMaxC
      || condition.rainIntensity < 0 || condition.rainIntensity > 1
      || condition.windMinKmh < 0 || condition.windMaxKmh > 100 || condition.windMinKmh > condition.windMaxKmh) {
      throw new MatchRulesError(`A condição climática “${condition.label}” contém valores fora dos limites.`);
    }
    return condition;
  });

  const rules = { ...parsed, weatherOptions } as unknown as MatchRules;
  const limits: Partial<Record<keyof MatchRules, [number, number]>> = {
    version: [1, 100], durationMinutes: [90, 90], homeAdvantage: [-10, 10], possessionStrengthWeight: [0, .03],
    possessionMin: [.2, .6], possessionMax: [.4, .8], shotBaseRate: [0, .4], shotAttackWeight: [0, .02], shotDefenseWeight: [0, .02],
    offensiveStyleShotBonus: [0, .2], defensiveStyleShotPenalty: [0, .2], passBaseAccuracy: [0, 1], passSkillWeight: [0, .02],
    markingWeight: [0, .02], heavyPressTurnoverBonus: [0, .5], heavyPressFoulBonus: [0, .5], goalBaseChance: [0, 1],
    finishingWeight: [0, .02], keeperWeight: [0, .02], motivationWeight: [0, .02], goalMinChance: [0, 1], goalMaxChance: [0, 1],
    rainPassPenalty: [0, .5], rainShotPenalty: [0, .5], windPassPenaltyPerKmh: [0, .05], windShotPenaltyPerKmh: [0, .05],
    heatFatiguePerDegree: [0, .02], baseFatiguePerMinute: [0, .02], heavyPressFatiguePerMinute: [0, .02],
    yellowCardBaseChanceOnFoul: [0, 1], heavyMarkingCardBonus: [0, 1],
  };
  const invalidLimit = Object.entries(limits).some(([key, [minimum, maximum]]) => {
    const value = rules[key as keyof MatchRules];
    return typeof value !== "number" || value < minimum || value > maximum;
  });
  if (invalidLimit || !Number.isInteger(rules.version) || rules.possessionMin >= rules.possessionMax || rules.goalMinChance > rules.goalMaxChance) {
    throw new MatchRulesError("Uma ou mais regras do motor estão fora dos limites aceitos.");
  }
  return rules;
}

/** Load the canonical Markdown rules without relying on browser or CDN caches. */
export async function loadMatchRules(fetcher: typeof fetch = fetch): Promise<MatchRules> {
  let response: Response;
  try {
    response = await fetcher("/game-assets/match-engine-rules.md", { cache: "no-store" });
  } catch {
    throw new MatchRulesError("Não foi possível ler as regras da partida. Verifique a conexão e tente novamente.");
  }
  if (!response.ok) throw new MatchRulesError(`Não foi possível carregar as regras da partida (HTTP ${response.status}).`);
  return parseMatchRules(await response.text());
}
