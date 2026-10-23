import type { Tranche, ValidationError } from './types';

/** Durée maximale acceptée pour une tranche (40 ans). */
export const MAX_DURATION_MONTHS = 480;
/** Taux annuel maximal accepté (30 %), garde-fou contre les erreurs de saisie. */
export const MAX_ANNUAL_RATE = 0.3;

function isFiniteNumber(x: number): boolean {
  return typeof x === 'number' && Number.isFinite(x);
}

/** Valide une tranche ; retourne la liste des erreurs (vide si valide). */
export function validateTranche(t: Tranche, path = 'tranche'): ValidationError[] {
  const errors: ValidationError[] = [];
  const err = (field: string, message: string) => errors.push({ field: `${path}.${field}`, message });

  if (!isFiniteNumber(t.amount) || t.amount <= 0) {
    err('amount', 'Le montant de la tranche doit être un nombre strictement positif.');
  }
  if (!Number.isInteger(t.durationMonths) || t.durationMonths < 1) {
    err('durationMonths', 'La durée doit être un nombre entier de mois, au moins 1.');
  } else if (t.durationMonths > MAX_DURATION_MONTHS) {
    err('durationMonths', `La durée ne peut pas dépasser ${MAX_DURATION_MONTHS / 12} ans.`);
  }
  if (!isFiniteNumber(t.annualRate) || t.annualRate < 0) {
    err('annualRate', 'Le taux doit être un nombre positif ou nul.');
  } else if (t.annualRate > MAX_ANNUAL_RATE) {
    err('annualRate', `Le taux annuel semble trop élevé (maximum ${MAX_ANNUAL_RATE * 100} %). Saisissez-le en pourcentage, par ex. 3,67.`);
  }
  if (!Number.isInteger(t.startMonth) || t.startMonth < 1) {
    err('startMonth', 'Le mois de la première échéance doit être un entier supérieur ou égal à 1.');
  }
  if (t.amortization !== 'annuity' && t.amortization !== 'constantCapital') {
    err('amortization', "Le type d'amortissement est inconnu.");
  }
  return errors;
}

/** Valide un ensemble de tranches. */
export function validateTranches(tranches: readonly Tranche[]): ValidationError[] {
  if (tranches.length === 0) {
    return [{ field: 'tranches', message: 'Ajoutez au moins une tranche.' }];
  }
  const errors: ValidationError[] = [];
  const ids = new Set<string>();
  tranches.forEach((t, i) => {
    errors.push(...validateTranche(t, `tranches[${i}]`));
    if (ids.has(t.id)) {
      errors.push({ field: `tranches[${i}].id`, message: 'Deux tranches ont le même identifiant.' });
    }
    ids.add(t.id);
  });
  return errors;
}
