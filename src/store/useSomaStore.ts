import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_NOTIFICATIONS, SEED_RECORDS } from '@/data/seed';
import { dismissAlert } from '@/lib/data';
import type { SensorReading } from '@/lib/db-types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ALERT_ID_PREFIX, pushRecord } from '@/lib/sync';
import type { Draft, Notification, SymptomRecord } from '@/lib/types';

/** UUIDs, so a record can be saved to Supabase under the same id it was shown with. */
const newId = () => Crypto.randomUUID();

export const emptyDraft = (): Draft => ({
  at: new Date().toISOString(),
  location: '',
  layer: 'muscles',
  feeling: null,
  severity: null,
  durationMin: 30,
  note: '',
  tags: [],
  strokes: [],
});

type SomaState = {
  records: SymptomRecord[];
  notifications: Notification[];
  draft: Draft;
  updateDraft: (patch: Partial<Draft>) => void;
  resetDraft: () => void;
  /** Drop an in-progress edit of a saved record; a fresh, unsaved mark is left alone. */
  discardEdit: () => void;
  /** Load an existing record into the draft so the mark-a-pain flow edits it. */
  editRecord: (id: string) => void;
  /** Save the draft as a new record (or over the record it edits). Returns the record id. */
  saveDraft: () => string;
  /** Save a typed or spoken symptom that has no body mark. Returns the record id. */
  addTextRecord: (input: { note: string; tags: string[] }) => string;
  /** Overwrite the note and tags of an existing text-only record. */
  updateTextRecord: (id: string, input: { note: string; tags: string[] }) => void;
  markNotificationRead: (id: string) => void;
  /** Records saved locally that haven't reached Supabase yet; retried on the next launch. */
  unsyncedIds: string[];
  /** Send a record to Supabase, tracking it in `unsyncedIds` until it succeeds. No-op without Supabase. */
  syncRecord: (id: string) => Promise<void>;
  /** Replace local data with what Supabase holds, keeping records that haven't been pushed yet. */
  hydrateRemote: (remote: { records: SymptomRecord[]; notifications: Notification[] }) => void;
  /** Wearable readings from Supabase, oldest first. Not persisted. */
  readings: SensorReading[];
  setReadings: (readings: SensorReading[]) => void;
  addReading: (reading: SensorReading) => void;
};

const byNewest = (a: SymptomRecord, b: SymptomRecord) => b.at.localeCompare(a.at);

export const useSomaStore = create<SomaState>()(
  persist(
    (set, get) => ({
      records: SEED_RECORDS,
      notifications: SEED_NOTIFICATIONS,
      draft: emptyDraft(),
      unsyncedIds: [],
      readings: [],

      updateDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
      resetDraft: () => set({ draft: emptyDraft() }),
      discardEdit: () => set((s) => (s.draft.editingId ? { draft: emptyDraft() } : s)),

      editRecord: (id) => {
        const record = get().records.find((r) => r.id === id);
        if (!record) return;
        const { id: editingId, ...rest } = record;
        set({ draft: { ...rest, editingId } });
      },

      saveDraft: () => {
        const { draft, records } = get();
        const { editingId, ...fields } = draft;
        const id = editingId ?? newId();
        const record: SymptomRecord = {
          ...fields,
          id,
          feeling: fields.feeling ?? 'other',
          severity: fields.severity ?? 0,
        };
        const rest = records.filter((r) => r.id !== id);
        set({ records: [record, ...rest].sort(byNewest), draft: emptyDraft() });
        void get().syncRecord(id);
        return id;
      },

      addTextRecord: ({ note, tags }) => {
        const id = newId();
        const record: SymptomRecord = {
          id,
          at: new Date().toISOString(),
          location: '',
          layer: 'skin',
          feeling: 'other',
          severity: 0,
          durationMin: 0,
          note,
          tags,
          strokes: [],
        };
        set((s) => ({ records: [record, ...s.records].sort(byNewest) }));
        void get().syncRecord(id);
        return id;
      },

      updateTextRecord: (id, { note, tags }) => {
        set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, note, tags } : r)) }));
        void get().syncRecord(id);
      },

      markNotificationRead: (id) => {
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
        if (isSupabaseConfigured && id.startsWith(ALERT_ID_PREFIX)) {
          dismissAlert(id.slice(ALERT_ID_PREFIX.length)).catch((e) => console.warn('[sync]', e));
        }
      },

      syncRecord: async (id) => {
        const record = get().records.find((r) => r.id === id);
        // Seed and pre-sync records use `rec-…` ids, which aren't valid database UUIDs.
        if (!isSupabaseConfigured || !record || id.startsWith('rec-')) return;
        try {
          await pushRecord(record);
          set((s) => ({ unsyncedIds: s.unsyncedIds.filter((x) => x !== id) }));
        } catch (e) {
          console.warn('[sync]', e);
          set((s) => (s.unsyncedIds.includes(id) ? s : { unsyncedIds: [...s.unsyncedIds, id] }));
        }
      },

      hydrateRemote: (remote) =>
        set((s) => {
          const ids = new Set(remote.records.map((r) => r.id));
          const pending = s.records.filter((r) => s.unsyncedIds.includes(r.id) && !ids.has(r.id));
          return { records: [...pending, ...remote.records].sort(byNewest), notifications: remote.notifications };
        }),

      setReadings: (readings) => set({ readings }),
      addReading: (reading) => set((s) => ({ readings: [...s.readings, reading] })),
    }),
    {
      name: 'soma-store',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ readings: _readings, ...rest }) => rest,
      // v1 had no sync queue; its `rec-…` records stay local and are never pushed.
      migrate: (persisted, version) =>
        (version < 2 ? { ...(persisted as object), unsyncedIds: [] } : persisted) as SomaState,
    },
  ),
);

/** Records that carry a body mark, newest first — the ones trends and reports are built from. */
export function useMarkedRecords() {
  const records = useSomaStore((s) => s.records);
  return useMemo(() => records.filter((r) => r.location), [records]);
}

export function useHasUnread() {
  return useSomaStore((s) => s.notifications.some((n) => !n.read));
}
