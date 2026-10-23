import type { SimulationInput, Tranche, ValidationError } from './types';

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
  if (t.reduction !== undefined && (!isFiniteNumber(t.reduction) || t.reduction < 0 || t.reduction >= t.amount)) {
    err('reduction', 'La réduction doit être positive et inférieure au montant de la tranche.');
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

function positive(x: number): boolean {
  return isFiniteNumber(x) && x > 0;
}

function positiveInt(x: number): boolean {
  return Number.isInteger(x) && x >= 1;
}

/** Valide les remboursements anticipés, l'indemnité et le refinancement d'un scénario. */
export function validateSimulationInput(input: SimulationInput): ValidationError[] {
  const errors = validateTranches(input.tranches);
  const ids = new Set(input.tranches.map((t) => t.id));

  (input.prepayments ?? []).forEach((p, i) => {
    const path = `prepayments[${i}]`;
    const err = (field: string, message: string) => errors.push({ field: `${path}.${field}`, message });
    if (p.trancheId !== undefined && !ids.has(p.trancheId) && p.trancheId !== input.refinancing?.trancheId) {
      err('trancheId', "La tranche choisie pour le remboursement anticipé n'existe pas.");
    }
    if (p.kind === 'oneOff') {
      if (!positiveInt(p.month)) err('month', 'Le mois du remboursement anticipé doit être un entier supérieur ou égal à 1.');
      if (!positive(p.amount)) err('amount', 'Le montant du remboursement anticipé doit être strictement positif.');
      return;
    }
    if (!positiveInt(p.everyMonths)) err('everyMonths', 'La périodicité doit être un nombre entier de mois, au moins 1.');
    if (p.startMonth !== undefined && !positiveInt(p.startMonth)) {
      err('startMonth', 'Le mois de début doit être un entier supérieur ou égal à 1.');
    }
    if (p.endMonth !== undefined && (!positiveInt(p.endMonth) || p.endMonth < (p.startMonth ?? 1))) {
      err('endMonth', 'Le mois de fin doit être postérieur au mois de début.');
    }
    if (p.amount.type === 'fixed' && !positive(p.amount.amount)) {
      err('amount', 'Le montant du remboursement récurrent doit être strictement positif.');
    }
    if (p.amount.type === 'budget' && !positive(p.amount.monthlyBudget)) {
      err('amount', 'Le budget mensuel doit être strictement positif.');
    }
  });

  const pen = input.penalty;
  if (pen) {
    if (!isFiniteNumber(pen.monthsOfInterest) || pen.monthsOfInterest < 0 || pen.monthsOfInterest > 12) {
      errors.push({ field: 'penalty.monthsOfInterest', message: "L'indemnité doit être comprise entre 0 et 12 mois d'intérêts." });
    }
    const a = pen.allowance;
    if (a.kind === 'percentOfInitial' && (!isFiniteNumber(a.fraction) || a.fraction < 0 || a.fraction > 1)) {
      errors.push({ field: 'penalty.allowance', message: 'La franchise doit être comprise entre 0 % et 100 % du capital.' });
    }
    if (a.kind === 'fixed' && (!isFiniteNumber(a.amount) || a.amount < 0)) {
      errors.push({ field: 'penalty.allowance', message: 'La franchise doit être un montant positif ou nul.' });
    }
  }

  const refi = input.refinancing;
  if (refi) {
    const err = (field: string, message: string) => errors.push({ field: `refinancing.${field}`, message });
    if (!positiveInt(refi.month)) err('month', 'Le mois du refinancement doit être un entier supérieur ou égal à 1.');
    if (!positiveInt(refi.durationMonths) || refi.durationMonths > MAX_DURATION_MONTHS) {
      err('durationMonths', `La durée du nouveau crédit doit être comprise entre 1 mois et ${MAX_DURATION_MONTHS / 12} ans.`);
    }
    if (!isFiniteNumber(refi.annualRate) || refi.annualRate < 0 || refi.annualRate > MAX_ANNUAL_RATE) {
      err('annualRate', 'Le taux du nouveau crédit est invalide.');
    }
    if (!isFiniteNumber(refi.deedCosts) || refi.deedCosts < 0) err('deedCosts', "Les frais d'acte doivent être positifs ou nuls.");
    if (!isFiniteNumber(refi.processingFees) || refi.processingFees < 0) {
      err('processingFees', 'Les frais de dossier doivent être positifs ou nuls.');
    }
  }
  return errors;
}
