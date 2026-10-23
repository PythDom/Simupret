import { annuityPayment, constantPrincipal } from './amortization';
import { DEFAULT_PENALTY, penaltyFor, penaltyRate, principalFromCash, yearlyAllowance } from './penalty';
import { monthlyRate } from './rates';
import type {
  MonthRow,
  PenaltyConfig,
  Prepayment,
  PrepaymentEffect,
  RecurringPrepayment,
  Refinancing,
  SimulationInput,
  SimulationOptions,
  SimulationResult,
  Tranche,
  TrancheMonth,
  YearRow,
} from './types';

/** En dessous de ce solde (€), une tranche est considérée comme remboursée. */
export const BALANCE_EPSILON = 1e-6;

/** Garde-fou contre les boucles infinies (100 ans). */
const MAX_MONTHS = 1200;

export const DEFAULT_OPTIONS: SimulationOptions = { rateConvention: 'equivalent' };

export const DEFAULT_REFINANCING_TRANCHE_ID = 'refinancement';

/** État courant d'une tranche pendant la simulation. */
interface TrancheState {
  tranche: Tranche;
  rate: number;
  penaltyRate: number;
  balance: number;
  /** Mois de la dernière échéance prévue. */
  lastMonth: number;
  /** Mensualité (annuité) ou capital mensuel (amortissement constant). */
  level: number;
  /** Franchise annuelle d'indemnité (€). */
  allowance: number;
  /** Franchise déjà consommée, par année de crédit. */
  allowanceUsed: Map<number, number>;
  /** Ligne du mois en cours (null si la tranche n'a pas d'échéance ce mois-ci). */
  current: TrancheMonth | null;
}

