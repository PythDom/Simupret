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
  /**
   * Réduction du montant à rembourser (prime, subside), par ex. pour une
   * tranche à 0 % de type Rénopack SWCS. Le montant débloqué reste `amount` ;
   * seul `amount − reduction` est amorti.
   */
  reduction?: number;
}

export interface SimulationOptions {
  rateConvention: RateConvention;
}

/** Effet d'un remboursement anticipé sur la tranche qui le reçoit. */
export type PrepaymentEffect = 'reduceDuration' | 'reducePayment';

interface PrepaymentBase {
  /**
   * Tranche qui reçoit le remboursement. Par défaut : la tranche active au
   * taux le plus élevé. Le surplus éventuel est reporté sur les autres
   * tranches, par taux décroissant.
   */
  trancheId?: string;
  /** Défaut : `reduceDuration` (on garde la mensualité). */
  effect?: PrepaymentEffect;
}

/** Remboursement anticipé ponctuel, effectué après l'échéance du mois indiqué. */
export interface OneOffPrepayment extends PrepaymentBase {
  kind: 'oneOff';
  month: number;
  amount: number;
}

/** Montant d'un remboursement récurrent. */
export type RecurringAmount =
  | { type: 'fixed'; amount: number }
  /**
   * Tout ce qui dépasse la mensualité normale jusqu'au budget mensuel :
   * chaque mois, (budget − mensualités) est mis de côté puis versé tous les
   * N mois.
   */
  | {
      type: 'budget';
      monthlyBudget: number;
      /**
       * Si vrai, l'indemnité de remploi est prélevée sur la somme mise de
       * côté. Sinon (défaut), elle est payée en plus.
       */
      penaltyWithinBudget?: boolean;
    };

/** Remboursement anticipé récurrent, tous les `everyMonths` mois. */
export interface RecurringPrepayment extends PrepaymentBase {
  kind: 'recurring';
  everyMonths: number;
  /** Premier mois de la période (défaut 1) : versements aux mois start+N−1, start+2N−1… */
  startMonth?: number;
  /** Dernier mois où un versement peut avoir lieu (inclus). */
  endMonth?: number;
  amount: RecurringAmount;
}

export type Prepayment = OneOffPrepayment | RecurringPrepayment;

/** Franchise annuelle de l'indemnité de remploi, par tranche et par année de crédit. */
export type PenaltyAllowance =
  | { kind: 'none' }
  /** Fraction du capital initial de la tranche remboursable sans indemnité chaque année. */
  | { kind: 'percentOfInitial'; fraction: number }
  /** Montant remboursable sans indemnité chaque année. */
  | { kind: 'fixed'; amount: number };

/**
 * Indemnité de remploi : `monthsOfInterest` mois d'intérêts sur le capital
 * remboursé, au taux de la tranche, soit capital × ((1 + r_m)^n − 1).
 */
export interface PenaltyConfig {
  monthsOfInterest: number;
  allowance: PenaltyAllowance;
}

/** Refinancement : au mois `month`, après l'échéance, tout le solde est remboursé et refinancé. */
export interface Refinancing {
  month: number;
  annualRate: number;
  durationMonths: number;
  amortization?: AmortizationType;
  /** Frais d'acte du nouveau crédit (€). */
  deedCosts: number;
  /** Frais de dossier du nouveau crédit (€). */
  processingFees: number;
  /** Si vrai, l'indemnité et les frais sont ajoutés au nouveau capital. Défaut : payés comptant. */
  financeCosts?: boolean;
  /** Identifiant de la tranche créée (défaut `refinancement`). */
  trancheId?: string;
}

export interface SimulationInput {
  tranches: readonly Tranche[];
  prepayments?: readonly Prepayment[];
  /** Défaut : 3 mois d'intérêts, sans franchise. */
  penalty?: PenaltyConfig;
  refinancing?: Refinancing;
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
  /** Remboursement anticipé reçu après l'échéance. */
  prepayment: number;
  /** Indemnité de remploi due sur ce remboursement. */
  penalty: number;
  /** Capital soldé par le refinancement. */
  refinanced: number;
  closingBalance: number;
}

/** Ligne consolidée (toutes tranches) pour un mois donné. */
export interface MonthRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  prepayment: number;
  penalty: number;
  /** Frais de refinancement (acte, dossier). */
  fees: number;
  /** Capital soldé par le refinancement (financé par le nouveau crédit, pas un décaissement). */
  refinanced: number;
  /** Décaissement réel de l'emprunteur ce mois-là (hors coûts financés). */
  cashOut: number;
  /** Solde restant dû total en fin de mois. */
  closingBalance: number;
  /** Détail des tranches actives ce mois-là. */
  tranches: TrancheMonth[];
}

export interface ScheduleTotals {
  payments: number;
  interest: number;
  principal: number;
  prepayments: number;
  penalties: number;
  fees: number;
  cashOut: number;
  /** Total des réductions de montant à rembourser. */
  reductions: number;
}

export interface SimulationResult {
  months: MonthRow[];
  perTranche: Record<string, TrancheMonth[]>;
  totals: ScheduleTotals;
  /** Dernier mois avec une échéance (0 si aucun prêt). */
  endMonth: number;
  /** Montants de remboursement anticipé non utilisés (prêt déjà soldé). */
  unusedPrepayment: number;
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
  prepayment: number;
  penalty: number;
  fees: number;
  cashOut: number;
  closingBalance: number;
}

export interface ValidationError {
  /** Chemin du champ concerné, ex. `tranches[0].amount`. */
  field: string;
  /** Message en français destiné à l'utilisateur. */
  message: string;
}
