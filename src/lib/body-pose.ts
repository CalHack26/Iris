import { useSomaStore } from '@/store/useSomaStore';

/** Camera and highlight kept with a symptom so the saved body matches the selection. */
export type SavedPose = {
  viewZoom?: number;
  viewTurn?: number;
  viewScroll?: number;
  viewSlide?: number;
  highlightedPart?: string | null;
  highlightDraw?: boolean;
};

export function rememberPose(patch: SavedPose & { location?: string }) {
  useSomaStore.getState().updateDraft(patch as never);
}

let figureReset = 0;
const resetListeners = new Set<() => void>();

/** Body map opened from Home, History, Report, or after a saved record. */
export function shouldResetFigure(from: string, to: string) {
  if (!/\/body-map\/?$/.test(to)) return false;
  if (/\/body-map\/?$/.test(from)) return false;
  if (from.includes('survey') || from.includes('body-map-fullscreen')) return false;
  return true;
}

export function requestFigureReset() {
  figureReset += 1;
  resetListeners.forEach((listener) => listener());
}

export function subscribeFigureReset(listener: () => void) {
  resetListeners.add(listener);
  return () => resetListeners.delete(listener);
}

export function getFigureReset() {
  return figureReset;
}

export function readPose(source: SavedPose | null | undefined) {
  if (!source || typeof source.viewZoom !== 'number') return null;
  return {
    zoom: source.viewZoom,
    turn: typeof source.viewTurn === 'number' ? source.viewTurn : 0,
    scroll: typeof source.viewScroll === 'number' ? source.viewScroll : 0,
    slide: typeof source.viewSlide === 'number' ? source.viewSlide : 0,
    highlightedPart: source.highlightedPart ?? null,
    highlightDraw: Boolean(source.highlightDraw),
  };
}
