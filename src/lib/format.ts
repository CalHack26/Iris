import type { Feeling, Layer } from './types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number) => String(n).padStart(2, '0');

export const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
/** "24 Oct" */
export const dayMonth = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
/** "24 Oct 2026" */
export const date = (d: Date) => `${dayMonth(d)} ${d.getFullYear()}`;
/** "24 Oct 2026 · 09:20" */
export const dateTime = (d: Date) => `${date(d)} · ${time(d)}`;
/** "24 Oct 2026, 09:20" */
export const dateTimeComma = (d: Date) => `${date(d)}, ${time(d)}`;
/** "24 Oct · 09:20" */
export const shortDateTime = (d: Date) => `${dayMonth(d)} · ${time(d)}`;
/** "SATURDAY, 24 OCTOBER 2026" */
export const longDate = (d: Date) =>
  `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`.toUpperCase();
/** "24 October" */
export const dayMonthLong = (d: Date) => `${d.getDate()} ${MONTHS_LONG[d.getMonth()]}`;
/** "12–24 Oct 2026", collapsing the month when both ends share it. */
export function dateRange(from: Date, to: Date) {
  if (from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear()) {
    return `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
  }
  return `${dayMonth(from)} – ${date(to)}`;
}
export const monthYear = (d: Date) => `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;

export function severityLabel(score: number) {
  if (score <= 0) return 'No pain';
  if (score <= 2) return 'Mild';
  if (score <= 4) return 'Moderate';
  if (score <= 6) return 'Strong';
  if (score <= 8) return 'Severe';
  return 'Worst';
}

export const FEELINGS: { key: Feeling; label: string; hint: string }[] = [
  { key: 'aching', label: 'Aching', hint: 'Dull & heavy' },
  { key: 'sharp', label: 'Sharp', hint: 'A sudden jab' },
  { key: 'burning', label: 'Burning', hint: 'Hot or stinging' },
  { key: 'throbbing', label: 'Throbbing', hint: 'Pulsing beats' },
  { key: 'tingling', label: 'Tingling', hint: 'Pins & needles' },
  { key: 'pressure', label: 'Pressure', hint: 'Squeezed tight' },
  { key: 'stiffness', label: 'Stiffness', hint: 'Hard to move' },
  { key: 'swelling', label: 'Swelling', hint: 'Puffy or tight' },
  { key: 'other', label: 'Other', hint: 'In your words' },
];

export const feelingLabel = (f: Feeling) => FEELINGS.find((x) => x.key === f)?.label ?? 'Other';

export const LAYERS: { key: Layer; label: string; depth: string }[] = [
  { key: 'skin', label: 'Skin', depth: 'surface location' },
  { key: 'muscles', label: 'Muscles & organs', depth: 'deep location' },
  { key: 'bones', label: 'Bones', depth: 'deepest location' },
];

export const layerLabel = (l: Layer) => LAYERS.find((x) => x.key === l)!.label;
export const layerDepth = (l: Layer) => LAYERS.find((x) => x.key === l)!.depth;

/** "Left anterior shoulder" → "Left shoulder" */
export const shortLocation = (location: string) => location.replace(/\s*(anterior|posterior)\s*/i, ' ');

/** "Left anterior shoulder" → "Left · Front view" */
export function sideLabel(location: string) {
  const side = /^left/i.test(location) ? 'Left' : /^right/i.test(location) ? 'Right' : 'Centre';
  return `${side} · Front view`;
}

export const average = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export const oneDecimal = (n: number) => (Math.round(n * 10) / 10).toString();
