// Met à jour src/market/snapshot.json avec les dernières moyennes BNB (exécuté en CI avant le build).
// Usage : node scripts/update-market-snapshot.ts   (Node ≥ 22.18 : TypeScript exécuté nativement)
import { writeFileSync } from 'node:fs';
import { fetchMarketData } from '../src/market/nbb.ts';

const data = await fetchMarketData();
const path = new URL('../src/market/snapshot.json', import.meta.url);
writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
console.log(`Moyennes BNB mises à jour : ${data.referenceMonth} (${Object.keys(data.series).length} séries).`);
