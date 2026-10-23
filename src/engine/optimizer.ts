import { annuityPayment } from './amortization';
import { GRID_DURATIONS_YEARS, quotite, quotiteTier, type QuotiteTier, type RateGrid } from './grid';
import { DEFAULT_PENALTY } from './penalty';
import { monthlyRate } from './rates';
import { DEFAULT_OPTIONS, simulate } from './schedule';
import type { PenaltyConfig, SimulationOptions, SimulationResult, Tranche, ValidationError } from './types';

export interface OptimizerInput {
  /** Montant à emprunter (€). */
  amount: number;
  /** Valeur du bien (€), pour la quotité. */
  propertyValue: number;
  /** Budget mensuel (€). */
  monthlyBudget: number;
  /** Durée maximale (mois). */
  maxDurationMonths: number;
  /** Marge de sécurité mensuelle minimale (€). */
  minMargin: number;
  /** Nombre maximal de tranches (1 à 3). */
  maxTranches: number;
  rateGrid: RateGrid;
  /** Pas des montants (défaut 5 000 €). */
  amountStep?: number;
  /** Nombre de résultats (défaut 5). */
  topN?: number;
  /** Indemnité pour la variante « flexibilité maximale ». */
  penalty?: PenaltyConfig;
  /** Périodicité des remboursements de la variante flexible (défaut 12 mois). */
  flexPrepaymentEveryMonths?: number;
}

export const OPTIMIZER_DEFAULTS = {
  amount: 250_000,
  propertyValue: 300_000,
  monthlyBudget: 2500,
  maxDurationMonths: 240,
  minMargin: 0,
  maxTranches: 3,
  amountStep: 5000,
  topN: 5,
  flexPrepaymentEveryMonths: 12,
} as const;

export interface OptimizerConfiguration {
  tranches: Tranche[];
  /** Coût total : intérêts (+ indemnités pour la variante flexible). */
  totalCost: number;
  interest: number;
  penalties: number;
  /** Mensualité la plus élevée sur la durée du crédit. */
  peakPayment: number;
  /** Marge minimale : budget − mensualité la plus élevée. */
  minMargin: number;
  endMonth: number;
  simulation: SimulationResult;
}

export interface OptimizerResult {
  quotite: number;
  tier: QuotiteTier;
  /** Meilleures configurations, du coût le plus bas au plus élevé. */
  top: OptimizerConfiguration[];
  /** Plus longue durée + remboursements anticipés jusqu'au budget. */
  flexibility: OptimizerConfiguration | null;
  /** Surcoût de la flexibilité par rapport à la meilleure configuration. */
  flexibilityPrice: number | null;
  /** Nombre de combinaisons évaluées. */
  evaluated: number;
  /** Plus petite mensualité atteignable avec la grille (diagnostic si aucun résultat). */
  lowestPossiblePayment: number | null;
  /** Message en français si aucune configuration ne respecte le budget. */
  message: string | null;
}

interface GridOption {
  months: number;
  annualRate: number;
  rate: number;
}

interface Candidate {
  /** Montants par option (index dans `options`). */
  parts: { option: GridOption; amount: number }[];
  cost: number;
  peak: number;
}

function availableOptions(input: OptimizerInput, tier: QuotiteTier, options: SimulationOptions): GridOption[] {
  const result: GridOption[] = [];
  for (const years of GRID_DURATIONS_YEARS) {
    const annualRate = input.rateGrid[tier][years];
    const months = years * 12;
    if (annualRate === null || months > input.maxDurationMonths) continue;
    result.push({ months, annualRate, rate: monthlyRate(annualRate, options.rateConvention) });
  }
  return result;
}

/** Sous-ensembles de `k` éléments (ordre conservé). */
function combinations<T>(items: readonly T[], k: number): T[][] {
  if (k === 0) return [[]];
  const out: T[][] = [];
  items.forEach((item, i) => {
    for (const rest of combinations(items.slice(i + 1), k - 1)) out.push([item, ...rest]);
  });
  return out;
}

