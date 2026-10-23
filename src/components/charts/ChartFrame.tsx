import type { ReactNode } from 'react';
import { formatEuro, formatEuroRounded } from '../../format';
import type { ChartTheme } from './palette';

export function ChartFrame({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <figure className="card space-y-2">
      <figcaption>
        <h3 className="font-semibold">{title}</h3>
        {subtitle ? <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
      </figcaption>
      <div className="h-64 w-full sm:h-72">{children}</div>
    </figure>
  );
}

interface TooltipEntry {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
}

/** Infobulle commune : libellé du mois + valeurs fr-BE, pastille de couleur à côté du texte. */
export function EuroTooltip({
  active,
  payload,
  label,
  labelFormatter,
  theme,
  total,
  rounded,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter: (label: number | string) => string;
  theme: ChartTheme;
  total?: boolean;
  rounded?: boolean;
}) {
  if (!active || !payload || payload.length === 0 || label === undefined) return null;
  const fmt = rounded ? formatEuroRounded : formatEuro;
  const entries = payload.filter((p) => typeof p.value === 'number');
  const sum = entries.reduce((s, p) => s + (p.value as number), 0);
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-md"
      style={{ background: theme.surface, borderColor: theme.axis, color: theme.text }}
    >
      <div className="mb-1 font-semibold">{labelFormatter(label)}</div>
      {entries.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="num">{fmt(p.value as number)}</span>
        </div>
      ))}
      {total && entries.length > 1 ? (
        <div className="mt-1 flex justify-between gap-4 border-t pt-1 font-semibold" style={{ borderColor: theme.axis }}>
          <span>Total</span>
          <span className="num">{fmt(sum)}</span>
        </div>
      ) : null}
    </div>
  );
}
