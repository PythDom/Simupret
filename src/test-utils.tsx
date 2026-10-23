import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { defaultState } from './state/defaults';
import { StoreProvider } from './state/store';
import type { AppState } from './state/types';

/** Rend un composant avec un état initial déterministe (pas de chargement asynchrone). */
export function renderWithStore(ui: ReactElement, state: AppState = defaultState(new Date(2026, 9, 23))) {
  return render(<StoreProvider initialState={state}>{ui}</StoreProvider>);
}
