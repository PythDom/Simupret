import { NO_COSTS, borrowerCashFlows, costBreakdown, upfrontFees, type CostBreakdown, type LoanCosts } from './costs';
import { DEFAULT_OPTIONS, simulate } from './schedule';
import { taeg } from './taeg';
import type { SimulationInput, SimulationOptions, SimulationResult } from './types';

export interface ScenarioSummary {
  /** Première mensualité (mois 1). */
  firstPayment: number;
  /** Mensualité normale la plus élevée. */
  peakPayment: number;
  /** Mensualité normale la plus basse (hors mois sans échéance). */
  lowestPayment: number;
  /** Marge minimale : budget − mensualité normale la plus élevée. */
  minMargin: number;
  interest: number;
  penalties: number;
  /** Frais de refinancement (acte, dossier). */
  refinancingFees: number;
  /** Frais à la signature : dossier, expertise, acte. */
  upfrontCosts: number;
  /** Assurance solde restant dû : prime unique ou primes annuelles. */
  balanceInsurance: number;
  /** Assurance incendie et compte bancaire liés au crédit. */
  linkedCosts: number;
  /** Réductions du montant à rembourser (primes, subsides). */
  reductions: number;
  /**
   * Coût total = total décaissé − fonds reçus :
   * intérêts + indemnités + frais + assurances − réductions.
   */
  totalCost: number;
  /** Total décaissé par l'emprunteur (échéances, remboursements, frais, assurances). */
  totalCashOut: number;
  /** TAEG sur les flux réels (null si non calculable). */
  taeg: number | null;
  endMonth: number;
}

export interface ScenarioAnalysis {
  result: SimulationResult;
  costs: CostBreakdown;
  flows: number[];
  summary: ScenarioSummary;
}

/** Indicateurs clés d'un scénario simulé. */
export function summarize(
  input: SimulationInput,
  result: SimulationResult,
  monthlyBudget: number,
  costs: LoanCosts = NO_COSTS,
): { summary: ScenarioSummary; breakdown: CostBreakdown; flows: number[] } {
  let peak = 0;
  let lowest = Infinity;
  for (const m of result.months) {
    peak = Math.max(peak, m.payment);
    if (m.payment > 0) lowest = Math.min(lowest, m.payment);
  }
  const breakdown = costBreakdown(input, result, costs);
  const flows = borrowerCashFlows(input, result, breakdown);
  const t = result.totals;
  const linkedCosts = breakdown.fireInsurance + breakdown.bankAccount;
  const disbursed = input.tranches.reduce((s, tr) => s + tr.amount, 0);
  const totalCashOut = -flows.reduce((s, f) => s + f, 0) + disbursed;
  return {
    breakdown,
    flows,
    summary: {
      firstPayment: result.months[0]?.payment ?? 0,
      peakPayment: peak,
      lowestPayment: Number.isFinite(lowest) ? lowest : 0,
      minMargin: monthlyBudget - peak,
      interest: t.interest,
      penalties: t.penalties,
      refinancingFees: t.fees,
      upfrontCosts: upfrontFees(costs),
      balanceInsurance: breakdown.balanceInsurance,
      linkedCosts,
      reductions: t.reductions,
      totalCost: totalCashOut - disbursed,
      totalCashOut,
      taeg: result.endMonth > 0 ? taeg(flows) : null,
      endMonth: result.endMonth,
    },
  };
}

/** Simule un scénario et calcule frais, flux, TAEG et synthèse. */
export function analyzeScenario(
  input: SimulationInput,
  monthlyBudget: number,
  costs: LoanCosts = NO_COSTS,
  options: SimulationOptions = DEFAULT_OPTIONS,
): ScenarioAnalysis {
  const result = simulate(input, options);
  const { summary, breakdown, flows } = summarize(input, result, monthlyBudget, costs);
  return { result, costs: breakdown, flows, summary };
}
