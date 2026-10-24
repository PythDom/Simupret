import { GRID_DURATIONS_YEARS, QUOTITE_TIERS, type RateGrid } from '../engine';
import { latest, type MarketData, type Observation } from './nbb';
import snapshotJson from './snapshot.json';

/**
 * Grille de taux à partir des moyennes du marché. La BNB publie les taux par
 * période de fixation, pas par durée ni par quotité :
 * - 10 ans ← fixation de 5 à 10 ans ;
 * - 15, 20 et 25 ans ← fixation de plus de 10 ans ;
 * - même taux pour toutes les tranches de quotité.
 */
export function marketRateGrid(data: MarketData): RateGrid {
  const mid = (latest(data, 'from5To10y')?.[1] ?? NaN) / 100;
  const long = (latest(data, 'over10y')?.[1] ?? NaN) / 100;
  const row = Object.fromEntries(GRID_DURATIONS_YEARS.map((y) => [y, y <= 10 ? mid : long])) as RateGrid['upTo80'];
  return Object.fromEntries(QUOTITE_TIERS.map((t) => [t, { ...row }])) as RateGrid;
}

/** Moyennes embarquées dans l'application (mises à jour à chaque publication). */
export function snapshotMarketData(): MarketData {
  const series: MarketData['series'] = {};
  for (const [id, obs] of Object.entries(snapshotJson.series)) {
    series[id as keyof MarketData['series']] = obs.map((o) => [String(o[0]), Number(o[1])] as Observation);
  }
  return {
    source: snapshotJson.source,
    referenceMonth: snapshotJson.referenceMonth,
    fetchedAt: snapshotJson.fetchedAt,
    series,
  };
}
