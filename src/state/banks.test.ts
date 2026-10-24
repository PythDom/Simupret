import { DEFAULT_RATE_GRID } from '../engine';
import { MIGRATED_BANK_ID, restoreState } from '../storage';
import { TEST_MARKET, testState } from '../test-utils';
import { applyMarketData, bankById, cloneBank, ratesAgeMonths, uniqueBankName } from './banks';
import { computeScenario } from './derived';
import { optimizeAcrossBanks } from './optimizeBanks';
import { reducer } from './reducer';
import { applyBankRates, gridRateFor } from './scenarioFactory';
import { MARKET_BANK_ID } from './types';

describe('banques', () => {
  it('le profil du marché suit les moyennes BNB', () => {
    const s = testState();
    expect(s.banks).toHaveLength(1);
    const m = s.banks[0]!;
    expect(m.id).toBe(MARKET_BANK_ID);
    expect(m.ratesDate).toBe('2026-08');
    expect(m.rateGrid.from80To90[10]).toBeCloseTo(0.0354, 12);
    expect(m.rateGrid.from80To90[20]).toBeCloseTo(0.0353, 12);
  });

  it('une nouvelle banque part des moyennes du marché', () => {
    const s = testState();
    const b = cloneBank(s.banks[0]!, uniqueBankName(s.banks, 'Nouvelle banque'));
    expect(b).toMatchObject({ kind: 'custom', name: 'Nouvelle banque', ratesDate: '2026-08' });
    expect(b.rateGrid).toEqual(s.banks[0]!.rateGrid);
    expect(b.rateGrid).not.toBe(s.banks[0]!.rateGrid);
    const s2 = reducer(s, { type: 'bank/add', bank: b });
    expect(uniqueBankName(s2.banks, 'Nouvelle banque')).toBe('Nouvelle banque 2');
  });

  it('mettre à jour les moyennes conserve les frais du profil BNB et ne touche pas aux autres banques', () => {
    let s = testState();
    const custom = cloneBank(s.banks[0]!, 'Ma banque');
    s = reducer(s, { type: 'bank/add', bank: custom });
    s = reducer(s, { type: 'bank/update', id: MARKET_BANK_ID, patch: { costs: { ...s.banks[0]!.costs, processingFees: 900 } } });
    const newer = { ...TEST_MARKET, referenceMonth: '2026-09', series: { ...TEST_MARKET.series, over10y: [['2026-09', 3.4]] as [string, number][] } };
    s = applyMarketData(s, newer);
    const m = bankById(s.banks, MARKET_BANK_ID);
    expect(m.ratesDate).toBe('2026-09');
    expect(m.rateGrid.upTo80[20]).toBeCloseTo(0.034, 12);
    expect(m.costs.processingFees).toBe(900);
    expect(bankById(s.banks, custom.id).rateGrid.upTo80[20]).toBeCloseTo(0.0353, 12);
  });

  it('la grille du profil BNB ne se modifie pas à la main', () => {
    const s = testState();
    const r = reducer(s, { type: 'bank/update', id: MARKET_BANK_ID, patch: { rateGrid: DEFAULT_RATE_GRID, name: 'X' } });
    expect(r.banks[0]!.rateGrid).toEqual(s.banks[0]!.rateGrid);
    expect(r.banks[0]!.name).toBe('Moyenne du marché (BNB)');
  });

  it('supprimer une banque rattache ses scénarios au marché ; le profil BNB est indélébile', () => {
    let s = testState();
    const b = cloneBank(s.banks[0]!, 'Ma banque');
    s = reducer(s, { type: 'bank/add', bank: b });
    s = reducer(s, { type: 'scenario/update', id: s.scenarios[0]!.id, patch: { bankId: b.id } });
    s = reducer(s, { type: 'settings/update', patch: { defaultBankId: b.id } });
    s = reducer(s, { type: 'bank/delete', id: b.id });
    expect(s.banks).toHaveLength(1);
    expect(s.scenarios[0]!.bankId).toBe(MARKET_BANK_ID);
    expect(s.settings.defaultBankId).toBe(MARKET_BANK_ID);
    expect(reducer(s, { type: 'bank/delete', id: MARKET_BANK_ID }).banks).toHaveLength(1);
  });

  it('les frais de la banque du scénario entrent dans le coût et le TAEG', () => {
    let s = testState();
    const cheap = { ...cloneBank(s.banks[0]!, 'Sans frais'), costs: { ...s.banks[0]!.costs, processingFees: 0, appraisalFees: 0, deedInscription: 0, balanceInsurance: { kind: 'none' as const } } };
    s = reducer(s, { type: 'bank/add', bank: cheap });
    const sc = s.scenarios[0]!;
    const market = computeScenario(sc, s).summary!;
    const none = computeScenario({ ...sc, bankId: cheap.id }, s).summary!;
    expect(none.taeg!).toBeCloseTo(0.0367, 10);
    expect(market.totalCost - none.totalCost).toBeGreaterThan(4800);
  });

  it('âge des taux en mois', () => {
    expect(ratesAgeMonths('2026-08', new Date(2026, 9, 24))).toBe(2);
    expect(ratesAgeMonths('2026-03-15', new Date(2026, 9, 24))).toBe(7);
    expect(ratesAgeMonths('n/a')).toBeNull();
  });
});

