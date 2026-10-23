import type { CostBreakdown } from './costs';
import { monthlyRate } from './rates';
import type { SimulationResult } from './types';

export interface OpportunityResult {
  /** Horizon commun de comparaison (mois). */
  horizonMonths: number;
  /** Patrimoine net final en remboursant anticipativement. */
  wealthPrepay: number;
  /** Patrimoine net final en investissant la différence. */
  wealthInvest: number;
  /** wealthPrepay − wealthInvest : positif si rembourser est plus intéressant. */
  advantagePrepay: number;
  /** Rendement annuel net à partir duquel investir devient plus intéressant (null si introuvable). */
  breakEvenReturn: number | null;
}

/** Décaissements mensuels (index = mois) : échéancier + frais et assurances. */
function outflows(result: SimulationResult, costs: CostBreakdown): number[] {
  const out = costs.monthly.slice();
  for (const m of result.months) out[m.month] = (out[m.month] ?? 0) + m.cashOut;
  return out;
}

function finalWealth(own: readonly number[], other: readonly number[], horizon: number, rate: number): number {
  // Chaque mois, l'emprunteur dépense max(décaissement A, décaissement B) ;
  // la différence avec son propre décaissement est placée.
  let wealth = 0;
  for (let m = 0; m <= horizon; m++) {
    wealth *= 1 + rate;
    const a = own[m] ?? 0;
    const b = other[m] ?? 0;
    wealth += Math.max(a, b) - a;
  }
  return wealth;
}

/**
 * Compare « rembourser anticipativement » (scénario avec remboursements) et
 * « investir la différence » (même crédit sans remboursements) sur le même
 * horizon et avec le même effort mensuel. Le patrimoine net final est la
 * valeur du placement à l'horizon (les deux crédits sont alors soldés).
 * Le rendement est net (après frais et impôts), en taux annuel équivalent.
 */
export function compareOpportunity(
  prepay: { result: SimulationResult; costs: CostBreakdown },
  invest: { result: SimulationResult; costs: CostBreakdown },
  annualReturn: number,
): OpportunityResult {
  const a = outflows(prepay.result, prepay.costs);
  const b = outflows(invest.result, invest.costs);
  const horizon = Math.max(a.length, b.length) - 1;
  const wealthAt = (annual: number) => {
    const r = monthlyRate(annual);
    return { prepay: finalWealth(a, b, horizon, r), invest: finalWealth(b, a, horizon, r) };
  };
  const w = wealthAt(annualReturn);

  // Seuil : rendement qui égalise les deux stratégies (dichotomie sur 0–30 %).
  const diff = (x: number) => {
    const v = wealthAt(x);
    return v.prepay - v.invest;
  };
  let breakEvenReturn: number | null = null;
  let lo = 0;
  let hi = 0.3;
  if (diff(lo) * diff(hi) < 0) {
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (diff(lo) * diff(mid) <= 0) hi = mid;
      else lo = mid;
    }
    breakEvenReturn = (lo + hi) / 2;
  }

  return {
    horizonMonths: horizon,
    wealthPrepay: w.prepay,
    wealthInvest: w.invest,
    advantagePrepay: w.prepay - w.invest,
    breakEvenReturn,
  };
}
