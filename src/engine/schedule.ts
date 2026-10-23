import { annuityPayment, constantPrincipal } from './amortization';
import { monthlyRate } from './rates';
import type {
  MonthRow,
  SimulationOptions,
  SimulationResult,
  Tranche,
  TrancheMonth,
  YearRow,
} from './types';

/** En dessous de ce solde (€), une tranche est considérée comme remboursée. */
export const BALANCE_EPSILON = 1e-6;

export const DEFAULT_OPTIONS: SimulationOptions = { rateConvention: 'equivalent' };

/** État courant d'une tranche pendant la simulation. */
interface TrancheState {
  tranche: Tranche;
  rate: number;
  balance: number;
  /** Mois de la dernière échéance prévue. */
  lastMonth: number;
  /** Mensualité (annuité) ou capital mensuel (amortissement constant). */
  level: number;
}

function initState(tranche: Tranche, options: SimulationOptions): TrancheState {
  const rate = monthlyRate(tranche.annualRate, options.rateConvention);
  const n = tranche.durationMonths;
  return {
    tranche,
    rate,
    balance: tranche.amount,
    lastMonth: tranche.startMonth + n - 1,
    level:
      tranche.amortization === 'annuity'
        ? annuityPayment(tranche.amount, rate, n)
        : constantPrincipal(tranche.amount, n),
  };
}

function stepTranche(s: TrancheState, month: number): TrancheMonth {
  const opening = s.balance;
  const interest = opening * s.rate;
  let principal: number;
  if (month >= s.lastMonth) {
    // Dernière échéance : solde intégral (absorbe les écarts de virgule flottante).
    principal = opening;
  } else if (s.tranche.amortization === 'annuity') {
    principal = Math.min(Math.max(s.level - interest, 0), opening);
  } else {
    principal = Math.min(s.level, opening);
  }
  const closing = opening - principal;
  s.balance = closing <= BALANCE_EPSILON ? 0 : closing;
  return {
    month,
    trancheId: s.tranche.id,
    openingBalance: opening,
    interest,
    principal,
    payment: interest + principal,
    closingBalance: s.balance,
  };
}

/**
 * Simule l'échéancier mois par mois de tranches parallèles.
 * La mensualité totale d'un mois est la somme des échéances des tranches actives.
 */
export function simulate(
  tranches: readonly Tranche[],
  options: SimulationOptions = DEFAULT_OPTIONS,
): SimulationResult {
  const states = tranches.map((t) => initState(t, options));
  const perTranche: Record<string, TrancheMonth[]> = {};
  for (const t of tranches) perTranche[t.id] = [];

  const horizon = states.reduce((m, s) => Math.max(m, s.lastMonth), 0);
  const months: MonthRow[] = [];
  const totals = { payments: 0, interest: 0, principal: 0 };
  let endMonth = 0;

  for (let month = 1; month <= horizon; month++) {
    const rows: TrancheMonth[] = [];
    for (const s of states) {
      if (month < s.tranche.startMonth || s.balance <= 0) continue;
      const row = stepTranche(s, month);
      rows.push(row);
      perTranche[s.tranche.id]!.push(row);
    }

    // Solde total : seul le capital déjà mis à disposition (mois startMonth − 1) est dû.
    let closingBalance = 0;
    for (const s of states) {
      if (month >= s.tranche.startMonth - 1) closingBalance += s.balance;
    }

    const row: MonthRow = {
      month,
      payment: sum(rows, (r) => r.payment),
      interest: sum(rows, (r) => r.interest),
      principal: sum(rows, (r) => r.principal),
      closingBalance,
      tranches: rows,
    };
    months.push(row);
    totals.payments += row.payment;
    totals.interest += row.interest;
    totals.principal += row.principal;
    if (rows.length > 0) endMonth = month;
  }

  return { months: months.slice(0, endMonth), perTranche, totals, endMonth };
}

/** Regroupe un échéancier mensuel par année de crédit (mois 1–12 = année 1). */
export function aggregateByYear(months: readonly MonthRow[]): YearRow[] {
  const years: YearRow[] = [];
  for (const m of months) {
    const year = Math.floor((m.month - 1) / 12) + 1;
    let y = years[years.length - 1];
    if (!y || y.year !== year) {
      y = { year, firstMonth: m.month, lastMonth: m.month, payment: 0, interest: 0, principal: 0, closingBalance: 0 };
      years.push(y);
    }
    y.lastMonth = m.month;
    y.payment += m.payment;
    y.interest += m.interest;
    y.principal += m.principal;
    y.closingBalance = m.closingBalance;
  }
  return years;
}

function sum<T>(items: readonly T[], f: (item: T) => number): number {
  let total = 0;
  for (const item of items) total += f(item);
  return total;
}
