export const ATLAS_ORDER = ['skin', 'muscle', 'organ', 'bone'] as const;
export type AtlasLayer = (typeof ATLAS_ORDER)[number];

/** Zoom at which a loaded region swaps from one chunk to its separate parts. */
export const CLOSE_ZOOM = 1.2;

export type AnatomyNode = {
  name?: string;
  userData: {
    atlas_region?: unknown;
    name?: unknown;
    regionChunk?: unknown;
    anatomy?: unknown;
  };
  parent?: unknown;
};

function parentOf(object: AnatomyNode): AnatomyNode | null {
  const parent = object.parent;
  if (!parent || typeof parent !== 'object') return null;
  return parent as AnatomyNode;
}

const REGION_LABELS: Record<string, string> = {
  head: 'Head',
  torso: 'Torso',
  'arm-left': 'Left arm',
  'arm-right': 'Right arm',
  'leg-left': 'Left leg',
  'leg-right': 'Right leg',
};

export function selectedLayers(layer: 'skin' | 'muscles' | 'bones'): AtlasLayer[] {
  if (layer === 'skin') return ['skin'];
  if (layer === 'bones') return ['bone'];
  return ['muscle', 'organ'];
}

/** The joined region stays up until a close zoom has that region's separate parts. */
export function showRegionChunk(zoom: number, layerOn: boolean, detailLoaded: boolean): boolean {
  return layerOn && !(zoom >= CLOSE_ZOOM && detailLoaded);
}

export function showDetail(zoom: number, layerOn: boolean): boolean {
  return zoom >= CLOSE_ZOOM && layerOn;
}

export function regionOf(object: AnatomyNode): string {
  let current: AnatomyNode | null = object;
  while (current) {
    const direct = current.userData.atlas_region;
    if (typeof direct === 'string' && direct) return direct;
    const raw = String(current.name || current.userData.name || '');
    const match = raw.match(/(?:skin|muscle|organ|bone)::(.+)$/);
    if (match?.[1]) return match[1];
    current = parentOf(current);
  }
  return 'body';
}

/** Far meshes are one piece per region. Their anatomy name is only a sample, not the whole shape. */
export function partLabel(object: AnatomyNode): string {
  let current: AnatomyNode | null = object;
  while (current) {
    if (current.userData.regionChunk) {
      const region = regionOf(current);
      return REGION_LABELS[region] ?? region;
    }
    const anatomy = current.userData.anatomy;
    if (typeof anatomy === 'string' && anatomy) return prettyAnatomy(anatomy);
    current = parentOf(current);
  }
  const region = regionOf(object);
  return REGION_LABELS[region] ?? 'Body';
}

export function prettyAnatomy(anatomy: string): string {
  const side = anatomy.match(/\.(l|r)$/i);
  const base = anatomy
    .replace(/\.(l|r|ol|or|el|er)$/i, '')
    .replace(/[()]/g, '')
    .trim();
  if (!side) return base;
  return `${base} · ${side[1].toLowerCase() === 'l' ? 'Left' : 'Right'}`;
}
