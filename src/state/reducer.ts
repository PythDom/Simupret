import { newId } from './ids';
import type { AppState, Scenario, Settings } from './types';

export type Action =
  | { type: 'hydrate'; state: AppState }
  | { type: 'settings/update'; patch: Partial<Settings> }
  | { type: 'scenario/add'; scenario: Scenario; select?: boolean }
  | { type: 'scenario/update'; id: string; patch: Partial<Omit<Scenario, 'id'>> }
  | { type: 'scenario/duplicate'; id: string }
  | { type: 'scenario/delete'; id: string }
  | { type: 'scenario/select'; id: string }
  | { type: 'compare/toggle'; id: string };

export const MAX_COMPARE = 4;

function now(): string {
  return new Date().toISOString();
}

/** Copie profonde d'un scénario avec de nouveaux identifiants de tranches. */
export function cloneScenario(s: Scenario, name: string): Scenario {
  const id = newId('sc');
  const idMap = new Map<string, string>();
  const tranches = s.tranches.map((t) => {
    const nid = newId('tr');
    idMap.set(t.id, nid);
    return { ...t, id: nid };
  });
  const prepayments = s.prepayments.map((p) => {
    const copy = JSON.parse(JSON.stringify(p)) as typeof p;
    if (copy.trancheId && idMap.has(copy.trancheId)) copy.trancheId = idMap.get(copy.trancheId);
    return copy;
  });
  return {
    id,
    name,
    tranches,
    prepayments,
    refinancing: s.refinancing ? { ...s.refinancing } : null,
    updatedAt: now(),
  };
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'hydrate':
      return action.state;
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'scenario/add': {
      const compareIds =
        state.compareIds.length < MAX_COMPARE ? [...state.compareIds, action.scenario.id] : state.compareIds;
      return {
        ...state,
        scenarios: [...state.scenarios, action.scenario],
        selectedScenarioId: action.select === false ? state.selectedScenarioId : action.scenario.id,
        compareIds,
      };
    }
    case 'scenario/update':
      return {
        ...state,
        scenarios: state.scenarios.map((s) => (s.id === action.id ? { ...s, ...action.patch, updatedAt: now() } : s)),
      };
    case 'scenario/duplicate': {
      const src = state.scenarios.find((s) => s.id === action.id);
      if (!src) return state;
      return reducer(state, { type: 'scenario/add', scenario: cloneScenario(src, `${src.name} (copie)`) });
    }
    case 'scenario/delete': {
      const scenarios = state.scenarios.filter((s) => s.id !== action.id);
      return {
        ...state,
        scenarios,
        selectedScenarioId:
          state.selectedScenarioId === action.id ? (scenarios[0]?.id ?? null) : state.selectedScenarioId,
        compareIds: state.compareIds.filter((id) => id !== action.id),
      };
    }
    case 'scenario/select':
      return { ...state, selectedScenarioId: action.id };
    case 'compare/toggle': {
      const has = state.compareIds.includes(action.id);
      if (has) return { ...state, compareIds: state.compareIds.filter((id) => id !== action.id) };
      if (state.compareIds.length >= MAX_COMPARE) return state;
      return { ...state, compareIds: [...state.compareIds, action.id] };
    }
  }
}
