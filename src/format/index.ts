/**
 * Formatage d'affichage selon les conventions belges (fr-BE).
 * Ces fonctions servent UNIQUEMENT à l'affichage : les calculs utilisent
 * toujours les valeurs non arrondies.
 */

export const LOCALE = 'fr-BE';

const euroFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const euroRoundFmt = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dateFmt = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/**
 * Intl produit une espace fine insécable (U+202F) comme séparateur de milliers
 * et une espace insécable (U+00A0) avant « € ». On les uniformise en U+00A0 :
 * rendu identique à « 1 464,00 € », sans coupure de ligne, et mieux supporté
 * par les polices (PDF, CSV ouverts dans un tableur).
 */
function normalizeSpaces(s: string): string {
  return s.replace(/[\u202F\u00A0]/g, '\u00A0');
}

/** 1464 → « 1 464,00 € » */
export function formatEuro(value: number): string {
  return normalizeSpaces(euroFmt.format(value));
}

/** 1464.4 → « 1 464 € » (synthèses, graphiques) */
export function formatEuroRounded(value: number): string {
  return normalizeSpaces(euroRoundFmt.format(value));
}

/** 0.0367 → « 3,67 % » */
export function formatPercent(rate: number, fractionDigits = 2): string {
  return normalizeSpaces(
    new Intl.NumberFormat(LOCALE, {
      style: 'percent',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(rate),
  );
}

/** 1234.5 → « 1 234,5 » */
export function formatNumber(value: number, fractionDigits = 0): string {
  return normalizeSpaces(
    new Intl.NumberFormat(LOCALE, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value),
  );
}

/** Date → « JJ/MM/AAAA » */
export function formatDate(date: Date): string {
  return dateFmt.format(date);
}

/** Durée en mois → « 20 ans », « 10 ans et 1 mois », « 7 mois » */
export function formatDuration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const ys = y === 0 ? '' : `${y} an${y > 1 ? 's' : ''}`;
  const ms = m === 0 ? '' : `${m} mois`;
  if (ys && ms) return `${ys} et ${ms}`;
  return ys || ms || '0 mois';
}

/**
 * Lit un nombre saisi à la belge : « 250 000 », « 3,67 », « 1.464,50 ».
 * Retourne `null` si la saisie n'est pas un nombre valide.
 */
export function parseNumber(input: string): number | null {
  let s = input.trim().replace(/[\s\u00A0\u202F€%]/g, '');
  if (s === '') return null;
  if (s.includes(',')) {
    // La virgule est le séparateur décimal ; les points sont des milliers.
    s = s.replace(/\./g, '').replace(',', '.');
  }
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  return Number(s);
}

/** « JJ/MM/AAAA » → « AAAA-MM-JJ », ou `null` si la date est invalide. */
export function parseDate(input: string): string | null {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(input.trim());
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = Number(dd);
  const mo = Number(mm);
  const y = Number(yyyy);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return `${yyyy}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** « AAAA-MM-JJ » → « JJ/MM/AAAA ». */
export function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Date des taux : « 2026-08 » → « 08/2026 », « 2026-10-12 » → « 12/10/2026 ». */
export function ratesDateLabel(d: string): string {
  const [y, m, day] = d.split('-');
  return day ? `${day}/${m}/${y}` : `${m}/${y}`;
}

/** « 2026-08 » → « août 2026 ». */
export function formatMonth(yyyyMm: string): string {
  const [y, m] = yyyyMm.split('-').map(Number);
  return new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric' }).format(new Date(y ?? 2026, (m ?? 1) - 1, 1));
}
