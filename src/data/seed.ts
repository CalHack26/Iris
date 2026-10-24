import type { Notification, SensorKind, SymptomRecord } from '@/lib/types';

/** The shoulder mark shown throughout the design, normalised against anatomy-front.png. */
export const DESIGN_SHOULDER_MARK = { x: 0.587, y: 0.344 };

const shoulder = (
  id: string,
  at: string,
  severity: number,
  durationMin: number,
  note: string,
): SymptomRecord => ({
  id,
  at,
  location: 'Left anterior shoulder',
  layer: 'muscles',
  feeling: 'aching',
  severity,
  durationMin,
  note,
  tags: [],
  mark: DESIGN_SHOULDER_MARK,
  strokes: [],
});

/** The six records shown in the design (12–24 Oct 2026), newest first. */
export const SEED_RECORDS: SymptomRecord[] = [
  {
    ...shoulder(
      'rec-2026-10-24',
      '2026-10-24T09:20:00',
      4,
      30,
      'A dull ache at the front of my left shoulder after desk work. Worse when I raise my arm. No numbness or tingling.',
    ),
    demoArea: true,
  },
  shoulder('rec-2026-10-21', '2026-10-21T18:10:00', 5, 40, 'After desk work; eased with rest.'),
  shoulder('rec-2026-10-19', '2026-10-19T17:45:00', 4, 35, 'After desk work; worse raising arm.'),
  shoulder('rec-2026-10-17', '2026-10-17T16:30:00', 3, 30, 'Aching after desk work.'),
  shoulder('rec-2026-10-14', '2026-10-14T18:00:00', 3, 25, 'Aching after desk work.'),
  shoulder('rec-2026-10-12', '2026-10-12T17:10:00', 2, 20, 'Mild aching after desk work.'),
];

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif-sensor-anomaly',
    at: '2026-10-24T09:40:00',
    title: 'Sensor update',
    message: 'noticed an anomaly in sensor data',
    detail: 'A reading differed from your recent pattern. Add how you feel to give it more context.',
    read: false,
  },
];

export const QUICK_TAGS = ['Period', 'headache', 'cold'];
export const EXTRA_TAGS = ['nausea', 'fatigue', 'dizziness', 'fever', 'back pain'];

export const SENSORS: Record<
  SensorKind,
  { title: string; unit: string; caption: string; ticks: [number, number, number]; decimals: number }
> = {
  heartRate: { title: 'Heart rate', unit: 'bpm', caption: 'Daily average · bpm', ticks: [90, 75, 60], decimals: 0 },
  temperature: {
    title: 'Body temperature',
    unit: '°C',
    caption: 'Daily average · °C',
    ticks: [37.0, 36.5, 36.0],
    decimals: 1,
  },
  respiratory: {
    title: 'Respiratory rate',
    unit: 'breaths/min',
    caption: 'Daily average · breaths/min',
    ticks: [20, 16, 12],
    decimals: 0,
  },
};

/** Daily averages for 18–24 Oct 2026, read off the design's plots. */
const WEEK: Record<SensorKind, number[]> = {
  heartRate: [68, 72, 71, 75, 79, 73, 74],
  temperature: [36.5, 36.4, 36.6, 36.3, 36.7, 36.8, 36.6],
  respiratory: [15.5, 14.6, 15.5, 16.4, 15.5, 17.3, 16],
};

/** Deterministic pseudo-noise so mock series stay stable between renders. */
const wobble = (i: number) => Math.sin(i * 12.9898) * 0.5 + Math.sin(i * 4.1414) * 0.5;

export type SensorRange = 'day' | 'week' | 'month';

export const SENSOR_END = new Date('2026-10-24T23:00:00');

/**
 * Mock wearable series ending `offset` periods before SENSOR_END. Week view uses the design's values; day (hourly)
 * and month (daily) views are generated around the same baseline.
 */
export function sensorSeries(kind: SensorKind, range: SensorRange, offset: number) {
  const week = WEEK[kind];
  const base = week.reduce((a, b) => a + b, 0) / week.length;
  const spread = kind === 'temperature' ? 0.3 : kind === 'heartRate' ? 6 : 1.5;
  if (range === 'week') {
    if (offset === 0) return week;
    return week.map((_, i) => base + wobble(i + offset * 7) * spread);
  }
  const n = range === 'day' ? 24 : 30;
  return Array.from({ length: n }, (_, i) => base + wobble(i + offset * n + (range === 'day' ? 100 : 300)) * spread);
}

/** Mock translation pair from the design. */
export const TRANSLATION_EXAMPLE = {
  source:
    'J’ai une douleur sourde à l’avant de l’épaule gauche après avoir travaillé au bureau. Elle augmente quand je lève le bras. Pas d’engourdissement ni de picotements.',
  english:
    'I have a dull ache at the front of my left shoulder after desk work. It gets worse when I raise my arm. No numbness or tingling.',
  keywords: [
    'Left anterior shoulder',
    'Dull aching pain',
    'Worse with arm elevation',
    'No numbness or tingling reported',
  ],
};
