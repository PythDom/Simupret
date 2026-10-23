import { Preferences } from '@capacitor/preferences';
import { defaultState } from '../state/defaults';
import type { AppState } from '../state/types';

/**
 * Persistance locale via Capacitor Preferences (SharedPreferences sur
 * Android, localStorage sur le web). Aucune donnée ne quitte l'appareil.
 */
export const STORAGE_KEY = 'simupret-state';
export const STORAGE_VERSION = 1;

interface StoredState {
  version: number;
  state: AppState;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

/** Fusionne un état stocké avec les valeurs par défaut (champs ajoutés depuis). */
export function restoreState(raw: string | null): AppState {
  const fallback = defaultState();
  if (!raw) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.version !== STORAGE_VERSION || !isObject(parsed.state)) return fallback;
    const s = parsed.state as Partial<AppState>;
    const scenarios = Array.isArray(s.scenarios) ? s.scenarios : fallback.scenarios;
    return {
      settings: { ...fallback.settings, ...(isObject(s.settings) ? s.settings : {}) },
      scenarios,
      selectedScenarioId:
        typeof s.selectedScenarioId === 'string' && scenarios.some((x) => x.id === s.selectedScenarioId)
          ? s.selectedScenarioId
          : (scenarios[0]?.id ?? null),
      compareIds: Array.isArray(s.compareIds)
        ? s.compareIds.filter((id) => scenarios.some((x) => x.id === id))
        : [],
    };
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
