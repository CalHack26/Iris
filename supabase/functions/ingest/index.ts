// =====================================================================
// ingest — where the ESP32 wearable sends its readings and taps.
//
// POST /functions/v1/ingest
//   x-device-token: <raw device token from the seed output>
//   { "readings": [{ "t": "2026-10-25T19:42:10Z", "hr": 74, "skin_c": 33.2 }], "tap": false }
//
// The board has no user login, so deploy with JWT verification off
// (supabase/config.toml, or --no-verify-jwt) and check the device token
// here instead. Writes use the secret key because RLS only lets the app
// read sensor_readings and quick_logs.
// =====================================================================
import { createClient } from 'npm:@supabase/supabase-js@2';
import { parsePayload } from './validate.ts';

const MAX_BODY_BYTES = 64 * 1024;

/** The secret key, from the current key dictionary or the legacy service_role variable. */
function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    const key = parsed.default ?? Object.values(parsed)[0];
    if (key) return key;
  }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legacy) throw new Error('No secret key in the function environment');
  return legacy;
}

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Same as the seed's encode(digest(token, 'sha256'), 'hex'). */
async function sha256Hex(text: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { ok: false, error: 'POST only' });

  const token = req.headers.get('x-device-token')?.trim();
  if (!token) return json(401, { ok: false, error: 'Missing x-device-token header' });

  const { data: device, error: deviceError } = await supabase
    .from('devices').select('id, user_id').eq('token_hash', await sha256Hex(token)).maybeSingle();
  if (deviceError) return json(500, { ok: false, error: `Device lookup failed: ${deviceError.message}` });
  if (!device) return json(401, { ok: false, error: 'Unknown device token' });

  const text = await req.text();
  if (text.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'Body too large' });
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: 'Body is not valid JSON' });
  }

  const parsed = parsePayload(body, new Date());
  if (!parsed.ok) return json(400, { ok: false, error: parsed.error });
  const { readings, tapAt, ignored } = parsed;

  let inserted = 0;
  if (readings.length) {
    const rows = readings.map((r) => ({ ...r, user_id: device.user_id, device_id: device.id }));
    // A retry of the same reading hits unique (device_id, recorded_at) and is skipped; only new rows come back.
    const { data, error } = await supabase
      .from('sensor_readings')
      .upsert(rows, { onConflict: 'device_id,recorded_at', ignoreDuplicates: true })
      .select('id');
    if (error) return json(500, { ok: false, error: `Saving readings failed: ${error.message}`, ignored });
    inserted = data?.length ?? 0;
  }

  let tapId: string | null = null;
  if (tapAt) {
    // quick_logs has no unique key, so look for a retried tap before adding a second "finish your log" entry.
    const { data: existing } = await supabase
      .from('quick_logs').select('id').eq('device_id', device.id).eq('tapped_at', tapAt).maybeSingle();
    if (existing) {
      tapId = existing.id;
    } else {
      const { data, error } = await supabase
        .from('quick_logs')
        .insert({ user_id: device.user_id, device_id: device.id, tapped_at: tapAt })
        .select('id').single();
      if (error) return json(500, { ok: false, error: `Saving tap failed: ${error.message}`, inserted, ignored });
      tapId = data.id;
    }
  }

  await supabase.from('devices').update({ last_seen_at: new Date().toISOString() }).eq('id', device.id);

  return json(200, {
    ok: true,
    inserted,
    duplicates: readings.length - inserted,
    ignored,
    tap_id: tapId,
  });
});
