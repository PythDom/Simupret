import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import { QUOTITE_TIER_LABELS, quotite, quotiteTier, type Prepayment } from '../engine';
import { formatDate, formatDuration, formatEuro, formatPercent, ratesDateLabel } from '../format';
import type { ScenarioComputation } from '../state/derived';
import { monthDate } from '../state/derived';
import { buildRows } from '../state/tableRows';
import type { BankProfile, Scenario, Settings } from '../state/types';

export const DISCLAIMER =
  "Simulation indicative : ce document ne constitue ni une offre de crédit ni un conseil financier. " +
  "Seule l'offre du prêteur (fiche ESIS et TAEG) fait foi.";

/**
 * Les polices standard du PDF (WinAnsi) ne contiennent pas certains signes
 * typographiques : on les remplace par des équivalents lisibles.
 */
export function pdfText(s: string): string {
  return s
    .replace(/−/g, '-')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=')
    .replace(/≈/g, '~')
    .replace(/\u202F/g, '\u00A0');
}

function describePrepayment(p: Prepayment, scenario: Scenario): string {
  const target = p.trancheId
    ? (scenario.tranches.find((t) => t.id === p.trancheId)?.label ?? 'tranche choisie')
    : 'tranche au taux le plus élevé';
  const effect = p.effect === 'reducePayment' ? 'réduction de la mensualité' : 'réduction de la durée';
  if (p.kind === 'oneOff') {
    return `Ponctuel : ${formatEuro(p.amount)} au mois ${p.month} (${target}, ${effect})`;
  }
  const amount =
    p.amount.type === 'fixed'
      ? formatEuro(p.amount.amount)
      : `tout ce qui dépasse la mensualité jusqu'à ${formatEuro(p.amount.monthlyBudget)}/mois` +
        (p.amount.penaltyWithinBudget ? ' (indemnité comprise)' : '');
  return `Récurrent tous les ${p.everyMonths} mois dès le mois ${p.startMonth ?? 1} : ${amount} (${target}, ${effect})`;
}

