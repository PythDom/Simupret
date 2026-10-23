/**
 * Palette catégorielle des graphiques (ordre fixe, jamais recyclé), validée
 * pour la vision des couleurs (CVD) en mode clair et sombre. Une couleur suit
 * une tranche ou un scénario, jamais son rang.
 */
const SERIES_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const SERIES_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

export interface ChartTheme {
  series: readonly string[];
  grid: string;
  axis: string;
  text: string;
  muted: string;
  surface: string;
  reference: string;
}

export function chartTheme(dark: boolean): ChartTheme {
  return dark
    ? {
        series: SERIES_DARK,
        grid: '#1e293b',
        axis: '#334155',
        text: '#f0efec',
        muted: '#94a3b8',
        surface: '#0f172a',
        reference: '#f0efec',
      }
    : {
        series: SERIES_LIGHT,
        grid: '#e5e7eb',
        axis: '#cbd5e1',
        text: '#0b0b0b',
        muted: '#64748b',
        surface: '#ffffff',
        reference: '#0b0b0b',
      };
}

export function seriesColor(theme: ChartTheme, index: number): string {
  // Au-delà de 8 séries, la dernière couleur est réutilisée (cas exclu : 3 tranches + refinancement).
  return theme.series[Math.min(index, theme.series.length - 1)]!;
}
