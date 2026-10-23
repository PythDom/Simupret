import type { TableRow } from '../state/tableRows';

/**
 * CSV au format attendu par un tableur configuré en fr-BE : séparateur
 * « ; », virgule décimale, sans séparateur de milliers, encodage UTF-8 avec
 * BOM (pour Excel). Les montants sont arrondis au centime à l'export
 * uniquement.
 */
export const CSV_SEPARATOR = ';';
const BOM = '﻿';

export function csvNumber(value: number): string {
  // Évite « -0,00 » pour les résidus d'arrondi.
  const v = Math.abs(value) < 0.005 ? 0 : value;
  return v.toFixed(2).replace('.', ',');
}

function csvText(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function scheduleToCsv(rows: readonly TableRow[], granularity: 'month' | 'year'): string {
  const header = [
    granularity === 'month' ? 'Mois' : 'Année',
    granularity === 'month' ? 'Date' : 'Année civile',
    granularity === 'month' ? 'Mensualité (€)' : 'Total payé (€)',
    'Intérêts (€)',
    'Capital (€)',
    'Remboursement anticipé (€)',
    'Indemnité de remploi (€)',
    'Solde restant dû (€)',
  ];
  const lines = rows.map((r) =>
    [
      csvText(r.period),
      csvText(r.date),
      csvNumber(r.payment),
      csvNumber(r.interest),
      csvNumber(r.principal),
      csvNumber(r.prepayment),
      csvNumber(r.penalty),
      csvNumber(r.closingBalance),
    ].join(CSV_SEPARATOR),
  );
  return BOM + [header.map(csvText).join(CSV_SEPARATOR), ...lines].join('\r\n') + '\r\n';
}

/** Nom de fichier sûr à partir du nom du scénario. */
export function safeFileName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return base || 'scenario';
}
