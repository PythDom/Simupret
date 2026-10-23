import { DEFAULT_COSTS, NO_COSTS, borrowerCashFlows, costBreakdown, type LoanCosts } from '../costs';
import { DEFAULT_RATE_GRID } from '../grid';
import { compareOpportunity } from '../opportunity';
import { OPTIMIZER_DEFAULTS, optimize } from '../optimizer';
import { simulate } from '../schedule';
import { analyzeScenario, summarize } from '../summary';
import { monthlyIrr, taeg } from '../taeg';
import type { SimulationInput } from '../types';
import { expectEuro, tranche } from './helpers';

const loan = (): SimulationInput => ({ tranches: [tranche(250_000, 20, 3.67)] });

describe('TAEG', () => {
  it('égale le taux du crédit sans frais (convention équivalente)', () => {
    const a = analyzeScenario(loan(), 2500);
    expect(a.summary.taeg!).toBeCloseTo(0.0367, 10);
  });

  it('égale (1 + r/12)^12 − 1 en convention r/12', () => {
    const a = analyzeScenario(loan(), 2500, NO_COSTS, { rateConvention: 'nominal' });
    expect(a.summary.taeg!).toBeCloseTo(Math.pow(1 + 0.0367 / 12, 12) - 1, 10);
  });

  it('augmente avec les frais et assurances', () => {
    const a = analyzeScenario(loan(), 2500, DEFAULT_COSTS);
    expect(a.summary.taeg!).toBeGreaterThan(0.0367);
    // Ordre de grandeur : ~4 800 € de frais + ~0,15 %/an d'assurance → environ 4,0 %.
    expect(a.summary.taeg!).toBeGreaterThan(0.039);
    expect(a.summary.taeg!).toBeLessThan(0.042);
  });

  it('les flux actualisés au TAEG mensuel ont une valeur nulle', () => {
    const a = analyzeScenario(loan(), 2500, DEFAULT_COSTS);
    const r = monthlyIrr(a.flows)!;
    const npv = a.flows.reduce((s, f, t) => s + f / Math.pow(1 + r, t), 0);
    expect(Math.abs(npv)).toBeLessThan(1e-6);
  });

  it('tient compte des remboursements anticipés et indemnités réels', () => {
    const input: SimulationInput = {
      ...loan(),
      prepayments: [{ kind: 'recurring', everyMonths: 12, amount: { type: 'budget', monthlyBudget: 2500 } }],
    };
    const a = analyzeScenario(input, 2500);
    // Les indemnités renchérissent légèrement le coût effectif.
    expect(a.summary.taeg!).toBeGreaterThan(0.0367);
    expect(a.summary.taeg!).toBeLessThan(0.0375);
  });

  it('retourne null pour des flux sans changement de signe', () => {
    expect(taeg([100, 100])).toBeNull();
  });
});

describe('frais et assurances', () => {
  const costs: LoanCosts = {
    processingFees: 500,
    appraisalFees: 300,
    deedInscription: 3000,
    deedMandate: 1000,
    balanceInsurance: { kind: 'annualPercent', rate: 0.002 },
    fireInsurance: { enabled: true, annualPremium: 300 },
    bankAccount: { enabled: true, monthlyFee: 5 },
  };

  it('calcule les frais à la signature et les primes annuelles', () => {
    const input = loan();
    const result = simulate(input);
    const b = costBreakdown(input, result, costs);
    expect(b.upfront).toBe(4800);
    expect(b.monthly[0]).toBe(4800);
    // Première prime : 0,2 % × 250 000 € au mois 1, puis sur le solde au mois 13.
    expect(b.monthly[1]).toBeCloseTo(500 + 300 + 5, 9);
    expect(b.monthly[13]).toBeCloseTo(0.002 * result.months[11]!.closingBalance + 300 + 5, 9);
    expect(b.monthly[2]).toBe(5);
    expect(b.fireInsurance).toBe(300 * 20);
    expect(b.bankAccount).toBe(5 * 240);
  });

  it('prime unique payée à la signature', () => {
    const input = loan();
    const b = costBreakdown(input, simulate(input), { ...NO_COSTS, balanceInsurance: { kind: 'single', premium: 3500 } });
    expect(b.upfront).toBe(3500);
    expect(b.balanceInsurance).toBe(3500);
  });

  it('coût total = décaissements − fonds reçus', () => {
    const input = loan();
    const result = simulate(input);
    const { summary: s } = summarize(input, result, 2500, costs);
    const b = costBreakdown(input, result, costs);
    expectEuro(
      s.totalCost,
      result.totals.interest + b.upfront + b.balanceInsurance + b.fireInsurance + b.bankAccount,
      1e-6,
    );
    const flows = borrowerCashFlows(input, result, b);
    expect(-flows.reduce((x, f) => x + f, 0)).toBeCloseTo(s.totalCost, 6);
  });
});

