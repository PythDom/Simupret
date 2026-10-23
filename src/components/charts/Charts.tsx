import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimulationResult, Tranche } from '../../engine';
import { formatDate } from '../../format';
import { monthDate } from '../../state/derived';
import { useIsDark } from '../useIsDark';
import { compactEuro, niceTicks } from './axisFormat';
import { ChartFrame, EuroTooltip } from './ChartFrame';
import { balanceData, cumulativeData, paymentData, trancheSeries } from './data';
import { chartTheme, seriesColor, type ChartTheme } from './palette';

interface TimeChartProps {
  result: SimulationResult;
  tranches: readonly Tranche[];
  firstPaymentDate: string;
}

function yearTicks(endMonth: number): number[] {
  const years = Math.ceil(endMonth / 12);
  const step = years > 20 ? 60 : years > 8 ? 36 : 12;
  const ticks: number[] = [];
  for (let m = 0; m <= endMonth; m += step) ticks.push(m);
  return ticks;
}

function axisProps(theme: ChartTheme) {
  return {
    stroke: theme.axis,
    tick: { fill: theme.muted, fontSize: 12 },
    tickLine: false,
  };
}

function useTimeAxis(firstPaymentDate: string, endMonth: number) {
  const tickYear = (m: number) => String(monthDate(firstPaymentDate, Math.max(1, m)).getFullYear());
  const label = (m: number | string) => {
    const n = Number(m);
    return n === 0 ? 'Mise à disposition' : `Mois ${n} — ${formatDate(monthDate(firstPaymentDate, n))}`;
  };
  return { ticks: yearTicks(endMonth), tickYear, label };
}

const legendStyle = (theme: ChartTheme) => ({ fontSize: 12, color: theme.text, paddingTop: 4 });

/** Le texte de la légende garde la couleur du texte ; la pastille porte la couleur de la série. */
const legendText = (theme: ChartTheme) => (value: string) => <span style={{ color: theme.text }}>{value}</span>;

