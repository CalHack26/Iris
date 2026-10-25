import { useSomaStore } from '@/store/useSomaStore';

import { loadAlerts, loadRecentReadings, subscribeToReadings } from './data';
import { isSupabaseConfigured, signInDemo } from './supabase';
import { alertToNotification, pullRecords } from './sync';

/** Reload pattern alerts into the notification list. */
export async function refreshAlerts() {
  if (!isSupabaseConfigured) return;
  try {
    const alerts = await loadAlerts();
    useSomaStore.setState({ notifications: alerts.map(alertToNotification) });
  } catch (e) {
    console.warn('[backend]', e);
  }
}

/**
 * Sign in, push anything saved offline, then load records, alerts and wearable readings into the store and listen
 * for new readings. Without Supabase config the app keeps its local seed data. Returns a cleanup function.
 */
export function startBackend(): () => void {
  if (!isSupabaseConfigured) return () => {};
  let stopped = false;
  let unsubscribe = () => {};

  (async () => {
    const userId = await signInDemo();
    const store = useSomaStore.getState();
    await Promise.all(store.unsyncedIds.map((id) => store.syncRecord(id)));

    const [records, alerts, readings] = await Promise.all([pullRecords(), loadAlerts(), loadRecentReadings(24 * 30)]);
    if (stopped) return;
    store.hydrateRemote({ records, notifications: alerts.map(alertToNotification) });
    store.setReadings(readings);
    unsubscribe = subscribeToReadings(userId, store.addReading);
    console.log(`[backend] signed in; ${records.length} records, ${alerts.length} alerts, ${readings.length} readings`);
  })().catch((e) => console.warn('[backend] using local data:', e));

  return () => {
    stopped = true;
    unsubscribe();
  };
}