describe('tranche à 0 % avec réduction (type Rénopack)', () => {
  it('rembourse le montant diminué de la réduction', () => {
    const input: SimulationInput = { tranches: [tranche(30_000, 10, 0, { reduction: 6000 })] };
    const a = analyzeScenario(input, 2500);
    expect(a.result.months[0]!.payment).toBeCloseTo(200, 9);
    expect(a.result.totals.principal).toBeCloseTo(24_000, 6);
    expect(a.summary.reductions).toBe(6000);
    expect(a.summary.totalCost).toBeCloseTo(-6000, 6);
    // Avantage net → TAEG négatif.
    expect(a.summary.taeg!).toBeLessThan(0);
  });

  it('combinée à une tranche classique', () => {
    const input: SimulationInput = {
      tranches: [tranche(220_000, 20, 3.67), tranche(30_000, 10, 0, { reduction: 3000 })],
    };
    const a = analyzeScenario(input, 2500);
    expect(a.summary.taeg!).toBeLessThan(0.0367);
    expect(a.summary.taeg!).toBeGreaterThan(0);
  });

  it('valide la réduction', async () => {
    const { validateTranche } = await import('../validation');
    expect(validateTranche(tranche(30_000, 10, 0, { reduction: 30_000 })).map((e) => e.field)).toEqual([
      'tranche.reduction',
    ]);
  });
});

describe('optimiseur avec frais et assurances', () => {
  const input = { ...OPTIMIZER_DEFAULTS, rateGrid: DEFAULT_RATE_GRID, costs: { ...DEFAULT_COSTS, fireInsurance: { enabled: true, annualPremium: 300 } } };

  it('le coût analytique égale le coût simulé', () => {
    const r = optimize({ ...input, monthlyBudget: 2000 });
    for (const c of r.top) {
      const { summary } = summarize({ tranches: c.tranches }, simulate({ tranches: c.tranches }), 2000, input.costs);
      expect(c.totalCost).toBeCloseTo(summary.totalCost, 6);
      expect(c.costs).toBeGreaterThan(4800);
      expect(c.taeg!).toBeGreaterThan(0.034);
    }
    for (let i = 1; i < r.top.length; i++) expect(r.top[i]!.totalCost).toBeGreaterThanOrEqual(r.top[i - 1]!.totalCost - 1e-6);
  });

  it("les assurances pénalisent les durées longues", () => {
    const r = optimize(input);
    expect(r.top[0]!.tranches[0]!.durationMonths).toBe(120);
    expect(r.flexibilityPrice!).toBeGreaterThan(optimize({ ...input, costs: NO_COSTS }).flexibilityPrice!);
  });
});

describe("coût d'opportunité", () => {
  const base = loan();
  const withPrepay: SimulationInput = {
    ...base,
    prepayments: [{ kind: 'recurring', everyMonths: 12, amount: { type: 'budget', monthlyBudget: 2500 } }],
  };
  const run = (i: SimulationInput) => {
    const a = analyzeScenario(i, 2500, DEFAULT_COSTS);
    return { result: a.result, costs: a.costs };
  };

  it('rembourser gagne si le placement rapporte moins que le crédit', () => {
    const o = compareOpportunity(run(withPrepay), run(base), 0.02);
    expect(o.horizonMonths).toBe(240);
    expect(o.advantagePrepay).toBeGreaterThan(0);
  });

  it('investir gagne si le placement rapporte nettement plus', () => {
    const o = compareOpportunity(run(withPrepay), run(base), 0.07);
    expect(o.advantagePrepay).toBeLessThan(0);
  });

  it('le seuil de rendement est proche du coût du crédit', () => {
    const o = compareOpportunity(run(withPrepay), run(base), 0.04);
    expect(o.breakEvenReturn).not.toBeNull();
    expect(o.breakEvenReturn!).toBeGreaterThan(0.03);
    expect(o.breakEvenReturn!).toBeLessThan(0.045);
    const at = compareOpportunity(run(withPrepay), run(base), o.breakEvenReturn!);
    expect(Math.abs(at.advantagePrepay)).toBeLessThan(1);
  });

  it('à 0 % de rendement, la différence égale l\'écart de coût total', () => {
    const p = analyzeScenario(withPrepay, 2500, DEFAULT_COSTS);
    const i = analyzeScenario(base, 2500, DEFAULT_COSTS);
    const o = compareOpportunity({ result: p.result, costs: p.costs }, { result: i.result, costs: i.costs }, 0);
    expect(o.advantagePrepay).toBeCloseTo(i.summary.totalCost - p.summary.totalCost, 6);
  });
});
