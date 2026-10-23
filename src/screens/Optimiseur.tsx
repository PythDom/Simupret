import { useMemo } from 'react';
import { QUOTITE_TIER_LABELS, optimize, validateOptimizerInput, type OptimizerConfiguration } from '../engine';
import { formatDate, formatDuration, formatEuro, formatEuroRounded, formatPercent } from '../format';
import { Button, Card, ErrorList, IndicativeBadge, Notice, Stat } from '../components/ui';
import { monthDate } from '../state/derived';
import { configurationToScenario } from '../state/scenarioFactory';
import { useStore } from '../state/context';

function describeTranches(c: OptimizerConfiguration): string {
  return c.tranches
    .map((t) => `${formatEuroRounded(t.amount)} sur ${formatDuration(t.durationMonths)} à ${formatPercent(t.annualRate)}`)
    .join(' + ');
}

export default function Optimiseur() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const input = useMemo(
    () => ({
      amount: s.amount,
      propertyValue: s.propertyValue,
      monthlyBudget: s.monthlyBudget,
      maxDurationMonths: s.maxDurationMonths,
      minMargin: s.minMargin,
      maxTranches: s.maxTranches,
      rateGrid: s.rateGrid,
      penalty: s.penalty,
      costs: s.costs,
    }),
    [s],
  );
  const errors = useMemo(() => validateOptimizerInput(input), [input]);
  const result = useMemo(
    () => (errors.length === 0 ? optimize(input, { rateConvention: s.rateConvention }) : null),
    [errors, input, s.rateConvention],
  );

  function createScenario(c: OptimizerConfiguration, name: string) {
    dispatch({ type: 'scenario/add', scenario: configurationToScenario(c, name) });
    window.location.hash = '#/scenarios';
  }

  return (
    <div className="space-y-4">
      <Card title={<span className="flex items-center gap-2">Optimiseur <IndicativeBadge /></span>}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Recherche des combinaisons de 1 à {s.maxTranches} tranches (durées de la grille, montants par pas de 5 000 €) qui
          minimisent le coût total (intérêts, frais et assurances), avec une mensualité toujours inférieure ou égale à{' '}
          <strong>{formatEuro(s.monthlyBudget - s.minMargin)}</strong> (budget − marge). Modifiez les paramètres dans
          l&apos;écran « Paramètres ».
        </p>
        <ErrorList errors={errors} />
        {result ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Stat label="Montant" value={formatEuroRounded(s.amount)} />
            <Stat label="Quotité" value={formatPercent(result.quotite, 1)} hint={`Grille ${QUOTITE_TIER_LABELS[result.tier]}`} />
            <Stat label="Durée maximale" value={formatDuration(s.maxDurationMonths)} />
            <Stat label="Combinaisons évaluées" value={result.evaluated.toLocaleString('fr-BE')} />
          </div>
        ) : null}
      </Card>

      {result?.message ? <Notice>{result.message}</Notice> : null}

      {result && result.top.length > 0 ? (
        <section aria-labelledby="top-title" className="space-y-3">
          <h2 id="top-title" className="text-lg font-semibold">
            Meilleures configurations
          </h2>
          {result.top.map((c, i) => (
            <ResultCard
              key={i}
              rank={i + 1}
              config={c}
              firstPaymentDate={s.firstPaymentDate}
              onCreate={() => createScenario(c, `Optimiseur n° ${i + 1}`)}
            />
          ))}
        </section>
      ) : null}

      {result?.flexibility ? (
        <section aria-labelledby="flex-title" className="space-y-3">
          <h2 id="flex-title" className="text-lg font-semibold">
            Variante « flexibilité maximale »
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Le crédit le plus long, avec chaque année un remboursement anticipé de tout ce qui dépasse la mensualité
            jusqu&apos;au budget (indemnité comprise). Vous pouvez arrêter ces versements à tout moment.
            {result.flexibilityPrice !== null ? (
              <>
                {' '}
                Prix de la flexibilité : <strong>{formatEuroRounded(result.flexibilityPrice)}</strong> de plus que la meilleure
                configuration.
              </>
            ) : null}
          </p>
          <ResultCard
            config={result.flexibility}
            firstPaymentDate={s.firstPaymentDate}
            flexible
            onCreate={() => createScenario(result.flexibility!, 'Flexibilité maximale')}
          />
        </section>
      ) : null}
    </div>
  );
}

function ResultCard({
  rank,
  config: c,
  firstPaymentDate,
  flexible,
  onCreate,
}: {
  rank?: number;
  config: OptimizerConfiguration;
  firstPaymentDate: string;
  flexible?: boolean;
  onCreate: () => void;
}) {
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">{rank ? `N° ${rank}` : 'Flexibilité maximale'}</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{describeTranches(c)}</p>
        </div>
        <Button variant="primary" onClick={onCreate}>
          Créer un scénario
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label="Coût total"
          value={formatEuroRounded(c.totalCost)}
          hint={`dont ${formatEuroRounded(c.costs)} de frais et assurances${c.penalties > 0 ? ` et ${formatEuroRounded(c.penalties)} d'indemnités` : ''}`}
        />
        <Stat label="TAEG" value={c.taeg === null ? '—' : formatPercent(c.taeg)} />
        <Stat label="Mensualité maximale" value={formatEuro(c.peakPayment)} />
        <Stat label={flexible ? 'Marge si arrêt des versements' : 'Marge minimale'} value={formatEuro(c.minMargin)} />
        <Stat label="Fin du crédit" value={formatDate(monthDate(firstPaymentDate, c.endMonth))} hint={formatDuration(c.endMonth)} />
      </div>
    </article>
  );
}
