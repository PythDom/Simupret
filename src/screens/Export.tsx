import { useMemo, useState } from 'react';
import { scheduleToCsv, safeFileName } from '../export/csv';
import { download, isNative, shareFile, type ExportFile, type ShareOutcome } from '../export/deliver';
import { SelectField } from '../components/fields';
import { ScenarioPicker } from '../components/ScenarioPicker';
import { trancheSeries } from '../components/charts/data';
import { Button, Card, ErrorList, Notice } from '../components/ui';
import { useStore } from '../state/context';
import { useScenarioComputation } from '../state/derived';
import { buildRows, type Granularity } from '../state/tableRows';

const MESSAGES: Record<ShareOutcome, string> = {
  shared: 'Fichier partagé.',
  downloaded: 'Fichier téléchargé.',
  cancelled: 'Partage annulé.',
};

export default function Export() {
  const { state } = useStore();
  const { settings } = state;
  const scenario = state.scenarios.find((s) => s.id === state.selectedScenarioId);
  const computation = useScenarioComputation(scenario, settings);
  const [view, setView] = useState('all');
  const [granularity, setGranularity] = useState<Granularity>('month');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const result = computation?.result ?? null;
  const series = useMemo(() => (scenario && result ? trancheSeries(scenario.tranches, result) : []), [scenario, result]);
  const activeView = view === 'all' || series.some((s) => s.key === view) ? view : 'all';

  if (!scenario) return <Notice>Créez d&apos;abord un scénario.</Notice>;
  const base = safeFileName(scenario.name);
  const native = isNative();

  function csvFile(): ExportFile | null {
    if (!result) return null;
    const source = activeView === 'all' ? result.months : (result.perTranche[activeView] ?? []);
    const suffix = activeView === 'all' ? '' : `-${safeFileName(series.find((s) => s.key === activeView)?.label ?? 'tranche')}`;
    return {
      filename: `${base}${suffix}-${granularity === 'month' ? 'mensuel' : 'annuel'}.csv`,
      mimeType: 'text/csv;charset=utf-8',
      content: scheduleToCsv(buildRows(source, granularity, settings.firstPaymentDate), granularity),
    };
  }

  async function pdfFile(): Promise<ExportFile | null> {
    if (!computation || !scenario) return null;
    const { buildSummaryPdf } = await import('../export/pdf');
    const doc = buildSummaryPdf(scenario, settings, computation);
    return { filename: `${base}-resume.pdf`, mimeType: 'application/pdf', content: doc.output('arraybuffer') };
  }

  async function run(make: () => ExportFile | null | Promise<ExportFile | null>, mode: 'download' | 'share', title: string) {
    setBusy(true);
    setStatus(null);
    try {
      const file = await make();
      if (!file) return;
      if (mode === 'download') {
        download(file);
        setStatus(MESSAGES.downloaded);
      } else {
        setStatus(MESSAGES[await shareFile(file, title)]);
      }
    } catch {
      setStatus("L'export a échoué. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  const actions = (make: () => ExportFile | null | Promise<ExportFile | null>, title: string, label: string) => (
    <div className="flex flex-wrap gap-2">
      {native ? null : (
        <Button variant="primary" disabled={busy || !result} onClick={() => void run(make, 'download', title)}>
          Télécharger {label}
        </Button>
      )}
      <Button variant={native ? 'primary' : 'secondary'} disabled={busy || !result} onClick={() => void run(make, 'share', title)}>
        Partager {label}
      </Button>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card title="Export">
        <ScenarioPicker />
        {computation ? <ErrorList errors={computation.errors} /> : null}
        <p aria-live="polite" className="min-h-5 text-sm text-slate-600 dark:text-slate-400">
          {status}
        </p>
      </Card>

      <Card title="Tableau d'amortissement (CSV)">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Format tableur belge : séparateur « ; », virgule décimale. S&apos;ouvre directement dans Excel ou LibreOffice.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectField
            label="Contenu"
            value={activeView}
            options={[{ value: 'all', label: 'Consolidé (toutes tranches)' }, ...series.map((s) => ({ value: s.key, label: s.label }))]}
            onChange={setView}
          />
          <SelectField<Granularity>
            label="Période"
            value={granularity}
            options={[
              { value: 'month', label: 'Mois par mois' },
              { value: 'year', label: 'Année par année' },
            ]}
            onChange={setGranularity}
          />
        </div>
        {actions(csvFile, `Tableau d'amortissement — ${scenario.name}`, 'le CSV')}
      </Card>

      <Card title="Résumé du scénario (PDF)">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Paramètres, tranches, remboursements anticipés, synthèse des coûts, TAEG et tableau d&apos;amortissement annuel.
        </p>
        {actions(pdfFile, `Résumé — ${scenario.name}`, 'le PDF')}
      </Card>
    </div>
  );
}
