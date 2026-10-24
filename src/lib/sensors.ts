import type { SensorReading } from './db-types';
import type { SensorKind } from './types';

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** Which reading column feeds each chart. Respiratory rate has no sensor yet. */
const FIELD: Partial<Record<SensorKind, keyof Pick<SensorReading, 'heart_rate_bpm' | 'skin_temp_c'>>> = {
  heartRate: 'heart_rate_bpm',
  temperature: 'skin_temp_c',
};

/** 23:00 today: where the period ends once live readings exist (the mock data ends at SENSOR_END instead). */
export function endOfToday() {
  const d = new Date();
  d.setHours(23, 0, 0, 0);
  return d;
}

/**
 * Average live readings into hourly buckets for the calendar day of `end` (day view), or daily buckets for the
 * `days` days ending on `end` (week / month). Empty buckets take the nearest real value so the chart stays
 * continuous; `lastIndex` is the newest bucket that had data. Returns null when the period has no readings.
 */
export function bucketReadings(readings: SensorReading[], kind: SensorKind, days: number, end: Date) {
  const field = FIELD[kind];
  if (!field) return null;

  const hourly = days === 1;
  const n = hourly ? 24 : days;
  const dayEnd = new Date(end);
  dayEnd.setHours(0, 0, 0, 0);
  const start = hourly ? dayEnd.getTime() : dayEnd.getTime() - (days - 1) * DAY_MS;
  const size = hourly ? HOUR_MS : DAY_MS;

  const sums = new Array<number>(n).fill(0);
  const counts = new Array<number>(n).fill(0);
  for (const r of readings) {
    const v = r[field];
    if (v == null) continue;
    const i = Math.floor((new Date(r.recorded_at).getTime() - start) / size);
    if (i < 0 || i >= n) continue;
    sums[i] += v;
    counts[i] += 1;
  }

  const filled = counts.map((c, i) => (c ? i : -1)).filter((i) => i >= 0);
  if (!filled.length) return null;
  const values = sums.map((_, i) => {
    const nearest = filled.reduce((best, j) => (Math.abs(j - i) < Math.abs(best - i) ? j : best));
    return sums[nearest] / counts[nearest];
  });
  return { values, lastIndex: filled[filled.length - 1] };
}
