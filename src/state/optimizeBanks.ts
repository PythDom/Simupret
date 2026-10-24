import {
  OPTIMIZER_DEFAULTS,
  optimize,
  validateOptimizerInput,
  type OptimizerConfiguration,
  type OptimizerInput,
  type QuotiteTier,
  type ValidationError,
} from '../engine';
import type { BankProfile, Settings } from './types';

export interface BankConfiguration {
  bank: BankProfile;
  config: OptimizerConfiguration;
}

export interface MultiBankResult {
  errors: ValidationError[];
  quotite: number;
  tier: QuotiteTier;
  evaluated: number;
  /** Meilleures configurations toutes banques confondues. */
  top: BankConfiguration[];
  /** Variante flexible de la banque de la meilleure configuration. */
  flexibility: BankConfiguration | null;
  flexibilityPrice: number | null;
  message: string | null;
}

function inputFor(settings: Settings, bank: BankProfile): OptimizerInput {
  return {
    amount: settings.amount,
    propertyValue: settings.propertyValue,
    monthlyBudget: settings.monthlyBudget,
    maxDurationMonths: settings.maxDurationMonths,
    minMargin: settings.minMargin,
    maxTranches: settings.maxTranches,
    rateGrid: bank.rateGrid,
    penalty: settings.penalty,
    costs: bank.costs,
  };
}

/** Lance l'optimiseur pour chaque banque et fusionne les résultats par coût total croissant. */
export function optimizeAcrossBanks(settings: Settings, banks: readonly BankProfile[]): MultiBankResult | null {
  const first = banks[0];
  if (!first) return null;
  const errors = banks.flatMap((b) =>
    validateOptimizerInput(inputFor(settings, b)).map((e) => (banks.length > 1 ? { ...e, message: `${b.name} : ${e.message}` } : e)),
  );
  if (errors.length > 0) {
    return { errors, quotite: NaN, tier: 'upTo80', evaluated: 0, top: [], flexibility: null, flexibilityPrice: null, message: null };
  }

  const runs = banks.map((bank) => ({ bank, result: optimize(inputFor(settings, bank), { rateConvention: settings.rateConvention }) }));
  const top = runs
    .flatMap(({ bank, result }) => result.top.map((config) => ({ bank, config })))
    .sort((a, b) => a.config.totalCost - b.config.totalCost || a.config.peakPayment - b.config.peakPayment)
    .slice(0, OPTIMIZER_DEFAULTS.topN);

  const best = top[0];
  const bestRun = best ? runs.find((r) => r.bank.id === best.bank.id)! : runs[0]!;
  const flexibility = bestRun.result.flexibility ? { bank: bestRun.bank, config: bestRun.result.flexibility } : null;

  return {
    errors,
    quotite: runs[0]!.result.quotite,
    tier: runs[0]!.result.tier,
    evaluated: runs.reduce((s, r) => s + r.result.evaluated, 0),
    top,
    flexibility,
    flexibilityPrice: best && flexibility ? flexibility.config.totalCost - best.config.totalCost : null,
    message: top.length === 0 ? (runs.find((r) => r.result.message)?.result.message ?? 'Aucune configuration possible.') : null,
  };
}
