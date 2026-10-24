import { marketRateGrid } from '../market/grid';
import type { MarketData } from '../market/nbb';
import { newId } from './ids';
import { MARKET_BANK_ID, type AppState, type BankProfile } from './types';

function copy<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

/** Banque d'un identifiant ; à défaut, le profil du marché. */
export function bankById(banks: readonly BankProfile[], id: string | undefined): BankProfile {
  return banks.find((b) => b.id === id) ?? banks.find((b) => b.id === MARKET_BANK_ID) ?? banks[0]!;
}

/** Nouvelle banque : copie modifiable d'un profil (par défaut, la moyenne du marché). */
export function cloneBank(source: BankProfile, name: string): BankProfile {
  return {
    id: newId('bq'),
    name,
    kind: 'custom',
    rateGrid: copy(source.rateGrid),
    costs: copy(source.costs),
    ratesDate: source.ratesDate,
    notes: source.kind === 'market' ? `Copie des moyennes du marché (${source.ratesDate}). Remplacez par les conditions de la banque.` : source.notes,
  };
}

/** Nom unique : « Nouvelle banque », « Nouvelle banque 2 »… */
export function uniqueBankName(banks: readonly BankProfile[], base: string): string {
  const names = new Set(banks.map((b) => b.name));
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) if (!names.has(`${base} ${i}`)) return `${base} ${i}`;
}

/** Remplace les moyennes du marché et met à jour la grille du profil BNB (ses frais sont conservés). */
export function applyMarketData(state: AppState, market: MarketData): AppState {
  return {
    ...state,
    market,
    banks: state.banks.map((b) =>
      b.id === MARKET_BANK_ID ? { ...b, rateGrid: marketRateGrid(market), ratesDate: market.referenceMonth } : b,
    ),
  };
}

/** Âge des taux en mois par rapport à `now` (« AAAA-MM » ou « AAAA-MM-JJ »). */
export function ratesAgeMonths(ratesDate: string, now: Date = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})/.exec(ratesDate);
  if (!m) return null;
  return (now.getFullYear() - Number(m[1])) * 12 + (now.getMonth() + 1 - Number(m[2]));
}
