import { useMemo } from 'react';
import {
  analyzeRefinancing,
  compareOpportunity,
  type ScenarioAnalysis,
  type AmortizationType,
  type Prepayment,
  type PrepaymentEffect,
  type RecurringAmount,
  type Refinancing,
  type Tranche,
  type ValidationError,
} from '../engine';
import { formatDate, formatDuration, formatEuro, formatEuroRounded, formatPercent } from '../format';
import { CheckboxField, NumberField, PercentField, SelectField, TextField } from '../components/fields';
import { Button, Card, ErrorList, Grid, Stat } from '../components/ui';
import { computeScenario, monthDate, scenarioInput } from '../state/derived';
import { defaultTranche, newScenario, zeroRateTranche } from '../state/scenarioFactory';
import { useStore } from '../state/context';
import type { Scenario, Settings } from '../state/types';

function fieldError(errors: readonly ValidationError[], path: string): string | null {
  return errors.find((e) => e.field === path)?.message ?? null;
}

export default function Scenarios() {
  const { state, dispatch } = useStore();
  const scenario = state.scenarios.find((s) => s.id === state.selectedScenarioId);

  return (
    <div className="space-y-4">
      <Card
        title="Mes scénarios"
        actions={
          <Button
            variant="primary"
            onClick={() =>
              dispatch({ type: 'scenario/add', scenario: newScenario(state.settings, state.scenarios.length + 1) })
            }
          >
            Nouveau scénario
          </Button>
        }
      >
        {state.scenarios.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">Aucun scénario. Créez-en un ou utilisez l&apos;optimiseur.</p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800">
            {state.scenarios.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-2 py-2">
                <button
                  type="button"
                  className={`min-w-0 flex-1 truncate rounded-lg px-2 py-2 text-left ${
                    s.id === state.selectedScenarioId ? 'bg-brand-50 font-semibold dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                  aria-current={s.id === state.selectedScenarioId ? 'true' : undefined}
                  onClick={() => dispatch({ type: 'scenario/select', id: s.id })}
                >
                  {s.name}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {s.tranches.length} tranche{s.tranches.length > 1 ? 's' : ''}
                  </span>
                </button>
                <Button variant="ghost" onClick={() => dispatch({ type: 'scenario/duplicate', id: s.id })} ariaLabel={`Dupliquer ${s.name}`}>
                  Dupliquer
                </Button>
                <Button
                  variant="danger"
                  ariaLabel={`Supprimer ${s.name}`}
                  onClick={() => {
                    if (window.confirm(`Supprimer le scénario « ${s.name} » ?`)) dispatch({ type: 'scenario/delete', id: s.id });
                  }}
                >
                  Supprimer
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {scenario ? <ScenarioEditor key={scenario.id} scenario={scenario} settings={state.settings} /> : null}
    </div>
  );
}

function ScenarioEditor({ scenario, settings }: { scenario: Scenario; settings: Settings }) {
  const { dispatch } = useStore();
  const update = (patch: Partial<Omit<Scenario, 'id'>>) => dispatch({ type: 'scenario/update', id: scenario.id, patch });
  const computation = useMemo(() => computeScenario(scenario, settings), [scenario, settings]);
  const { errors, summary } = computation;

  const updateTranche = (i: number, patch: Partial<Tranche>) =>
    update({ tranches: scenario.tranches.map((t, k) => (k === i ? { ...t, ...patch } : t)) });
  const updatePrepayment = (i: number, p: Prepayment) =>
    update({ prepayments: scenario.prepayments.map((x, k) => (k === i ? p : x)) });
  const total = scenario.tranches.reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <Card title="Scénario">
        <TextField
          label="Nom du scénario"
          value={scenario.name}
          onChange={(name) => update({ name })}
          error={scenario.name.trim() === '' ? 'Donnez un nom au scénario.' : null}
        />
      </Card>

      <Card title="Synthèse">
        <ErrorList errors={errors} />
        {summary ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Première mensualité" value={formatEuro(summary.firstPayment)} />
            <Stat
              label="Marge minimale"
              value={formatEuro(summary.minMargin)}
              hint={summary.minMargin < settings.minMargin ? 'Sous la marge de sécurité' : `Budget ${formatEuroRounded(settings.monthlyBudget)}`}
            />
            <Stat label="Intérêts totaux" value={formatEuroRounded(summary.interest)} />
            <Stat label="Indemnités de remploi" value={formatEuroRounded(summary.penalties)} />
            <Stat label="Frais et assurances" value={formatEuroRounded(summary.upfrontCosts + summary.balanceInsurance + summary.linkedCosts + summary.refinancingFees)} />
            {summary.reductions > 0 ? <Stat label="Réductions" value={`− ${formatEuroRounded(summary.reductions)}`} hint="Primes, subsides" /> : null}
            <Stat label="Coût total" value={formatEuroRounded(summary.totalCost)} hint="Intérêts + indemnités + frais + assurances" />
            <Stat label="TAEG" value={summary.taeg === null ? '—' : formatPercent(summary.taeg)} hint="Sur les flux réels" />
            <Stat
              label="Fin du crédit"
              value={formatDate(monthDate(settings.firstPaymentDate, summary.endMonth))}
              hint={formatDuration(summary.endMonth)}
            />
          </div>
        ) : null}
        {total !== settings.amount ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Total des tranches : {formatEuroRounded(total)} (montant du projet : {formatEuroRounded(settings.amount)}).
          </p>
        ) : null}
      </Card>

      <Card
        title="Tranches"
        actions={
          scenario.tranches.length < 6 ? (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => update({ tranches: [...scenario.tranches, defaultTranche(settings, 50_000)] })}>
                Ajouter une tranche
              </Button>
              <Button onClick={() => update({ tranches: [...scenario.tranches, zeroRateTranche()] })}>
                Tranche à 0 % (type Rénopack)
              </Button>
            </div>
          ) : null
        }
      >
        <div className="space-y-4">
          {scenario.tranches.map((t, i) => (
            <fieldset key={t.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
              <legend className="px-1 text-sm font-semibold">{t.label || `Tranche ${i + 1}`}</legend>
              <Grid>
                <TextField label="Libellé" value={t.label ?? ''} onChange={(label) => updateTranche(i, { label })} />
                <NumberField
                  label="Montant"
                  unit="€"
                  value={t.amount}
                  onChange={(amount) => updateTranche(i, { amount })}
                  error={fieldError(errors, `tranches[${i}].amount`)}
                />
                <NumberField
                  label="Durée"
                  unit="mois"
                  integer
                  value={t.durationMonths}
                  onChange={(durationMonths) => updateTranche(i, { durationMonths })}
                  hint={formatDuration(t.durationMonths)}
                  error={fieldError(errors, `tranches[${i}].durationMonths`)}
                />
                <PercentField
                  label="Taux annuel fixe"
                  value={t.annualRate}
                  onChange={(annualRate) => updateTranche(i, { annualRate })}
                  error={fieldError(errors, `tranches[${i}].annualRate`)}
                />
                <NumberField
                  label="Mois de la première échéance"
                  integer
                  value={t.startMonth}
                  onChange={(startMonth) => updateTranche(i, { startMonth })}
                  hint={t.startMonth > 1 ? `Fonds débloqués au mois ${t.startMonth - 1}` : 'Dès le début du crédit'}
                  error={fieldError(errors, `tranches[${i}].startMonth`)}
                />
                <SelectField<AmortizationType>
                  label="Amortissement"
                  value={t.amortization}
                  options={[
                    { value: 'annuity', label: 'Mensualités constantes' },
                    { value: 'constantCapital', label: 'Amortissement constant du capital' },
                  ]}
                  onChange={(amortization) => updateTranche(i, { amortization })}
                />
                <NumberField
                  label="Réduction du montant à rembourser"
                  unit="€"
                  min={0}
                  value={t.reduction ?? 0}
                  onChange={(reduction) => updateTranche(i, { reduction })}
                  hint="Prime ou subside déduit du capital à rembourser (facultatif)."
                  error={fieldError(errors, `tranches[${i}].reduction`)}
                />
              </Grid>
              {scenario.tranches.length > 1 ? (
                <div className="mt-3">
                  <Button
                    variant="danger"
                    onClick={() =>
                      update({
                        tranches: scenario.tranches.filter((_, k) => k !== i),
                        prepayments: scenario.prepayments.map((p) =>
                          p.trancheId === t.id ? { ...p, trancheId: undefined } : p,
                        ),
                      })
                    }
                  >
                    Retirer cette tranche
                  </Button>
                </div>
              ) : null}
            </fieldset>
          ))}
        </div>
      </Card>

      <Card
        title="Remboursements anticipés"
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() =>
                update({ prepayments: [...scenario.prepayments, { kind: 'oneOff', month: 12, amount: 10_000 }] })
              }
            >
              Ponctuel
            </Button>
            <Button
              onClick={() =>
                update({
                  prepayments: [
                    ...scenario.prepayments,
                    { kind: 'recurring', everyMonths: 12, amount: { type: 'budget', monthlyBudget: settings.monthlyBudget } },
                  ],
                })
              }
            >
              Récurrent
            </Button>
          </div>
        }
      >
        {scenario.prepayments.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">Aucun remboursement anticipé.</p>
        ) : (
          <div className="space-y-4">
            {scenario.prepayments.map((p, i) => (
              <PrepaymentEditor
                key={i}
                index={i}
                prepayment={p}
                tranches={scenario.tranches}
                errors={errors}
                onChange={(np) => updatePrepayment(i, np)}
                onRemove={() => update({ prepayments: scenario.prepayments.filter((_, k) => k !== i) })}
                defaultBudget={settings.monthlyBudget}
              />
            ))}
          </div>
        )}
      </Card>

      <RefinancingEditor scenario={scenario} settings={settings} errors={errors} onChange={(refinancing) => update({ refinancing })} />

      {scenario.prepayments.length > 0 && computation.analysis ? (
        <OpportunityCard scenario={scenario} settings={settings} analysis={computation.analysis} />
      ) : null}
    </>
  );
}

function PrepaymentEditor({
  index,
  prepayment: p,
  tranches,
  errors,
  onChange,
  onRemove,
  defaultBudget,
}: {
  defaultBudget: number;
  index: number;
  prepayment: Prepayment;
  tranches: readonly Tranche[];
  errors: readonly ValidationError[];
  onChange: (p: Prepayment) => void;
  onRemove: () => void;
}) {
  const path = `prepayments[${index}]`;
  const common = (
    <>
      <SelectField
        label="Tranche concernée"
        value={p.trancheId ?? ''}
        options={[
          { value: '', label: 'Automatique (taux le plus élevé)' },
          ...tranches.map((t, i) => ({ value: t.id, label: t.label || `Tranche ${i + 1}` })),
        ]}
        onChange={(v) => onChange({ ...p, trancheId: v === '' ? undefined : v })}
      />
      <SelectField<PrepaymentEffect>
        label="Effet"
        value={p.effect ?? 'reduceDuration'}
        options={[
          { value: 'reduceDuration', label: 'Réduire la durée (garder la mensualité)' },
          { value: 'reducePayment', label: 'Réduire la mensualité (garder la durée)' },
        ]}
        onChange={(effect) => onChange({ ...p, effect })}
      />
    </>
  );

  return (
    <fieldset className="rounded-lg border border-slate-200 p-3 dark:border-slate-800">
      <legend className="px-1 text-sm font-semibold">{p.kind === 'oneOff' ? 'Remboursement ponctuel' : 'Remboursement récurrent'}</legend>
      <Grid>
        {p.kind === 'oneOff' ? (
          <>
            <NumberField
              label="Mois"
              integer
              value={p.month}
              onChange={(month) => onChange({ ...p, month })}
              error={fieldError(errors, `${path}.month`)}
            />
            <NumberField
              label="Montant"
              unit="€"
              value={p.amount}
              onChange={(amount) => onChange({ ...p, amount })}
              error={fieldError(errors, `${path}.amount`)}
            />
          </>
        ) : (
          <>
            <NumberField
              label="Tous les"
              unit="mois"
              integer
              value={p.everyMonths}
              onChange={(everyMonths) => onChange({ ...p, everyMonths })}
              error={fieldError(errors, `${path}.everyMonths`)}
            />
            <NumberField
              label="À partir du mois"
              integer
              value={p.startMonth ?? 1}
              onChange={(startMonth) => onChange({ ...p, startMonth })}
              error={fieldError(errors, `${path}.startMonth`)}
            />
            <SelectField<'fixed' | 'budget'>
              label="Montant"
              value={p.amount.type}
              options={[
                { value: 'budget', label: "Tout ce qui dépasse la mensualité jusqu'au budget" },
                { value: 'fixed', label: 'Montant fixe' },
              ]}
              onChange={(type) =>
                onChange({
                  ...p,
                  amount: type === 'fixed' ? { type, amount: 5000 } : { type, monthlyBudget: defaultBudget },
                })
              }
            />
            {p.amount.type === 'fixed' ? (
              <NumberField
                label="Montant par versement"
                unit="€"
                value={p.amount.amount}
                onChange={(amount) => onChange({ ...p, amount: { type: 'fixed', amount } })}
                error={fieldError(errors, `${path}.amount`)}
              />
            ) : (
              <BudgetAmountFields
                amount={p.amount}
                error={fieldError(errors, `${path}.amount`)}
                onChange={(amount) => onChange({ ...p, amount })}
              />
            )}
          </>
        )}
        {common}
      </Grid>
      <div className="mt-3">
        <Button variant="danger" onClick={onRemove}>
          Retirer
        </Button>
      </div>
    </fieldset>
  );
}

/** « Rembourser anticipativement » ou « investir la différence » ? */
function OpportunityCard({ scenario, settings, analysis }: { scenario: Scenario; settings: Settings; analysis: ScenarioAnalysis }) {
  const opportunity = useMemo(() => {
    const withoutPrepay = computeScenario({ ...scenario, prepayments: [] }, settings).analysis;
    if (!withoutPrepay) return null;
    return compareOpportunity(
      { result: analysis.result, costs: analysis.costs },
      { result: withoutPrepay.result, costs: withoutPrepay.costs },
      settings.investmentReturn,
    );
  }, [scenario, settings, analysis]);
  if (!opportunity) return null;
  const prepayWins = opportunity.advantagePrepay >= 0;
  return (
    <Card title="Rembourser ou investir ?">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Même effort mensuel dans les deux cas : soit les remboursements anticipés de ce scénario, soit le même crédit sans
        remboursement anticipé et la différence placée à {formatPercent(settings.investmentReturn)} net par an (modifiable
        dans « Paramètres »). Comparaison du patrimoine net après {formatDuration(opportunity.horizonMonths)}.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Patrimoine — rembourser" value={formatEuroRounded(opportunity.wealthPrepay)} />
        <Stat label="Patrimoine — investir" value={formatEuroRounded(opportunity.wealthInvest)} />
        <Stat
          label={prepayWins ? 'Avantage : rembourser' : 'Avantage : investir'}
          value={formatEuroRounded(Math.abs(opportunity.advantagePrepay))}
        />
        <Stat
          label="Rendement d'équilibre"
          value={opportunity.breakEvenReturn === null ? '—' : formatPercent(opportunity.breakEvenReturn)}
          hint="Au-delà, investir rapporte davantage"
        />
      </div>
    </Card>
  );
}

type BudgetAmount = Extract<RecurringAmount, { type: 'budget' }>;

function BudgetAmountFields({
  amount,
  error,
  onChange,
}: {
  amount: BudgetAmount;
  error: string | null;
  onChange: (a: BudgetAmount) => void;
}) {
  return (
    <>
      <NumberField
        label="Budget mensuel"
        unit="€"
        value={amount.monthlyBudget}
        onChange={(monthlyBudget) => onChange({ ...amount, monthlyBudget })}
        error={error}
      />
      <CheckboxField
        label="Indemnité comprise dans le budget"
        checked={amount.penaltyWithinBudget ?? false}
        onChange={(penaltyWithinBudget) => onChange({ ...amount, penaltyWithinBudget })}
        hint="Sinon, l'indemnité est payée en plus du versement."
      />
    </>
  );
}

function RefinancingEditor({
  scenario,
  settings,
  errors,
  onChange,
}: {
  scenario: Scenario;
  settings: Settings;
  errors: readonly ValidationError[];
  onChange: (r: Refinancing | null) => void;
}) {
  const refi = scenario.refinancing;
  const analysis = useMemo(() => {
    if (!refi || errors.length > 0) return null;
    return analyzeRefinancing(scenarioInput(scenario, settings), { rateConvention: settings.rateConvention });
  }, [refi, errors, scenario, settings]);

  return (
    <Card title="Refinancement">
      <CheckboxField
        label="Refinancer le crédit"
        checked={refi !== null}
        onChange={(on) =>
          onChange(on ? { month: 60, annualRate: 0.03, durationMonths: 180, deedCosts: 2000, processingFees: 500 } : null)
        }
        hint="Au mois choisi, le solde est remboursé (avec indemnité) et refinancé à un nouveau taux."
      />
      {refi ? (
        <>
          <Grid>
            <NumberField
              label="Mois du refinancement"
              integer
              value={refi.month}
              onChange={(month) => onChange({ ...refi, month })}
              error={fieldError(errors, 'refinancing.month')}
            />
            <PercentField
              label="Nouveau taux annuel"
              value={refi.annualRate}
              onChange={(annualRate) => onChange({ ...refi, annualRate })}
              error={fieldError(errors, 'refinancing.annualRate')}
            />
            <NumberField
              label="Nouvelle durée"
              unit="mois"
              integer
              value={refi.durationMonths}
              onChange={(durationMonths) => onChange({ ...refi, durationMonths })}
              hint={formatDuration(refi.durationMonths)}
              error={fieldError(errors, 'refinancing.durationMonths')}
            />
            <NumberField
              label="Frais d'acte du nouveau crédit"
              unit="€"
              value={refi.deedCosts}
              onChange={(deedCosts) => onChange({ ...refi, deedCosts })}
              error={fieldError(errors, 'refinancing.deedCosts')}
              hint="Montant indicatif : demandez un décompte à votre notaire."
            />
            <NumberField
              label="Frais de dossier"
              unit="€"
              value={refi.processingFees}
              onChange={(processingFees) => onChange({ ...refi, processingFees })}
              error={fieldError(errors, 'refinancing.processingFees')}
            />
            <CheckboxField
              label="Financer l'indemnité et les frais"
              checked={refi.financeCosts ?? false}
              onChange={(financeCosts) => onChange({ ...refi, financeCosts })}
              hint="Ajoutés au capital du nouveau crédit au lieu d'être payés comptant."
            />
          </Grid>
          {analysis ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat label="Coût immédiat" value={formatEuroRounded(analysis.upfrontCost)} hint="Indemnité + frais" />
              <Stat
                label={analysis.savings >= 0 ? 'Économie totale' : 'Surcoût total'}
                value={formatEuroRounded(Math.abs(analysis.savings))}
              />
              <Stat
                label="Seuil de rentabilité"
                value={
                  analysis.breakEvenMonth === null
                    ? 'Jamais rentable'
                    : formatDate(monthDate(settings.firstPaymentDate, analysis.breakEvenMonth))
                }
                hint={
                  analysis.breakEvenMonth === null
                    ? undefined
                    : `Mois ${analysis.breakEvenMonth}, soit ${formatDuration(Math.max(0, analysis.breakEvenMonth - refi.month))} après le refinancement`
                }
              />
            </div>
          ) : null}
        </>
      ) : null}
    </Card>
  );
}
