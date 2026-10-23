/**
 * Grille de taux par durée et par tranche de quotité (montant emprunté /
 * valeur du bien). Valeurs par défaut indicatives (octobre 2026).
 */

export type QuotiteTier = 'upTo80' | 'from80To90' | 'above90';

export const QUOTITE_TIERS: readonly QuotiteTier[] = ['upTo80', 'from80To90', 'above90'];

export const QUOTITE_TIER_LABELS: Record<QuotiteTier, string> = {
  upTo80: '≤ 80 %',
  from80To90: '80–90 %',
  above90: '> 90 %',
};

/** Durées de la grille, en années. */
export const GRID_DURATIONS_YEARS = [10, 15, 20, 25] as const;
export type GridDurationYears = (typeof GRID_DURATIONS_YEARS)[number];

/**
 * Taux annuel (fraction) par quotité et par durée. `null` : durée non
 * proposée pour cette quotité.
 */
export type RateGrid = Record<QuotiteTier, Record<GridDurationYears, number | null>>;

/**
 * Valeurs indicatives d'octobre 2026. Les taux 10/15/20 ans pour une
 * quotité ≤ 90 % sont ceux du cahier des charges ; les taux 25 ans et
 * > 90 % sont des estimations à adapter.
 */
export const DEFAULT_RATE_GRID: RateGrid = {
  upTo80: { 10: 0.034, 15: 0.0355, 20: 0.0367, 25: 0.038 },
  from80To90: { 10: 0.034, 15: 0.0355, 20: 0.0367, 25: 0.038 },
  above90: { 10: 0.036, 15: 0.0375, 20: 0.0387, 25: 0.04 },
};

/** Quotité : montant emprunté / valeur du bien. */
export function quotite(amount: number, propertyValue: number): number {
  return amount / propertyValue;
}

export function quotiteTier(q: number): QuotiteTier {
  if (q <= 0.8 + 1e-12) return 'upTo80';
  if (q <= 0.9 + 1e-12) return 'from80To90';
  return 'above90';
}
