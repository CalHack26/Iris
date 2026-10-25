import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { TURN_RANGE, ZOOM_RANGE } from '@/components/AnatomyCanvas';
import { describeLocation } from '@/lib/anatomy';
import { clearDrawn, getDrawnPart, keepMarkedLocation, selectDrawn, setDrawMode, subscribeDraw } from '@/lib/draw-selection';
import { layerDepth } from '@/lib/format';
import type { Layer, Point } from '@/lib/types';
import { useSomaStore } from '@/store/useSomaStore';

const ORDER: Layer[] = ['skin', 'muscles', 'bones'];

/** Phone body map. Draw lights a part on its own and does not become the mark. */
export function useMarking() {
  const draft = useSomaStore((s) => s.draft);
  const updateDraft = useSomaStore((s) => s.updateDraft);
  const [mode, setMode] = useState<'mark' | 'draw'>('mark');
  const [rotating, setRotating] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [turn, setTurn] = useState(0);
  const drawnPart = useSyncExternalStore(subscribeDraw, getDrawnPart, getDrawnPart);
  const markedLocation = useRef<string | null>(null);

  useEffect(() => {
    setDrawMode(mode === 'draw');
    return () => setDrawMode(false);
  }, [mode]);

  const clampZoom = (z: number) => Math.min(ZOOM_RANGE[1], Math.max(ZOOM_RANGE[0], z));
  const clampTurn = (t: number) => Math.min(TURN_RANGE[1], Math.max(TURN_RANGE[0], t));

  const centroid = (pts: Point[]) => ({
    x: pts.reduce((a, p) => a + p.x, 0) / pts.length,
    y: pts.reduce((a, p) => a + p.y, 0) / pts.length,
  });

  const marks = (draft.mark ? 1 : 0) + draft.strokes.length;
  const status =
    mode === 'draw'
      ? drawnPart
        ? `${drawnPart} · ${layerDepth(draft.layer)}`
        : 'No area yet · draw on the body'
      : draft.mark
        ? `1 mark · ${layerDepth(draft.layer)}`
        : draft.strokes.length
          ? `${draft.strokes.length} drawn area${draft.strokes.length > 1 ? 's' : ''} · ${layerDepth(draft.layer)}`
          : 'No mark yet · tap the body';

  return {
    draft,
    drawnPart,
    mode,
    setMode: (m: 'mark' | 'draw') => {
      const current = useSomaStore.getState().draft;
      if (m === 'draw') {
        markedLocation.current = current.location;
        keepMarkedLocation(current.location);
      }
      setMode(m);
      setRotating(false);
      updateDraft(m === 'mark' && markedLocation.current != null ? { strokes: [], location: markedLocation.current } : { strokes: [] });
    },
    rotating,
    toggleRotate: () => setRotating((r) => !r),
    canvasMode: rotating ? ('rotate' as const) : mode,
    zoom,
    setZoom,
    zoomBy: (d: number) => {
      if (mode === 'draw') return;
      setZoom((z) => clampZoom(z + d));
    },
    turn,
    setTurn,
    turnBy: (d: number) => {
      if (mode === 'draw') return;
      setTurn((t) => clampTurn(t + d));
    },
    resetView: () => {
      setZoom(1);
      setTurn(0);
      setRotating(false);
    },
    clearDrawing: () => {
      clearDrawn();
      updateDraft({
        strokes: [],
        demoArea: false,
        ...(markedLocation.current != null ? { location: markedLocation.current } : {}),
      });
    },
    selectDrawn: (name: string) => {
      selectDrawn(name);
      updateDraft({ strokes: [], location: name });
    },
    marks,
    status,
    onMark: (p: Point) => updateDraft({ mark: p, location: describeLocation(p) }),
    onStroke: (stroke: Point[]) => {
      if (mode === 'draw') return;
      updateDraft({
        strokes: [...draft.strokes, stroke],
        location: draft.mark ? draft.location : describeLocation(centroid(stroke)),
      });
    },
    setLayer: (layer: Layer) => updateDraft({ layer }),
    shiftLayer: (d: number) => {
      const i = Math.min(2, Math.max(0, ORDER.indexOf(draft.layer) + d));
      updateDraft({ layer: ORDER[i] });
    },
  };
}