function initState(tranche: Tranche, options: SimulationOptions, penalty: PenaltyConfig): TrancheState {
  const rate = monthlyRate(tranche.annualRate, options.rateConvention);
  const n = tranche.durationMonths;
  return {
    tranche,
    rate,
    penaltyRate: penaltyRate(rate, penalty),
    balance: tranche.amount,
    lastMonth: tranche.startMonth + n - 1,
    level:
      tranche.amortization === 'annuity'
        ? annuityPayment(tranche.amount, rate, n)
        : constantPrincipal(tranche.amount, n),
    allowance: yearlyAllowance(penalty.allowance, tranche.amount),
    allowanceUsed: new Map(),
    current: null,
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
  setBalance(s, opening - principal);
  return {
    month,
    trancheId: s.tranche.id,
    openingBalance: opening,
    interest,
    principal,
    payment: interest + principal,
    prepayment: 0,
    penalty: 0,
    refinanced: 0,
    closingBalance: s.balance,
  };
}

function setBalance(s: TrancheState, balance: number): void {
  s.balance = balance <= BALANCE_EPSILON ? 0 : balance;
  if (s.current) s.current.closingBalance = s.balance;
}

/** Année de crédit (0 pour les mois 1 à 12). */
function creditYear(month: number): number {
  return Math.floor((month - 1) / 12);
}

function allowanceLeft(s: TrancheState, month: number): number {
  return Math.max(0, s.allowance - (s.allowanceUsed.get(creditYear(month)) ?? 0));
}

/**
 * Retourne la ligne du mois en cours d'une tranche, en la créant (sans
 * échéance) si la tranche est débloquée mais n'a pas encore d'échéance.
 */
type RowFactory = (s: TrancheState) => TrancheMonth;

/** Est-ce que la tranche a reçu ses fonds à la fin du mois `month` ? */
function isDisbursed(s: TrancheState, month: number): boolean {
  return month >= s.tranche.startMonth - 1;
}

/**
 * Applique un remboursement anticipé à une tranche : capital `amount`,
 * indemnité calculée avec la franchise restante. Recalcule la mensualité si
 * l'effet est `reducePayment`.
 */
function applyPrepayment(
  s: TrancheState,
  month: number,
  amount: number,
  effect: PrepaymentEffect,
  ensureRow: RowFactory,
): number {
  const row = ensureRow(s);
  const left = allowanceLeft(s, month);
  const penalty = penaltyFor(amount, s.penaltyRate, left);
  const year = creditYear(month);
  s.allowanceUsed.set(year, (s.allowanceUsed.get(year) ?? 0) + Math.min(amount, left));
  setBalance(s, s.balance - amount);
  row.prepayment += amount;
  row.penalty += penalty;
  if (effect === 'reducePayment' && s.balance > 0) {
    const remaining = Math.max(1, s.lastMonth - month);
    s.level =
      s.tranche.amortization === 'annuity'
        ? annuityPayment(s.balance, s.rate, remaining)
        : constantPrincipal(s.balance, remaining);
  }
  return penalty;
}

/** Ordre de répartition : tranche choisie d'abord, puis taux décroissant. */
function allocationOrder(states: readonly TrancheState[], month: number, trancheId?: string): TrancheState[] {
  const open = states.filter((s) => s.balance > 0 && isDisbursed(s, month));
  open.sort((a, b) => b.tranche.annualRate - a.tranche.annualRate);
  if (trancheId) {
    const i = open.findIndex((s) => s.tranche.id === trancheId);
    if (i > 0) open.unshift(...open.splice(i, 1));
  }
  return open;
}

interface AllocationResult {
  principal: number;
  penalty: number;
  /** Montant non utilisé (toutes les tranches soldées). */
  unused: number;
}

/**
 * Répartit un montant de remboursement anticipé. Si `penaltyFromCash`, le
 * montant couvre aussi l'indemnité ; sinon il est entièrement affecté au capital.
 */
function allocate(
  states: readonly TrancheState[],
  month: number,
  cash: number,
  effect: PrepaymentEffect,
  trancheId: string | undefined,
  penaltyFromCash: boolean,
  ensureRow: RowFactory,
): AllocationResult {
  let remaining = cash;
  let principal = 0;
  let penalty = 0;
  for (const s of allocationOrder(states, month, trancheId)) {
    if (remaining <= BALANCE_EPSILON) break;
    const wanted = penaltyFromCash ? principalFromCash(remaining, s.penaltyRate, allowanceLeft(s, month)) : remaining;
    const x = Math.min(wanted, s.balance);
    const p = applyPrepayment(s, month, x, effect, ensureRow);
    principal += x;
    penalty += p;
    remaining -= penaltyFromCash ? x + p : x;
  }
  const unused = remaining > BALANCE_EPSILON ? remaining : 0;
  return { principal, penalty, unused };
}

function isRecurringDue(p: RecurringPrepayment, month: number): boolean {
  const start = p.startMonth ?? 1;
  if (month < start || (p.endMonth !== undefined && month > p.endMonth)) return false;
  return p.everyMonths >= 1 && (month - start + 1) % p.everyMonths === 0;
}

/**
 * Simule l'échéancier mois par mois de tranches parallèles, avec
 * remboursements anticipés et refinancement éventuels.
 *
 * Ordre des opérations pour chaque mois : échéances normales, puis
 * remboursements anticipés (ponctuels puis récurrents), puis refinancement.
 */
export function simulate(input: SimulationInput, options: SimulationOptions = DEFAULT_OPTIONS): SimulationResult {
  const penaltyConfig = input.penalty ?? DEFAULT_PENALTY;
  const prepayments: readonly Prepayment[] = input.prepayments ?? [];
  const states = input.tranches.map((t) => initState(t, options, penaltyConfig));
  const perTranche: Record<string, TrancheMonth[]> = {};
  for (const t of input.tranches) perTranche[t.id] = [];

  // Sommes mises de côté par les remboursements « jusqu'au budget ».
  const budgetSavings = new Map<Prepayment, number>();

  const months: MonthRow[] = [];
  const totals = { payments: 0, interest: 0, principal: 0, prepayments: 0, penalties: 0, fees: 0, cashOut: 0 };
  let unusedPrepayment = 0;
  let endMonth = 0;

  for (let month = 1; month <= MAX_MONTHS && states.some((s) => s.balance > 0); month++) {
    // 1. Échéances normales.
    const rows: TrancheMonth[] = [];
    for (const s of states) {
      s.current = null;
      if (month < s.tranche.startMonth || s.balance <= 0) continue;
      s.current = stepTranche(s, month);
      rows.push(s.current);
      perTranche[s.tranche.id]!.push(s.current);
    }
    const regularPayment = sum(rows, (r) => r.payment);
    const ensureRow: RowFactory = (s) => {
      if (s.current) return s.current;
      const row: TrancheMonth = {
        month,
        trancheId: s.tranche.id,
        openingBalance: s.balance,
        interest: 0,
        principal: 0,
        payment: 0,
        prepayment: 0,
        penalty: 0,
        refinanced: 0,
        closingBalance: s.balance,
      };
      s.current = row;
      rows.push(row);
      perTranche[s.tranche.id]!.push(row);
      return row;
    };

    // 2. Remboursements anticipés.
    let penalty = 0;
    for (const p of prepayments) {
      const effect = p.effect ?? 'reduceDuration';
      if (p.kind === 'oneOff') {
        if (p.month !== month || p.amount <= 0) continue;
        const r = allocate(states, month, p.amount, effect, p.trancheId, false, ensureRow);
        penalty += r.penalty;
        unusedPrepayment += r.unused;
        continue;
      }
      let cash: number;
      let penaltyFromCash = false;
      if (p.amount.type === 'budget') {
        const saved = (budgetSavings.get(p) ?? 0) + Math.max(0, p.amount.monthlyBudget - regularPayment);
        budgetSavings.set(p, saved);
        if (!isRecurringDue(p, month)) continue;
        budgetSavings.set(p, 0);
        cash = saved;
        penaltyFromCash = p.amount.penaltyWithinBudget ?? false;
      } else {
        if (!isRecurringDue(p, month)) continue;
        cash = p.amount.amount;
      }
      if (cash <= 0 || !states.some((s) => s.balance > 0)) continue;
      const r = allocate(states, month, cash, effect, p.trancheId, penaltyFromCash, ensureRow);
      penalty += r.penalty;
      // L'épargne « budget » restante après solde du prêt n'est pas un remboursement perdu.
      if (p.amount.type === 'fixed') unusedPrepayment += r.unused;
    }

    // 3. Refinancement.
    let fees = 0;
    let refinanced = 0;
    let financed = 0;
    const refi = input.refinancing;
    if (refi && refi.month === month) {
      const r = refinance(states, month, refi, options, penaltyConfig, ensureRow);
      penalty += r.penalty;
      fees = r.fees;
      refinanced = r.refinanced;
      financed = r.financed;
      if (r.state) {
        states.push(r.state);
        perTranche[r.state.tranche.id] = [];
      }
    }

    let closingBalance = 0;
    for (const s of states) if (isDisbursed(s, month)) closingBalance += s.balance;

    const prepayment = sum(rows, (r) => r.prepayment);
    const row: MonthRow = {
      month,
      payment: regularPayment,
      interest: sum(rows, (r) => r.interest),
      principal: sum(rows, (r) => r.principal),
      prepayment,
      penalty,
      fees,
      refinanced,
      cashOut: regularPayment + prepayment + penalty + fees - financed,
      closingBalance,
      tranches: rows,
    };
    months.push(row);
    totals.payments += row.payment;
    totals.interest += row.interest;
    totals.principal += row.principal;
    totals.prepayments += row.prepayment;
    totals.penalties += row.penalty;
    totals.fees += row.fees;
    totals.cashOut += row.cashOut;
    if (rows.length > 0 || row.prepayment > 0 || row.refinanced > 0) endMonth = month;
  }

  return { months: months.slice(0, endMonth), perTranche, totals, endMonth, unusedPrepayment };
}

interface RefinanceResult {
  penalty: number;
  fees: number;
  refinanced: number;
  financed: number;
  state: TrancheState | null;
}

function refinance(
  states: readonly TrancheState[],
  month: number,
  refi: Refinancing,
  options: SimulationOptions,
  penaltyConfig: PenaltyConfig,
  ensureRow: RowFactory,
): RefinanceResult {
  let refinanced = 0;
  let penalty = 0;
  for (const s of states) {
    if (s.balance <= 0 || !isDisbursed(s, month)) continue;
    const amount = s.balance;
    const left = allowanceLeft(s, month);
    const p = penaltyFor(amount, s.penaltyRate, left);
    const row = ensureRow(s);
    setBalance(s, 0);
    row.refinanced += amount;
    row.penalty += p;
    refinanced += amount;
    penalty += p;
  }
  const fees = refi.deedCosts + refi.processingFees;
  const financed = refi.financeCosts ? penalty + fees : 0;
  const amount = refinanced + financed;
  if (amount <= BALANCE_EPSILON) return { penalty, fees, refinanced, financed, state: null };
  const tranche: Tranche = {
    id: refi.trancheId ?? DEFAULT_REFINANCING_TRANCHE_ID,
    label: 'Refinancement',
    amount,
    durationMonths: refi.durationMonths,
    annualRate: refi.annualRate,
    startMonth: month + 1,
    amortization: refi.amortization ?? 'annuity',
  };
  return { penalty, fees, refinanced, financed, state: initState(tranche, options, penaltyConfig) };
}

/** Regroupe un échéancier mensuel par année de crédit (mois 1–12 = année 1). */
export function aggregateByYear(months: readonly MonthRow[]): YearRow[] {
  const years: YearRow[] = [];
  for (const m of months) {
    const year = creditYear(m.month) + 1;
    let y = years[years.length - 1];
    if (!y || y.year !== year) {
      y = {
        year,
        firstMonth: m.month,
        lastMonth: m.month,
        payment: 0,
        interest: 0,
        principal: 0,
        prepayment: 0,
        penalty: 0,
        fees: 0,
        cashOut: 0,
        closingBalance: 0,
      };
      years.push(y);
    }
    y.lastMonth = m.month;
    y.payment += m.payment;
    y.interest += m.interest;
    y.principal += m.principal;
    y.prepayment += m.prepayment;
    y.penalty += m.penalty;
    y.fees += m.fees;
    y.cashOut += m.cashOut;
    y.closingBalance = m.closingBalance;
  }
  return years;
}

function sum<T>(items: readonly T[], f: (item: T) => number): number {
  let total = 0;
  for (const item of items) total += f(item);
  return total;
}
