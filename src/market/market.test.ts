import { marketRateGrid, snapshotMarketData } from './grid';
import { MARKET_API_URL, fetchMarketData, latest, parseCsvLine, parseMarketCsv, yearAgo } from './nbb';

// Extrait réel de la réponse de l'API (format csvdata, detail=dataonly), raccourci.
const CSV = [
  'KEY,FREQ,REF_AREA,BS_REP_SECTOR,BS_ITEM,MATURITY_NOT_IRATE,DATA_TYPE_MIR,AMOUNT_CAT,BS_COUNT_SECTOR,CURRENCY_TRANS,IR_BUS_COV,TIME_PERIOD,OBS_VALUE',
  'MIR.M.BE.B.A2C.A.B.A.2250.EUR.N,M,BE,B,A2C,A,B,A,2250,EUR,N,2026-08,3176',
  'MIR.M.BE.B.A2C.A.C.A.2250.EUR.N,M,BE,B,A2C,A,C,A,2250,EUR,N,2026-08,4.03',
  'MIR.M.BE.B.A2C.A.R.A.2250.EUR.N,M,BE,B,A2C,A,R,A,2250,EUR,N,2026-08,3.7',
  'MIR.M.BE.B.A2C.O.R.A.2250.EUR.N,M,BE,B,A2C,O,R,A,2250,EUR,N,2026-07,3.48',
  'MIR.M.BE.B.A2C.O.R.A.2250.EUR.N,M,BE,B,A2C,O,R,A,2250,EUR,N,2026-08,3.54',
  'MIR.M.BE.B.A2C.P.R.A.2250.EUR.N,M,BE,B,A2C,P,R,A,2250,EUR,N,2026-08,3.53',
  'MIR.M.BE.B.A2C.P.R.A.2250.EUR.N,M,BE,B,A2C,P,R,A,2250,EUR,N,2025-08,3.31',
  'MIR.M.BE.B.A2C.P.R.A.2250.EUR.N,M,BE,B,A2C,P,R,A,2250,EUR,N,2026-07,3.48',
  'MIR.M.BE.B.A2C.AM.R.A.2250.EUR.N,M,BE,B,A2C,AM,R,A,2250,EUR,N,2026-08,3.7',
].join('\r\n');

describe('moyennes du marché (BNB)', () => {
  it('découpe les lignes CSV avec guillemets', () => {
    expect(parseCsvLine('a,"b, c","d ""e"""')).toEqual(['a', 'b, c', 'd "e"']);
  });

  it('lit la réponse de l\'API', () => {
    const d = parseMarketCsv('﻿' + CSV, '2026-10-24T08:00:00Z');
    expect(d.referenceMonth).toBe('2026-08');
    expect(latest(d, 'over10y')).toEqual(['2026-08', 3.53]);
    expect(latest(d, 'from5To10y')).toEqual(['2026-08', 3.54]);
    expect(latest(d, 'aprc')).toEqual(['2026-08', 4.03]);
    expect(latest(d, 'volume')).toEqual(['2026-08', 3176]);
    // Observations triées ; série « AM » (coût d'emprunt composite) ignorée.
    expect(d.series.over10y!.map((o) => o[0])).toEqual(['2025-08', '2026-07', '2026-08']);
    expect(Object.keys(d.series).sort()).toEqual(['all', 'aprc', 'from5To10y', 'over10y', 'volume']);
    expect(yearAgo(d, 'over10y')).toEqual(['2025-08', 3.31]);
    expect(yearAgo(d, 'aprc')).toBeNull();
  });

  it('refuse une réponse sans taux à long terme', () => {
    expect(() => parseMarketCsv(CSV.split('\r\n').slice(0, 4).join('\n'), 'x')).toThrow(/long terme/);
    expect(() => parseMarketCsv('<html>erreur</html>', 'x')).toThrow(/Format/);
  });

  it('construit la grille : 10 ans ← 5-10 ans, 15/20/25 ans ← plus de 10 ans', () => {
    const g = marketRateGrid(parseMarketCsv(CSV, 'x'));
    for (const tier of ['upTo80', 'from80To90', 'above90'] as const) {
      expect(g[tier][10]).toBeCloseTo(0.0354, 12);
      expect(g[tier][15]).toBeCloseTo(0.0353, 12);
      expect(g[tier][25]).toBeCloseTo(0.0353, 12);
    }
  });

  it('interroge l\'API publique et gère les erreurs', async () => {
    const ok = vi.fn(async () => new Response(CSV, { status: 200 }));
    const d = await fetchMarketData(ok as unknown as typeof fetch);
    expect(ok).toHaveBeenCalledWith(MARKET_API_URL, expect.anything());
    expect(MARKET_API_URL).toContain('MIR/M.BE.B.A2C.');
    expect(d.referenceMonth).toBe('2026-08');
    const ko = vi.fn(async () => new Response('', { status: 503 }));
    await expect(fetchMarketData(ko as unknown as typeof fetch)).rejects.toThrow('503');
  });

  it('fournit une copie embarquée valide', () => {
    const s = snapshotMarketData();
    expect(s.referenceMonth).toMatch(/^\d{4}-\d{2}$/);
    expect(latest(s, 'over10y')).not.toBeNull();
    const g = marketRateGrid(s);
    expect(g.upTo80[20]).toBeGreaterThan(0);
    expect(g.upTo80[20]).toBeLessThan(0.3);
  });
});