/** Décompositions de `units` en `k` parts entières strictement positives. */
function* compositions(units: number, k: number): Generator<number[]> {
  if (k === 1) {
    if (units >= 1) yield [units];
    return;
  }
  for (let first = 1; first <= units - (k - 1); first++) {
    for (const rest of compositions(units - first, k - 1)) yield [first, ...rest];
  }
}

/**
 * Évaluation analytique d'une combinaison de tranches en annuités démarrant
 * toutes au mois 1 : la mensualité totale est maximale au mois 1 (somme des
 * annuités) et le coût est Σ (annuité × durée − capital).
 */
function evaluate(parts: Candidate['parts']): Candidate {
  let cost = 0;
  let peak = 0;
  for (const { option, amount } of parts) {
    const pmt = annuityPayment(amount, option.rate, option.months);
    peak += pmt;
    cost += pmt * option.months - amount;
  }
  return { parts, cost, peak };
}

function toTranches(parts: Candidate['parts'], prefix: string): Tranche[] {
  return parts.map(({ option, amount }, i) => ({
    id: `${prefix}${i + 1}`,
    label: `Tranche ${i + 1} — ${option.months / 12} ans`,
    amount,
    durationMonths: option.months,
    annualRate: option.annualRate,
    startMonth: 1,
    amortization: 'annuity',
  }));
}

function buildConfiguration(
  tranches: Tranche[],
  simulation: SimulationResult,
  budget: number,
): OptimizerConfiguration {
  const peakPayment = simulation.months.reduce((m, r) => Math.max(m, r.payment), 0);
  return {
    tranches,
    totalCost: simulation.totals.interest + simulation.totals.penalties,
    interest: simulation.totals.interest,
    penalties: simulation.totals.penalties,
    peakPayment,
    minMargin: budget - peakPayment,
    endMonth: simulation.endMonth,
    simulation,
  };
}

/**
 * Recherche les combinaisons de tranches (durées de la grille, montants par
 * pas de 5 000 €) qui minimisent le coût total sous la contrainte
 * mensualité ≤ budget − marge à chaque mois.
 */
export function optimize(input: OptimizerInput, options: SimulationOptions = DEFAULT_OPTIONS): OptimizerResult {
  const step = input.amountStep ?? OPTIMIZER_DEFAULTS.amountStep;
  const topN = input.topN ?? OPTIMIZER_DEFAULTS.topN;
  const limit = input.monthlyBudget - input.minMargin;
  const q = quotite(input.amount, input.propertyValue);
  const tier = quotiteTier(q);
  const gridOptions = availableOptions(input, tier, options);

  // Le reste éventuel (montant non multiple du pas) va à la première part.
  const units = Math.floor(input.amount / step);
  const remainder = input.amount - units * step;

  const feasible: Candidate[] = [];
  let evaluated = 0;
  let lowestPossiblePayment: number | null = null;
  const maxK = Math.max(1, Math.min(3, Math.floor(input.maxTranches)));

  for (let k = 1; k <= maxK; k++) {
    for (const combo of combinations(gridOptions, k)) {
      const splits = k === 1 ? [[units]] : compositions(units, k);
      for (const split of splits) {
        const parts = combo.map((option, i) => ({
          option,
          amount: (split[i] ?? 0) * step + (i === 0 ? remainder : 0),
        }));
        if (parts.some((p) => p.amount <= 0)) continue;
        const c = evaluate(parts);
        evaluated++;
        if (lowestPossiblePayment === null || c.peak < lowestPossiblePayment) lowestPossiblePayment = c.peak;
        if (c.peak <= limit + 1e-9) feasible.push(c);
      }
    }
  }

  feasible.sort((a, b) => a.cost - b.cost || a.peak - b.peak);
  const top = feasible.slice(0, topN).map((c, i) => {
    const tranches = toTranches(c.parts, `opt${i + 1}-`);
    return buildConfiguration(tranches, simulate({ tranches }, options), input.monthlyBudget);
  });

  const flexibility = flexibilityVariant(input, gridOptions, limit, options);
  const best = top[0];
  let message: string | null = null;
  if (gridOptions.length === 0) {
    message = 'Aucune durée de la grille ne respecte la durée maximale.';
  } else if (top.length === 0) {
    message =
      lowestPossiblePayment === null
        ? 'Aucune configuration possible.'
        : `Budget insuffisant : la mensualité la plus basse possible est de ${Math.ceil(lowestPossiblePayment)} €, ` +
          `pour un maximum autorisé de ${Math.floor(limit)} € (budget − marge).`;
  }

  return {
    quotite: q,
    tier,
    top,
    flexibility,
    flexibilityPrice: best && flexibility ? flexibility.totalCost - best.totalCost : null,
    evaluated,
    lowestPossiblePayment,
    message,
  };
}

