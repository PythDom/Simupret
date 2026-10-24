import { GRID_DURATIONS_YEARS, quotite, quotiteTier, type OptimizerConfiguration, type Tranche } from '../engine';
import { newId } from './ids';
import type { BankProfile, Scenario, Settings } from './types';

/** Tranche par défaut : plus longue durée de la grille de la banque ne dépassant pas la durée maximale. */
export function defaultTranche(settings: Settings, bank: BankProfile, amount: number): Tranche {
  const grid = bank.rateGrid[quotiteTier(quotite(settings.amount, settings.propertyValue))];
  const years =
    [...GRID_DURATIONS_YEARS].reverse().find((y) => y * 12 <= settings.maxDurationMonths && grid[y] !== null) ?? 20;
  return {
    id: newId('tr'),
    label: `Tranche ${years} ans`,
    amount,
    durationMonths: years * 12,
    annualRate: grid[years] ?? 0.0367,
    startMonth: 1,
    amortization: 'annuity',
  };
}

/**
 * Taux de la grille d'une banque pour une durée : durée de la grille la plus
 * proche (à égalité, la plus longue). `null` si la banque ne propose aucune durée.
 */
export function gridRateFor(settings: Settings, bank: BankProfile, durationMonths: number): number | null {
  const grid = bank.rateGrid[quotiteTier(quotite(settings.amount, settings.propertyValue))];
  let best: { diff: number; rate: number } | null = null;
  for (const y of GRID_DURATIONS_YEARS) {
    const rate = grid[y];
    if (rate === null) continue;
    const diff = Math.abs(y * 12 - durationMonths);
    if (!best || diff <= best.diff) best = { diff, rate };
  }
  return best?.rate ?? null;
}

/** Applique les taux d'une banque aux tranches (les tranches à 0 % sont conservées). */
export function applyBankRates(tranches: readonly Tranche[], settings: Settings, bank: BankProfile): Tranche[] {
  return tranches.map((t) => {
    if (t.annualRate === 0) return t;
    const rate = gridRateFor(settings, bank, t.durationMonths);
    return rate === null ? t : { ...t, annualRate: rate };
  });
}

/** Tranche à 0 % pour travaux économiseurs d'énergie (type Rénopack SWCS) : valeurs à adapter. */
export function zeroRateTranche(): Tranche {
  return {
    id: newId('tr'),
    label: 'Prêt à 0 % (type Rénopack)',
    amount: 30_000,
    durationMonths: 120,
    annualRate: 0,
    startMonth: 1,
    amortization: 'annuity',
    reduction: 0,
  };
}

export function newScenario(settings: Settings, bank: BankProfile, index: number): Scenario {
  return {
    id: newId('sc'),
    name: `Scénario ${index}`,
    tranches: [defaultTranche(settings, bank, settings.amount)],
    prepayments: [],
    refinancing: null,
    bankId: bank.id,
    updatedAt: new Date().toISOString(),
  };
}

export function configurationToScenario(c: OptimizerConfiguration, name: string, bankId: string): Scenario {
  const idMap = new Map<string, string>();
  const tranches = c.tranches.map((t) => {
    const id = newId('tr');
    idMap.set(t.id, id);
    return { ...t, id };
  });
  const prepayments = c.prepayments.map((p) => ({
    ...structuredCopy(p),
    ...(p.trancheId ? { trancheId: idMap.get(p.trancheId) } : {}),
  }));
  return { id: newId('sc'), name, tranches, prepayments, refinancing: null, bankId, updatedAt: new Date().toISOString() };
}

function structuredCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
