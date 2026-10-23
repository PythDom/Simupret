import type { SimulationResult, Tranche } from '../../engine';
import { DEFAULT_REFINANCING_TRANCHE_ID } from '../../engine';

export interface SeriesDef {
  key: string;
  label: string;
}

/** Séries d'un scénario : ses tranches puis l'éventuelle tranche de refinancement. */
export function trancheSeries(tranches: readonly Tranche[], result: SimulationResult): SeriesDef[] {
  const defs: SeriesDef[] = tranches.map((t, i) => ({ key: t.id, label: t.label || `Tranche ${i + 1}` }));
  for (const id of Object.keys(result.perTranche)) {
    if (!defs.some((d) => d.key === id)) {
      defs.push({ key: id, label: id === DEFAULT_REFINANCING_TRANCHE_ID ? 'Refinancement' : id });
    }
  }
  return defs;
}

export type MonthPoint = { month: number } & Record<string, number>;

/** Solde restant dû par tranche en fin de mois (mois 0 = capital initial débloqué). */
export function balanceData(result: SimulationResult, series: readonly SeriesDef[]): MonthPoint[] {
  const last = new Map<string, number>();
  const points: MonthPoint[] = [];
  const start: MonthPoint = { month: 0 };
  for (const s of series) {
    const first = result.perTranche[s.key]?.[0];
    const initial = first && first.month === 1 ? first.openingBalance : 0;
    start[s.key] = initial;
    last.set(s.key, initial);
  }
  points.push(start);
  for (const m of result.months) {
    const p: MonthPoint = { month: m.month };
    for (const s of series) {
      const row = m.tranches.find((t) => t.trancheId === s.key);
      if (row) last.set(s.key, row.closingBalance);
      p[s.key] = last.get(s.key) ?? 0;
    }
    // Une tranche débloquée plus tard n'apparaît qu'à sa première ligne.
    points.push(p);
  }
  return points;
}

/** Échéance normale par tranche et par mois. */
export function paymentData(result: SimulationResult, series: readonly SeriesDef[]): MonthPoint[] {
  return result.months.map((m) => {
    const p: MonthPoint = { month: m.month };
    for (const s of series) p[s.key] = m.tranches.find((t) => t.trancheId === s.key)?.payment ?? 0;
    return p;
  });
}

/** Intérêts cumulés et capital remboursé cumulé (amortissement + anticipé + refinancement exclu). */
export function cumulativeData(result: SimulationResult): MonthPoint[] {
  let interest = 0;
  let capital = 0;
  const points: MonthPoint[] = [{ month: 0, interest: 0, capital: 0 }];
  for (const m of result.months) {
    interest += m.interest;
    capital += m.principal + m.prepayment;
    points.push({ month: m.month, interest, capital });
  }
  return points;
}
