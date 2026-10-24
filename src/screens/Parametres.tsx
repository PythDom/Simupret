import { QUOTITE_TIER_LABELS, quotite, quotiteTier, type PenaltyAllowance, type RateConvention } from '../engine';
import { formatPercent } from '../format';
import { DateField, NumberField, PercentField, SelectField } from '../components/fields';
import { Card, Grid } from '../components/ui';
import { useStore } from '../state/context';

type AllowanceKind = PenaltyAllowance['kind'];

export default function Parametres() {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const update = (patch: Partial<typeof s>) => dispatch({ type: 'settings/update', patch });
  const q = s.propertyValue > 0 ? quotite(s.amount, s.propertyValue) : NaN;
  const tier = Number.isFinite(q) ? quotiteTier(q) : null;

  function setAllowanceKind(kind: AllowanceKind) {
    const allowance: PenaltyAllowance =
      kind === 'none'
        ? { kind }
        : kind === 'percentOfInitial'
          ? { kind, fraction: 0.1 }
          : { kind, amount: 10_000 };
    update({ penalty: { ...s.penalty, allowance } });
  }

  return (
    <div className="space-y-4">
      <Card title="Projet">
        <Grid>
          <NumberField label="Montant à emprunter" unit="€" value={s.amount} min={1} onChange={(v) => update({ amount: v })} />
          <NumberField
            label="Valeur du bien"
            unit="€"
            value={s.propertyValue}
            min={1}
            onChange={(v) => update({ propertyValue: v })}
            hint={
              tier
                ? `Quotité : ${formatPercent(q, 1)} (tranche ${QUOTITE_TIER_LABELS[tier]})`
                : 'Saisissez la valeur du bien pour calculer la quotité.'
            }
          />
          <NumberField label="Budget mensuel" unit="€" value={s.monthlyBudget} min={1} onChange={(v) => update({ monthlyBudget: v })} />
          <NumberField
            label="Durée maximale"
            unit="ans"
            integer
            min={1}
            max={40}
            value={s.maxDurationMonths / 12}
            onChange={(v) => update({ maxDurationMonths: v * 12 })}
          />
          <NumberField
            label="Marge de sécurité minimale"
            unit="€"
            min={0}
            value={s.minMargin}
            onChange={(v) => update({ minMargin: v })}
            hint="Montant qui doit rester disponible chaque mois sous le budget."
          />
          <SelectField
            label="Nombre maximal de tranches"
            value={String(s.maxTranches) as '1' | '2' | '3'}
            options={[
              { value: '1', label: '1 tranche' },
              { value: '2', label: '2 tranches' },
              { value: '3', label: '3 tranches' },
            ]}
            onChange={(v) => update({ maxTranches: Number(v) })}
          />
          <DateField label="Date de la première échéance" value={s.firstPaymentDate} onChange={(iso) => update({ firstPaymentDate: iso })} />
        </Grid>
      </Card>

      <Card title="Banques, taux et frais">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Les grilles de taux, les frais et les assurances sont définis par banque dans l&apos;écran{' '}
          <a href="#/banques" className="font-medium text-brand-700 underline dark:text-brand-100">
            « Banques »
          </a>
          , à partir des moyennes du marché publiées par la Banque nationale de Belgique.
        </p>
      </Card>

      <Card title="Indemnité de remploi">
        <Grid>
          <NumberField
            label="Mois d'intérêts"
            unit="mois"
            min={0}
            max={12}
            decimals={1}
            value={s.penalty.monthsOfInterest}
            onChange={(v) => update({ penalty: { ...s.penalty, monthsOfInterest: v } })}
            hint="Par défaut 3 mois d'intérêts sur le capital remboursé, au taux de la tranche."
          />
          <SelectField<AllowanceKind>
            label="Franchise annuelle"
            value={s.penalty.allowance.kind}
            options={[
              { value: 'none', label: 'Aucune' },
              { value: 'percentOfInitial', label: '% du capital initial' },
              { value: 'fixed', label: 'Montant fixe' },
            ]}
            onChange={setAllowanceKind}
          />
          {s.penalty.allowance.kind === 'percentOfInitial' ? (
            <PercentField
              label="Remboursable sans indemnité par an"
              min={0}
              max={100}
              value={s.penalty.allowance.fraction}
              onChange={(fraction) => update({ penalty: { ...s.penalty, allowance: { kind: 'percentOfInitial', fraction } } })}
            />
          ) : null}
          {s.penalty.allowance.kind === 'fixed' ? (
            <NumberField
              label="Remboursable sans indemnité par an"
              unit="€"
              min={0}
              value={s.penalty.allowance.amount}
              onChange={(amount) => update({ penalty: { ...s.penalty, allowance: { kind: 'fixed', amount } } })}
            />
          ) : null}
        </Grid>
      </Card>

      <Card title="Convention de taux">
        <SelectField<RateConvention>
          label="Taux mensuel"
          value={s.rateConvention}
          options={[
            { value: 'equivalent', label: 'Taux équivalent (1 + r)^(1/12) − 1 — pratique belge' },
            { value: 'nominal', label: 'Taux proportionnel r / 12 — pour comparaison' },
          ]}
          onChange={(rateConvention) => update({ rateConvention })}
        />
      </Card>

      <Card title="Placement (coût d'opportunité)">
        <PercentField
          label="Rendement annuel net d'un placement"
          min={-10}
          max={30}
          value={s.investmentReturn}
          onChange={(investmentReturn) => update({ investmentReturn })}
          hint="Après frais et impôts. Sert à comparer « rembourser anticipativement » et « investir la différence »."
        />
      </Card>
    </div>
  );
}
