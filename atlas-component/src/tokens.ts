export type LayerId = "skin" | "muscle" | "organ" | "bone";

export type LayerSpec = {
  id: LayerId;
  label: string;
  color: string;
  roughness: number;
};

/** Outside to inside. A layer turns translucent when anything inside it is on. */
export const LAYERS: LayerSpec[] = [
  { id: "skin", label: "Skin", color: "#E0B494", roughness: 0.78 },
  { id: "muscle", label: "Muscle", color: "#B94A45", roughness: 0.58 },
  { id: "organ", label: "Organs", color: "#C4895A", roughness: 0.62 },
  { id: "bone", label: "Bone", color: "#E7DFD1", roughness: 0.84 },
];

export const REGION_LABELS: Record<string, string> = {
  head: "Head",
  torso: "Torso",
  "arm-left": "Left arm",
  "arm-right": "Right arm",
  "leg-left": "Left leg",
  "leg-right": "Right leg",
};

export function layerById(id: string): LayerSpec | undefined {
  return LAYERS.find((layer) => layer.id === id);
}

export function isTranslucent(layer: LayerId, visible: ReadonlySet<LayerId>): boolean {
  const order = LAYERS.map((item) => item.id);
  const index = order.indexOf(layer);
  return order.slice(index + 1).some((deeper) => visible.has(deeper));
}

const LAYER_IDS = new Set(LAYERS.map((layer) => layer.id));

export function prettyName(raw: string): string {
  const source = (raw.split("/").pop() ?? raw).replace(/\.\d{3}$/, "");
  if (source.includes("::")) {
    const [prefix, rest] = source.split("::");
    if (LAYER_IDS.has(prefix as LayerId) && rest && REGION_LABELS[rest]) {
      return REGION_LABELS[rest];
    }
    return labelAnatomy(rest || source);
  }
  return labelAnatomy(source);
}

function labelAnatomy(source: string): string {
  const side = source.match(/\.(l|r)$/i);
  const base = source
    .replace(/\.(l|r|ol|or|el|er|e\d+[lr]|o\d+[lr])$/i, "")
    .replace(/[()]/g, "")
    .replace(/[_]+/g, " ")
    .trim();
  if (!side) return base;
  return `${base} · ${side[1].toLowerCase() === "l" ? "Left" : "Right"}`;
}
