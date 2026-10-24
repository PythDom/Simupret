export type ScreenId =
  | 'parametres'
  | 'banques'
  | 'scenarios'
  | 'comparateur'
  | 'optimiseur'
  | 'amortissement'
  | 'graphiques'
  | 'export'
  | 'a-propos';

export interface ScreenDef {
  id: ScreenId;
  label: string;
}

export const SCREENS: readonly ScreenDef[] = [
  { id: 'parametres', label: 'Paramètres' },
  { id: 'banques', label: 'Banques' },
  { id: 'scenarios', label: 'Scénarios' },
  { id: 'comparateur', label: 'Comparateur' },
  { id: 'optimiseur', label: 'Optimiseur' },
  { id: 'amortissement', label: 'Amortissement' },
  { id: 'graphiques', label: 'Graphiques' },
  { id: 'export', label: 'Export' },
  { id: 'a-propos', label: 'À propos' },
];

export const DEFAULT_SCREEN: ScreenId = 'parametres';

export function screenFromHash(hash: string): ScreenId {
  const id = hash.replace(/^#\/?/, '');
  return SCREENS.some((s) => s.id === id) ? (id as ScreenId) : DEFAULT_SCREEN;
}
