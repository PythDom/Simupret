import { useMemo } from 'react';
import { BalanceChart, CostComparisonChart, CumulativeChart, PaymentChart, type CostBar } from '../components/charts/Charts';
import { ScenarioPicker } from '../components/ScenarioPicker';
import { Card, ErrorList, Notice } from '../components/ui';
import { computeScenario, useScenarioComputation } from '../state/derived';
import { useStore } from '../state/context';

export default function Graphiques() {
  const { state } = useStore();
  const { settings } = state;
  const scenario = state.scenarios.find((s) => s.id === state.selectedScenarioId);
  const computation = useScenarioComputation(scenario, state);

  // Comparaison des coûts : scénarios cochés dans le comparateur, sinon tous.
  const costs = useMemo<CostBar[]>(() => {
    const list = state.compareIds.length >= 2 ? state.scenarios.filter((s) => state.compareIds.includes(s.id)) : state.scenarios;
    return list.flatMap((s) => {
      const c = computeScenario(s, state);
      const m = c.summary;
      return m
        ? [
            {
              name: s.name,
              interest: m.interest,
              penalties: m.penalties,
              fees: m.upfrontCosts + m.refinancingFees,
              insurance: m.balanceInsurance + m.linkedCosts,
            },
          ]
        : [];
    });
  }, [state]);

  if (!scenario) return <Notice>Créez d&apos;abord un scénario.</Notice>;
  const result = computation?.result;

  return (
    <div className="space-y-4">
      <Card>
        <ScenarioPicker />
        {computation ? <ErrorList errors={computation.errors} /> : null}
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Survolez ou touchez un graphique pour voir les valeurs. Les données détaillées sont dans le tableau d&apos;amortissement.
        </p>
      </Card>
      {result ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <BalanceChart result={result} tranches={scenario.tranches} firstPaymentDate={settings.firstPaymentDate} />
          <PaymentChart result={result} tranches={scenario.tranches} firstPaymentDate={settings.firstPaymentDate} budget={settings.monthlyBudget} />
          <CumulativeChart result={result} firstPaymentDate={settings.firstPaymentDate} />
          {costs.length > 0 ? <CostComparisonChart data={costs} /> : null}
        </div>
      ) : null}
    </div>
  );
}
