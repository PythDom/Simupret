import type { PenaltyAllowance, PenaltyConfig } from './types';

/** Défaut belge : 3 mois d'intérêts, sans franchise. */
export const DEFAULT_PENALTY: PenaltyConfig = {
  monthsOfInterest: 3,
  allowance: { kind: 'none' },
};

/**
 * Taux de l'indemnité appliqué au capital remboursé : n mois d'intérêts
 * composés au taux mensuel de la tranche, (1 + r_m)^n − 1.
 */
export function penaltyRate(monthlyRate: number, config: PenaltyConfig): number {
  return Math.pow(1 + monthlyRate, config.monthsOfInterest) - 1;
}

/** Franchise annuelle (€) d'une tranche dont le capital initial est `initialAmount`. */
export function yearlyAllowance(allowance: PenaltyAllowance, initialAmount: number): number {
  switch (allowance.kind) {
    case 'none':
      return 0;
    case 'percentOfInitial':
      return Math.max(0, allowance.fraction) * initialAmount;
    case 'fixed':
      return Math.max(0, allowance.amount);
  }
}

/** Indemnité due sur `amount` remboursé, compte tenu de la franchise encore disponible. */
export function penaltyFor(amount: number, rate: number, allowanceLeft: number): number {
  return Math.max(0, amount - Math.max(0, allowanceLeft)) * rate;
}

/**
 * Capital maximal remboursable avec une enveloppe `cash` qui doit couvrir le
 * capital ET l'indemnité : x + max(0, x − a)·p = cash.
 */
export function principalFromCash(cash: number, rate: number, allowanceLeft: number): number {
  const a = Math.max(0, allowanceLeft);
  if (cash <= a) return cash;
  return a + (cash - a) / (1 + rate);
}
