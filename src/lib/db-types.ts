// =====================================================================
// CalHacks26 — shared data types. Matches schema.sql (plus
// supabase/migrations/20261024_app_feelings_tags.sql); change both together.
// Once the Supabase project is up, `npx supabase gen types typescript`
// can generate these automatically. Until then, import from here.
// =====================================================================

// ---------- enums ----------
export type BodyLayer = 'skin' | 'muscles_organs' | 'bones';

export type PainType =
  | 'aching' | 'throbbing' | 'stabbing' | 'burning' | 'cramping'
  | 'pressure' | 'radiating' | 'tingling' | 'numbness' | 'other'
  // added for the app's feeling picker (see the 20261024 migration)
  | 'sharp' | 'stiffness' | 'swelling';

export type SymptomContext =
  | 'period' | 'exercise' | 'eating' | 'sleeping' | 'working' | 'stress' | 'other';

export type RelativeChange = 'much_better' | 'better' | 'same' | 'worse' | 'much_worse';
export type ReportStatus = 'pending' | 'ready' | 'failed';
export type AlertLevel = 'info' | 'see_professional' | 'urgent';

type UUID = string;
type ISODate = string; // timestamptz as an ISO 8601 string
export type Vec3 = [number, number, number];

// ---------- tables ----------
export interface Profile {
  id: UUID;
  display_name: string | null;
  preferred_language: string; // BCP-47, e.g. 'vi'
  created_at: ISODate;
}

export interface Device {
  id: UUID;
  user_id: UUID;
  name: string;
  last_seen_at: ISODate | null;
  created_at: ISODate;
  // token_hash exists in the DB but is never sent to the app
}

/** One mark drawn on the 3D body (the doc's SymptomEvent). */
export interface PainMark {
  id: UUID;
  user_id: UUID;
  // WHEN
  occurred_at: ISODate;
  created_at: ISODate;
  // WHERE
  layer: BodyLayer;
  mesh_name: string;          // raycast hit, e.g. 'Gastrocnemius_R'
  region: string;             // e.g. 'right calf (outer)'
  pos_x: number; pos_y: number; pos_z: number;
  normal_x: number | null; normal_y: number | null; normal_z: number | null;
  brush_radius: number;
  stroke: Vec3[] | null;      // drawn path
  spread_to: string[];        // regions it radiates to
  // WHAT
  pain_type: PainType;
  // HOW
  intensity: number | null;   // 0-10
  compared_to_last: RelativeChange | null;
  duration_minutes: number | null;
  is_constant: boolean | null;
  // CONTEXT
  context: SymptomContext[];
  triggers: string | null;
  relief: string | null;
  daily_impact: string | null;
  tags: string[];             // free-text chips, e.g. 'Period', 'headache'
  // notes
  notes: string | null;
  notes_language: string | null;
  notes_en: string | null;    // filled by the LLM
  quick_log_id: UUID | null;
}

/**
 * What the app sends when a mark is saved. The server fills the rest.
 * `id` is optional: the app generates one up front so it can show the record before the save finishes.
 */
export type NewPainMark =
  Pick<PainMark, 'layer' | 'mesh_name' | 'region' | 'pos_x' | 'pos_y' | 'pos_z' | 'pain_type'> &
  Partial<Omit<PainMark, 'user_id' | 'created_at' | 'notes_en'>>;

export interface QuickLog {
  id: UUID;
  user_id: UUID;
  device_id: UUID | null;
  tapped_at: ISODate;
  received_at: ISODate;
  pain_mark_id: UUID | null;  // null = tap not detailed yet
}

export interface SensorReading {
  id: number;
  user_id: UUID;
  device_id: UUID;
  recorded_at: ISODate;
  received_at: ISODate;
  heart_rate_bpm: number | null;
  skin_temp_c: number | null;
  ambient_temp_c: number | null;
  humidity_pct: number | null;
  motion_g: number | null;
  raw: Record<string, unknown> | null;
}

export interface Report {
  id: UUID;
  user_id: UUID;
  period_start: ISODate;
  period_end: ISODate;
  status: ReportStatus;
  summary_en: string | null;
  summary_patient: string | null;
  patient_language: string | null;
  content: Record<string, unknown> | null;
  pain_mark_ids: UUID[];
  model: string | null;
  created_at: ISODate;
}

export interface PatternAlert {
  id: UUID;
  user_id: UUID;
  region: string;
  level: AlertLevel;
  pattern_score: number | null;
  message: string;            // pattern wording, never a diagnosis
  evidence: Record<string, unknown> | null;
  window_start: ISODate;
  window_end: ISODate;
  dismissed_at: ISODate | null;
  created_at: ISODate;
}

/** Row of the region_trend_30d view. */
export interface RegionTrend {
  user_id: UUID;
  region: string;
  count_last_30d: number;
  count_prev_30d: number;
  avg_intensity_last_30d: number | null;
  avg_intensity_prev_30d: number | null;
  avg_duration_last_30d: number | null;
  avg_duration_prev_30d: number | null;
  last_seen: ISODate;
}

// ---------- wearable → server ----------
/**
 * What the ESP32 POSTs to the ingest Edge Function (supabase/functions/ingest; sketch in esp32/).
 * Header: `x-device-token: <device token>`.
 * Send readings in batches; `tap: true` marks a touch-sensor quick-log.
 * Without `t` / `tap_at` (clock not set) the server uses its own time.
 *
 * {
 *   "readings": [
 *     { "t": "2026-10-25T19:42:10Z", "hr": 74, "skin_c": 33.2,
 *       "air_c": 22.1, "hum": 41, "motion_g": 1.02 }
 *   ],
 *   "tap": false
 * }
 */
export interface DevicePayload {
  readings?: {
    t?: ISODate;
    hr?: number;
    skin_c?: number;
    air_c?: number;
    hum?: number;
    motion_g?: number;
    [extra: string]: unknown; // goes into `raw`
  }[];
  tap?: boolean;
  tap_at?: ISODate;
}
