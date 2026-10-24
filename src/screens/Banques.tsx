import { useState } from 'react';
import { quotite, quotiteTier } from '../engine';
import { formatDate, formatMonth, formatNumber, formatPercent, ratesDateLabel } from '../format';
import { CostsEditor, RateGridEditor } from '../components/BankEditor';
import { DateField, TextField } from '../components/fields';
import { Button, Card, Notice } from '../components/ui';
import {
  MARKET_SERIES_LABELS,
  MARKET_SOURCE_URL,
  fetchMarketData,
  latest,
  yearAgo,
  type MarketSeriesId,
} from '../market/nbb';
import { bankById, cloneBank, ratesAgeMonths, uniqueBankName } from '../state/banks';
import { useStore } from '../state/context';
import { MARKET_BANK_ID, type BankProfile } from '../state/types';

/** Au-delà de cet âge (mois), les taux d'une banque sont signalés « à vérifier ». */
const STALE_AFTER_MONTHS = 3;

const RATE_ROWS: MarketSeriesId[] = ['over10y', 'from5To10y', 'from1To5y', 'upTo1y', 'all', 'aprc'];

export default function Banques() {
  const { state, dispatch } = useStore();
  const [selectedId, setSelectedId] = useState(state.settings.defaultBankId);
  const selected = bankById(state.banks, selectedId);

  return (
    <div className="space-y-4">
      <MarketCard />

      <Card
        title="Mes banques"
        actions={
          <Button variant="primary" onClick={() => addBank()}>
            Nouvelle banque
          </Button>
        }
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Chaque nouvelle banque part des moyennes du marché : remplacez ensuite ses taux, frais et assurances par ceux
          de son offre (fiche ESIS).
        </p>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {state.banks.map((b) => (
            <BankRow
              key={b.id}
              bank={b}
              selected={b.id === selected.id}
              isDefault={b.id === state.settings.defaultBankId}
              onSelect={() => setSelectedId(b.id)}
              onDuplicate={() => addBank(b)}
            />
          ))}
        </ul>
      </Card>

      <BankEditor key={selected.id} bank={selected} />
    </div>
  );

  /** Ajoute une copie de `source` (par défaut la moyenne du marché) et l'ouvre dans l'éditeur. */
  function addBank(source: BankProfile = bankById(state.banks, MARKET_BANK_ID)) {
    const base = source.kind === 'market' ? 'Nouvelle banque' : `${source.name} (copie)`;
    const bank = cloneBank(source, uniqueBankName(state.banks, base));
    dispatch({ type: 'bank/add', bank });
    setSelectedId(bank.id);
  }
}