describe('taux de la banque appliqués aux tranches', () => {
  const s = testState();
  const bank = { ...cloneBank(s.banks[0]!, 'Grille'), rateGrid: DEFAULT_RATE_GRID };

  it('prend la durée de la grille la plus proche', () => {
    expect(gridRateFor(s.settings, bank, 120)).toBe(0.034);
    expect(gridRateFor(s.settings, bank, 200)).toBe(0.0355); // 15 ans (écart 20 mois) plutôt que 20 ans (40)
    expect(gridRateFor(s.settings, bank, 210)).toBe(0.0367); // à égalité 15/20 ans : la plus longue
    expect(gridRateFor(s.settings, bank, 400)).toBe(0.038);
  });

  it('conserve les tranches à 0 %', () => {
    const tranches = [
      { ...s.scenarios[0]!.tranches[0]!, durationMonths: 120, annualRate: 0.05 },
      { ...s.scenarios[0]!.tranches[0]!, id: 'z', annualRate: 0 },
    ];
    const r = applyBankRates(tranches, s.settings, bank);
    expect(r[0]!.annualRate).toBe(0.034);
    expect(r[1]!.annualRate).toBe(0);
  });
});

describe('optimiseur multi-banques', () => {
  it('fusionne les résultats et indique la banque', () => {
    const s = testState();
    const cheap = { ...cloneBank(s.banks[0]!, 'Moins chère'), rateGrid: DEFAULT_RATE_GRID };
    const r = optimizeAcrossBanks(s.settings, [s.banks[0]!, cheap])!;
    expect(r.top).toHaveLength(5);
    expect(r.top[0]!.bank.name).toBe('Moins chère');
    for (let i = 1; i < r.top.length; i++) expect(r.top[i]!.config.totalCost).toBeGreaterThanOrEqual(r.top[i - 1]!.config.totalCost);
    expect(r.flexibility!.bank.name).toBe('Moins chère');
    const single = optimizeAcrossBanks(s.settings, [s.banks[0]!])!;
    expect(single.top.every((t) => t.bank.id === MARKET_BANK_ID)).toBe(true);
    expect(r.evaluated).toBe(2 * single.evaluated);
  });

  it('préfixe les erreurs par le nom de la banque', () => {
    const s = testState();
    const bad = { ...cloneBank(s.banks[0]!, 'Erronée'), rateGrid: { ...DEFAULT_RATE_GRID, upTo80: { ...DEFAULT_RATE_GRID.upTo80, 10: 5 } } };
    const r = optimizeAcrossBanks(s.settings, [s.banks[0]!, bad])!;
    expect(r.errors[0]!.message).toMatch(/^Erronée : Le taux 10 ans/);
    expect(r.top).toEqual([]);
  });
});

describe('migration des données enregistrées', () => {
  it('version 1 : grille et frais globaux deviennent la banque « Mes taux »', () => {
    const v1 = testState() as unknown as Record<string, unknown>;
    const settings = { ...(v1.settings as object), rateGrid: DEFAULT_RATE_GRID, costs: { ...testState().banks[0]!.costs, processingFees: 777 } };
    const stored = { version: 1, state: { settings, scenarios: (v1.scenarios as object[]).map((sc) => ({ ...sc, bankId: undefined })), selectedScenarioId: 'demo-20', compareIds: ['demo-20'] } };
    const r = restoreState(JSON.stringify(stored), testState());
    const mine = bankById(r.banks, MIGRATED_BANK_ID);
    expect(mine.name).toBe('Mes taux');
    expect(mine.rateGrid).toEqual(DEFAULT_RATE_GRID);
    expect(mine.costs.processingFees).toBe(777);
    expect(r.banks.map((b) => b.id)).toEqual([MARKET_BANK_ID, MIGRATED_BANK_ID]);
    expect(r.scenarios.every((sc) => sc.bankId === MIGRATED_BANK_ID)).toBe(true);
    expect(r.settings.defaultBankId).toBe(MIGRATED_BANK_ID);
    expect('rateGrid' in r.settings).toBe(false);
    expect(r.compareIds).toEqual(['demo-20']);
  });

  it('version 2 : des moyennes embarquées plus récentes mettent à jour le profil BNB', () => {
    const old = applyMarketData(testState(), { ...TEST_MARKET, referenceMonth: '2026-05', series: { ...TEST_MARKET.series, over10y: [['2026-05', 3.1]] } });
    const r = restoreState(JSON.stringify({ version: 2, state: old }), testState());
    expect(r.market.referenceMonth).toBe('2026-08');
    expect(bankById(r.banks, MARKET_BANK_ID).rateGrid.upTo80[20]).toBeCloseTo(0.0353, 12);
  });

  it('version 2 : des moyennes enregistrées plus récentes sont conservées', () => {
    const newer = applyMarketData(testState(), { ...TEST_MARKET, referenceMonth: '2026-09', series: { ...TEST_MARKET.series, over10y: [['2026-09', 3.2]] } });
    const r = restoreState(JSON.stringify({ version: 2, state: newer }), testState());
    expect(r.market.referenceMonth).toBe('2026-09');
    expect(bankById(r.banks, MARKET_BANK_ID).rateGrid.upTo80[20]).toBeCloseTo(0.032, 12);
  });
});
