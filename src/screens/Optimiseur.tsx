import { useMemo, useState } from 'react';
import { QUOTITE_TIER_LABELS, type OptimizerConfiguration } from '../engine';
import { formatDate, formatDuration, formatEuro, formatEuroRounded, formatPercent } from '../format';
import { SelectField } from '../components/fields';
import { Button, Card, ErrorList, IndicativeBadge, Notice, Stat } from '../components/ui';
import { bankById } from '../state/banks';
import { monthDate } from '../state/derived';
import { optimizeAcrossBanks, type BankConfiguration } from '../state/optimizeBanks';
import { configurationToScenario } from '../state/scenarioFactory';
import { useStore } from '../state/context';

function describeTranches(c: OptimizerConfiguration): string {
  return c.tranches
    .map((t) => `${formatEuroRounded(t.amount)} sur ${formatDuration(t.durationMonths)} à ${formatPercent(t.annualRate)}`)
    .join(' + ');
}

const ALL_BANKS = 'toutes';

export default function Optimiseur() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const [choice, setChoice] = useState(state.banks.length > 1 ? ALL_BANKS : s.defaultBankId);
  const banks = useMemo(
    () => (choice === ALL_BANKS ? state.banks : [bankById(state.banks, choice)]),
    [choice, state.banks],
  );
  const result = useMemo(() => optimizeAcrossBanks(s, banks), [s, banks]);
  const showBank = banks.length > 1;

  function createScenario(r: BankConfiguration, name: string) {
    dispatch({ type: 'scenario/add', scenario: configurationToScenario(r.config, name, r.bank.id) });
    window.location.hash = '#/scenarios';
  }

  return (
    <div className="space-y-4">
      <Card title={<span className="flex items-center gap-2">Optimiseur <IndicativeBadge /></span>}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Recherche des combinaisons de 1 à {s.maxTranches} tranches (durées de la grille, montants par pas de 5 000 €) qui
          minimisent le coût total (intérêts, frais et assurances), avec une mensualité toujours inférieure ou égale à{' '}
          <strong>{formatEuro(s.monthlyBudget - s.minMargin)}</strong> (budget − marge). Projet et budget : écran
          « Paramètres » ; taux et frais : écran « Banques ».
        </p>
        <SelectField
          label="Banque"
          value={choice}
          options={[
            ...(state.banks.length > 1 ? [{ value: ALL_BANKS, label: 'Toutes les banques' }] : []),
            ...state.banks.map((b) => ({ value: b.id, label: b.name })),
          ]}
          onChange={setChoice}
        />
        {result ? <ErrorList errors={result.errors} /> : null}
        {result && result.errors.length === 0 ? (
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
          {result.top.map((r, i) => (
            <ResultCard
              key={i}
              rank={i + 1}
              config={r.config}
              bankName={showBank ? r.bank.name : undefined}
              firstPaymentDate={s.firstPaymentDate}
              onCreate={() => createScenario(r, `Optimiseur n° ${i + 1}${showBank ? ` — ${r.bank.name}` : ''}`)}
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
            config={result.flexibility.config}
            bankName={showBank ? result.flexibility.bank.name : undefined}
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
  bankName,
  firstPaymentDate,
  flexible,
  onCreate,
}: {
  rank?: number;
  config: OptimizerConfiguration;
  bankName?: string;
  firstPaymentDate: string;
  flexible?: boolean;
  onCreate: () => void;
}) {
  return (
    <article className="card space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold">
            {rank ? `N° ${rank}` : 'Flexibilité maximale'}
            {bankName ? <span className="font-normal text-slate-600 dark:text-slate-400"> — {bankName}</span> : null}
          </h3>
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
