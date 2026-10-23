import type { Tranche } from '../types';

let seq = 0;

/** Construit une tranche annuité démarrant au mois 1, surchargeable. */
export function tranche(amount: number, years: number, ratePct: number, extra: Partial<Tranche> = {}): Tranche {
  seq += 1;
  return {
    id: `t${seq}`,
    amount,
    durationMonths: years * 12,
    annualRate: ratePct / 100,
    startMonth: 1,
    amortization: 'annuity',
    ...extra,
  };
}

/** Tolérance de ±1 € exigée par le cahier des charges. */
export function expectEuro(actual: number, expected: number, tolerance = 1): void {
  expect(Math.abs(actual - expected), `${actual} ≉ ${expected} (±${tolerance} €)`).toBeLessThanOrEqual(tolerance);
}