/** Solde restant dû, empilé par tranche. */
export function BalanceChart({ result, tranches, firstPaymentDate }: TimeChartProps) {
  const theme = chartTheme(useIsDark());
  const series = trancheSeries(tranches, result);
  const data = balanceData(result, series);
  const axis = useTimeAxis(firstPaymentDate, result.endMonth);
  const yTicks = niceTicks(Math.max(...data.map((p) => series.reduce((s, d) => s + (p[d.key] ?? 0), 0))));
  return (
    <ChartFrame title="Solde restant dû" subtitle="Capital restant à rembourser, par tranche">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="month" type="number" domain={[0, result.endMonth]} ticks={axis.ticks} tickFormatter={axis.tickYear} {...axisProps(theme)} />
          <YAxis tickFormatter={compactEuro} width={56} ticks={yTicks} domain={[0, yTicks.at(-1)!]} {...axisProps(theme)} axisLine={false} />
          <Tooltip content={<EuroTooltip theme={theme} labelFormatter={axis.label} total rounded />} />
          {series.length > 1 ? <Legend wrapperStyle={legendStyle(theme)} formatter={legendText(theme)} iconType="square" /> : null}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="linear"
              dataKey={s.key}
              name={s.label}
              stackId="balance"
              stroke={seriesColor(theme, i)}
              strokeWidth={2}
              fill={seriesColor(theme, i)}
              fillOpacity={0.15}
              isAnimationActive={false}
              activeDot={{ r: 4, stroke: theme.surface, strokeWidth: 2 }}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Mensualités empilées par tranche, avec la ligne de budget. */
export function PaymentChart({ result, tranches, firstPaymentDate, budget }: TimeChartProps & { budget: number }) {
  const theme = chartTheme(useIsDark());
  const series = trancheSeries(tranches, result);
  const data = paymentData(result, series);
  const axis = useTimeAxis(firstPaymentDate, result.endMonth);
  const peak = Math.max(budget, ...data.map((p) => series.reduce((s, d) => s + (p[d.key] ?? 0), 0)));
  const yTicks = niceTicks(peak * 1.05);
  return (
    <ChartFrame title="Mensualités par tranche" subtitle="Échéances normales (hors remboursements anticipés) et budget mensuel">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="month" type="number" domain={[1, result.endMonth]} ticks={axis.ticks.filter((t) => t > 0)} tickFormatter={axis.tickYear} {...axisProps(theme)} />
          <YAxis tickFormatter={compactEuro} width={56} ticks={yTicks} domain={[0, yTicks.at(-1)!]} {...axisProps(theme)} axisLine={false} />
          <Tooltip content={<EuroTooltip theme={theme} labelFormatter={axis.label} total />} />
          {series.length > 1 ? <Legend wrapperStyle={legendStyle(theme)} formatter={legendText(theme)} iconType="square" /> : null}
          {series.map((s, i) => (
            <Area
              key={s.key}
              type="stepAfter"
              dataKey={s.key}
              name={s.label}
              stackId="payment"
              stroke={seriesColor(theme, i)}
              strokeWidth={2}
              fill={seriesColor(theme, i)}
              fillOpacity={0.25}
              isAnimationActive={false}
            />
          ))}
          <ReferenceLine
            y={budget}
            stroke={theme.reference}
            strokeWidth={1.5}
            label={{ value: 'Budget', position: 'insideTopRight', fill: theme.text, fontSize: 12 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

/** Intérêts cumulés et capital remboursé cumulé. */
export function CumulativeChart({ result, firstPaymentDate }: Omit<TimeChartProps, 'tranches'>) {
  const theme = chartTheme(useIsDark());
  const data = cumulativeData(result);
  const axis = useTimeAxis(firstPaymentDate, result.endMonth);
  const last = data[data.length - 1];
  const yTicks = niceTicks(Math.max(last?.capital ?? 0, last?.interest ?? 0));
  return (
    <ChartFrame title="Intérêts cumulés et capital remboursé" subtitle="Montants cumulés depuis la mise à disposition">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={theme.grid} />
          <XAxis dataKey="month" type="number" domain={[0, result.endMonth]} ticks={axis.ticks} tickFormatter={axis.tickYear} {...axisProps(theme)} />
          <YAxis tickFormatter={compactEuro} width={56} ticks={yTicks} domain={[0, yTicks.at(-1)!]} {...axisProps(theme)} axisLine={false} />
          <Tooltip content={<EuroTooltip theme={theme} labelFormatter={axis.label} rounded />} />
          <Legend wrapperStyle={legendStyle(theme)} formatter={legendText(theme)} iconType="plainline" />
          <Line type="linear" dataKey="capital" name="Capital remboursé" stroke={seriesColor(theme, 0)} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: theme.surface, strokeWidth: 2 }} />
          <Line type="linear" dataKey="interest" name="Intérêts cumulés" stroke={seriesColor(theme, 1)} strokeWidth={2} dot={false} isAnimationActive={false} activeDot={{ r: 4, stroke: theme.surface, strokeWidth: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export interface CostBar {
  name: string;
  interest: number;
  penalties: number;
  /** Frais de dossier, d'expertise, d'acte et de refinancement. */
  fees: number;
  /** Assurance solde restant dû, incendie, compte bancaire. */
  insurance: number;
}

/** Comparaison des coûts entre scénarios (barres horizontales empilées). */
export function CostComparisonChart({ data }: { data: readonly CostBar[] }) {
  const theme = chartTheme(useIsDark());
  // Ordre et couleur fixes par composante, même si certaines sont absentes.
  const parts = [
    { key: 'interest', label: 'Intérêts', color: 0 },
    { key: 'penalties', label: 'Indemnités de remploi', color: 1 },
    { key: 'fees', label: 'Frais', color: 2 },
    { key: 'insurance', label: 'Assurances', color: 3 },
  ].filter((p) => data.some((d) => d[p.key as keyof CostBar] !== 0));
  const height = Math.max(160, data.length * 56 + 60);
  const xTicks = niceTicks(Math.max(...data.map((d) => d.interest + d.penalties + d.fees + d.insurance)), 5);
  return (
    <figure className="card space-y-2">
      <figcaption>
        <h3 className="font-semibold">Comparaison des coûts</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Intérêts, indemnités, frais et assurances de chaque scénario (avant réductions éventuelles)
        </p>
      </figcaption>
      <div className="w-full" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={[...data]} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 0 }} barCategoryGap={12}>
            <CartesianGrid horizontal={false} stroke={theme.grid} />
            <XAxis type="number" tickFormatter={compactEuro} ticks={xTicks} domain={[0, xTicks.at(-1)!]} {...axisProps(theme)} />
            <YAxis type="category" dataKey="name" width={120} {...axisProps(theme)} axisLine={false} tick={{ fill: theme.text, fontSize: 12 }} />
            <Tooltip
              cursor={{ fill: theme.grid, opacity: 0.5 }}
              content={<EuroTooltip theme={theme} labelFormatter={(l) => String(l)} total rounded />}
            />
            {parts.length > 1 ? <Legend wrapperStyle={legendStyle(theme)} formatter={legendText(theme)} iconType="square" /> : null}
            {parts.map((p, i) => (
              <Bar
                key={p.key}
                dataKey={p.key}
                name={p.label}
                stackId="cost"
                fill={seriesColor(theme, p.color)}
                maxBarSize={24}
                stroke={theme.surface}
                strokeWidth={i > 0 ? 2 : 0}
                radius={i === parts.length - 1 ? [0, 4, 4, 0] : 0}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
