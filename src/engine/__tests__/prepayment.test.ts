import { monthlyRate } from '../rates';
import { simulate } from '../schedule';
import { analyzeRefinancing } from '../refinance';
import { validateSimulationInput } from '../validation';
import type { PenaltyConfig } from '../types';
import { expectEuro, tranche } from './helpers';

const r367 = monthlyRate(0.0367);
const pen3 = Math.pow(1 + r367, 3) - 1;

describe('remboursement anticipé ponctuel', () => {
  it('réduit la durée en gardant la mensualité (par défaut)', () => {
    const base = simulate({ tranches: [tranche(250_000, 20, 3.67)] });
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [{ kind: 'oneOff', month: 12, amount: 20_000 }],
    });
    expect(r.endMonth).toBeLessThan(240);
    expect(r.months[12]!.payment).toBeCloseTo(base.months[12]!.payment, 9);
    expect(r.months[11]!.prepayment).toBe(20_000);
    expect(r.totals.penalties).toBeCloseTo(20_000 * pen3, 9);
    expect(r.totals.principal + r.totals.prepayments).toBeCloseTo(250_000, 6);
    expect(r.totals.interest).toBeLessThan(base.totals.interest);
  });

  it('réduit la mensualité en gardant la durée', () => {
    const base = simulate({ tranches: [tranche(250_000, 20, 3.67)] });
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [{ kind: 'oneOff', month: 12, amount: 20_000, effect: 'reducePayment' }],
    });
    expect(r.endMonth).toBe(240);
    expect(r.months[12]!.payment).toBeLessThan(base.months[12]!.payment);
    // Mensualité constante après le remboursement.
    expect(r.months[200]!.payment).toBeCloseTo(r.months[12]!.payment, 9);
    expect(r.totals.principal + r.totals.prepayments).toBeCloseTo(250_000, 6);
  });

  it('réduit la mensualité en amortissement constant', () => {
    const r = simulate({
      tranches: [tranche(240_000, 20, 3.67, { amortization: 'constantCapital' })],
      prepayments: [{ kind: 'oneOff', month: 120, amount: 60_000, effect: 'reducePayment' }],
    });
    expect(r.endMonth).toBe(240);
    // 120 000 − 60 000 restants sur 120 mois → 500 €/mois de capital.
    expect(r.months[120]!.principal).toBeCloseTo(500, 9);
  });

  it('va par défaut à la tranche au taux le plus élevé', () => {
    const a = tranche(200_000, 10, 3.4);
    const b = tranche(50_000, 15, 3.55);
    const r = simulate({ tranches: [a, b], prepayments: [{ kind: 'oneOff', month: 6, amount: 10_000 }] });
    const rowB = r.perTranche[b.id]![5]!;
    expect(rowB.prepayment).toBe(10_000);
    expect(r.perTranche[a.id]![5]!.prepayment).toBe(0);
  });

  it('respecte la tranche choisie', () => {
    const a = tranche(200_000, 10, 3.4);
    const b = tranche(50_000, 15, 3.55);
    const r = simulate({ tranches: [a, b], prepayments: [{ kind: 'oneOff', month: 6, amount: 10_000, trancheId: a.id }] });
    expect(r.perTranche[a.id]![5]!.prepayment).toBe(10_000);
  });

  it('cas limite : montant supérieur au solde restant', () => {
    const a = tranche(100_000, 10, 3.4);
    const b = tranche(30_000, 10, 3.55);
    const r = simulate({ tranches: [a, b], prepayments: [{ kind: 'oneOff', month: 24, amount: 500_000 }] });
    expect(r.endMonth).toBe(24);
    expect(r.months.at(-1)!.closingBalance).toBe(0);
    expect(r.totals.principal + r.totals.prepayments).toBeCloseTo(130_000, 6);
    // Le surplus non utilisé est signalé et ne génère pas d'indemnité.
    const repaid = r.totals.prepayments;
    expect(r.unusedPrepayment).toBeCloseTo(500_000 - repaid, 6);
    expect(r.totals.cashOut).toBeCloseTo(r.totals.payments + repaid + r.totals.penalties, 6);
    // D'abord la tranche à 3,55 %, puis le surplus sur celle à 3,40 %.
    expect(r.perTranche[b.id]![23]!.closingBalance).toBe(0);
    expect(r.perTranche[a.id]![23]!.closingBalance).toBe(0);
  });
});

describe('indemnité de remploi', () => {
  it('est paramétrable en nombre de mois', () => {
    const penalty: PenaltyConfig = { monthsOfInterest: 0, allowance: { kind: 'none' } };
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [{ kind: 'oneOff', month: 12, amount: 20_000 }],
      penalty,
    });
    expect(r.totals.penalties).toBe(0);
  });

  it('applique une franchise annuelle en % du capital initial', () => {
    const penalty: PenaltyConfig = { monthsOfInterest: 3, allowance: { kind: 'percentOfInitial', fraction: 0.1 } };
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [
        { kind: 'oneOff', month: 3, amount: 15_000 },
        { kind: 'oneOff', month: 9, amount: 15_000 },
        { kind: 'oneOff', month: 15, amount: 15_000 },
      ],
      penalty,
    });
    // Année 1 : 25 000 € de franchise sur 30 000 € → indemnité sur 5 000 €.
    // Année 2 : franchise renouvelée → aucune indemnité.
    expect(r.months[2]!.penalty).toBe(0);
    expect(r.months[8]!.penalty).toBeCloseTo(5000 * pen3, 9);
    expect(r.months[14]!.penalty).toBe(0);
  });

  it('applique une franchise annuelle en montant fixe', () => {
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [{ kind: 'oneOff', month: 3, amount: 15_000 }],
      penalty: { monthsOfInterest: 3, allowance: { kind: 'fixed', amount: 10_000 } },
    });
    expect(r.totals.penalties).toBeCloseTo(5000 * pen3, 9);
  });
});

