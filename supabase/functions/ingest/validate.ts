// =====================================================================
// Payload checks for the ingest function. Pure TypeScript (no Deno or
// npm imports) so it runs under `node --test` as well as on Supabase.
// Ranges mirror the check constraints on sensor_readings in schema.sql;
// change both together.
// =====================================================================

export const MAX_READINGS = 100;

/** Wire field → column, with the range the database accepts. */
const FIELDS = {
  hr:       { column: 'heart_rate_bpm', min: 20,  max: 250, int: true },
  skin_c:   { column: 'skin_temp_c',    min: 20,  max: 45 },
  air_c:    { column: 'ambient_temp_c', min: -30, max: 60 },
  hum:      { column: 'humidity_pct',   min: 0,   max: 100 },
  motion_g: { column: 'motion_g',       min: 0,   max: 64 }, // DB only needs >= 0; 64 g is past any real wrist
} as const;

type Field = keyof typeof FIELDS;
type Column = (typeof FIELDS)[Field]['column'];

/** Timestamp key on the wire; never copied into `raw`. */
const TIME_KEY = 't';

/** Before this the board's clock wasn't set (an ESP32 without NTP boots at 1970). */
const EARLIEST_MS = Date.UTC(2024, 0, 1);
/** Allowed clock drift into the future. */
const FUTURE_SLACK_MS = 5 * 60_000;

export type ReadingRow = Partial<Record<Column, number>> & {
  recorded_at: string;
  raw: Record<string, unknown> | null;
};

export type Parsed =
  | { ok: true; readings: ReadingRow[]; tapAt: string | null; ignored: string[] }
  | { ok: false; error: string };

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** A usable board time, or null when it's missing, junk, or outside the believable window. */
function boardTime(v: unknown, now: Date): Date | null {
  if (typeof v !== 'string' && typeof v !== 'number') return null;
  // Numbers are unix seconds (what time() gives on the ESP32).
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v);
  const ms = d.getTime();
  if (Number.isNaN(ms) || ms < EARLIEST_MS || ms > now.getTime() + FUTURE_SLACK_MS) return null;
  return d;
}

export function parsePayload(body: unknown, now: Date): Parsed {
  if (!isObject(body)) return { ok: false, error: 'Body must be a JSON object' };

  const list = body.readings ?? [];
  if (!Array.isArray(list)) return { ok: false, error: '`readings` must be an array' };
  if (list.length > MAX_READINGS) {
    return { ok: false, error: `Too many readings (${list.length}); send at most ${MAX_READINGS} per request` };
  }

  const ignored: string[] = [];
  const readings: ReadingRow[] = [];

  list.forEach((item, i) => {
    const at = `readings[${i}]`;
    if (!isObject(item)) {
      ignored.push(`${at} is not an object`);
      return;
    }

    const row: Partial<Record<Column, number>> = {};
    const extras: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(item)) {
      if (key === TIME_KEY) continue;
      if (!(key in FIELDS)) {
        extras[key] = value;
        continue;
      }
      const spec = FIELDS[key as Field];
      if (value === null) continue; // "no reading" is fine
      if (typeof value !== 'number' || !Number.isFinite(value) || value < spec.min || value > spec.max) {
        ignored.push(`${at}.${key}=${JSON.stringify(value)}`);
        continue;
      }
      row[spec.column] = 'int' in spec ? Math.round(value) : value;
    }

    const hasExtras = Object.keys(extras).length > 0;
    if (!Object.keys(row).length && !hasExtras) {
      ignored.push(`${at} has no usable values`);
      return;
    }

    const t = boardTime(item[TIME_KEY], now);
    if (!t && item[TIME_KEY] !== undefined) ignored.push(`${at}.t=${JSON.stringify(item[TIME_KEY])} (used server time)`);
    // Server-time readings in one batch are spaced 1 ms apart so they don't hit the (device_id, recorded_at) key.
    const recorded = t ?? new Date(now.getTime() - (list.length - 1 - i));
    readings.push({ ...row, recorded_at: recorded.toISOString(), raw: hasExtras ? extras : null });
  });

  let tapAt: string | null = null;
  if (body.tap === true) {
    const t = boardTime(body.tap_at, now);
    if (!t && body.tap_at !== undefined) ignored.push(`tap_at=${JSON.stringify(body.tap_at)} (used server time)`);
    tapAt = (t ?? now).toISOString();
  }

  return { ok: true, readings, tapAt, ignored };
}
