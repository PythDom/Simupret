import { useMemo, useState } from 'react';
import { formatEuro } from '../format';
import { SelectField } from '../components/fields';
import { ScenarioPicker } from '../components/ScenarioPicker';
import { trancheSeries } from '../components/charts/data';
import { Card, ErrorList, Notice } from '../components/ui';
import { useScenarioComputation } from '../state/derived';
import { buildRows, type Granularity } from '../state/tableRows';
import { useStore } from '../state/context';

export default function Amortissement() {
  const { state } = useStore();
  const scenario = state.scenarios.find((s) => s.id === state.selectedScenarioId);
  const computation = useScenarioComputation(scenario, state);
  const [view, setView] = useState<string>('all');
  const [granularity, setGranularity] = useState<Granularity>('month');

  const result = computation?.result ?? null;
  const series = useMemo(() => (scenario && result ? trancheSeries(scenario.tranches, result) : []), [scenario, result]);
  const activeView = view === 'all' || series.some((s) => s.key === view) ? view : 'all';
  const rows = useMemo(() => {
    if (!result) return [];
    const source = activeView === 'all' ? result.months : (result.perTranche[activeView] ?? []);
    return buildRows(source, granularity, state.settings.firstPaymentDate);
  }, [result, activeView, granularity, state.settings.firstPaymentDate]);

  if (!scenario) return <Notice>Créez d&apos;abord un scénario.</Notice>;
  const showPrepay = rows.some((r) => r.prepayment > 0 || r.penalty > 0);

  return (
    <div className="space-y-4">
      <Card title="Tableau d'amortissement">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ScenarioPicker />
          <SelectField
            label="Affichage"
            value={activeView}
            options={[{ value: 'all', label: 'Consolidé (toutes tranches)' }, ...series.map((s) => ({ value: s.key, label: s.label }))]}
            onChange={setView}
          />
          <SelectField<Granularity>
            label="Période"
            value={granularity}
            options={[
              { value: 'month', label: 'Mois par mois' },
              { value: 'year', label: 'Année par année' },
            ]}
            onChange={setGranularity}
          />
        </div>
        {computation ? <ErrorList errors={computation.errors} /> : null}
      </Card>

      {result ? (
        <div className="card overflow-hidden p-0">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <caption className="sr-only">
                Tableau d&apos;amortissement {granularity === 'month' ? 'mensuel' : 'annuel'} — {scenario.name}
              </caption>
              <thead className="sticky top-0 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <tr>
                  <th className="px-3 py-2">{granularity === 'month' ? 'Mois' : 'Année'}</th>
                  <th className="px-3 py-2">{granularity === 'month' ? 'Échéance' : 'Année civile'}</th>
                  <th className="px-3 py-2 text-right">{granularity === 'month' ? 'Mensualité' : 'Total payé'}</th>
                  <th className="px-3 py-2 text-right">Intérêts</th>
                  <th className="px-3 py-2 text-right">Capital</th>
                  {showPrepay ? <th className="px-3 py-2 text-right">Rbt anticipé</th> : null}
                  {showPrepay ? <th className="px-3 py-2 text-right">Indemnité</th> : null}
                  <th className="px-3 py-2 text-right">Solde restant dû</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.map((r) => (
                  <tr key={r.key} className="num hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-1.5">{r.period}</td>
                    <td className="px-3 py-1.5">{r.date}</td>
                    <td className="px-3 py-1.5 text-right">{formatEuro(r.payment)}</td>
                    <td className="px-3 py-1.5 text-right">{formatEuro(r.interest)}</td>
                    <td className="px-3 py-1.5 text-right">{formatEuro(r.principal)}</td>
                    {showPrepay ? <td className="px-3 py-1.5 text-right">{r.prepayment ? formatEuro(r.prepayment) : ''}</td> : null}
                    {showPrepay ? <td className="px-3 py-1.5 text-right">{r.penalty ? formatEuro(r.penalty) : ''}</td> : null}
                    <td className="px-3 py-1.5 text-right">{formatEuro(r.closingBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