function BankRow({
  bank,
  selected,
  isDefault,
  onSelect,
  onDuplicate,
}: {
  bank: BankProfile;
  selected: boolean;
  isDefault: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
}) {
  const { dispatch } = useStore();
  const age = ratesAgeMonths(bank.ratesDate);
  const stale = bank.kind === 'custom' && age !== null && age > STALE_AFTER_MONTHS;
  return (
    <li className="flex flex-wrap items-center gap-2 py-2">
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-left ${
          selected ? 'bg-brand-50 font-semibold dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        <span className="block truncate">{bank.name}</span>
        <span className="block text-xs font-normal text-slate-500">
          Taux du {ratesDateLabel(bank.ratesDate)}
          {isDefault ? ' · par défaut' : ''}
          {stale ? ' · à vérifier' : ''}
        </span>
      </button>
      {!isDefault ? (
        <Button
          variant="ghost"
          ariaLabel={`Utiliser ${bank.name} par défaut`}
          onClick={() => dispatch({ type: 'settings/update', patch: { defaultBankId: bank.id } })}
        >
          Par défaut
        </Button>
      ) : null}
      <Button variant="ghost" ariaLabel={`Dupliquer ${bank.name}`} onClick={onDuplicate}>
        Dupliquer
      </Button>
      {bank.kind === 'custom' ? (
        <Button
          variant="danger"
          ariaLabel={`Supprimer ${bank.name}`}
          onClick={() => {
            if (window.confirm(`Supprimer la banque « ${bank.name} » ? Ses scénarios utiliseront la moyenne du marché.`)) {
              dispatch({ type: 'bank/delete', id: bank.id });
            }
          }}
        >
          Supprimer
        </Button>
      ) : null}
    </li>
  );
}

function BankEditor({ bank }: { bank: BankProfile }) {
  const { state, dispatch } = useStore();
  const s = state.settings;
  const update = (patch: Partial<Omit<BankProfile, 'id' | 'kind'>>) => dispatch({ type: 'bank/update', id: bank.id, patch });
  const tier = s.propertyValue > 0 ? quotiteTier(quotite(s.amount, s.propertyValue)) : null;
  const market = bank.kind === 'market';
  const isoDate = /^\d{4}-\d{2}$/.test(bank.ratesDate) ? `${bank.ratesDate}-01` : bank.ratesDate;

  return (
    <>
      <Card title={market ? bank.name : `Banque : ${bank.name}`}>
        {market ? (
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Profil de référence : sa grille suit les moyennes de la BNB (bouton « Mettre à jour »). Ses frais et
            assurances sont des valeurs indicatives modifiables. Pour saisir l&apos;offre d&apos;une banque, utilisez
            « Nouvelle banque » ou « Dupliquer ».
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <TextField
              label="Nom de la banque"
              value={bank.name}
              onChange={(name) => update({ name })}
              error={bank.name.trim() === '' ? 'Donnez un nom à la banque.' : null}
            />
            <DateField label="Date des taux (offre)" value={isoDate} onChange={(ratesDate) => update({ ratesDate })} />
            <TextField
              label="Notes"
              value={bank.notes}
              onChange={(notes) => update({ notes })}
              hint="Conditions de réduction de taux, produits liés, contact…"
            />
          </div>
        )}
      </Card>

      <RateGridEditor
        title={market ? 'Grille de taux (moyennes BNB)' : 'Grille de taux'}
        description={
          market
            ? 'La BNB publie des taux par période de fixation, pas par durée ni par quotité : 10 ans = fixation de 5 à 10 ans ; 15, 20 et 25 ans = fixation de plus de 10 ans ; même taux pour toutes les quotités.'
            : 'Taux annuels en %, par durée et par quotité. Touchez × si une durée n’est pas proposée.'
        }
        grid={bank.rateGrid}
        readOnly={market}
        highlightTier={tier}
        onChange={(rateGrid) => update({ rateGrid })}
      />

      <CostsEditor costs={bank.costs} onChange={(costs) => update({ costs })} />
    </>
  );
}

function MarketCard() {
  const { state, dispatch } = useStore();
  const m = state.market;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function refresh() {
    setBusy(true);
    setStatus(null);
    try {
      const data = await fetchMarketData();
      if (data.referenceMonth < m.referenceMonth) {
        setStatus(`Les données reçues (${formatMonth(data.referenceMonth)}) sont plus anciennes : aucune modification.`);
        return;
      }
      const changed = data.referenceMonth !== m.referenceMonth;
      dispatch({ type: 'market/update', market: data });
      setStatus(
        changed
          ? `Moyennes mises à jour : ${formatMonth(data.referenceMonth)}.`
          : `Déjà à jour : ${formatMonth(data.referenceMonth)} est le dernier mois publié.`,
      );
    } catch {
      setStatus('Impossible de récupérer les taux. Vérifiez la connexion Internet et réessayez.');
    } finally {
      setBusy(false);
    }
  }

  const volume = latest(m, 'volume');
  return (
    <Card
      title="Moyennes du marché (BNB)"
      actions={
        <Button variant="primary" disabled={busy} onClick={() => void refresh()}>
          {busy ? 'Mise à jour…' : 'Mettre à jour'}
        </Button>
      }
    >
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Taux moyens des nouveaux crédits hypothécaires en Belgique, publiés chaque mois par la Banque nationale de
        Belgique (statistiques MIR, environ 5 à 6 semaines après la fin du mois). Données de{' '}
        <strong>{formatMonth(m.referenceMonth)}</strong>, récupérées le {formatDate(new Date(m.fetchedAt))}.
      </p>
      <p aria-live="polite" className="min-h-5 text-sm font-medium text-slate-700 dark:text-slate-300">
        {status}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[20rem] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="py-2 pr-2">Nouveaux crédits au logement</th>
              <th className="px-2 py-2 text-right">Taux</th>
              <th className="px-2 py-2 text-right">Sur 1 an</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {RATE_ROWS.map((id) => {
              const last = latest(m, id);
              if (!last) return null;
              const before = yearAgo(m, id);
              const delta = before ? last[1] - before[1] : null;
              return (
                <tr key={id} className={id === 'aprc' ? 'font-medium' : ''}>
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal">
                    {MARKET_SERIES_LABELS[id]}
                  </th>
                  <td className="num px-2 py-1.5 text-right">{formatPercent(last[1] / 100)}</td>
                  <td className="num px-2 py-1.5 text-right text-slate-500">
                    {delta === null ? '—' : `${delta >= 0 ? '+' : '−'}${formatNumber(Math.abs(delta), 2)} pt`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {volume ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Nouveaux crédits hypothécaires en {formatMonth(volume[0])} : {formatNumber(volume[1], 0)} millions d&apos;euros.
        </p>
      ) : null}
      <Notice>
        Moyennes de marché, pas une offre : le taux obtenu dépend de la banque, de la quotité, de la durée, des revenus
        et des produits liés. Le TAEG moyen inclut les frais et assurances obligatoires.
      </Notice>
      <p className="text-xs text-slate-500">
        Source : Banque nationale de Belgique, diffusion via le{' '}
        <a href={MARKET_SOURCE_URL} target="_blank" rel="noreferrer" className="underline">
          portail de données de la BCE
        </a>{' '}
        (série MIR, Belgique, crédits aux ménages pour l&apos;achat d&apos;un logement, nouveaux contrats).
      </p>
    </Card>
  );
}
