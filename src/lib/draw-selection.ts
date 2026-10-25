type Listener = () => void;

let part: string | null = null;
let drawMode = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeDraw(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDrawnPart() {
  return part;
}

export function getDrawMode() {
  return drawMode;
}

/** Light this part. Kept off the symptom mark, so Mark does not inherit it. */
export function selectDrawn(name: string) {
  part = name;
  emit();
}

export function clearDrawn() {
  if (part == null) return;
  part = null;
  emit();
}

export function setDrawMode(on: boolean) {
  if (drawMode === on) return;
  drawMode = on;
  emit();
}
