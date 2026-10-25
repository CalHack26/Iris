import { useSomaStore } from '@/store/useSomaStore';

import { refreshAlerts, startBackend } from './bootstrap.ts';

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

export { refreshAlerts, startBackend };
