import { Image } from 'expo-image';
import { useLocalSearchParams, usePathname } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import Svg, { Path } from 'react-native-svg';

import SymptomHalo44 from '@/assets/icons/symptom-halo-44.svg';
import SymptomHalo from '@/assets/icons/symptom-halo.svg';
import SymptomLocation from '@/assets/icons/symptom-location.svg';
import { coverRect, FRONT_IMAGE, frontToSaved, SAVED_IMAGE } from '@/lib/anatomy';
import { clearDrawn, getDrawnPart, getMarkedLocation, selectDrawn, subscribeDraw } from '@/lib/draw-selection';
import type { Layer, Point } from '@/lib/types';
import { useSomaStore } from '@/store/useSomaStore';
import { colors } from '@/theme/tokens';

import {
  dragSlide,
  dragTurn,
  dragTurns,
  oneFingerMovesView,
  pinchTurn as turnFromPinch,
  pinchZoom,
  TURN_RANGE,
  twoFingerTurns,
  wheelChangesZoom,
  wheelZoom,
  ZOOM_RANGE,
} from '@/atlas/web-view';

import { AtlasBody } from './AtlasBody';
import { useLockPageScroll } from './Screen';
import { Txt } from './Txt';

const IMAGES = {
  front: { source: require('@/assets/images/anatomy-front.png'), size: FRONT_IMAGE },
  saved: { source: require('@/assets/images/anatomy-saved.png'), size: SAVED_IMAGE },
} as const;

export type CanvasMode = 'mark' | 'draw' | 'rotate' | 'view';
type Rect = { left: number; top: number; width: number; height: number };

