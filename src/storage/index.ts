import { Preferences } from '@capacitor/preferences';
import { DEFAULT_RATE_GRID, type LoanCosts, type RateGrid } from '../engine';
import type { MarketData } from '../market/nbb';
import { applyMarketData } from '../state/banks';
import { defaultCosts, defaultState, marketBank } from '../state/defaults';
import { MARKET_BANK_ID, type AppState, type BankProfile, type Scenario } from '../state/types';

/**
 * Persistance locale via Capacitor Preferences (SharedPreferences sur
 * Android, localStorage sur le web et Windows). Aucune donnée ne quitte l'appareil.
 */
export const STORAGE_KEY = 'simupret-state';
/** Version 2 : grille de taux et frais par banque (version 1 : réglages globaux). */
export const STORAGE_VERSION = 2;

/** Identifiant de la banque créée lors de la migration depuis la version 1. */
export const MIGRATED_BANK_ID = 'mes-taux';

interface StoredState {
  version: number;
  state: AppState;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function isMarketData(v: unknown): v is MarketData {
  return isObject(v) && typeof v.referenceMonth === 'string' && typeof v.fetchedAt === 'string' && isObject(v.series);
}

function isBank(v: unknown): v is BankProfile {
  return isObject(v) && typeof v.id === 'string' && typeof v.name === 'string' && isObject(v.rateGrid) && isObject(v.costs);
}

/** La plus récente de deux séries de moyennes (mois de référence, puis date de récupération). */
function newer(a: MarketData, b: MarketData): MarketData {
  if (a.referenceMonth !== b.referenceMonth) return a.referenceMonth > b.referenceMonth ? a : b;
  return a.fetchedAt >= b.fetchedAt ? a : b;
}

/** Restaure un état stocké, migre les anciennes versions et complète les champs ajoutés depuis. */
export function restoreState(raw: string | null, fallback: AppState = defaultState()): AppState {
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || !isObject(parsed.state)) return fallback;
    const version = parsed.version;
    if (version !== 1 && version !== STORAGE_VERSION) return fallback;
    const s = parsed.state as Record<string, unknown>;
    const storedSettings = isObject(s.settings) ? s.settings : {};

    let banks: BankProfile[] = Array.isArray(s.banks) ? s.banks.filter(isBank) : [];
    let defaultBankId = typeof storedSettings.defaultBankId === 'string' ? storedSettings.defaultBankId : MARKET_BANK_ID;
    let fallbackBankId = MARKET_BANK_ID;

    if (version === 1) {
      // Version 1 : grille et frais globaux → banque « Mes taux » pour conserver les résultats.
      banks = [
        {
          id: MIGRATED_BANK_ID,
          name: 'Mes taux',
          kind: 'custom',
          rateGrid: (isObject(storedSettings.rateGrid) ? storedSettings.rateGrid : DEFAULT_RATE_GRID) as RateGrid,
          costs: (isObject(storedSettings.costs) ? storedSettings.costs : defaultCosts()) as LoanCosts,
          ratesDate: '2026-10',
          notes: "Taux et frais saisis avant l'ajout des banques.",
        },
      ];
      defaultBankId = MIGRATED_BANK_ID;
      fallbackBankId = MIGRATED_BANK_ID;
    }

    const storedMarket = isMarketData(s.market) ? s.market : fallback.market;
    const market = newer(storedMarket, fallback.market);
    if (!banks.some((b) => b.id === MARKET_BANK_ID)) banks = [marketBank(market), ...banks];
    if (!banks.some((b) => b.id === defaultBankId)) defaultBankId = MARKET_BANK_ID;

    // Champs de la version 1 désormais portés par les banques.
    const settingsRest = { ...storedSettings };
    delete settingsRest.rateGrid;
    delete settingsRest.costs;
    const scenarios = (Array.isArray(s.scenarios) ? (s.scenarios as Scenario[]) : fallback.scenarios).map((sc) => ({
      ...sc,
      bankId: typeof sc.bankId === 'string' && banks.some((b) => b.id === sc.bankId) ? sc.bankId : fallbackBankId,
    }));

    const state: AppState = {
      settings: { ...fallback.settings, ...settingsRest, defaultBankId },
      banks,
      market: storedMarket,
      scenarios,
      selectedScenarioId:
        typeof s.selectedScenarioId === 'string' && scenarios.some((x) => x.id === s.selectedScenarioId)
          ? s.selectedScenarioId
          : (scenarios[0]?.id ?? null),
      compareIds: Array.isArray(s.compareIds)
        ? (s.compareIds as unknown[]).filter((id): id is string => typeof id === 'string' && scenarios.some((x) => x.id === id))
        : [],
    };
    // Moyennes embarquées plus récentes (nouvelle version de l'application) : mise à jour du profil BNB.
    return market === storedMarket ? state : applyMarketData(state, market);
  } catch {
    return fallback;
  }
}

export async function loadState(): Promise<AppState> {
  const { value } = await Preferences.get({ key: STORAGE_KEY });
  return restoreState(value);
}

export async function saveState(state: AppState): Promise<void> {
  const payload: StoredState = { version: STORAGE_VERSION, state };
  await Preferences.set({ key: STORAGE_KEY, value: JSON.stringify(payload) });
}
