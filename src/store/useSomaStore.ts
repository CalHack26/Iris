import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMemo } from 'react';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_NOTIFICATIONS, SEED_RECORDS } from '@/data/seed';
import type { Draft, Notification, SymptomRecord } from '@/lib/types';

const newId = () => `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

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
};

const byNewest = (a: SymptomRecord, b: SymptomRecord) => b.at.localeCompare(a.at);

export const useSomaStore = create<SomaState>()(
  persist(
    (set, get) => ({
      records: SEED_RECORDS,
      notifications: SEED_NOTIFICATIONS,
      draft: emptyDraft(),

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
        return id;
      },

      updateTextRecord: (id, { note, tags }) =>
        set((s) => ({ records: s.records.map((r) => (r.id === id ? { ...r, note, tags } : r)) })),

      markNotificationRead: (id) =>
        set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    }),
    {
      name: 'soma-store',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
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
