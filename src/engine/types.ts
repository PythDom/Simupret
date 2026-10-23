/**
 * Types du moteur financier. Toutes les valeurs monétaires sont en euros et
 * ne sont jamais arrondies dans les calculs. Les taux sont exprimés en
 * fraction (0.0367 pour 3,67 %).
 *
 * Convention temporelle : le mois 0 est la date de signature / mise à
 * disposition des fonds ; le mois 1 est la première échéance mensuelle.
 */

/** `equivalent` : (1 + r)^(1/12) − 1 (pratique belge). `nominal` : r / 12. */
export type RateConvention = 'equivalent' | 'nominal';

/** `annuity` : mensualités constantes. `constantCapital` : amortissement constant du capital. */
export type AmortizationType = 'annuity' | 'constantCapital';

export interface Tranche {
  id: string;
  label?: string;
  /** Capital emprunté (€). */
  amount: number;
  /** Durée en mois. */
  durationMonths: number;
  /** Taux annuel fixe (fraction). */
  annualRate: number;
  /**
   * Mois de la première échéance (≥ 1). Les fonds de la tranche sont mis à
   * disposition au mois `startMonth − 1`.
   */
  startMonth: number;
  amortization: AmortizationType;
}

export interface SimulationOptions {
  rateConvention: RateConvention;
}

/** Ligne d'échéancier d'une tranche pour un mois donné. */
export interface TrancheMonth {
  month: number;
  trancheId: string;
  openingBalance: number;
  interest: number;
  /** Capital amorti par l'échéance normale. */
  principal: number;
  /** Échéance normale (intérêts + capital). */
  payment: number;
  closingBalance: number;
}

/** Ligne consolidée (toutes tranches) pour un mois donné. */
export interface MonthRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  /** Solde restant dû total en fin de mois. */
  closingBalance: number;
  /** Détail des tranches actives ce mois-là. */
  tranches: TrancheMonth[];
}

export interface ScheduleTotals {
  payments: number;
  interest: number;
  principal: number;
}

export interface SimulationResult {
  months: MonthRow[];
  perTranche: Record<string, TrancheMonth[]>;
  totals: ScheduleTotals;
  /** Dernier mois avec une échéance (0 si aucun prêt). */
  endMonth: number;
}

/** Agrégat annuel d'un échéancier. */
export interface YearRow {
  /** Année de crédit, à partir de 1 (mois 1 à 12 = année 1). */
  year: number;
  firstMonth: number;
  lastMonth: number;
  payment: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

export interface ValidationError {
  /** Chemin du champ concerné, ex. `tranches[0].amount`. */
  field: string;
  /** Message en français destiné à l'utilisateur. */
  message: string;
}
