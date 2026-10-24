// =====================================================================
// Every read/write the app needs, in one place. Screens and the 3D view
// call these instead of writing Supabase queries themselves.
//
//   3D view:   markFromHit → savePainMark, loadPainMarks, deletePainMark
//   History:   loadPainMarks
//   App sync:  upsertPainMark (src/lib/sync.ts)
//   Taps:      loadPendingTaps, saveMarkForTap
//   Live HR:   loadRecentReadings, subscribeToReadings
//   Insights:  loadTrends, loadAlerts, dismissAlert, loadReports
// =====================================================================
import { currentUserId, getSupabase } from './supabase';
import type {
  BodyLayer, NewPainMark, PainMark, PainType, PatternAlert, QuickLog,
  RegionTrend, Report, SensorReading,
} from './db-types';

// ---------------------------------------------------------------------
// Body regions: mesh name → friendly name stored in `region`.
// The 3D lead should fill this from the real model. Region names must stay
// the SAME every time, because trends are grouped by them.
// Unknown meshes fall back to a cleaned-up mesh name.
// ---------------------------------------------------------------------
export const REGION_NAMES: Record<string, string> = {
  Skin_Head: 'right temple',
  Uterus: 'lower abdomen',
  Gastrocnemius_lateral_head_R: 'right calf (outer)',
  Erector_spinae_L: 'lower back (left side)',
  Patella_R: 'right knee',
};

export function regionFor(meshName: string): string {
  if (REGION_NAMES[meshName]) return REGION_NAMES[meshName];
  const side = /[_.\s-](R|right)$/i.test(meshName) ? ' (right)'
             : /[_.\s-](L|left)$/i.test(meshName) ? ' (left)' : '';
  const base = meshName
    .replace(/[_.\s-](R|L|right|left)$/i, '')
    .replace(/[_.-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();
  return (base || 'unknown area') + side;
}

// ---------------------------------------------------------------------
// 3D tap → a mark ready to save
// ---------------------------------------------------------------------
export interface Hit {
  meshName: string;
  /** Hit point in the body model's OWN space (see PainMarks3D.tsx), not world space */
  point: { x: number; y: number; z: number };
  normal?: { x: number; y: number; z: number } | null;
}

export function markFromHit(
  hit: Hit,
  layer: BodyLayer,
  painType: PainType,
  extra: Partial<NewPainMark> = {},
): NewPainMark {
  const r = (n: number) => Math.round(n * 10000) / 10000;
  const mark: NewPainMark = {
    layer,
    mesh_name: hit.meshName,
    region: regionFor(hit.meshName),
    pos_x: r(hit.point.x), pos_y: r(hit.point.y), pos_z: r(hit.point.z),
    normal_x: hit.normal ? r(hit.normal.x) : null,
    normal_y: hit.normal ? r(hit.normal.y) : null,
    normal_z: hit.normal ? r(hit.normal.z) : null,
    pain_type: painType,
    ...extra,
  };
  // Handy for filling REGION_NAMES and the seed file's STEP 2 table:
  console.log('[pain-mark hit]', JSON.stringify({ mesh: mark.mesh_name, layer,
    x: mark.pos_x, y: mark.pos_y, z: mark.pos_z }));
  return mark;
}

// ---------------------------------------------------------------------
// Pain marks
// ---------------------------------------------------------------------
function fail(action: string, error: { message: string } | null): never {
  throw new Error(`${action} failed: ${error?.message ?? 'unknown error'}`);
}

export async function savePainMark(input: NewPainMark): Promise<PainMark> {
  if (input.intensity != null && (input.intensity < 0 || input.intensity > 10)) {
    throw new Error('Intensity must be 0–10');
  }
  const user_id = await currentUserId();
  const { data, error } = await getSupabase()
    .from('pain_marks')
    .insert({ ...input, user_id })
    .select()
    .single();
  if (error || !data) fail('Saving pain mark', error);
  return data as PainMark;
}

/** Create or overwrite a mark by id, so a new record and later edits go through one path. */
export async function upsertPainMark(input: NewPainMark & { id: string }): Promise<PainMark> {
  if (input.intensity != null && (input.intensity < 0 || input.intensity > 10)) {
    throw new Error('Intensity must be 0–10');
  }
  const user_id = await currentUserId();
  const { data, error } = await getSupabase()
    .from('pain_marks')
    .upsert({ ...input, user_id })
    .select()
    .single();
  if (error || !data) fail('Saving pain mark', error);
  return data as PainMark;
}

export async function updatePainMark(id: string, changes: Partial<NewPainMark>): Promise<PainMark> {
  const { data, error } = await getSupabase()
    .from('pain_marks').update(changes).eq('id', id).select().single();
  if (error || !data) fail('Updating pain mark', error);
  return data as PainMark;
}

export async function deletePainMark(id: string): Promise<void> {
  const { error } = await getSupabase().from('pain_marks').delete().eq('id', id);
  if (error) fail('Deleting pain mark', error);
}

export async function loadPainMarks(opts: { sinceDays?: number; layer?: BodyLayer; region?: string } = {}): Promise<PainMark[]> {
  const sinceDays = opts.sinceDays ?? 60;
  let q = getSupabase()
    .from('pain_marks')
    .select('*')
    .gte('occurred_at', new Date(Date.now() - sinceDays * 86_400_000).toISOString())
    .order('occurred_at', { ascending: false });
  if (opts.layer) q = q.eq('layer', opts.layer);
  if (opts.region) q = q.eq('region', opts.region);
  const { data, error } = await q;
  if (error) fail('Loading pain marks', error);
  return (data ?? []) as PainMark[];
}

// ---------------------------------------------------------------------
// Wearable taps ("finish your log")
// ---------------------------------------------------------------------
export async function loadPendingTaps(): Promise<QuickLog[]> {
  const { data, error } = await getSupabase()
    .from('quick_logs').select('*').is('pain_mark_id', null)
    .order('tapped_at', { ascending: false });
  if (error) fail('Loading taps', error);
  return (data ?? []) as QuickLog[];
}

/** Save a mark for a tap: the mark gets the tap's time, and the two are linked. */
export async function saveMarkForTap(tap: QuickLog, input: NewPainMark): Promise<PainMark> {
  const mark = await savePainMark({ ...input, occurred_at: tap.tapped_at, quick_log_id: tap.id });
  const { error } = await getSupabase().from('quick_logs').update({ pain_mark_id: mark.id }).eq('id', tap.id);
  if (error) fail('Linking tap', error);
  return mark;
}

// ---------------------------------------------------------------------
// Live wearable data
// ---------------------------------------------------------------------
export async function loadRecentReadings(hours = 24): Promise<SensorReading[]> {
  const { data, error } = await getSupabase()
    .from('sensor_readings').select('*')
    .gte('recorded_at', new Date(Date.now() - hours * 3_600_000).toISOString())
    .order('recorded_at', { ascending: true })
    .limit(2000);
  if (error) fail('Loading readings', error);
  return (data ?? []) as SensorReading[];
}

/** Calls `onReading` for every new reading. Returns a function that stops listening. */
export function subscribeToReadings(userId: string, onReading: (r: SensorReading) => void): () => void {
  const channel = getSupabase()
    .channel(`readings-${userId}`)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `user_id=eq.${userId}` },
        (payload: { new: unknown }) => onReading(payload.new as SensorReading))
    .subscribe();
  return () => { getSupabase().removeChannel(channel); };
}

