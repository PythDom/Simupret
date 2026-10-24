import { useMemo } from 'react';
import {
  analyzeScenario,
  validateSimulationInput,
  type ScenarioAnalysis,
  type ScenarioSummary,
  type SimulationInput,
  type SimulationResult,
  type ValidationError,
} from '../engine';
import { bankById } from './banks';
import type { AppState, Scenario, Settings } from './types';

export function scenarioInput(scenario: Scenario, settings: Settings): SimulationInput {
  return {
    tranches: scenario.tranches,
    prepayments: scenario.prepayments,
    penalty: settings.penalty,
    ...(scenario.refinancing ? { refinancing: scenario.refinancing } : {}),
  };
}

export interface ScenarioComputation {
  input: SimulationInput;
  errors: ValidationError[];
  analysis: ScenarioAnalysis | null;
  result: SimulationResult | null;
  summary: ScenarioSummary | null;
}

/** Ce dont le calcul d'un scénario a besoin : réglages et conditions des banques. */
export type ComputeContext = Pick<AppState, 'settings' | 'banks'>;

export function computeScenario(scenario: Scenario, ctx: ComputeContext): ScenarioComputation {
  const { settings } = ctx;
  const input = scenarioInput(scenario, settings);
  const errors = validateSimulationInput(input);
  if (errors.length > 0) return { input, errors, analysis: null, result: null, summary: null };
  const bank = bankById(ctx.banks, scenario.bankId);
  const analysis = analyzeScenario(input, settings.monthlyBudget, bank.costs, { rateConvention: settings.rateConvention });
  return { input, errors, analysis, result: analysis.result, summary: analysis.summary };
}

export function useScenarioComputation(scenario: Scenario | undefined, ctx: ComputeContext): ScenarioComputation | null {
  const { settings, banks } = ctx;
  return useMemo(() => (scenario ? computeScenario(scenario, { settings, banks }) : null), [scenario, settings, banks]);
}

/** Date de l'échéance du mois `month` (mois 1 = première échéance). */
export function monthDate(firstPaymentDate: string, month: number): Date {
  const [y = 2026, m = 1, d = 1] = firstPaymentDate.split('-').map(Number);
  const target = new Date(y, m - 1 + (month - 1), 1);
  // Le jour est plafonné au dernier jour du mois (31/01 + 1 mois → 28/02).
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return target;
}