describe('remboursements récurrents', () => {
  it('montant fixe tous les N mois', () => {
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [{ kind: 'recurring', everyMonths: 6, startMonth: 7, endMonth: 30, amount: { type: 'fixed', amount: 1000 } }],
    });
    expect(r.months.filter((m) => m.prepayment > 0).map((m) => m.month)).toEqual([12, 18, 24, 30]);
  });

  it("« jusqu'au budget » avec indemnité prélevée sur le budget", () => {
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [
        { kind: 'recurring', everyMonths: 12, amount: { type: 'budget', monthlyBudget: 2500, penaltyWithinBudget: true } },
      ],
    });
    // Aucun mois ne dépasse le budget sur l'année : versement + indemnité = épargne.
    const year1 = r.months.slice(0, 12).reduce((s, m) => s + m.cashOut, 0);
    expectEuro(year1, 2500 * 12, 1e-6);
    expect(r.endMonth).toBe(122);
  });

  it('mensuel jusqu\'au budget : le décaissement mensuel égale le budget', () => {
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [{ kind: 'recurring', everyMonths: 1, amount: { type: 'budget', monthlyBudget: 2500, penaltyWithinBudget: true } }],
      penalty: { monthsOfInterest: 3, allowance: { kind: 'none' } },
    });
    for (const m of r.months.slice(0, -1)) expectEuro(m.cashOut, 2500, 1e-6);
  });
});

describe('refinancement', () => {
  const base = { tranches: [tranche(250_000, 20, 3.67)] };

  it('solde le crédit au mois X avec indemnité et ouvre un nouveau crédit', () => {
    const input = {
      ...base,
      refinancing: { month: 36, annualRate: 0.025, durationMonths: 204, deedCosts: 2000, processingFees: 500 },
    };
    const r = simulate(input);
    const row = r.months[35]!;
    expect(row.refinanced).toBeCloseTo(row.tranches[0]!.openingBalance - row.tranches[0]!.principal, 6);
    expect(row.penalty).toBeCloseTo(row.refinanced * pen3, 6);
    expect(row.fees).toBe(2500);
    expect(row.cashOut).toBeCloseTo(row.payment + row.penalty + 2500, 6);
    expect(r.endMonth).toBe(240);
    expect(r.perTranche['refinancement']![0]!.openingBalance).toBeCloseTo(row.refinanced, 6);

    const a = analyzeRefinancing(input);
    expect(a.savings).toBeGreaterThan(0);
    expect(a.upfrontCost).toBeCloseTo(row.penalty + 2500, 6);
    expect(a.breakEvenMonth).not.toBeNull();
    const be = a.cumulativeCost[a.breakEvenMonth! - 1]!;
    expect(be.refinanced).toBeLessThanOrEqual(be.baseline);
    const before = a.cumulativeCost[a.breakEvenMonth! - 2]!;
    expect(before.refinanced).toBeGreaterThan(before.baseline);
  });

  it('peut financer l\'indemnité et les frais', () => {
    const r = simulate({
      ...base,
      refinancing: { month: 36, annualRate: 0.025, durationMonths: 204, deedCosts: 2000, processingFees: 500, financeCosts: true },
    });
    const row = r.months[35]!;
    expect(row.cashOut).toBeCloseTo(row.payment, 6);
    expect(r.perTranche['refinancement']![0]!.openingBalance).toBeCloseTo(row.refinanced + row.penalty + 2500, 6);
  });

  it("n'est pas rentable si le nouveau taux est plus élevé", () => {
    const a = analyzeRefinancing({
      ...base,
      refinancing: { month: 36, annualRate: 0.04, durationMonths: 204, deedCosts: 2000, processingFees: 500 },
    });
    expect(a.breakEvenMonth).toBeNull();
    expect(a.savings).toBeLessThan(0);
  });

  it('cas limite : refinancement au mois 1', () => {
    const input = {
      ...base,
      refinancing: { month: 1, annualRate: 0.03, durationMonths: 239, deedCosts: 1500, processingFees: 500 },
    };
    const r = simulate(input);
    expect(r.months[0]!.tranches).toHaveLength(1);
    expect(r.months[1]!.tranches.map((t) => t.trancheId)).toEqual(['refinancement']);
    expect(r.endMonth).toBe(240);
    expect(r.totals.principal).toBeCloseTo(250_000, 6);
    const a = analyzeRefinancing(input);
    expect(a.breakEvenMonth).not.toBeNull();
    expect(a.breakEvenMonth!).toBeGreaterThan(1);
  });
});

describe('validation des remboursements et du refinancement', () => {
  it('rejette les saisies invalides en français', () => {
    const errors = validateSimulationInput({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [
        { kind: 'oneOff', month: 0, amount: -5, trancheId: 'inconnue' },
        { kind: 'recurring', everyMonths: 0, amount: { type: 'budget', monthlyBudget: 0 } },
      ],
      penalty: { monthsOfInterest: 24, allowance: { kind: 'percentOfInitial', fraction: 2 } },
      refinancing: { month: 0, annualRate: -1, durationMonths: 0, deedCosts: -1, processingFees: 0 },
    });
    expect(errors.map((e) => e.field)).toEqual([
      'prepayments[0].trancheId',
      'prepayments[0].month',
      'prepayments[0].amount',
      'prepayments[1].everyMonths',
      'prepayments[1].amount',
      'penalty.monthsOfInterest',
      'penalty.allowance',
      'refinancing.month',
      'refinancing.durationMonths',
      'refinancing.annualRate',
      'refinancing.deedCosts',
    ]);
    expect(errors.every((e) => e.message.length > 0)).toBe(true);
  });
});
