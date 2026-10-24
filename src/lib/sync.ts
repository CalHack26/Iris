import { loadPainMarks, upsertPainMark } from './data';
import type { BodyLayer, NewPainMark, PainMark, PainType, PatternAlert, Vec3 } from './db-types';
import { dateRange, FEELINGS } from './format';
import type { Feeling, Layer, Notification, Point, SymptomRecord } from './types';

/**
 * Until the 3D body lands, marks come from the 2D front render. `mesh_name` says how to read the position back:
 * a tapped point, the centre of a drawn area (no tap), or no location at all (typed/spoken record).
 */
const MESH = { point: 'front-2d', drawn: 'front-2d-stroke', none: 'text-only' } as const;

const LAYER_TO_DB: Record<Layer, BodyLayer> = { skin: 'skin', muscles: 'muscles_organs', bones: 'bones' };
const LAYER_FROM_DB: Record<BodyLayer, Layer> = { skin: 'skin', muscles_organs: 'muscles', bones: 'bones' };

const isFeeling = (t: PainType): t is Feeling => FEELINGS.some((f) => f.key === t);

const centroid = (pts: Point[]) => ({
  x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
  y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
});

/** App record → `pain_marks` row. Strokes share the one path column as [x, y, strokeIndex]. */
export function toPainMark(r: SymptomRecord): NewPainMark & { id: string } {
  const firstStroke = r.strokes.find((s) => s.length);
  const pos = r.mark ?? (firstStroke ? centroid(firstStroke) : null);
  const stroke: Vec3[] = r.strokes.flatMap((s, i) => s.map((p): Vec3 => [p.x, p.y, i]));
  return {
    id: r.id,
    occurred_at: r.at,
    layer: LAYER_TO_DB[r.layer],
    mesh_name: !r.location ? MESH.none : r.mark ? MESH.point : MESH.drawn,
    region: r.location,
    pos_x: pos?.x ?? 0,
    pos_y: pos?.y ?? 0,
    pos_z: 0,
    stroke: stroke.length ? stroke : null,
    pain_type: r.feeling,
    intensity: r.severity,
    duration_minutes: r.durationMin,
    tags: r.tags,
    notes: r.note,
  };
}

/** `pain_marks` row → app record. Marks saved by other clients (e.g. the future 3D view) show without a 2D point. */
export function fromPainMark(m: PainMark): SymptomRecord {
  const strokes: Point[][] = [];
  if (m.mesh_name.startsWith('front-2d')) {
    for (const [x, y, i] of m.stroke ?? []) (strokes[i] ??= []).push({ x, y });
  }
  return {
    id: m.id,
    at: m.occurred_at,
    location: m.region,
    layer: LAYER_FROM_DB[m.layer],
    feeling: isFeeling(m.pain_type) ? m.pain_type : 'other',
    severity: m.intensity ?? 0,
    durationMin: m.duration_minutes ?? 0,
    note: m.notes ?? '',
    tags: m.tags ?? [],
    mark: m.mesh_name === MESH.point ? { x: m.pos_x, y: m.pos_y } : undefined,
    strokes: strokes.filter(Boolean),
  };
}

export const pushRecord = (r: SymptomRecord) => upsertPainMark(toPainMark(r));

export async function pullRecords(): Promise<SymptomRecord[]> {
  return (await loadPainMarks({ sinceDays: 365 })).map(fromPainMark);
}

const ALERT_TITLES: Record<PatternAlert['level'], string> = {
  info: 'Pattern noticed',
  see_professional: 'Worth checking with a professional',
  urgent: 'Urgent pattern',
};

/** Alert ids are UUIDs from the database; local seed notifications use readable ids. */
export const ALERT_ID_PREFIX = 'alert:';

export function alertToNotification(a: PatternAlert): Notification {
  return {
    id: `${ALERT_ID_PREFIX}${a.id}`,
    at: a.created_at,
    title: ALERT_TITLES[a.level],
    message: a.message,
    detail: `${a.region} · ${dateRange(new Date(a.window_start), new Date(a.window_end))}`,
    read: a.dismissed_at != null,
  };
}