/** Same idea for wearable taps, so a tap pops up in the app instantly. */
export function subscribeToTaps(userId: string, onTap: (t: QuickLog) => void): () => void {
  const channel = getSupabase()
    .channel(`taps-${userId}`)
    .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'quick_logs', filter: `user_id=eq.${userId}` },
        (payload: { new: unknown }) => onTap(payload.new as QuickLog))
    .subscribe();
  return () => { getSupabase().removeChannel(channel); };
}

// ---------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------
export async function loadTrends(): Promise<RegionTrend[]> {
  const { data, error } = await getSupabase()
    .from('region_trend_30d').select('*').order('count_last_30d', { ascending: false });
  if (error) fail('Loading trends', error);
  return (data ?? []) as RegionTrend[];
}

export async function loadAlerts(): Promise<PatternAlert[]> {
  const { data, error } = await getSupabase()
    .from('pattern_alerts').select('*').is('dismissed_at', null)
    .order('created_at', { ascending: false });
  if (error) fail('Loading alerts', error);
  return (data ?? []) as PatternAlert[];
}

export async function dismissAlert(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from('pattern_alerts').update({ dismissed_at: new Date().toISOString() }).eq('id', id);
  if (error) fail('Dismissing alert', error);
}

export async function loadReports(): Promise<Report[]> {
  const { data, error } = await getSupabase()
    .from('reports').select('*').order('created_at', { ascending: false });
  if (error) fail('Loading reports', error);
  return (data ?? []) as Report[];
}

// ---------------------------------------------------------------------
// Display helpers (Olivia: swap colors for the Figma palette)
// ---------------------------------------------------------------------
export const PAIN_COLORS: Record<PainType, string> = {
  aching: '#E8A33D', throbbing: '#D94F4F', stabbing: '#B5179E', burning: '#F2622E',
  cramping: '#7B5CD6', pressure: '#3D7FD9', radiating: '#E0457B', tingling: '#2BB3A3',
  numbness: '#8A94A6', other: '#666C78',
  sharp: '#C2185B', stiffness: '#5C6BC0', swelling: '#26A69A',
};
