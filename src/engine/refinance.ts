import { DEFAULT_OPTIONS, simulate } from './schedule';
import type { MonthRow, SimulationInput, SimulationOptions, SimulationResult } from './types';

export interface RefinancingAnalysis {
  /** Scénario sans refinancement. */
  baseline: SimulationResult;
  /** Scénario avec refinancement. */
  refinanced: SimulationResult;
  /** Coût immédiat du refinancement : indemnité de remploi + frais. */
  upfrontCost: number;
  /** Économie totale (positive si le refinancement est avantageux). */
  savings: number;
  /**
   * Premier mois à partir duquel le coût cumulé (intérêts + indemnités + frais)
   * du refinancement reste inférieur ou égal à celui du scénario de base.
   * `null` si le refinancement n'est jamais rentable.
   */
  breakEvenMonth: number | null;
  /** Coût cumulé mois par mois (index 0 = mois 1) des deux scénarios. */
  cumulativeCost: { month: number; baseline: number; refinanced: number }[];
}

function monthCost(m: MonthRow | undefined): number {
  return m ? m.interest + m.penalty + m.fees : 0;
}

/** Compare un scénario avec et sans son refinancement. */
export function analyzeRefinancing(
  input: SimulationInput,
  options: SimulationOptions = DEFAULT_OPTIONS,
): RefinancingAnalysis {
  if (!input.refinancing) throw new Error('Aucun refinancement à analyser.');
  const refiMonth = input.refinancing.month;
  const baseline = simulate({ ...input, refinancing: undefined }, options);
  const refinanced = simulate(input, options);

  const horizon = Math.max(baseline.endMonth, refinanced.endMonth);
  const cumulativeCost: RefinancingAnalysis['cumulativeCost'] = [];
  let b = 0;
  let r = 0;
  for (let month = 1; month <= horizon; month++) {
    b += monthCost(baseline.months[month - 1]);
    r += monthCost(refinanced.months[month - 1]);
    cumulativeCost.push({ month, baseline: b, refinanced: r });
  }

  // Parcours à rebours : dernier mois où le refinancement coûte plus cher.
  let breakEvenMonth: number | null = null;
  for (let i = cumulativeCost.length - 1; i >= 0; i--) {
    const c = cumulativeCost[i]!;
    if (c.month < refiMonth) break;
    if (c.refinanced > c.baseline + 1e-9) break;
    breakEvenMonth = c.month;
  }

  const refiRow = refinanced.months[refiMonth - 1];
  const totalCost = (s: SimulationResult) => s.totals.interest + s.totals.penalties + s.totals.fees;
  return {
    baseline,
    refinanced,
    upfrontCost: refiRow ? refiRow.penalty + refiRow.fees : 0,
    savings: totalCost(baseline) - totalCost(refinanced),
    breakEvenMonth,
    cumulativeCost,
  };
}
