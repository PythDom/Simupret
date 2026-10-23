import {
  formatDate,
  formatDuration,
  formatEuro,
  formatEuroRounded,
  formatNumber,
  formatPercent,
  parseNumber,
} from './index';

const NBSP = '\u00A0';

describe('formatage fr-BE', () => {
  it('formate les montants en euros', () => {
    expect(formatEuro(1464)).toBe(`1${NBSP}464,00${NBSP}€`);
    expect(formatEuro(250000)).toBe(`250${NBSP}000,00${NBSP}€`);
    expect(formatEuro(0.5)).toBe(`0,50${NBSP}€`);
    expect(formatEuroRounded(101366.85)).toBe(`101${NBSP}367${NBSP}€`);
  });

  it('formate les pourcentages', () => {
    expect(formatPercent(0.0367)).toBe(`3,67${NBSP}%`);
    expect(formatPercent(0.034, 1)).toBe(`3,4${NBSP}%`);
  });

  it('formate les nombres', () => {
    expect(formatNumber(1234.5, 1)).toBe(`1${NBSP}234,5`);
  });

  it('formate les dates en JJ/MM/AAAA', () => {
    expect(formatDate(new Date(2026, 9, 3))).toBe('03/10/2026');
  });

  it('formate les durées', () => {
    expect(formatDuration(240)).toBe('20 ans');
    expect(formatDuration(121)).toBe('10 ans et 1 mois');
    expect(formatDuration(12)).toBe('1 an');
    expect(formatDuration(7)).toBe('7 mois');
    expect(formatDuration(0)).toBe('0 mois');
  });

  it('lit les saisies à la belge', () => {
    expect(parseNumber('250 000')).toBe(250000);
    expect(parseNumber('3,67')).toBe(3.67);
    expect(parseNumber('1.464,50 €')).toBe(1464.5);
    expect(parseNumber('2500')).toBe(2500);
    expect(parseNumber('3.5')).toBe(3.5);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('1,2,3')).toBeNull();
  });
});
