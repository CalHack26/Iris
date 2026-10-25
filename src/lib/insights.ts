import { average, oneDecimal, shortLocation } from './format';
import type { SymptomRecord } from './types';

/** Split a chronological series in two halves and compare their mean severity. */
export function severityTrend(newestFirst: SymptomRecord[]) {
  const chrono = [...newestFirst].reverse();
  const half = Math.floor(chrono.length / 2);
  const early = chrono.slice(0, half);
  const late = chrono.slice(chrono.length - half);
  const before = average(early.map((r) => r.severity));
  const after = average(late.map((r) => r.severity));
  const delta = after - before;
  const direction = Math.abs(delta) < 0.5 ? 'steady' : delta > 0 ? 'higher' : 'lower';
  return { chrono, half, before, after, direction } as const;
}

/** "Left anterior shoulder" → "Shoulder" */
export function regionName(location: string) {
  const words = shortLocation(location).trim().split(/\s+/);
  const region = words.slice(1).join(' ') || words[0] || 'Symptom';
  return region.charAt(0).toUpperCase() + region.slice(1);
}

export const fmtAvg = (n: number) => oneDecimal(n);

export function range(values: number[]) {
  return values.length ? ([Math.min(...values), Math.max(...values)] as const) : ([0, 0] as const);
}

/** Up to six evenly spaced records for a chart's date axis. */
export function sampleLabels(chrono: SymptomRecord[]) {
  if (chrono.length <= 6) return chrono;
  return Array.from({ length: 6 }, (_, i) => chrono[Math.round((i * (chrono.length - 1)) / 5)]);
}
