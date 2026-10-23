import { useMemo } from 'react';
import {
  simulate,
  summarize,
  validateSimulationInput,
  type ScenarioSummary,
  type SimulationInput,
  type SimulationResult,
  type ValidationError,
} from '../engine';
import type { Scenario, Settings } from './types';

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
  result: SimulationResult | null;
  summary: ScenarioSummary | null;
}

export function computeScenario(scenario: Scenario, settings: Settings): ScenarioComputation {
  const input = scenarioInput(scenario, settings);
  const errors = validateSimulationInput(input);
  if (errors.length > 0) return { input, errors, result: null, summary: null };
  const result = simulate(input, { rateConvention: settings.rateConvention });
  return { input, errors, result, summary: summarize(result, settings.monthlyBudget) };
}

export function useScenarioComputation(scenario: Scenario | undefined, settings: Settings): ScenarioComputation | null {
  return useMemo(() => (scenario ? computeScenario(scenario, settings) : null), [scenario, settings]);
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
