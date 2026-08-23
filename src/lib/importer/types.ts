export type RawRecord = { source: string; sourceUrl: string; payload: unknown; collectedAt: string };
export type NormalizedPlayer = { fullName: string; knownAs?: string; birthDate?: string; nationalityCode?: string; positionCode?: string };
export type ValidationResult<T> = { valid: T[]; errors: Array<{ record: T; message: string }> };

export interface DataCollector<TInput, TNormalized> {
  collect(input: TInput): Promise<RawRecord[]>;
  normalize(records: RawRecord[]): Promise<TNormalized[]>;
  validate(records: TNormalized[]): Promise<ValidationResult<TNormalized>>;
}
