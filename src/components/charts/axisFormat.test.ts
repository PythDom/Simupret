import { compactEuro, niceTicks } from './axisFormat';

describe('graduations', () => {
  it('produit des pas ronds', () => {
    expect(niceTicks(250_000)).toEqual([0, 50_000, 100_000, 150_000, 200_000, 250_000]);
    expect(niceTicks(2750)).toEqual([0, 1000, 2000, 3000]);
    expect(niceTicks(101_367)).toEqual([0, 25_000, 50_000, 75_000, 100_000, 125_000]);
    expect(niceTicks(0)).toEqual([0]);
  });

  it('formate les montants compacts en fr-BE', () => {
    expect(compactEuro(250_000)).toBe('250 k€');
    expect(compactEuro(2500)).toBe('2,5 k€');
    expect(compactEuro(500)).toBe('500 €');
  });
});