/** Construit le résumé PDF d'un scénario. */
export function buildSummaryPdf(
  scenario: Scenario,
  settings: Settings,
  computation: ScenarioComputation,
  bank?: BankProfile,
  now = new Date(),
): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const margin = 14;
  const width = doc.internal.pageSize.getWidth() - 2 * margin;
  let y = 18;
  const text = (s: string, size = 10, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(pdfText(s), width) as string[];
    doc.text(lines, margin, y);
    y += lines.length * size * 0.45 + 1.5;
  };
  const heading = (s: string) => {
    y += 3;
    text(s, 12, 'bold');
  };
  const table = (head: string[] | null, body: string[][], columnStyles?: Record<number, { halign: 'right' | 'left' }>) => {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin, bottom: 20 },
      head: head ? [head.map(pdfText)] : undefined,
      body: body.map((r) => r.map(pdfText)),
      styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.6 },
      headStyles: { fillColor: [29, 78, 216], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  };

  text('Simulateur de crédit hypothécaire', 16, 'bold');
  text(`Résumé du scénario « ${scenario.name} »`, 12);
  text(`Édité le ${formatDate(now)}`, 9);

  heading('Paramètres');
  const q = quotite(settings.amount, settings.propertyValue);
  table(null, [
    ['Montant du projet', formatEuro(settings.amount)],
    ['Valeur du bien', formatEuro(settings.propertyValue)],
    ['Quotité', `${formatPercent(q, 1)} (${QUOTITE_TIER_LABELS[quotiteTier(q)]})`],
    ['Budget mensuel', formatEuro(settings.monthlyBudget)],
    ...(bank ? [['Banque (frais et assurances)', `${bank.name} - taux du ${ratesDateLabel(bank.ratesDate)}`]] : []),
    ['Première échéance', formatDate(monthDate(settings.firstPaymentDate, 1))],
    ['Taux mensuel', settings.rateConvention === 'equivalent' ? 'Taux équivalent (1 + r)^(1/12) - 1' : 'Taux proportionnel r / 12'],
  ]);

  heading('Tranches');
  table(
    ['Tranche', 'Montant', 'Durée', 'Taux', '1re échéance', 'Amortissement', 'Réduction'],
    scenario.tranches.map((t, i) => [
      t.label || `Tranche ${i + 1}`,
      formatEuro(t.amount),
      formatDuration(t.durationMonths),
      formatPercent(t.annualRate),
      `mois ${t.startMonth}`,
      t.amortization === 'annuity' ? 'Mensualités constantes' : 'Capital constant',
      t.reduction ? formatEuro(t.reduction) : '-',
    ]),
    { 1: { halign: 'right' }, 3: { halign: 'right' }, 6: { halign: 'right' } },
  );

  if (scenario.prepayments.length > 0) {
    heading('Remboursements anticipés');
    for (const p of scenario.prepayments) text(`• ${describePrepayment(p, scenario)}`, 9);
  }
  if (scenario.refinancing) {
    const r = scenario.refinancing;
    heading('Refinancement');
    text(
      `Au mois ${r.month} : nouveau taux ${formatPercent(r.annualRate)} sur ${formatDuration(r.durationMonths)}, ` +
        `frais d'acte ${formatEuro(r.deedCosts)}, frais de dossier ${formatEuro(r.processingFees)}` +
        (r.financeCosts ? ' (indemnité et frais financés).' : ' (payés comptant).'),
      9,
    );
  }

  const s = computation.summary;
  if (!s || !computation.result) {
    heading('Scénario invalide');
    for (const e of computation.errors) text(`• ${e.message}`, 9);
  } else {
    heading('Synthèse');
    table(
      null,
      [
        ['Première mensualité', formatEuro(s.firstPayment)],
        ['Mensualité maximale', formatEuro(s.peakPayment)],
        ['Marge minimale (budget - mensualité maximale)', formatEuro(s.minMargin)],
        ['Intérêts totaux', formatEuro(s.interest)],
        ['Indemnités de remploi', formatEuro(s.penalties)],
        ['Frais à la signature (dossier, expertise, acte)', formatEuro(s.upfrontCosts)],
        ...(s.refinancingFees > 0 ? [['Frais de refinancement', formatEuro(s.refinancingFees)]] : []),
        ['Assurance solde restant dû', formatEuro(s.balanceInsurance)],
        ['Assurance incendie et compte liés au crédit', formatEuro(s.linkedCosts)],
        ...(s.reductions > 0 ? [['Réductions (primes, subsides)', `- ${formatEuro(s.reductions)}`]] : []),
        ['Coût total du crédit', formatEuro(s.totalCost)],
        ['TAEG (sur les flux réels)', s.taeg === null ? '-' : formatPercent(s.taeg)],
        ['Fin du crédit', `${formatDate(monthDate(settings.firstPaymentDate, s.endMonth))} (${formatDuration(s.endMonth)})`],
      ],
      { 1: { halign: 'right' } },
    );

    heading("Tableau d'amortissement annuel");
    const rows = buildRows(computation.result.months, 'year', settings.firstPaymentDate);
    table(
      ['Année', 'Année civile', 'Total payé', 'Intérêts', 'Capital', 'Rbt anticipé', 'Indemnité', 'Solde'],
      rows.map((r) => [
        r.period,
        r.date,
        formatEuro(r.payment),
        formatEuro(r.interest),
        formatEuro(r.principal),
        r.prepayment ? formatEuro(r.prepayment) : '',
        r.penalty ? formatEuro(r.penalty) : '',
        formatEuro(r.closingBalance),
      ]),
      { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
    );
  }

  // Pied de page : avertissement et numérotation sur chaque page.
  const pages = doc.getNumberOfPages();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100);
    doc.text(doc.splitTextToSize(pdfText(DISCLAIMER), width - 20) as string[], margin, pageHeight - 12);
    doc.text(`${i} / ${pages}`, margin + width, pageHeight - 12, { align: 'right' });
    doc.setTextColor(0);
  }
  return doc;
}
