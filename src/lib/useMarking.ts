import { useState } from 'react';

import { TURN_RANGE, ZOOM_RANGE } from '@/components/AnatomyCanvas';
import { describeLocation } from '@/lib/anatomy';
import { layerDepth } from '@/lib/format';
import type { BodyHit, Layer, Point } from '@/lib/types';
import { useSomaStore } from '@/store/useSomaStore';

const ORDER: Layer[] = ['skin', 'muscles', 'bones'];

/** Shared state and actions for the body map (Mark a pain tab and the full-screen view). */
export function useMarking() {
  const draft = useSomaStore((s) => s.draft);
  const updateDraft = useSomaStore((s) => s.updateDraft);
  const [mode, setMode] = useState<'mark' | 'draw'>('mark');
  const [rotating, setRotating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);

  const clampZoom = (z: number) => Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], z));
  const clampTurn = (t: number) => Math.min(TURN_RANGE[1], Math.max(TURN_RANGE[0], t));

  const centroid = (pts: Point[]) => ({
    x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
    y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
  });

  const marks = (draft.mark ? 1 : 0) + draft.strokes.length;
  const status = draft.mark
    ? `1 mark · ${layerDepth(draft.layer)}`
    : draft.strokes.length
      ? `${draft.strokes.length} drawn area${draft.strokes.length > 1 ? 's' : ''} · ${layerDepth(draft.layer)}`
      : 'No mark yet · tap the body';

  return {
    draft,
    mode,
    setMode: (m: 'mark' | 'draw') => {
      setMode(m);
      setRotating(false);
    },
    rotating,
    toggleRotate: () => setRotating((r) => !r),
    canvasMode: rotating ? ('rotate' as const) : mode,
    zoom,
    setZoom,
    zoomBy: (d: number) => setZoom((z) => clampZoom(z + d)),
    turn,
    setTurn,
    turnBy: (d: number) => setTurn((t) => clampTurn(t + d)),
    resetView: () => {
      setZoom(1);
      setTurn(0);
      setRotating(false);
    },
    clearDrawing: () => updateDraft({ strokes: [], demoArea: false }),
    marks,
    status,
    // A flat tap (no 3D hit) clears any earlier 3D mark, so an edit can't keep a stale point.
    onMark: (p: Point, hit?: BodyHit) =>
      updateDraft({ mark: p, mark3d: hit?.mark, location: hit?.label ?? describeLocation(p) }),
    onStroke: (stroke: Point[]) =>
      updateDraft({
        strokes: [...draft.strokes, stroke],
        location: draft.mark ? draft.location : describeLocation(centroid(stroke)),
      }),
    setLayer: (layer: Layer) => updateDraft({ layer }),
    shiftLayer: (d: number) => {
      const i = Math.min(2, Math.max(0, ORDER.indexOf(draft.layer) + d));
      updateDraft({ layer: ORDER[i] });
    },
  };
}
