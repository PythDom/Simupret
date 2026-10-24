/**
 * Taux moyens du marché belge des crédits hypothécaires : statistiques MIR
 * (taux d'intérêt des institutions financières monétaires) compilées par la
 * Banque nationale de Belgique et diffusées par l'API publique du portail de
 * données de la BCE (accessible sans clé, CORS ouvert).
 *
 * Séries : crédits aux ménages pour l'achat d'un logement, nouveaux contrats,
 * par période de fixation initiale du taux.
 *
 * Ce module n'importe rien : il est aussi utilisé par scripts/update-market-snapshot.ts.
 */
export const MARKET_API_URL =
  'https://data-api.ecb.europa.eu/service/data/MIR/M.BE.B.A2C.A+F+I+O+P.R+C+B.A.2250.EUR.N' +
  '?lastNObservations=13&format=csvdata&detail=dataonly';

/** Page de référence pour l'utilisateur. */
export const MARKET_SOURCE_URL = 'https://data.ecb.europa.eu/data/datasets/MIR';

export type MarketSeriesId = 'all' | 'upTo1y' | 'from1To5y' | 'from5To10y' | 'over10y' | 'aprc' | 'volume';

/** Correspondance entre les clés MIR (fixation, type de donnée) et nos séries. */
const SERIES_KEYS: Record<string, MarketSeriesId> = {
  'A.R': 'all',
  'F.R': 'upTo1y',
  'I.R': 'from1To5y',
  'O.R': 'from5To10y',
  'P.R': 'over10y',
  'A.C': 'aprc',
  'A.B': 'volume',
};

export const MARKET_SERIES_LABELS: Record<MarketSeriesId, string> = {
  all: 'Tous les crédits au logement',
  upTo1y: 'Taux variable ou fixe ≤ 1 an',
  from1To5y: 'Taux fixe de 1 à 5 ans',
  from5To10y: 'Taux fixe de 5 à 10 ans',
  over10y: 'Taux fixe plus de 10 ans',
  aprc: 'TAEG moyen (frais compris)',
  volume: 'Nouveaux crédits du mois',
};

/** Observation mensuelle : [« AAAA-MM », valeur]. Taux en % (3.53), volume en millions €. */
export type Observation = [string, number];

export interface MarketData {
  source: string;
  /** Dernier mois disponible pour le taux fixe à plus de 10 ans (« AAAA-MM »). */
  referenceMonth: string;
  /** Date de récupération (ISO). */
  fetchedAt: string;
  series: Partial<Record<MarketSeriesId, Observation[]>>;
}

/** Découpe une ligne CSV en respectant les guillemets. */
export function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i]!;
    if (quoted) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        cur += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ',') {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

/** Lit la réponse CSV de l'API (une ligne par observation). */
export function parseMarketCsv(text: string, fetchedAt: string): MarketData {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const header = parseCsvLine(lines[0] ?? '');
  const col = (name: string) => header.indexOf(name);
  const iKey = col('KEY');
  const iTime = col('TIME_PERIOD');
  const iValue = col('OBS_VALUE');
  if (iKey < 0 || iTime < 0 || iValue < 0) throw new Error('Format de réponse inattendu.');

  const series: Partial<Record<MarketSeriesId, Observation[]>> = {};
  for (const line of lines.slice(1)) {
    const cells = parseCsvLine(line);
    // KEY = MIR.M.BE.B.A2C.<fixation>.<type>.A.2250.EUR.N
    const parts = (cells[iKey] ?? '').split('.');
    const id = SERIES_KEYS[`${parts[5]}.${parts[6]}`];
    const value = Number(cells[iValue]);
    const month = cells[iTime] ?? '';
    if (!id || !/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(value)) continue;
    (series[id] ??= []).push([month, value]);
  }
  for (const obs of Object.values(series)) obs.sort((a, b) => a[0].localeCompare(b[0]));

  const over10 = series.over10y;
  if (!over10 || over10.length === 0 || !series.from5To10y?.length) {
    throw new Error('Les taux à long terme sont absents de la réponse.');
  }
  return {
    source: 'BNB — statistiques MIR (via le portail de données de la BCE)',
    referenceMonth: over10[over10.length - 1]![0],
    fetchedAt,
    series,
  };
}

/** Dernière valeur d'une série (en %), ou null. */
export function latest(data: MarketData, id: MarketSeriesId): Observation | null {
  const s = data.series[id];
  return s && s.length > 0 ? s[s.length - 1]! : null;
}

/** Valeur un an avant la dernière observation, si disponible. */
export function yearAgo(data: MarketData, id: MarketSeriesId): Observation | null {
  const last = latest(data, id);
  if (!last) return null;
  const [y, m] = last[0].split('-').map(Number);
  const target = `${(y ?? 0) - 1}-${String(m).padStart(2, '0')}`;
  return data.series[id]?.find((o) => o[0] === target) ?? null;
}

/** Récupère les dernières moyennes publiées. */
export async function fetchMarketData(fetcher: typeof fetch = fetch, timeoutMs = 20_000): Promise<MarketData> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetcher(MARKET_API_URL, { signal: controller.signal, headers: { Accept: 'text/csv' } });
    if (!res.ok) throw new Error(`Le service a répondu ${res.status}.`);
    return parseMarketCsv(await res.text(), new Date().toISOString());
  } finally {
    clearTimeout(timer);
  }
}
