import { DEFAULT_COSTS, DEFAULT_PENALTY, DEFAULT_RATE_GRID, OPTIMIZER_DEFAULTS, type Tranche } from '../engine';
import type { AppState, Scenario, Settings } from './types';

/** Premier jour du mois suivant `now`, au format ISO. */
export function nextMonthIso(now: Date = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function defaultSettings(now?: Date): Settings {
  return {
    amount: OPTIMIZER_DEFAULTS.amount,
    propertyValue: OPTIMIZER_DEFAULTS.propertyValue,
    monthlyBudget: OPTIMIZER_DEFAULTS.monthlyBudget,
    maxDurationMonths: OPTIMIZER_DEFAULTS.maxDurationMonths,
    minMargin: OPTIMIZER_DEFAULTS.minMargin,
    maxTranches: OPTIMIZER_DEFAULTS.maxTranches,
    rateGrid: structuredCloneGrid(DEFAULT_RATE_GRID),
    penalty: { ...DEFAULT_PENALTY, allowance: { ...DEFAULT_PENALTY.allowance } },
    rateConvention: 'equivalent',
    firstPaymentDate: nextMonthIso(now),
    costs: structuredCloneGrid(DEFAULT_COSTS),
    investmentReturn: 0.03,
  };
}

function structuredCloneGrid<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function t(id: string, amount: number, years: number, rate: number, label: string): Tranche {
  return { id, label, amount, durationMonths: years * 12, annualRate: rate, startMonth: 1, amortization: 'annuity' };
}

export function defaultScenarios(): Scenario[] {
  const updatedAt = new Date(0).toISOString();
  return [
    {
      id: 'demo-20',
      name: '250 000 € sur 20 ans',
      tranches: [t('demo-20-t1', 250_000, 20, 0.0367, 'Tranche 20 ans')],
      prepayments: [],
      refinancing: null,
      updatedAt,
    },
    {
      id: 'demo-10-15',
      name: 'Deux tranches 10 + 15 ans',
      tranches: [
        t('demo-10-15-t1', 200_000, 10, 0.034, 'Tranche 10 ans'),
        t('demo-10-15-t2', 50_000, 15, 0.0355, 'Tranche 15 ans'),
      ],
      prepayments: [],
      refinancing: null,
      updatedAt,
    },
  ];
}

export function defaultState(now?: Date): AppState {
  const scenarios = defaultScenarios();
  return {
    settings: defaultSettings(now),
    scenarios,
    selectedScenarioId: scenarios[0]!.id,
    compareIds: scenarios.map((s) => s.id),
  };
}
