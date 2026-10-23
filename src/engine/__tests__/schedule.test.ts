import { annuityPayment } from '../amortization';
import { annualFromMonthly, monthlyRate } from '../rates';
import { aggregateByYear, simulate } from '../schedule';
import { expectEuro, tranche } from './helpers';

describe('taux', () => {
  it('convertit en taux mensuel équivalent', () => {
    const r = monthlyRate(0.0367);
    expect(Math.pow(1 + r, 12) - 1).toBeCloseTo(0.0367, 12);
    expect(annualFromMonthly(r)).toBeCloseTo(0.0367, 12);
  });

  it('convertit en taux nominal r/12 pour comparaison', () => {
    expect(monthlyRate(0.0367, 'nominal')).toBeCloseTo(0.0367 / 12, 15);
    expect(monthlyRate(0.0367, 'nominal')).toBeGreaterThan(monthlyRate(0.0367));
  });

  it('la convention r/12 donne une mensualité plus élevée', () => {
    const eq = simulate({ tranches: [tranche(250_000, 20, 3.67)] });
    const nom = simulate({ tranches: [tranche(250_000, 20, 3.67)] }, { rateConvention: 'nominal' });
    expect(nom.months[0]!.payment).toBeGreaterThan(eq.months[0]!.payment);
    const r = 0.0367 / 12;
    expect(nom.months[0]!.payment).toBeCloseTo((250_000 * r) / (1 - Math.pow(1 + r, -240)), 9);
  });
});

describe('échéancier', () => {
  it('rembourse exactement le capital et respecte les identités comptables', () => {
    const r = simulate({ tranches: [tranche(250_000, 20, 3.67)] });
    expect(r.totals.principal).toBeCloseTo(250_000, 6);
    expect(r.totals.payments).toBeCloseTo(r.totals.interest + r.totals.principal, 6);
    expect(r.months.at(-1)!.closingBalance).toBe(0);
    for (const m of r.months) {
      const t = m.tranches[0]!;
      expect(t.openingBalance - t.principal).toBeCloseTo(t.closingBalance, 6);
    }
  });

  it('ne fait aucun arrondi dans les calculs', () => {
    const r = simulate({ tranches: [tranche(250_000, 20, 3.67)] });
    expect(r.months[0]!.payment).not.toBe(Math.round(r.months[0]!.payment * 100) / 100);
  });

  it('agrège par année', () => {
    const r = simulate({ tranches: [tranche(250_000, 20, 3.67)] });
    const years = aggregateByYear(r.months);
    expect(years).toHaveLength(20);
    expect(years[0]).toMatchObject({ year: 1, firstMonth: 1, lastMonth: 12 });
    expectEuro(years[0]!.payment, 1464.03 * 12, 0.5);
    expect(years.reduce((s, y) => s + y.interest, 0)).toBeCloseTo(r.totals.interest, 6);
    expect(years.at(-1)!.closingBalance).toBe(0);
  });

  it('gère une tranche démarrant plus tard', () => {
    const r = simulate({ tranches: [tranche(100_000, 10, 3.4), tranche(50_000, 5, 3, { startMonth: 25 })] });
    expect(r.months[23]!.tranches).toHaveLength(1);
    expect(r.months[24]!.tranches).toHaveLength(2);
    // Le solde inclut la seconde tranche dès sa mise à disposition (mois 24).
    expect(r.months[23]!.closingBalance).toBeGreaterThan(r.months[22]!.closingBalance + 40_000);
    expect(r.perTranche[r.months[24]!.tranches[1]!.trancheId]).toHaveLength(60);
    expect(r.endMonth).toBe(120);
  });

  it('retourne un échéancier vide sans tranche', () => {
    const r = simulate({ tranches: [] });
    expect(r.months).toEqual([]);
    expect(r.endMonth).toBe(0);
  });
});

describe('cas limites', () => {
  it('tranche à 0 % : mensualités égales, aucun intérêt', () => {
    const r = simulate({ tranches: [tranche(30_000, 10, 0)] });
    expect(r.totals.interest).toBe(0);
    for (const m of r.months) expect(m.payment).toBeCloseTo(250, 9);
    expect(r.endMonth).toBe(120);
    expect(annuityPayment(30_000, 0, 120)).toBe(250);
  });

  it('amortissement constant du capital', () => {
    const r = simulate({ tranches: [tranche(240_000, 20, 3.67, { amortization: 'constantCapital' })] });
    const rm = monthlyRate(0.0367);
    expect(r.endMonth).toBe(240);
    for (const m of r.months) expect(m.principal).toBeCloseTo(1000, 9);
    // Échéances décroissantes : première = 1 000 + 240 000·r_m.
    expect(r.months[0]!.payment).toBeCloseTo(1000 + 240_000 * rm, 9);
    expect(r.months[1]!.payment).toBeLessThan(r.months[0]!.payment);
    // Intérêts totaux = r_m · 1 000 · (240 + 239 + … + 1).
    expect(r.totals.interest).toBeCloseTo(rm * 1000 * (240 * 241) / 2, 6);
    // Moins d'intérêts qu'en annuité pour le même prêt.
    expect(r.totals.interest).toBeLessThan(simulate({ tranches: [tranche(240_000, 20, 3.67)] }).totals.interest);
  });

  it('mélange annuité et amortissement constant', () => {
    const r = simulate({ tranches: [tranche(100_000, 10, 3.4), tranche(60_000, 5, 3, { amortization: 'constantCapital' })] });
    expect(r.totals.principal).toBeCloseTo(160_000, 6);
    expect(r.months[0]!.tranches[1]!.principal).toBeCloseTo(1000, 9);
  });
});

describe('synthèse', () => {
  it('résume un scénario à deux tranches', async () => {
    const { summarize } = await import('../summary');
    const r = simulate({ tranches: [tranche(200_000, 10, 3.4), tranche(50_000, 15, 3.55)] });
    const s = summarize(r, 2500);
    expectEuro(s.firstPayment, 2321);
    expectEuro(s.peakPayment, 2321);
    expectEuro(s.lowestPayment, 357);
    expectEuro(s.minMargin, 179);
    expectEuro(s.totalCost, 49_933);
    expect(s.endMonth).toBe(180);
  });
});
