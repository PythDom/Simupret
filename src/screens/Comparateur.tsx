import { useMemo, type ReactNode } from 'react';
import type { ScenarioSummary } from '../engine';
import { formatDate, formatDuration, formatEuro, formatEuroRounded, formatPercent } from '../format';
import { Card, Notice } from '../components/ui';
import { computeScenario, monthDate } from '../state/derived';
import { useStore } from '../state/context';
import { MAX_COMPARE } from '../state/reducer';

interface Row {
  label: string;
  value: (s: ScenarioSummary) => number | null;
  format: (v: number, s: ScenarioSummary) => ReactNode;
  /** Le meilleur est la valeur la plus basse (`min`) ou la plus haute (`max`). */
  best?: 'min' | 'max';
  hint?: string;
}

export default function Comparateur() {
  const { state, dispatch } = useStore();
  const { settings } = state;
  const selected = state.scenarios.filter((s) => state.compareIds.includes(s.id));
  const computed = useMemo(
    () => selected.map((s) => ({ scenario: s, computation: computeScenario(s, settings) })),
    [selected, settings],
  );

  const rows: Row[] = [
    { label: 'Première mensualité', value: (s) => s.firstPayment, format: (v) => formatEuro(v) },
    { label: 'Mensualité maximale', value: (s) => s.peakPayment, format: (v) => formatEuro(v), best: 'min' },
    { label: 'Mensualité minimale', value: (s) => s.lowestPayment, format: (v) => formatEuro(v) },
    { label: 'Intérêts totaux', value: (s) => s.interest, format: (v) => formatEuroRounded(v), best: 'min' },
    { label: 'Indemnités de remploi', value: (s) => s.penalties, format: (v) => formatEuroRounded(v) },
    {
      label: 'Frais et assurances',
      value: (s) => s.upfrontCosts + s.refinancingFees + s.balanceInsurance + s.linkedCosts,
      format: (v) => formatEuroRounded(v),
      best: 'min',
    },
    { label: 'Réductions', value: (s) => s.reductions, format: (v) => (v > 0 ? `− ${formatEuroRounded(v)}` : '—') },
    { label: 'Coût total', value: (s) => s.totalCost, format: (v) => formatEuroRounded(v), best: 'min', hint: 'Intérêts + indemnités + frais + assurances − réductions' },
    { label: 'TAEG', value: (s) => s.taeg, format: (v) => formatPercent(v), best: 'min', hint: 'Sur les flux réels' },
    {
      label: 'Date de fin',
      value: (s) => s.endMonth,
      format: (v) => (
        <>
          {formatDate(monthDate(settings.firstPaymentDate, v))}
          <span className="block text-xs text-slate-500">{formatDuration(v)}</span>
        </>
      ),
      best: 'min',
    },
    { label: 'Marge minimale', value: (s) => s.minMargin, format: (v) => formatEuro(v), best: 'max', hint: `Budget ${formatEuroRounded(settings.monthlyBudget)} − mensualité maximale` },
  ];

  return (
    <div className="space-y-4">
      <Card title="Scénarios à comparer">
        <p className="text-sm text-slate-600 dark:text-slate-400">Choisissez de 2 à {MAX_COMPARE} scénarios.</p>
        <div className="flex flex-wrap gap-2">
          {state.scenarios.map((s) => {
            const on = state.compareIds.includes(s.id);
            const disabled = !on && state.compareIds.length >= MAX_COMPARE;
            return (
              <label
                key={s.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
                  on ? 'border-brand-500 bg-brand-50 dark:bg-slate-800' : 'border-slate-300 dark:border-slate-700'
                } ${disabled ? 'opacity-50' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  disabled={disabled}
                  onChange={() => dispatch({ type: 'compare/toggle', id: s.id })}
                  className="h-4 w-4"
                />
                {s.name}
              </label>
            );
          })}
        </div>
      </Card>

      {selected.length < 2 ? (
        <Notice>Sélectionnez au moins deux scénarios pour les comparer.</Notice>
      ) : (
        <Card title="Comparaison">
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[32rem] text-sm">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white py-2 pr-3 text-left font-medium text-slate-500 dark:bg-slate-900" />
                  {computed.map(({ scenario }) => (
                    <th key={scenario.id} scope="col" className="px-2 py-2 text-right font-semibold">
                      {scenario.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rows.map((row) => {
                  const values = computed.map(({ computation }) => (computation.summary ? row.value(computation.summary) : null));
                  const valid = values.filter((v): v is number => v !== null);
                  const best = row.best && valid.length > 1 ? (row.best === 'min' ? Math.min(...valid) : Math.max(...valid)) : null;
                  return (
                    <tr key={row.label}>
                      <th scope="row" className="sticky left-0 bg-white py-2 pr-3 text-left font-medium dark:bg-slate-900">
                        {row.label}
                        {row.hint ? <span className="block text-xs font-normal text-slate-500">{row.hint}</span> : null}
                      </th>
                      {computed.map(({ scenario, computation }, i) => {
                        const v = values[i];
                        const s = computation.summary;
                        const isBest = best !== null && v !== null && v !== undefined && Math.abs(v - best) < 1e-6;
                        return (
                          <td key={scenario.id} className={`num relative px-2 py-2 text-right ${isBest ? 'font-semibold text-emerald-700 dark:text-emerald-400' : ''}`}>
                            {!s ? (
                              <span className="text-red-600">Scénario invalide</span>
                            ) : v === null || v === undefined ? (
                              row.format(0, s)
                            ) : (
                              <>
                                {row.format(v, s)}
                                {isBest ? <span className="sr-only"> (meilleur)</span> : null}
                              </>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">La meilleure valeur de chaque ligne est en vert.</p>
        </Card>
      )}
    </div>
  );
}
