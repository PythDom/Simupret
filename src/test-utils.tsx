import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import type { MarketData } from './market/nbb';
import { applyMarketData } from './state/banks';
import { defaultState } from './state/defaults';
import { StoreProvider } from './state/store';
import type { AppState } from './state/types';

/**
 * Moyennes BNB figées pour les tests : la copie embarquée (snapshot.json) est
 * mise à jour à chaque publication et ne doit pas faire varier les attentes.
 */
export const TEST_MARKET: MarketData = {
  source: 'BNB — statistiques MIR (via le portail de données de la BCE)',
  referenceMonth: '2026-08',
  fetchedAt: '2026-10-24T06:11:38Z',
  series: {
    all: [['2025-08', 3.4], ['2026-07', 3.64], ['2026-08', 3.7]],
    upTo1y: [['2026-08', 4.69]],
    from1To5y: [['2026-08', 3.91]],
    from5To10y: [['2026-07', 3.48], ['2026-08', 3.54]],
    over10y: [['2025-08', 3.3], ['2026-07', 3.48], ['2026-08', 3.53]],
    aprc: [['2026-08', 4.03]],
    volume: [['2026-08', 3176]],
  },
};

/** État initial déterministe : date fixe et moyennes du marché figées. */
export function testState(): AppState {
  return applyMarketData(defaultState(new Date(2026, 9, 23)), TEST_MARKET);
}

/** Rend un composant avec un état initial déterministe (pas de chargement asynchrone). */
export function renderWithStore(ui: ReactElement, state: AppState = testState()) {
  return render(<StoreProvider initialState={state}>{ui}</StoreProvider>);
}
