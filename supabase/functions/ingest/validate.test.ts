// Run: node --test supabase/functions/ingest/validate.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_READINGS, parsePayload } from './validate.ts';

const NOW = new Date('2026-10-25T20:00:00.000Z');

function ok(body: unknown) {
  const r = parsePayload(body, NOW);
  assert.ok(r.ok, `expected ok, got ${JSON.stringify(r)}`);
  return r;
}

test('a good reading maps to columns and keeps the board time', () => {
  const r = ok({ readings: [{ t: '2026-10-25T19:42:10Z', hr: 74.4, skin_c: 33.2, air_c: 22.1, hum: 41, motion_g: 1.02 }] });
  assert.deepEqual(r.readings, [{
    heart_rate_bpm: 74, skin_temp_c: 33.2, ambient_temp_c: 22.1, humidity_pct: 41, motion_g: 1.02,
    recorded_at: '2026-10-25T19:42:10.000Z', raw: null,
  }]);
  assert.deepEqual(r.ignored, []);
  assert.equal(r.tapAt, null);
});

test('a bad heart rate is dropped but the temperature from the same reading is kept', () => {
  const r = ok({ readings: [{ t: '2026-10-25T19:42:10Z', hr: 400, skin_c: 33.4 }] });
  assert.equal(r.readings.length, 1);
  assert.equal(r.readings[0].heart_rate_bpm, undefined);
  assert.equal(r.readings[0].skin_temp_c, 33.4);
  assert.deepEqual(r.ignored, ['readings[0].hr=400']);
});

test('a missing clock uses server time, spaced so a batch stays unique', () => {
  const r = ok({ readings: [{ hr: 80 }, { hr: 81 }] });
  assert.equal(r.readings[0].recorded_at, '2026-10-25T19:59:59.999Z');
  assert.equal(r.readings[1].recorded_at, NOW.toISOString());
  assert.deepEqual(r.ignored, []); // no `t` at all isn't worth a warning
});

test('a timestamp more than 5 minutes in the future falls back to server time', () => {
  const r = ok({ readings: [{ t: '2026-10-25T21:00:00Z', hr: 80 }] });
  assert.equal(r.readings[0].recorded_at, NOW.toISOString());
  assert.match(r.ignored[0], /readings\[0\]\.t=.*used server time/);
});

test('an unset ESP32 clock (1970 unix seconds) falls back to server time', () => {
  const r = ok({ readings: [{ t: 12, hr: 80 }] });
  assert.equal(r.readings[0].recorded_at, NOW.toISOString());
  assert.equal(r.ignored.length, 1);
  // A real unix-seconds time is accepted.
  const good = ok({ readings: [{ t: NOW.getTime() / 1000 - 60, hr: 80 }] });
  assert.equal(good.readings[0].recorded_at, '2026-10-25T19:59:00.000Z');
});

test('too many readings is rejected', () => {
  const r = parsePayload({ readings: Array.from({ length: MAX_READINGS + 1 }, () => ({ hr: 70 })) }, NOW);
  assert.equal(r.ok, false);
});

test('non-object junk is rejected or skipped', () => {
  for (const body of [null, 'hello', 42, [1, 2], { readings: 'nope' }]) {
    assert.equal(parsePayload(body, NOW).ok, false, JSON.stringify(body));
  }
  const r = ok({ readings: ['x', { hr: 'fast' }, { hr: NaN }] });
  assert.deepEqual(r.readings, []);
  assert.equal(r.ignored.length, 5); // 'x', hr='fast' + empty, hr=NaN (serialised null) + empty
});

test('unknown fields like battery go into raw', () => {
  const r = ok({ readings: [{ t: '2026-10-25T19:42:10Z', hr: 70, battery: 87, fw: '0.2' }] });
  assert.deepEqual(r.readings[0].raw, { battery: 87, fw: '0.2' });
  // Extras alone are still worth a row.
  assert.equal(ok({ readings: [{ battery: 50 }] }).readings.length, 1);
});

test('a tap without tap_at uses server time; a tap alone needs no readings', () => {
  const r = ok({ tap: true });
  assert.equal(r.tapAt, NOW.toISOString());
  assert.deepEqual(r.readings, []);
  assert.equal(ok({ tap: true, tap_at: '2026-10-25T19:58:00Z' }).tapAt, '2026-10-25T19:58:00.000Z');
  assert.equal(ok({ tap: 'yes' }).tapAt, null);
});
