import type { SimulationInput, SimulationResult } from './types';

/**
 * Assurance solde restant dû :
 * - `single` : prime unique payée à la signature ;
 * - `annualPercent` : prime annuelle = taux × solde restant dû au début de
 *   chaque année de crédit (mois 1, 13, 25…).
 */
export type BalanceInsurance =
  | { kind: 'none' }
  | { kind: 'single'; premium: number }
  | { kind: 'annualPercent'; rate: number };

/**
 * Frais et assurances liés au crédit. Les montants par défaut sont
 * approximatifs : seuls les décomptes du prêteur et du notaire font foi.
 */
export interface LoanCosts {
  /** Frais de dossier (€). */
  processingFees: number;
  /** Frais d'expertise (€). */
  appraisalFees: number;
  /** Frais d'acte de crédit — part inscription hypothécaire (€). */
  deedInscription: number;
  /** Frais d'acte de crédit — part mandat hypothécaire (€). */
  deedMandate: number;
  balanceInsurance: BalanceInsurance;
  /** Assurance incendie exigée par le prêteur : prime annuelle (€). */
  fireInsurance: { enabled: boolean; annualPremium: number };
  /** Compte bancaire exigé par le prêteur : frais mensuels (€). */
  bankAccount: { enabled: boolean; monthlyFee: number };
}

/** Valeurs indicatives (approximatives). */
export const DEFAULT_COSTS: LoanCosts = {
  processingFees: 500,
  appraisalFees: 300,
  deedInscription: 4000,
  deedMandate: 0,
  balanceInsurance: { kind: 'annualPercent', rate: 0.0015 },
  fireInsurance: { enabled: false, annualPremium: 300 },
  bankAccount: { enabled: false, monthlyFee: 5 },
};

export const NO_COSTS: LoanCosts = {
  processingFees: 0,
  appraisalFees: 0,
  deedInscription: 0,
  deedMandate: 0,
  balanceInsurance: { kind: 'none' },
  fireInsurance: { enabled: false, annualPremium: 0 },
  bankAccount: { enabled: false, monthlyFee: 0 },
};

export interface CostBreakdown {
  /** Frais payés à la signature : dossier, expertise, acte, prime unique. */
  upfront: number;
  /** Primes d'assurance solde restant dû (unique ou annuelles). */
  balanceInsurance: number;
  fireInsurance: number;
  bankAccount: number;
  /** Coûts par mois (index = mois, 0 = signature). */
  monthly: number[];
}

/** Frais à la signature, hors assurance. */
export function upfrontFees(costs: LoanCosts): number {
  return costs.processingFees + costs.appraisalFees + costs.deedInscription + costs.deedMandate;
}

/** Calcule les frais et assurances d'un échéancier simulé. */
export function costBreakdown(input: SimulationInput, result: SimulationResult, costs: LoanCosts): CostBreakdown {
  const end = result.endMonth;
  const monthly = new Array<number>(end + 1).fill(0);
  const fees = upfrontFees(costs);
  monthly[0] = fees;
  let balanceInsurance = 0;
  let fireInsurance = 0;
  let bankAccount = 0;

  const ins = costs.balanceInsurance;
  if (ins.kind === 'single') {
    balanceInsurance = ins.premium;
    monthly[0] += ins.premium;
  }

  // Solde au début du mois m = solde de fin du mois m − 1 (mois 0 : capital débloqué au départ).
  const initialBalance = input.tranches
    .filter((t) => t.startMonth <= 1)
    .reduce((s, t) => s + Math.max(0, t.amount - (t.reduction ?? 0)), 0);

  for (let m = 1; m <= end; m++) {
    let cost = 0;
    const yearStart = (m - 1) % 12 === 0;
    if (ins.kind === 'annualPercent' && yearStart) {
      const opening = m === 1 ? initialBalance : (result.months[m - 2]?.closingBalance ?? 0);
      const premium = ins.rate * opening;
      balanceInsurance += premium;
      cost += premium;
    }
    if (costs.fireInsurance.enabled && yearStart) {
      fireInsurance += costs.fireInsurance.annualPremium;
      cost += costs.fireInsurance.annualPremium;
    }
    if (costs.bankAccount.enabled) {
      bankAccount += costs.bankAccount.monthlyFee;
      cost += costs.bankAccount.monthlyFee;
    }
    monthly[m] = cost;
  }

  return { upfront: fees + (ins.kind === 'single' ? ins.premium : 0), balanceInsurance, fireInsurance, bankAccount, monthly };
}

/**
 * Flux de trésorerie de l'emprunteur, mois par mois (index 0 = signature) :
 * + fonds débloqués, − mensualités, remboursements anticipés, indemnités,
 * frais et assurances.
 */
export function borrowerCashFlows(input: SimulationInput, result: SimulationResult, breakdown: CostBreakdown): number[] {
  const flows = breakdown.monthly.map((c) => -c);
  for (const t of input.tranches) {
    const at = Math.max(0, t.startMonth - 1);
    if (at < flows.length) flows[at]! += t.amount;
  }
  for (const m of result.months) flows[m.month]! -= m.cashOut;
  return flows;
}