type Props = {
  height: number;
  image?: keyof typeof IMAGES;
  imageBox?: (width: number, height: number) => Rect;
  background?: string;
  radius?: number;
  mark?: Point;
  strokes?: Point[][];
  demoArea?: boolean;
  numbered?: boolean;
  labels?: { top: number; rLeft: number; lRight: number; weight?: 'regular' | 'medium' };
  mode?: CanvasMode;
  zoom?: number;
  turn?: number;
  onMark?: (p: Point) => void;
  onStroke?: (stroke: Point[]) => void;
  onZoom?: (zoom: number) => void;
  onTurn?: (deg: number) => void;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export { TURN_RANGE, ZOOM_RANGE };

/**
 * Website body. Draw shows a stroke while the pointer is down, then keeps the yellow part highlight.
 */
export function AnatomyCanvas({
  height,
  image = 'front',
  imageBox,
  background = colors.anatomyBg,
  radius = 32,
  mark,
  strokes = [],
  demoArea,
  numbered,
  labels = { top: 128, rLeft: 62, lRight: 42 },
  mode = 'view',
  zoom = 1,
  turn = 0,
  onMark,
  onZoom,
  onTurn,
  children,
  style,
}: Props) {
  const pathname = usePathname();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const draftLayer = useSomaStore((s) => s.draft.layer);
  const recordLayer = useSomaStore((s) => (id ? s.records.find((r) => r.id === id)?.layer : undefined));
  const layer: Layer = pathname.includes('/record/') && recordLayer ? recordLayer : draftLayer;

  const [width, setWidth] = useState(0);
  const [modelReady, setModelReady] = useState(false);
  const [modelFailed, setModelFailed] = useState(false);
  const [scroll, setScroll] = useState(0);
  const [slide, setSlide] = useState(0);
  const [markedPart, setMarkedPart] = useState<string | null>(null);
  const [fingerStroke, setFingerStroke] = useState<Point[]>([]);
  const drawnPart = useSyncExternalStore(subscribeDraw, getDrawnPart, getDrawnPart);
  const pinchStart = useRef(zoom);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const shiftRef = useRef(false);
  const turnStart = useRef(turn);
  const turnRef = useRef(turn);
  turnRef.current = turn;
  const scrollRef = useRef(scroll);
  scrollRef.current = scroll;
  const slideRef = useRef(slide);
  slideRef.current = slide;
  const scrollStart = useRef(0);
  const slideStart = useRef(0);
  const prevPose = useRef({ zoom, turn });
  if (prevPose.current.zoom !== zoom || prevPose.current.turn !== turn) {
    const cleared = zoom === 1 && turn === 0;
    prevPose.current = { zoom, turn };
    if (cleared && (scroll !== 0 || slide !== 0)) {
      setScroll(0);
      setSlide(0);
    }
  }
  const picker = useRef<((x: number, y: number, viewWidth: number, viewHeight: number) => string | null) | null>(
    null,
  );
  const lockPageScroll = useLockPageScroll();
  const frameRef = useRef<View>(null);
  const onZoomRef = useRef(onZoom);
  onZoomRef.current = onZoom;

  useEffect(() => {
    if (mode === 'draw') setMarkedPart(null);
    else setFingerStroke([]);
  }, [mode]);

  useEffect(() => {
    const onWheel = (event: WheelEvent) => {
      if (mode === 'draw') return;
      const node = frameRef.current as unknown as HTMLElement | null;
      const inside = Boolean(node && typeof node.contains === 'function' && node.contains(event.target as Node));
      if (!wheelChangesZoom(mode, inside)) return;
      event.preventDefault();
      onZoomRef.current?.(wheelZoom(zoomRef.current, event.deltaY));
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Shift') shiftRef.current = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Shift') shiftRef.current = false;
    };
    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [mode]);

  const img = IMAGES[image];
  const box = width ? (imageBox?.(width, height) ?? { left: 0, top: 0, width, height }) : null;
  const fit = box ? coverRect(box, img.size) : null;
  const rect: Rect | null = fit && box ? { ...fit, left: fit.left + box.left, top: fit.top + box.top } : null;

  const toImage = (x: number, y: number): Point | null => {
    if (!rect) return null;
    const p = { x: (x - rect.left) / rect.width, y: (y - rect.top) / rect.height };
    return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 ? p : null;
  };
  const place = (p: Point) => {
    const q = image === 'saved' ? frontToSaved(p) : p;
    return rect ? { x: q.x * rect.width, y: q.y * rect.height } : { x: 0, y: 0 };
  };

  const selectPart = (x: number, y: number) => {
    if (!(modelReady && !modelFailed)) return;
    const part = picker.current?.(x, y, width, height);
    if (part) {
      selectDrawn(part);
      useSomaStore.getState().updateDraft({ location: part });
    }
  };

  const tap = useTapGesture({
    onTouchesDown: () => lockPageScroll(true),
    onTouchesUp: (e) => lockPageScroll(e.allTouches.length > e.changedTouches.length),
    onTouchesCancel: () => lockPageScroll(false),
    runOnJS: true,
    enabled: mode === 'mark' || mode === 'draw',
    onActivate: (e) => {
      if (mode === 'draw') {
        selectPart(e.x, e.y);
        return;
      }
      const p = toImage(e.x, e.y) ?? { x: width ? e.x / width : 0.5, y: height ? e.y / height : 0.5 };
      onMark?.(p);
      if (!(modelReady && !modelFailed)) return;
      const part = picker.current?.(e.x, e.y, width, height);
      setMarkedPart(part);
      if (part) useSomaStore.getState().updateDraft({ location: part });
    },
  });

  const drawPan = usePanGesture({
    onTouchesDown: () => lockPageScroll(true),
    onTouchesUp: (e) => lockPageScroll(e.allTouches.length > e.changedTouches.length),
    onTouchesCancel: () => {
      lockPageScroll(false);
      setFingerStroke([]);
    },
    runOnJS: true,
    enabled: mode === 'draw',
    maxPointers: 1,
    minDistance: 2,
    onActivate: (e) => {
      setFingerStroke([{ x: e.x, y: e.y }]);
    },
    onUpdate: (e) => {
      setFingerStroke((points) => [...points, { x: e.x, y: e.y }]);
    },
    onDeactivate: (e) => {
      setFingerStroke([]);
      selectPart(e.x, e.y);
    },
  });

  const scrollPan = usePanGesture({
    onTouchesDown: () => lockPageScroll(true),
    onTouchesUp: (e) => lockPageScroll(e.allTouches.length > e.changedTouches.length),
    onTouchesCancel: () => lockPageScroll(false),
    runOnJS: true,
    enabled: oneFingerMovesView(mode),
    minPointers: 1,
    maxPointers: 1,
    minDistance: 8,
    onActivate: () => {
      scrollStart.current = scrollRef.current;
      slideStart.current = slideRef.current;
      turnStart.current = turnRef.current;
    },
    onUpdate: (e) => {
      if (e.numberOfPointers != null && e.numberOfPointers > 1) return;
      if (dragTurns(mode, shiftRef.current)) {
        onTurn?.(dragTurn(turnStart.current, e.translationX));
        return;
      }
      const next = dragSlide(scrollStart.current, slideStart.current, e.translationX, e.translationY, height);
      setScroll(next.scroll);
      setSlide(next.slide);
    },
  });

  const turnPan = usePanGesture({
    onTouchesDown: () => lockPageScroll(true),
    onTouchesUp: (e) => lockPageScroll(e.allTouches.length > e.changedTouches.length),
    onTouchesCancel: () => lockPageScroll(false),
    runOnJS: true,
    enabled: twoFingerTurns(mode) && mode !== 'draw',
    minPointers: 2,
    maxPointers: 2,
    onActivate: () => {
      turnStart.current = turnRef.current;
    },
    onUpdate: (e) => {
      if (e.numberOfPointers != null && e.numberOfPointers < 2) return;
      onTurn?.(dragTurn(turnStart.current, e.translationX));
    },
  });

  const pinchFocal = useRef(0);
  const pinchTurn = useRef(0);
  const pinchTwist = useRef(0);
  const pinch = usePinchGesture({
    onTouchesDown: () => lockPageScroll(true),
    onTouchesUp: (e) => lockPageScroll(e.allTouches.length > e.changedTouches.length),
    onTouchesCancel: () => lockPageScroll(false),
    runOnJS: true,
    enabled: twoFingerTurns(mode) && mode !== 'draw',
    onActivate: (e) => {
      pinchStart.current = zoom;
      pinchFocal.current = e.focalX ?? 0;
      pinchTwist.current = e.rotation ?? 0;
      pinchTurn.current = turnRef.current;
    },
    onUpdate: (e) => {
      onZoom?.(pinchZoom(pinchStart.current, e.scale));
      const dragged = typeof e.focalX === 'number' ? e.focalX - pinchFocal.current : 0;
      const twisted = typeof e.rotation === 'number' ? e.rotation - pinchTwist.current : 0;
      onTurn?.(turnFromPinch(pinchTurn.current, dragged, twisted));
    },
  });

  const gestures = useSimultaneousGestures(tap, drawPan, scrollPan, turnPan, pinch);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const showMark = mode !== 'draw';
  const allStrokes = showMark ? strokes : [];
  const placed = showMark && mark ? place(mark) : null;
  const Halo = numbered ? SymptomHalo44 : SymptomHalo;
  const haloSize = numbered ? 44 : 42;

  return (
    <View
      ref={(node) => {
        frameRef.current = node;
        const el = node as unknown as HTMLElement | null;
        if (el?.dataset) el.dataset.bodyFrame = '1';
      }}
      style={[styles.frame, { height, backgroundColor: background, borderRadius: radius }, style]}
      onLayout={onLayout}>
      {modelFailed ? null : (
        <AtlasBody
          zoom={zoom}
          turn={turn}
          scroll={scroll}
          slide={slide}
          layer={layer}
          background={background}
          visible={modelReady}
          picker={picker}
          highlight={mode === 'draw' ? drawnPart : markedPart}
          drawHighlight={mode === 'draw'}
          onReady={() => setModelReady(true)}
          onError={() => setModelFailed(true)}
        />
      )}
      <GestureDetector gesture={gestures}>
        <View style={StyleSheet.absoluteFill}>
          {mode === 'draw' && fingerStroke.length > 1 ? (
            <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path
                d={strokePath(fingerStroke)}
                stroke="#ffe14a"
                strokeOpacity={0.95}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </Svg>
          ) : null}
          {rect ? (
            <View style={[styles.abs, rect]} pointerEvents="none">
              {!modelReady || modelFailed ? (
                <Image source={img.source} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : null}
              {allStrokes.length ? (
                <Svg width={rect.width} height={rect.height} style={StyleSheet.absoluteFill}>
                  {allStrokes.map((s, i) => (
                    <Path
                      key={i}
                      d={strokePath(s.map(place))}
                      stroke={colors.marker}
                      strokeOpacity={0.85}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                    />
                  ))}
                </Svg>
              ) : null}
              {placed && demoArea ? (
                <Image
                  source={require('@/assets/images/drawn-symptom-area.png')}
                  style={[styles.abs, { left: placed.x - 30, top: placed.y - 14, width: 58, height: 74 }]}
                />
              ) : null}
              {placed ? (
                <>
                  <View style={[styles.abs, { left: placed.x - haloSize / 2, top: placed.y - haloSize / 2 }]}>
                    <Halo />
                  </View>
                  <View style={[styles.abs, { left: placed.x - 11, top: placed.y - 11 }]}>
                    <SymptomLocation />
                  </View>
                  {numbered ? (
                    <View style={[styles.abs, styles.badge, { left: placed.x + 21, top: placed.y - 23 }]}>
                      <Txt size={11} weight="semibold" color={colors.marker}>
                        1
                      </Txt>
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}
        </View>
      </GestureDetector>
      {modelReady && !modelFailed ? null : (
        <>
          <Txt
            size={12}
            weight={labels.weight ?? 'regular'}
            color={colors.muted}
            style={[styles.abs, { top: labels.top, left: labels.rLeft }]}
            pointerEvents="none">
            R
          </Txt>
          <Txt
            size={12}
            weight={labels.weight ?? 'regular'}
            color={colors.muted}
            style={[styles.abs, { top: labels.top, right: labels.lRight }]}
            pointerEvents="none">
            L
          </Txt>
        </>
      )}
      {mode === 'draw' ? (
        <View style={styles.resetWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear the highlighted area"
            onPress={() => {
              clearDrawn();
              const location = getMarkedLocation();
              if (location != null) useSomaStore.getState().updateDraft({ location });
            }}
            style={styles.resetBtn}>
            <Txt size={13} weight="semibold">
              Reset
            </Txt>
          </Pressable>
        </View>
      ) : (
        children
      )}
    </View>
  );
}

function strokePath(points: Point[]) {
  return points.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join('');
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignSelf: 'stretch' },
  abs: { position: 'absolute' },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetWrap: {
    position: 'absolute',
    bottom: 16,
    alignSelf: 'center',
    backgroundColor: colors.white,
    borderRadius: 100,
    padding: 6,
  },
  resetBtn: {
    minWidth: 72,
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