/**
 * Variante « flexibilité maximale » : une seule tranche sur la plus longue
 * durée disponible, et remboursements anticipés récurrents de tout ce qui
 * dépasse la mensualité jusqu'au budget (indemnité comprise dans le budget).
 */
function flexibilityVariant(
  input: OptimizerInput,
  gridOptions: readonly GridOption[],
  limit: number,
  options: SimulationOptions,
): OptimizerConfiguration | null {
  const longest = gridOptions[gridOptions.length - 1];
  if (!longest) return null;
  const parts = [{ option: longest, amount: input.amount }];
  if (evaluate(parts).peak > limit + 1e-9) return null;
  const tranches = toTranches(parts, 'flex-');
  const simulation = simulate(
    {
      tranches,
      prepayments: [
        {
          kind: 'recurring',
          everyMonths: input.flexPrepaymentEveryMonths ?? OPTIMIZER_DEFAULTS.flexPrepaymentEveryMonths,
          amount: { type: 'budget', monthlyBudget: limit, penaltyWithinBudget: true },
        },
      ],
      penalty: input.penalty ?? DEFAULT_PENALTY,
    },
    options,
  );
  return buildConfiguration(tranches, simulation, input.monthlyBudget);
}

/** Valide les paramètres de l'optimiseur ; messages en français. */
export function validateOptimizerInput(input: OptimizerInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const err = (field: string, message: string) => errors.push({ field, message });
  const finite = (x: number) => typeof x === 'number' && Number.isFinite(x);

  if (!finite(input.amount) || input.amount <= 0) err('amount', 'Le montant à emprunter doit être strictement positif.');
  if (!finite(input.propertyValue) || input.propertyValue <= 0) {
    err('propertyValue', 'La valeur du bien doit être strictement positive.');
  }
  if (!finite(input.monthlyBudget) || input.monthlyBudget <= 0) {
    err('monthlyBudget', 'Le budget mensuel doit être strictement positif.');
  }
  if (!Number.isInteger(input.maxDurationMonths) || input.maxDurationMonths < 12) {
    err('maxDurationMonths', "La durée maximale doit être d'au moins 1 an.");
  }
  if (!finite(input.minMargin) || input.minMargin < 0) {
    err('minMargin', 'La marge de sécurité doit être positive ou nulle.');
  } else if (finite(input.monthlyBudget) && input.minMargin >= input.monthlyBudget) {
    err('minMargin', 'La marge de sécurité doit être inférieure au budget mensuel.');
  }
  if (!Number.isInteger(input.maxTranches) || input.maxTranches < 1 || input.maxTranches > 3) {
    err('maxTranches', 'Le nombre de tranches doit être compris entre 1 et 3.');
  }
  const step = input.amountStep ?? OPTIMIZER_DEFAULTS.amountStep;
  if (!finite(step) || step <= 0) err('amountStep', 'Le pas des montants doit être strictement positif.');
  for (const tier of Object.keys(input.rateGrid) as QuotiteTier[]) {
    for (const years of GRID_DURATIONS_YEARS) {
      const rate = input.rateGrid[tier][years];
      if (rate !== null && (!finite(rate) || rate < 0 || rate > 0.3)) {
        err(`rateGrid.${tier}.${years}`, `Le taux ${years} ans de la grille est invalide.`);
      }
    }
  }
  return errors;
}
