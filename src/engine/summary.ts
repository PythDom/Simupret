import type { SimulationResult } from './types';

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
  fees: number;
  /** Coût total : intérêts + indemnités + frais. */
  totalCost: number;
  /** Total décaissé par l'emprunteur. */
  totalCashOut: number;
  endMonth: number;
}

/** Indicateurs clés d'un scénario simulé. */
export function summarize(result: SimulationResult, monthlyBudget: number): ScenarioSummary {
  let peak = 0;
  let lowest = Infinity;
  for (const m of result.months) {
    peak = Math.max(peak, m.payment);
    if (m.payment > 0) lowest = Math.min(lowest, m.payment);
  }
  const { interest, penalties, fees, cashOut } = {
    interest: result.totals.interest,
    penalties: result.totals.penalties,
    fees: result.totals.fees,
    cashOut: result.totals.cashOut,
  };
  return {
    firstPayment: result.months[0]?.payment ?? 0,
    peakPayment: peak,
    lowestPayment: Number.isFinite(lowest) ? lowest : 0,
    minMargin: monthlyBudget - peak,
    interest,
    penalties,
    fees,
    totalCost: interest + penalties + fees,
    totalCashOut: cashOut,
    endMonth: result.endMonth,
  };
}
