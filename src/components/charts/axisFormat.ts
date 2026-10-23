/** Graduations compactes : 0, 50 k€, 100 k€… */
export function compactEuro(v: number): string {
  if (Math.abs(v) >= 1000) return `${formatNumberCompact(v / 1000)} k€`;
  return `${Math.round(v)} €`;
}

function formatNumberCompact(v: number): string {
  return new Intl.NumberFormat('fr-BE', { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v);
}

/** Graduations rondes de 0 à au moins `max` (pas de 1, 2, 2,5 ou 5 × 10^k ; 6 graduations au plus). */
export function niceTicks(max: number, maxTicks = 6): number[] {
  if (!(max > 0)) return [0];
  const rough = max / (maxTicks - 1);
  const pow = Math.pow(10, Math.floor(Math.log10(rough)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= rough) ?? 10 * pow;
  const ticks: number[] = [];
  for (let v = 0; v < max + step - 1e-9; v += step) ticks.push(v);
  return ticks;
}
