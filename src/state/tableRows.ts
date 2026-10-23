import type { MonthRow, TrancheMonth } from '../engine';
import { formatDate } from '../format';
import { monthDate } from './derived';

/** Ligne affichée (mois ou année), consolidée ou pour une tranche. */
export interface TableRow {
  key: string;
  period: string;
  date: string;
  payment: number;
  interest: number;
  principal: number;
  prepayment: number;
  penalty: number;
  closingBalance: number;
}

export type Granularity = 'month' | 'year';

function fromMonth(m: MonthRow | TrancheMonth): Omit<TableRow, 'key' | 'period' | 'date'> {
  return {
    payment: m.payment,
    interest: m.interest,
    principal: m.principal,
    prepayment: m.prepayment,
    penalty: m.penalty,
    closingBalance: m.closingBalance,
  };
}

/** Construit les lignes du tableau (exporté pour l'export CSV). */
export function buildRows(
  source: readonly (MonthRow | TrancheMonth)[],
  granularity: Granularity,
  firstPaymentDate: string,
): TableRow[] {
  if (granularity === 'month') {
    return source.map((m) => ({
      key: String(m.month),
      period: String(m.month),
      date: formatDate(monthDate(firstPaymentDate, m.month)),
      ...fromMonth(m),
    }));
  }
  const rows: TableRow[] = [];
  for (const m of source) {
    const year = Math.floor((m.month - 1) / 12) + 1;
    let r = rows[rows.length - 1];
    if (!r || r.key !== String(year)) {
      r = {
        key: String(year),
        period: String(year),
        date: String(monthDate(firstPaymentDate, m.month).getFullYear()),
        payment: 0,
        interest: 0,
        principal: 0,
        prepayment: 0,
        penalty: 0,
        closingBalance: 0,
      };
      rows.push(r);
    }
    r.payment += m.payment;
    r.interest += m.interest;
    r.principal += m.principal;
    r.prepayment += m.prepayment;
    r.penalty += m.penalty;
    r.closingBalance = m.closingBalance;
  }
  return rows;
}
