import type { Point } from './types';

/** Natural size of assets/images/anatomy-front.png — every stored point is normalised against it. */
export const FRONT_IMAGE = { width: 1264, height: 848 };
/** Natural size of assets/images/anatomy-saved.png (the Saved record view). */
export const SAVED_IMAGE = { width: 1024, height: 1024 };

/**
 * Map a point from the front render onto the Saved-record render. The two renders frame the body differently, so
 * this is a linear fit on shared landmarks (body centreline, top of head, chin).
 */
export function frontToSaved(p: Point): Point {
  return { x: 0.5 + (p.x - 0.5) * 1.3, y: 0.078 + (p.y - 0.053) * 0.869 };
}

/** Name the region under a point on the front render. Patient left is the viewer's right. */
export function describeLocation({ x, y }: Point): string {
  const dx = x - 0.5;
  const side = Math.abs(dx) < 0.04 ? '' : dx > 0 ? 'Left' : 'Right';
  const sided = (part: string) => (side ? `${side} ${part}` : `Central ${part}`);

  if (y < 0.29) return side ? `${side} side of head` : 'Head';
  if (y < 0.37 && Math.abs(dx) < 0.06) return 'Neck';
  if (Math.abs(dx) > 0.17 && y > 0.42) return `${side} ${y < 0.62 ? 'upper arm' : 'forearm'}`;
  if (y < 0.44) return side ? `${side} anterior shoulder` : 'Upper chest';
  if (y < 0.59) return sided('chest');
  if (y < 0.7) return side ? `${side} upper abdomen` : 'Upper abdomen';
  if (y < 0.9) return side ? `${side} lower abdomen` : 'Lower abdomen';
  return side ? `${side} hip` : 'Pelvis';
}

/** Cover-fit an image of natural size `img` into a frame, like CSS object-fit: cover. */
export function coverRect(frame: { width: number; height: number }, img: { width: number; height: number }) {
  const scale = Math.max(frame.width / img.width, frame.height / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  return { left: (frame.width - width) / 2, top: (frame.height - height) / 2, width, height };
}
