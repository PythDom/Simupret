/**
 * Cas de validation du cahier des charges (taux mensuel équivalent, ±1 €).
 */
import { simulate } from '../schedule';
import { expectEuro, tranche } from './helpers';

describe('cas de validation', () => {
  it('250 000 € / 20 ans / 3,67 % → 1 464 €/mois, intérêts 101 367 €', () => {
    const r = simulate({ tranches: [tranche(250_000, 20, 3.67)] });
    expectEuro(r.months[0]!.payment, 1464);
    expectEuro(r.totals.interest, 101_367);
    expect(r.endMonth).toBe(240);
  });

  it('250 000 € / 15 ans / 3,55 % → 1 786 €/mois, intérêts 71 554 €', () => {
    const r = simulate({ tranches: [tranche(250_000, 15, 3.55)] });
    expectEuro(r.months[0]!.payment, 1786);
    expectEuro(r.totals.interest, 71_554);
    expect(r.endMonth).toBe(180);
  });

  it('250 000 € / 10 ans / 3,40 % → 2 454 €/mois, intérêts 44 528 €', () => {
    const r = simulate({ tranches: [tranche(250_000, 10, 3.4)] });
    expectEuro(r.months[0]!.payment, 2454);
    expectEuro(r.totals.interest, 44_528);
    expect(r.endMonth).toBe(120);
  });

  it('200 000 € / 10 ans / 3,40 % + 50 000 € / 15 ans / 3,55 % → 2 321 € puis 357 €, intérêts 49 933 €', () => {
    const r = simulate({ tranches: [tranche(200_000, 10, 3.4), tranche(50_000, 15, 3.55)] });
    for (const m of r.months.slice(0, 120)) expectEuro(m.payment, 2321);
    for (const m of r.months.slice(120)) expectEuro(m.payment, 357);
    expect(r.months[119]!.tranches).toHaveLength(2);
    expect(r.months[120]!.tranches).toHaveLength(1);
    expectEuro(r.totals.interest, 49_933);
    expect(r.endMonth).toBe(180);
  });
});

describe('cas de validation — remboursements anticipés', () => {
  it('250 000 € / 20 ans / 3,67 %, 2 500 €/mois via remboursements annuels, indemnité 3 mois → 121 mois, intérêts ≈ 50 300 €, indemnités ≈ 1 125 €', () => {
    const r = simulate({
      tranches: [tranche(250_000, 20, 3.67)],
      prepayments: [{ kind: 'recurring', everyMonths: 12, amount: { type: 'budget', monthlyBudget: 2500 } }],
    });
    expect(r.endMonth).toBe(121);
    // Le cahier des charges donne « ≈ 50 300 € » (arrondi à la centaine) ;
    // la valeur exacte est 50 295 €.
    expectEuro(r.totals.interest, 50_300, 10);
    expectEuro(r.totals.interest, 50_295);
    expectEuro(r.totals.penalties, 1125);
    // Neuf versements annuels (mois 12 à 108), le dixième (mois 120) solde presque tout.
    expect(r.months.filter((m) => m.prepayment > 0).map((m) => m.month)).toEqual([
      12, 24, 36, 48, 60, 72, 84, 96, 108, 120,
    ]);
  });
});
