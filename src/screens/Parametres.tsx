import {
  GRID_DURATIONS_YEARS,
  QUOTITE_TIERS,
  QUOTITE_TIER_LABELS,
  quotite,
  quotiteTier,
  type PenaltyAllowance,
  type RateConvention,
} from '../engine';
import { formatPercent } from '../format';
import { DateField, NumberField, PercentField, SelectField } from '../components/fields';
import { Card, Grid, IndicativeBadge, Notice } from '../components/ui';
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

      <Card title={<span className="flex items-center gap-2">Grille de taux fixes <IndicativeBadge /></span>}>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Taux annuels en %, par durée et par quotité (octobre 2026). Touchez × si une durée n&apos;est pas proposée.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400">
                <th className="py-2 pr-2 font-medium">Quotité</th>
                {GRID_DURATIONS_YEARS.map((y) => (
                  <th key={y} className="px-1 py-2 font-medium">
                    {y} ans (%)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {QUOTITE_TIERS.map((t) => (
                <tr key={t} className={t === tier ? 'bg-brand-50 dark:bg-slate-800' : ''}>
                  <th scope="row" className="py-1 pr-2 text-left font-medium">
                    {QUOTITE_TIER_LABELS[t]}
                  </th>
                  {GRID_DURATIONS_YEARS.map((y) => (
                    <td key={y} className="px-1 py-1">
                      <GridCell
                        label={`Taux ${y} ans, quotité ${QUOTITE_TIER_LABELS[t]}`}
                        value={s.rateGrid[t][y]}
                        onChange={(rate) =>
                          update({ rateGrid: { ...s.rateGrid, [t]: { ...s.rateGrid[t], [y]: rate } } })
                        }
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

      <Card title="Frais et assurances">
        <Notice>
          Les frais de dossier, d&apos;expertise et d&apos;acte, l&apos;assurance solde restant dû et le TAEG seront ajoutés
          dans une prochaine version. Les coûts affichés comprennent actuellement les intérêts et les indemnités de
          remploi.
        </Notice>
      </Card>
    </div>
  );
}

/** Case de la grille : taux en %, vide = durée non proposée. */
function GridCell({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  if (value === null) {
    return (
      <button
        type="button"
        className="w-full rounded-lg border border-dashed border-slate-300 px-2 py-2 text-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        onClick={() => onChange(0.035)}
        aria-label={`${label} : proposer cette durée`}
      >
        non proposé
      </button>
    );
  }
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        <NumberField label={label} hideLabel scale={100} decimals={3} value={value} min={0} max={30} onChange={(v) => onChange(v)} />
      </div>
      <button
        type="button"
        className="mt-1.5 rounded px-1.5 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
        onClick={() => onChange(null)}
        aria-label={`${label} : retirer`}
        title="Durée non proposée"
      >
        ×
      </button>
    </div>
  );
}
