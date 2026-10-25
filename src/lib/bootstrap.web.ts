import { useSomaStore } from '@/store/useSomaStore';

import { refreshAlerts } from './bootstrap.ts';
import { loadAlerts, loadRecentReadings, subscribeToReadings } from './data';
import { isSupabaseConfigured, signInDemo } from './supabase';
import { alertToNotification, pullRecords } from './sync';

type WebsiteStore = {
  draft: { editingId?: string };
  records: { id: string; note: string; tags: string[] }[];
  resetDraft: () => void;
  discardEdit?: () => void;
  updateTextRecord?: (id: string, input: { note: string; tags: string[] }) => void;
};

/**
 * The website store is the older copy and does not include the actions the
 * screens already call. Add them before the first screen renders.
 */
const store = useSomaStore as unknown as {
  getState: () => WebsiteStore;
  setState: (partial: Partial<WebsiteStore> | ((state: WebsiteStore) => Partial<WebsiteStore>)) => void;
};

if (typeof window !== 'undefined' && typeof store.getState().discardEdit !== 'function') {
  store.setState({
    discardEdit: () => {
      const { draft, resetDraft } = store.getState();
      if (draft.editingId) resetDraft();
    },
    updateTextRecord: (id, input) => {
      store.setState((state) => ({
        records: state.records.map((record) =>
          record.id === id ? { ...record, note: input.note, tags: input.tags } : record,
        ),
      }));
    },
  });
}

type BackendStore = {
  unsyncedIds?: string[];
  syncRecord?: (id: string) => Promise<unknown>;
  hydrateRemote?: (input: { records: unknown[]; notifications: unknown[] }) => void;
  setReadings?: (readings: unknown[]) => void;
  addReading?: (reading: unknown) => void;
};

/** Website startup. The store has no offline queue, so a missing list is skipped instead of mapped. */
export function startBackend(): () => void {
  if (!isSupabaseConfigured) return () => {};
  let stopped = false;
  let unsubscribe = () => {};

  (async () => {
    const userId = await signInDemo();
    const store = useSomaStore.getState() as BackendStore;
    const pending = store.unsyncedIds ?? [];
    if (store.syncRecord) await Promise.all(pending.map((id) => store.syncRecord?.(id)));

    const [records, alerts, readings] = await Promise.all([pullRecords(), loadAlerts(), loadRecentReadings(24 * 30)]);
    if (stopped) return;
    store.hydrateRemote?.({ records, notifications: (alerts ?? []).map(alertToNotification) });
    store.setReadings?.(readings);
    if (store.addReading) unsubscribe = subscribeToReadings(userId, store.addReading);
  })().catch((e) => console.warn('[backend] using local data:', e));

  return () => {
    stopped = true;
    unsubscribe();
  };
}

export { refreshAlerts };
