import { createContext, useContext, type Dispatch } from 'react';
import type { Action } from './reducer';
import type { AppState } from './types';

interface StoreValue {
  state: AppState;
  dispatch: Dispatch<Action>;
}

export const StoreContext = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore doit être utilisé dans <StoreProvider>.');
  return v;
}
