import { useEffect, useReducer, useRef, type ReactNode } from 'react';
import { loadState, saveState } from '../storage';
import { StoreContext } from './context';
import { defaultState } from './defaults';
import { reducer } from './reducer';
import type { AppState } from './types';

/** Délai avant sauvegarde après une modification (ms). */
const SAVE_DELAY = 300;

export function StoreProvider({ children, initialState }: { children: ReactNode; initialState?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initialState ?? defaultState());
  const hydrated = useRef(initialState !== undefined);

  useEffect(() => {
    if (hydrated.current) return;
    let cancelled = false;
    loadState()
      .then((s) => {
        if (!cancelled) dispatch({ type: 'hydrate', state: s });
      })
      .catch(() => undefined)
      .finally(() => {
        hydrated.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    const timer = setTimeout(() => {
      saveState(state).catch(() => undefined);
    }, SAVE_DELAY);
    return () => clearTimeout(timer);
  }, [state]);

  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}
