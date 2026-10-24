import { defaultState } from '../state/defaults';
import { computeScenario } from '../state/derived';
import { buildRows } from '../state/tableRows';
import { CSV_SEPARATOR, csvNumber, safeFileName, scheduleToCsv } from './csv';
import { buildSummaryPdf, pdfText } from './pdf';

const state = defaultState(new Date(2026, 9, 23));

describe('export CSV', () => {
  it('formate les nombres à la belge sans séparateur de milliers', () => {
    expect(csvNumber(1464.0318)).toBe('1464,03');
    expect(csvNumber(-0.001)).toBe('0,00');
    expect(csvNumber(250000)).toBe('250000,00');
  });

  it('exporte 240 lignes mensuelles avec en-tête et BOM', () => {
    const c = computeScenario(state.scenarios[0]!, state);
    const csv = scheduleToCsv(buildRows(c.result!.months, 'month', state.settings.firstPaymentDate), 'month');
    expect(csv.startsWith('﻿')).toBe(true);
    // trim() supprimerait aussi le BOM : on ne retire que la fin.
    const lines = csv.trimEnd().split('\r\n');
    expect(lines).toHaveLength(241);
    expect(lines[0]).toBe(
      '﻿Mois;Date;Mensualité (€);Intérêts (€);Capital (€);Remboursement anticipé (€);Indemnité de remploi (€);Solde restant dû (€)',
    );
    expect(lines[1]!.split(CSV_SEPARATOR).slice(0, 3)).toEqual(['1', '01/11/2026', '1464,03']);
    expect(lines[240]!.split(CSV_SEPARATOR).at(-1)).toBe('0,00');
  });

  it('exporte un tableau annuel', () => {
    const c = computeScenario(state.scenarios[1]!, state);
    const csv = scheduleToCsv(buildRows(c.result!.months, 'year', state.settings.firstPaymentDate), 'year');
    const lines = csv.trim().split('\r\n');
    expect(lines).toHaveLength(16);
    expect(lines[0]).toContain('Année;Année civile;Total payé (€)');
  });

  it('produit des noms de fichier sûrs', () => {
    expect(safeFileName('Deux tranches 10 + 15 ans')).toBe('deux-tranches-10-15-ans');
    expect(safeFileName('Scénario « été »')).toBe('scenario-ete');
    expect(safeFileName('***')).toBe('scenario');
  });
});

describe('export PDF', () => {
  it('remplace les signes absents des polices standard', () => {
    expect(pdfText('budget − marge, quotité ≤ 80 %')).toBe('budget - marge, quotité <= 80 %');
  });

  it('génère un résumé de scénario', () => {
    const sc = state.scenarios[1]!;
    const doc = buildSummaryPdf(sc, state.settings, computeScenario(sc, state), state.banks[0], new Date(2026, 9, 23));
    expect(doc.output()).toContain('Moyenne du march');
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    const raw = doc.output();
    expect(raw.startsWith('%PDF-')).toBe(true);
    for (const s of ['Simulateur de cr', 'TAEG', 'Tableau d', '23/10/2026']) expect(raw).toContain(s);
  });

  it('signale un scénario invalide dans le PDF', () => {
    const sc = { ...state.scenarios[0]!, tranches: [{ ...state.scenarios[0]!.tranches[0]!, amount: -1 }] };
    const doc = buildSummaryPdf(sc, state.settings, computeScenario(sc, state));
    expect(doc.output()).toContain('Sc');
    expect(doc.output()).toContain('invalide');
  });
});
