import { GRID_DURATIONS_YEARS, quotite, quotiteTier, type OptimizerConfiguration, type Tranche } from '../engine';
import { newId } from './ids';
import type { Scenario, Settings } from './types';

/** Taux de la grille pour la durée la plus proche de la durée maximale. */
export function defaultTranche(settings: Settings, amount: number): Tranche {
  const tier = quotiteTier(quotite(settings.amount, settings.propertyValue));
  const years =
    [...GRID_DURATIONS_YEARS].reverse().find((y) => y * 12 <= settings.maxDurationMonths && settings.rateGrid[tier][y] !== null) ??
    20;
  return {
    id: newId('tr'),
    label: `Tranche ${years} ans`,
    amount,
    durationMonths: years * 12,
    annualRate: settings.rateGrid[tier][years] ?? 0.0367,
    startMonth: 1,
    amortization: 'annuity',
  };
}

export function newScenario(settings: Settings, index: number): Scenario {
  return {
    id: newId('sc'),
    name: `Scénario ${index}`,
    tranches: [defaultTranche(settings, settings.amount)],
    prepayments: [],
    refinancing: null,
    updatedAt: new Date().toISOString(),
  };
}

export function configurationToScenario(c: OptimizerConfiguration, name: string): Scenario {
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
  return { id: newId('sc'), name, tranches, prepayments, refinancing: null, updatedAt: new Date().toISOString() };
}

function structuredCopy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}
