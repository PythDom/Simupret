import type { LoanCosts, PenaltyConfig, Prepayment, RateConvention, RateGrid, Refinancing, Tranche } from '../engine';
import type { MarketData } from '../market/nbb';

/** Identifiant du profil « Moyenne du marché (BNB) », toujours présent. */
export const MARKET_BANK_ID = 'marche-bnb';

/** Conditions d'une banque : grille de taux, frais et assurances. */
export interface BankProfile {
  id: string;
  name: string;
  /** `market` : moyennes BNB (grille mise à jour automatiquement) ; `custom` : saisie par l'utilisateur. */
  kind: 'market' | 'custom';
  rateGrid: RateGrid;
  costs: LoanCosts;
  /** Date des taux : « AAAA-MM » (moyennes BNB) ou « AAAA-MM-JJ » (offre d'une banque). */
  ratesDate: string;
  notes: string;
}

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
  penalty: PenaltyConfig;
  rateConvention: RateConvention;
  /** Date de la première échéance, ISO AAAA-MM-JJ. */
  firstPaymentDate: string;
  /** Banque utilisée par défaut (nouveaux scénarios, optimiseur). */
  defaultBankId: string;
  /** Rendement annuel net d'un placement, pour le coût d'opportunité. */
  investmentReturn: number;
}

export interface Scenario {
  id: string;
  name: string;
  tranches: Tranche[];
  prepayments: Prepayment[];
  refinancing: Refinancing | null;
  /** Banque dont les frais et assurances s'appliquent au scénario. */
  bankId: string;
  updatedAt: string;
}

export interface AppState {
  settings: Settings;
  banks: BankProfile[];
  /** Dernières moyennes du marché connues (BNB). */
  market: MarketData;
  scenarios: Scenario[];
  selectedScenarioId: string | null;
  /** Scénarios cochés dans le comparateur (2 à 4). */
  compareIds: string[];
}
