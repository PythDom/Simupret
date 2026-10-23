import type { LoanCosts, PenaltyConfig, Prepayment, RateConvention, RateGrid, Refinancing, Tranche } from '../engine';

export interface Settings {
  /** Montant à emprunter (€). */
  amount: number;
  /** Valeur du bien (€). */
  propertyValue: number;
  /** Budget mensuel (€). */
  monthlyBudget: number;
  /** Durée maximale (mois). */
  maxDurationMonths: number;
  /** Marge de sécurité minimale (€). */
  minMargin: number;
  /** Nombre maximal de tranches pour l'optimiseur (1 à 3). */
  maxTranches: number;
  rateGrid: RateGrid;
  penalty: PenaltyConfig;
  rateConvention: RateConvention;
  /** Date de la première échéance, ISO AAAA-MM-JJ. */
  firstPaymentDate: string;
  /** Frais et assurances liés au crédit. */
  costs: LoanCosts;
  /** Rendement annuel net d'un placement, pour le coût d'opportunité. */
  investmentReturn: number;
}

export interface Scenario {
  id: string;
  name: string;
  tranches: Tranche[];
  prepayments: Prepayment[];
  refinancing: Refinancing | null;
  updatedAt: string;
}

export interface AppState {
  settings: Settings;
  scenarios: Scenario[];
  selectedScenarioId: string | null;
  /** Scénarios cochés dans le comparateur (2 à 4). */
  compareIds: string[];
}
