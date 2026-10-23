import type { RateConvention } from './types';

/** Taux mensuel à partir d'un taux annuel selon la convention choisie. */
export function monthlyRate(annualRate: number, convention: RateConvention = 'equivalent'): number {
  return convention === 'equivalent' ? Math.pow(1 + annualRate, 1 / 12) - 1 : annualRate / 12;
}

/** Taux annuel effectif correspondant à un taux mensuel : (1 + r_m)^12 − 1. */
export function annualFromMonthly(monthly: number): number {
  return Math.pow(1 + monthly, 12) - 1;
}
