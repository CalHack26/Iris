export type Layer = 'skin' | 'muscles' | 'bones';

export type Feeling =
  | 'aching'
  | 'sharp'
  | 'burning'
  | 'throbbing'
  | 'tingling'
  | 'pressure'
  | 'stiffness'
  | 'swelling'
  | 'other';

/** A point on the anatomy, normalised 0–1 against the front anatomy image (assets/images/anatomy-front.png). */
export type Point = { x: number; y: number };

export type SymptomRecord = {
  id: string;
  /** ISO timestamp of when the symptom was felt. */
  at: string;
  /** Long location label, e.g. "Left anterior shoulder". Empty for text-only records. */
  location: string;
  layer: Layer;
  feeling: Feeling;
  /** Patient-reported severity, 0–10. */
  severity: number;
  durationMin: number;
  note: string;
  tags: string[];
  mark?: Point;
  /** Freehand strokes drawn in Draw mode, in the same normalised space as `mark`. */
  strokes: Point[][];
  /** The seeded example record carries the drawn-area illustration from the design. */
  demoArea?: boolean;
};

/** An in-progress mark-a-pain record. Feeling and severity stay unset until the survey asks for them. */
export type Draft = Omit<SymptomRecord, 'id' | 'feeling' | 'severity'> & {
  feeling: Feeling | null;
  severity: number | null;
  /** Set when the draft edits an existing record rather than creating one. */
  editingId?: string;
};

export type SensorKind = 'heartRate' | 'temperature' | 'respiratory';

export type Notification = {
  id: string;
  at: string;
  title: string;
  message: string;
  detail: string;
  read: boolean;
};
