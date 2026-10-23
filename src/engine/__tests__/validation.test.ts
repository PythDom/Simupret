import { validateTranche, validateTranches } from '../validation';
import { tranche } from './helpers';

describe('validation des saisies', () => {
  it('accepte une tranche valide', () => {
    expect(validateTranche(tranche(250_000, 20, 3.67))).toEqual([]);
  });

  it('rejette les valeurs invalides avec des messages en français', () => {
    const errors = validateTranche(
      { ...tranche(-1, 20, 3.67), durationMonths: 0.5, annualRate: 3.67, startMonth: 0 },
      'tranches[0]',
    );
    const fields = errors.map((e) => e.field);
    expect(fields).toEqual([
      'tranches[0].amount',
      'tranches[0].durationMonths',
      'tranches[0].annualRate',
      'tranches[0].startMonth',
    ]);
    expect(errors[0]!.message).toMatch(/montant/);
    expect(errors[2]!.message).toMatch(/trop élevé/);
  });

  it('rejette NaN et une durée excessive', () => {
    const errors = validateTranche({ ...tranche(Number.NaN, 50, 3) });
    expect(errors.map((e) => e.field)).toEqual(['tranche.amount', 'tranche.durationMonths']);
  });

  it('exige au moins une tranche et des identifiants uniques', () => {
    expect(validateTranches([])[0]!.message).toBe('Ajoutez au moins une tranche.');
    const t = tranche(1000, 1, 1);
    expect(validateTranches([t, t]).map((e) => e.field)).toEqual(['tranches[1].id']);
  });
});
