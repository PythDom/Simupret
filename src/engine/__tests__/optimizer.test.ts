import { DEFAULT_RATE_GRID, quotite, quotiteTier } from '../grid';
import { OPTIMIZER_DEFAULTS, optimize, validateOptimizerInput, type OptimizerInput } from '../optimizer';
import { simulate } from '../schedule';
import { expectEuro } from './helpers';

const defaults: OptimizerInput = { ...OPTIMIZER_DEFAULTS, rateGrid: DEFAULT_RATE_GRID };

describe('quotité', () => {
  it('calcule la quotité et sa tranche', () => {
    expect(quotite(250_000, 300_000)).toBeCloseTo(0.8333, 4);
    expect(quotiteTier(0.8)).toBe('upTo80');
    expect(quotiteTier(0.85)).toBe('from80To90');
    expect(quotiteTier(0.9)).toBe('from80To90');
    expect(quotiteTier(0.95)).toBe('above90');
  });
});

describe('optimiseur', () => {
  it('valeurs par défaut : 250 000 € sur 10 ans est optimal (2 454 € ≤ 2 500 €)', () => {
    const r = optimize(defaults);
    expect(r.tier).toBe('from80To90');
    expect(r.top).toHaveLength(5);
    const best = r.top[0]!;
    expect(best.tranches).toHaveLength(1);
    expect(best.tranches[0]).toMatchObject({ amount: 250_000, durationMonths: 120, annualRate: 0.034 });
    expectEuro(best.totalCost, 44_528);
    expectEuro(best.peakPayment, 2454);
    expectEuro(best.minMargin, 46);
    // Coûts croissants.
    for (let i = 1; i < r.top.length; i++) expect(r.top[i]!.totalCost).toBeGreaterThanOrEqual(r.top[i - 1]!.totalCost);
  });

  it('respecte budget − marge à chaque mois (vérifié par simulation complète)', () => {
    const input = { ...defaults, monthlyBudget: 2000, minMargin: 100 };
    const r = optimize(input);
    expect(r.top.length).toBeGreaterThan(0);
    for (const c of r.top) {
      const sim = simulate({ tranches: c.tranches });
      for (const m of sim.months) expect(m.payment).toBeLessThanOrEqual(1900 + 1e-9);
      expect(c.minMargin).toBeGreaterThanOrEqual(100 - 1e-9);
      expect(c.tranches.reduce((s, t) => s + t.amount, 0)).toBe(250_000);
      for (const t of c.tranches) expect(t.amount % 5000).toBe(0);
      expect(c.totalCost).toBeCloseTo(sim.totals.interest, 6);
    }
    // Avec 1 900 €, une seule tranche 10 ans ou 15 ans est impossible ; le
    // meilleur résultat mélange plusieurs durées.
    expect(r.top[0]!.tranches.length).toBeGreaterThan(1);
  });

  it('trouve le même optimum qu\'une recherche exhaustive par simulation', () => {
    const input = { ...defaults, amount: 60_000, monthlyBudget: 450, amountStep: 5000 };
    const r = optimize(input);
    // Recherche exhaustive indépendante sur 2 tranches (10 et 20 ans) et (15 et 20 ans).
    let bestCost = Infinity;
    const durations: [number, number][] = [[120, 0.034], [180, 0.0355], [240, 0.0367]];
    const singles = durations.map(([d, rate]) => [{ d, rate, a: 60_000 }]);
    const pairs: { d: number; rate: number; a: number }[][] = [];
    for (let i = 0; i < 3; i++)
      for (let j = i + 1; j < 3; j++)
        for (let a = 5000; a < 60_000; a += 5000)
          pairs.push([
            { d: durations[i]![0], rate: durations[i]![1], a },
            { d: durations[j]![0], rate: durations[j]![1], a: 60_000 - a },
          ]);
    for (const combo of [...singles, ...pairs]) {
      const sim = simulate({
        tranches: combo.map((c, k) => ({
          id: `x${k}`,
          amount: c.a,
          durationMonths: c.d,
          annualRate: c.rate,
          startMonth: 1,
          amortization: 'annuity' as const,
        })),
      });
      const peak = Math.max(...sim.months.map((m) => m.payment));
      if (peak <= 450) bestCost = Math.min(bestCost, sim.totals.interest);
    }
    // L'optimiseur (jusqu'à 3 tranches) fait au moins aussi bien.
    expect(r.top[0]!.totalCost).toBeLessThanOrEqual(bestCost + 1e-6);
  });

  it('limite le nombre de tranches', () => {
    const r = optimize({ ...defaults, monthlyBudget: 2000, maxTranches: 1 });
    for (const c of r.top) expect(c.tranches).toHaveLength(1);
    expect(r.top[0]!.tranches[0]!.durationMonths).toBe(180);
  });

  it('respecte la durée maximale', () => {
    const r = optimize({ ...defaults, maxDurationMonths: 180, monthlyBudget: 1900 });
    for (const c of r.top) for (const t of c.tranches) expect(t.durationMonths).toBeLessThanOrEqual(180);
  });

  it('utilise la grille de la quotité > 90 %', () => {
    const r = optimize({ ...defaults, propertyValue: 260_000 });
    expect(r.tier).toBe('above90');
    expect(r.top[0]!.tranches.every((t) => [0.036, 0.0375, 0.0387].includes(t.annualRate))).toBe(true);
  });

  it('ignore les durées non proposées (null)', () => {
    const grid = { ...DEFAULT_RATE_GRID, from80To90: { ...DEFAULT_RATE_GRID.from80To90, 10: null } };
    const r = optimize({ ...defaults, rateGrid: grid });
    for (const c of r.top) for (const t of c.tranches) expect(t.durationMonths).not.toBe(120);
  });

  it('explique en français quand le budget est insuffisant', () => {
    const r = optimize({ ...defaults, monthlyBudget: 1000 });
    expect(r.top).toEqual([]);
    expect(r.flexibility).toBeNull();
    expect(r.message).toMatch(/^Budget insuffisant : la mensualité la plus basse possible est de 1465 €/);
  });

  it('gère un montant non multiple du pas', () => {
    const r = optimize({ ...defaults, amount: 252_345, monthlyBudget: 2000 });
    for (const c of r.top) expect(c.tranches.reduce((s, t) => s + t.amount, 0)).toBe(252_345);
  });

  it('variante « flexibilité maximale » : plus longue durée + remboursements jusqu\'au budget', () => {
    const r = optimize(defaults);
    const flex = r.flexibility!;
    expect(flex.tranches).toHaveLength(1);
    expect(flex.tranches[0]!.durationMonths).toBe(240);
    expectEuro(flex.peakPayment, 1464);
    // Mêmes chiffres que le 5e cas de validation, indemnité comprise dans le budget.
    expect(flex.endMonth).toBe(122);
    expect(flex.penalties).toBeGreaterThan(0);
    expect(r.flexibilityPrice).toBeCloseTo(flex.totalCost - r.top[0]!.totalCost, 9);
    expect(r.flexibilityPrice!).toBeGreaterThan(0);
    // Aucune année ne dépasse le budget.
    const year1 = flex.simulation.months.slice(0, 12).reduce((s, m) => s + m.cashOut, 0);
    expect(year1).toBeLessThanOrEqual(2500 * 12 + 1e-6);
  });

  it('reste rapide pour un grand montant sur 25 ans et 3 tranches', () => {
    const t0 = performance.now();
    const r = optimize({ ...defaults, amount: 600_000, propertyValue: 700_000, monthlyBudget: 4000, maxDurationMonths: 300 });
    expect(r.evaluated).toBeGreaterThan(10_000);
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});

describe('validation de l\'optimiseur', () => {
  it('accepte les valeurs par défaut', () => {
    expect(validateOptimizerInput(defaults)).toEqual([]);
  });

  it('rejette les saisies invalides en français', () => {
    const grid = { ...DEFAULT_RATE_GRID, upTo80: { ...DEFAULT_RATE_GRID.upTo80, 15: 3.55 } };
    const errors = validateOptimizerInput({
      ...defaults,
      amount: 0,
      propertyValue: -1,
      monthlyBudget: 2500,
      minMargin: 3000,
      maxTranches: 4,
      maxDurationMonths: 6,
      rateGrid: grid,
    });
    expect(errors.map((e) => e.field)).toEqual([
      'amount',
      'propertyValue',
      'maxDurationMonths',
      'minMargin',
      'maxTranches',
      'rateGrid.upTo80.15',
    ]);
    expect(errors[3]!.message).toBe('La marge de sécurité doit être inférieure au budget mensuel.');
  });
});
