/** Website view math. The browser canvas calls these, and the tests lock the same numbers. */

export const ZOOM_RANGE = [1, 6] as const;
export const TURN_RANGE = [-180, 180] as const;
export const SLIDE_RANGE = [-1, 1] as const;

/** Scroll up zooms in by this fraction of deltaY. A trackpad flick should not jump to the limit. */
export const WHEEL_GAIN = 500;
/** Degrees of yaw per pixel of drag. Shared with the phone so the site turns at the same rate. */
export const TURN_GAIN = 3;
/** A drag of this many screen-heights moves the body from one end of the slide range to the other. */
export const SLIDE_GAIN = 1.4;

export const HIGHLIGHT = {
  color: '#fff1c9',
  emissive: '#ffb703',
  intensity: 0.85,
  dimOpacity: 0.18,
} as const;

export type CanvasMode = 'mark' | 'draw' | 'rotate' | 'view';

export type MeshLook =
  | { kind: 'highlight'; color: string; emissive: string; intensity: number; opacity: 1 }
  | { kind: 'dim'; opacity: number }
  | { kind: 'rest' };

function clamp(value: number, [lo, hi]: readonly [number, number]): number {
  return Math.min(hi, Math.max(lo, value));
}

/** The browser's WebGL2 context is real. The phone workaround rejects it. */
export function useRawWebglContext(platform: string): boolean {
  return platform === 'web';
}

/** Atlas files on the site are same-origin paths, so the page does not depend on a phone tunnel host. */
export function atlasRequestPath(file: string): string {
  return `/atlas/${file}`;
}

/** Scroll over the figure zooms. View mode, and the wheel outside the figure, leave the page free to scroll. */
export function wheelChangesZoom(mode: CanvasMode, insideFigure: boolean): boolean {
  return mode !== 'view' && insideFigure;
}

/** Negative deltaY is scroll-up, which zooms in. */
export function wheelZoom(zoom: number, deltaY: number): number {
  return clamp(zoom + -deltaY / WHEEL_GAIN, ZOOM_RANGE);
}

export function pinchZoom(zoom: number, scale: number): number {
  return clamp(zoom * scale, ZOOM_RANGE);
}

/** A tap names a structure only while marking. Rotate mode is for turning, so a click there must not retitle the mark. */
export function tapNamesPart(mode: CanvasMode): boolean {
  return mode === 'mark';
}

/** One finger slides, unless Rotate is on or Shift is held, in which case that same drag turns. */
export function oneFingerMovesView(mode: CanvasMode): boolean {
  return mode !== 'draw' && mode !== 'view';
}

export function dragTurns(mode: CanvasMode, shiftHeld: boolean): boolean {
  return mode === 'rotate' || shiftHeld;
}

export function twoFingerTurns(mode: CanvasMode): boolean {
  return mode !== 'view';
}

/** Dragging right decreases the angle. The phone uses this same sign. */
export function dragTurn(turn: number, translationX: number): number {
  return clamp(turn - translationX / TURN_GAIN, TURN_RANGE);
}

/** Twist is the pinch gesture's rotation, in radians. Focal drag uses the same sign as a two-finger slide. */
export function pinchTurn(turn: number, focalDelta: number, twistRadians: number): number {
  const twisted = (twistRadians * 180) / Math.PI;
  return clamp(turn - focalDelta / TURN_GAIN - twisted, TURN_RANGE);
}

/** Horizontal and vertical drags share one gain, so a sideways slide moves the body as fast as an up-down slide. */
export function dragSlide(
  scroll: number,
  slide: number,
  translationX: number,
  translationY: number,
  height: number,
): { scroll: number; slide: number } {
  const gain = Math.max(height * SLIDE_GAIN, 1);
  return {
    scroll: clamp(scroll + translationY / gain, SLIDE_RANGE),
    slide: clamp(slide + translationX / gain, SLIDE_RANGE),
  };
}

/** The mesh under the cursor is gold. Every other mesh fades, so the lit piece is the one the label names. */
export function meshLook(hasSelection: boolean, isSelected: boolean): MeshLook {
  if (hasSelection && isSelected) {
    return {
      kind: 'highlight',
      color: HIGHLIGHT.color,
      emissive: HIGHLIGHT.emissive,
      intensity: HIGHLIGHT.intensity,
      opacity: 1,
    };
  }
  if (hasSelection) return { kind: 'dim', opacity: HIGHLIGHT.dimOpacity };
  return { kind: 'rest' };
}
