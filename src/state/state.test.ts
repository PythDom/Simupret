import { STORAGE_KEY, loadState, restoreState, saveState } from '../storage';
import { defaultState } from './defaults';
import { monthDate } from './derived';
import { reducer } from './reducer';

describe('persistance', () => {
  beforeEach(() => localStorage.clear());

  it('sauvegarde et recharge les scénarios', async () => {
    const s = defaultState(new Date(2026, 9, 23));
    const next = reducer(s, { type: 'scenario/update', id: s.scenarios[0]!.id, patch: { name: 'Mon crédit' } });
    await saveState(next);
    const loaded = await loadState();
    expect(loaded.scenarios[0]!.name).toBe('Mon crédit');
    expect(loaded.settings.firstPaymentDate).toBe('2026-11-01');
  });

  it("revient aux valeurs par défaut si les données sont illisibles", () => {
    expect(restoreState('pas du json').scenarios).toHaveLength(2);
    expect(restoreState(JSON.stringify({ version: 999, state: {} })).scenarios).toHaveLength(2);
  });

  it('complète les réglages ajoutés depuis la sauvegarde', () => {
    const s = defaultState();
    const partial = { ...s, settings: { amount: 300_000 } };
    const r = restoreState(JSON.stringify({ version: 1, state: partial }));
    expect(r.settings.amount).toBe(300_000);
    expect(r.settings.monthlyBudget).toBe(2500);
  });

  it('utilise la clé de stockage attendue', async () => {
    await saveState(defaultState());
    expect(localStorage.getItem(`CapacitorStorage.${STORAGE_KEY}`)).not.toBeNull();
  });
});

describe('réducteur', () => {
  const s = defaultState(new Date(2026, 9, 23));

  it('duplique un scénario avec de nouveaux identifiants', () => {
    const r = reducer(s, { type: 'scenario/duplicate', id: s.scenarios[1]!.id });
    const copy = r.scenarios[2]!;
    expect(copy.name).toBe('Deux tranches 10 + 15 ans (copie)');
    expect(copy.id).not.toBe(s.scenarios[1]!.id);
    expect(copy.tranches.map((t) => t.id)).not.toEqual(s.scenarios[1]!.tranches.map((t) => t.id));
    expect(r.selectedScenarioId).toBe(copy.id);
  });

  it('supprime un scénario et met à jour la sélection et le comparateur', () => {
    const r = reducer(s, { type: 'scenario/delete', id: s.scenarios[0]!.id });
    expect(r.scenarios).toHaveLength(1);
    expect(r.selectedScenarioId).toBe(s.scenarios[1]!.id);
    expect(r.compareIds).toEqual([s.scenarios[1]!.id]);
  });

  it('limite le comparateur à 4 scénarios', () => {
    let r = s;
    for (let i = 0; i < 4; i++) r = reducer(r, { type: 'scenario/duplicate', id: s.scenarios[0]!.id });
    expect(r.scenarios).toHaveLength(6);
    expect(r.compareIds).toHaveLength(4);
    const extra = r.scenarios[5]!.id;
    expect(reducer(r, { type: 'compare/toggle', id: extra }).compareIds).toHaveLength(4);
  });
});

describe('dates des échéances', () => {
  it('ajoute des mois en plafonnant le jour', () => {
    expect(monthDate('2026-11-01', 1)).toEqual(new Date(2026, 10, 1));
    expect(monthDate('2026-11-01', 240)).toEqual(new Date(2046, 9, 1));
    expect(monthDate('2027-01-31', 2)).toEqual(new Date(2027, 1, 28));
  });
});
