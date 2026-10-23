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
  analysis: ScenarioAnalysis | null;
  result: SimulationResult | null;
  summary: ScenarioSummary | null;
}

export function computeScenario(scenario: Scenario, settings: Settings): ScenarioComputation {
  const input = scenarioInput(scenario, settings);
  const errors = validateSimulationInput(input);
  if (errors.length > 0) return { input, errors, analysis: null, result: null, summary: null };
  const analysis = analyzeScenario(input, settings.monthlyBudget, settings.costs, { rateConvention: settings.rateConvention });
  return { input, errors, analysis, result: analysis.result, summary: analysis.summary };
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
