import {
  GRID_DURATIONS_YEARS,
  QUOTITE_TIERS,
  QUOTITE_TIER_LABELS,
  type BalanceInsurance,
  type LoanCosts,
  type QuotiteTier,
  type RateGrid,
} from '../engine';
import { formatPercent } from '../format';
import { CheckboxField, NumberField, PercentField, SelectField } from './fields';
import { Card, Grid, IndicativeBadge } from './ui';

/** Grille de taux (durée × quotité). En lecture seule pour le profil du marché. */
export function RateGridEditor({
  grid,
  onChange,
  readOnly,
  highlightTier,
  title,
  description,
}: {
  grid: RateGrid;
  onChange: (grid: RateGrid) => void;
  readOnly?: boolean;
  highlightTier: QuotiteTier | null;
  title: string;
  description: string;
}) {
  return (
    <Card title={title}>
      <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
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
              <tr key={t} className={t === highlightTier ? 'bg-brand-50 dark:bg-slate-800' : ''}>
                <th scope="row" className="py-1 pr-2 text-left font-medium">
                  {QUOTITE_TIER_LABELS[t]}
                </th>
                {GRID_DURATIONS_YEARS.map((y) => {
                  const label = `Taux ${y} ans, quotité ${QUOTITE_TIER_LABELS[t]}`;
                  const value = grid[t][y];
                  return (
                    <td key={y} className="num px-1 py-1">
                      {readOnly ? (
                        <span aria-label={label} className="block px-2 py-2">
                          {value === null ? '—' : formatPercent(value)}
                        </span>
                      ) : (
                        <GridCell
                          label={label}
                          value={value}
                          onChange={(rate) => onChange({ ...grid, [t]: { ...grid[t], [y]: rate } })}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
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

/** Frais et assurances d'une banque. */
export function CostsEditor({ costs: c, onChange }: { costs: LoanCosts; onChange: (costs: LoanCosts) => void }) {
  const setCosts = (patch: Partial<LoanCosts>) => onChange({ ...c, ...patch });

  function setInsuranceKind(kind: BalanceInsurance['kind']) {
    const balanceInsurance: BalanceInsurance =
      kind === 'none' ? { kind } : kind === 'single' ? { kind, premium: 3000 } : { kind, rate: 0.0015 };
    setCosts({ balanceInsurance });
  }

  return (
        <Card title={<span className="flex items-center gap-2">Frais et assurances <IndicativeBadge /></span>}>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Montants approximatifs, à remplacer par ceux de l&apos;offre de la banque (fiche ESIS) et du décompte du
            notaire. Ils entrent dans le coût total et le TAEG des scénarios liés à cette banque.
          </p>
          <Grid>
            <NumberField label="Frais de dossier" unit="€" min={0} value={c.processingFees} onChange={(v) => setCosts({ processingFees: v })} />
            <NumberField label="Frais d'expertise" unit="€" min={0} value={c.appraisalFees} onChange={(v) => setCosts({ appraisalFees: v })} />
            <NumberField
              label="Acte de crédit — inscription hypothécaire"
              unit="€"
              min={0}
              value={c.deedInscription}
              onChange={(v) => setCosts({ deedInscription: v })}
              hint="Frais liés à la part du crédit garantie par inscription."
            />
            <NumberField
              label="Acte de crédit — mandat hypothécaire"
              unit="€"
              min={0}
              value={c.deedMandate}
              onChange={(v) => setCosts({ deedMandate: v })}
              hint="Frais liés à la part couverte par un mandat (souvent moins coûteuse)."
            />
          </Grid>
          <Grid>
            <SelectField<BalanceInsurance['kind']>
              label="Assurance solde restant dû"
              value={c.balanceInsurance.kind}
              options={[
                { value: 'annualPercent', label: 'Prime annuelle (% du solde restant dû)' },
                { value: 'single', label: 'Prime unique' },
                { value: 'none', label: 'Aucune' },
              ]}
              onChange={setInsuranceKind}
            />
            {c.balanceInsurance.kind === 'annualPercent' ? (
              <PercentField
                label="Prime annuelle"
                min={0}
                max={5}
                value={c.balanceInsurance.rate}
                onChange={(rate) => setCosts({ balanceInsurance: { kind: 'annualPercent', rate } })}
                hint="Pourcentage du solde restant dû au début de chaque année."
              />
            ) : null}
            {c.balanceInsurance.kind === 'single' ? (
              <NumberField
                label="Prime unique"
                unit="€"
                min={0}
                value={c.balanceInsurance.premium}
                onChange={(premium) => setCosts({ balanceInsurance: { kind: 'single', premium } })}
                hint="Payée à la signature."
              />
            ) : null}
          </Grid>
          <Grid>
            <CheckboxField
              label="Assurance incendie exigée par le prêteur"
              checked={c.fireInsurance.enabled}
              onChange={(enabled) => setCosts({ fireInsurance: { ...c.fireInsurance, enabled } })}
            />
            {c.fireInsurance.enabled ? (
              <NumberField
                label="Prime annuelle incendie"
                unit="€"
                min={0}
                value={c.fireInsurance.annualPremium}
                onChange={(annualPremium) => setCosts({ fireInsurance: { ...c.fireInsurance, annualPremium } })}
              />
            ) : null}
          </Grid>
          <Grid>
            <CheckboxField
              label="Compte bancaire exigé par le prêteur"
              checked={c.bankAccount.enabled}
              onChange={(enabled) => setCosts({ bankAccount: { ...c.bankAccount, enabled } })}
            />
            {c.bankAccount.enabled ? (
              <NumberField
                label="Frais mensuels du compte"
                unit="€"
                min={0}
                value={c.bankAccount.monthlyFee}
                onChange={(monthlyFee) => setCosts({ bankAccount: { ...c.bankAccount, monthlyFee } })}
              />
            ) : null}
          </Grid>
        </Card>
  );
}
