import { Image } from 'expo-image';
import { useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
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
import type { Point } from '@/lib/types';
import { colors } from '@/theme/tokens';

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
  /** Box the image is cover-fitted into, given the canvas size. Defaults to the whole canvas. */
  imageBox?: (width: number, height: number) => Rect;
  background?: string;
  radius?: number;
  mark?: Point;
  strokes?: Point[][];
  /** Show the design's drawn-area illustration around the mark (seeded example record). */
  demoArea?: boolean;
  /** Fullscreen variant: 44pt halo plus a numbered badge. */
  numbered?: boolean;
  /** Position of the R / L orientation letters. */
  labels?: { top: number; rLeft: number; lRight: number; weight?: 'regular' | 'medium' };
  mode?: CanvasMode;
  zoom?: number;
  turn?: number;
  onMark?: (p: Point) => void;
  onStroke?: (stroke: Point[]) => void;
  onZoom?: (zoom: number) => void;
  onTurn?: (deg: number) => void;
  /** Floating controls, drawn above the anatomy and unaffected by zoom. */
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export const ZOOM_RANGE = [1, 2.5] as const;
export const TURN_RANGE = [-35, 35] as const;
const clamp = (v: number, [lo, hi]: readonly [number, number]) => Math.min(hi, Math.max(lo, v));

/**
 * The anatomy illustration with the patient's mark and drawn strokes. Tap to mark, drag to draw, drag to turn in
 * rotate mode, and pinch to zoom. Points are stored normalised against the front render.
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
  onStroke,
  onZoom,
  onTurn,
  children,
  style,
}: Props) {
  const [width, setWidth] = useState(0);
  const [live, setLive] = useState<Point[] | null>(null);
  const pinchStart = useRef(zoom);
  const turnStart = useRef(turn);
  const liveStroke = useRef<Point[]>([]);

  const img = IMAGES[image];
  const box = width ? (imageBox?.(width, height) ?? { left: 0, top: 0, width, height }) : null;
  const fit = box ? coverRect(box, img.size) : null;
  const rect: Rect | null = fit && box ? { ...fit, left: fit.left + box.left, top: fit.top + box.top } : null;

  /** Canvas coordinates → normalised image coordinates, undoing the centred zoom. */
  const toImage = (x: number, y: number): Point | null => {
    if (!rect) return null;
    const ux = (x - width / 2) / zoom + width / 2;
    const uy = (y - height / 2) / zoom + height / 2;
    const p = { x: (ux - rect.left) / rect.width, y: (uy - rect.top) / rect.height };
    return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 ? p : null;
  };
  /** Normalised point (front-image space) → position inside the image rect. */
  const place = (p: Point) => {
    const q = image === 'saved' ? frontToSaved(p) : p;
    return rect ? { x: q.x * rect.width, y: q.y * rect.height } : { x: 0, y: 0 };
  };

  const tap = useTapGesture({
    runOnJS: true,
    enabled: mode === 'mark',
    onActivate: (e) => {
      const p = toImage(e.x, e.y);
      if (p) onMark?.(p);
    },
  });

  const pan = usePanGesture({
    runOnJS: true,
    enabled: mode === 'draw' || mode === 'rotate',
    minDistance: 2,
    onActivate: (e) => {
      turnStart.current = turn;
      if (mode === 'draw') {
        const p = toImage(e.x, e.y);
        liveStroke.current = p ? [p] : [];
        setLive(liveStroke.current);
      }
    },
    onUpdate: (e) => {
      if (mode === 'rotate') {
        onTurn?.(clamp(turnStart.current + e.translationX / 4, TURN_RANGE));
        return;
      }
      const p = toImage(e.x, e.y);
      if (!p) return;
      liveStroke.current = [...liveStroke.current, p];
      setLive(liveStroke.current);
    },
    onDeactivate: () => {
      if (mode === 'draw' && liveStroke.current.length > 1) onStroke?.(liveStroke.current);
      liveStroke.current = [];
      setLive(null);
    },
  });

  const pinch = usePinchGesture({
    runOnJS: true,
    enabled: mode !== 'view',
    onActivate: () => {
      pinchStart.current = zoom;
    },
    onUpdate: (e) => onZoom?.(clamp(pinchStart.current * e.scale, ZOOM_RANGE)),
  });

  const gestures = useSimultaneousGestures(tap, pan, pinch);

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const allStrokes = live ? [...strokes, live] : strokes;
  const m = mark ? place(mark) : null;
  const Halo = numbered ? SymptomHalo44 : SymptomHalo;
  const haloSize = numbered ? 44 : 42;

  return (
    <View style={[styles.frame, { height, backgroundColor: background, borderRadius: radius }, style]} onLayout={onLayout}>
      <GestureDetector gesture={gestures}>
        <View
          style={[
            StyleSheet.absoluteFill,
            { transform: [{ perspective: 900 }, { rotateY: `${turn}deg` }, { scale: zoom }] },
          ]}>
          {rect ? (
            <View style={[styles.abs, rect]} pointerEvents="none">
              <Image source={img.source} style={StyleSheet.absoluteFill} contentFit="cover" />
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
              {m && demoArea ? (
                <Image
                  source={require('@/assets/images/drawn-symptom-area.png')}
                  style={[styles.abs, { left: m.x - 30, top: m.y - 14, width: 58, height: 74 }]}
                />
              ) : null}
              {m ? (
                <>
                  <View style={[styles.abs, { left: m.x - haloSize / 2, top: m.y - haloSize / 2 }]}>
                    <Halo />
                  </View>
                  <View style={[styles.abs, { left: m.x - 11, top: m.y - 11 }]}>
                    <SymptomLocation />
                  </View>
                  {numbered ? (
                    <View style={[styles.abs, styles.badge, { left: m.x + 21, top: m.y - 23 }]}>
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
      {children}
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
});
