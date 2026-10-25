import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import { Platform, StyleSheet } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { EMBEDDED_LOD0 } from '@/atlas/embedded';
import { atlasUrl, type AtlasFile } from '@/atlas/files';
import {
  ATLAS_ORDER as ORDER,
  partLabel,
  regionOf,
  selectedLayers,
  showDetail,
  showRegionChunk,
  type AtlasLayer,
} from '@/atlas/body-model';
import { meshLook, useRawWebglContext } from '@/atlas/web-view';
import type { BodyHit, BodyMark, Layer } from '@/lib/types';
import { colors } from '@/theme/tokens';

const COLOR: Record<AtlasLayer, string> = {
  skin: '#E0B494',
  muscle: '#B94A45',
  organ: '#C4895A',
  bone: '#E7DFD1',
};

const LOD0: Record<AtlasLayer, AtlasFile> = {
  skin: 'lod0-skin.glb',
  muscle: 'lod0-muscle.glb',
  organ: 'lod0-organ.glb',
  bone: 'lod0-bone.glb',
};

/** Closer meshes. Each one is a single structure, so a tap can light the humerus without the rest of the arm. */
const DETAIL: { layer: AtlasLayer; region: string; file: AtlasFile }[] = [
  { layer: 'skin', region: 'head', file: 'lod1-head-skin.glb' },
  { layer: 'muscle', region: 'head', file: 'lod1-head-muscle.glb' },
  { layer: 'organ', region: 'head', file: 'lod1-head-organ.glb' },
  { layer: 'bone', region: 'head', file: 'lod1-head-bone.glb' },
  { layer: 'skin', region: 'torso', file: 'lod1-torso-skin.glb' },
  { layer: 'muscle', region: 'torso', file: 'lod1-torso-muscle.glb' },
  { layer: 'organ', region: 'torso', file: 'lod1-torso-organ.glb' },
  { layer: 'bone', region: 'torso', file: 'lod1-torso-bone.glb' },
  { layer: 'skin', region: 'arm-left', file: 'lod1-arm-left-skin.glb' },
  { layer: 'muscle', region: 'arm-left', file: 'lod1-arm-left-muscle.glb' },
  { layer: 'bone', region: 'arm-left', file: 'lod1-arm-left-bone.glb' },
  { layer: 'skin', region: 'arm-right', file: 'lod1-arm-right-skin.glb' },
  { layer: 'muscle', region: 'arm-right', file: 'lod1-arm-right-muscle.glb' },
  { layer: 'bone', region: 'arm-right', file: 'lod1-arm-right-bone.glb' },
  { layer: 'skin', region: 'leg-left', file: 'lod1-leg-left-skin.glb' },
  { layer: 'muscle', region: 'leg-left', file: 'lod1-leg-left-muscle.glb' },
  { layer: 'organ', region: 'leg-left', file: 'lod1-leg-left-organ.glb' },
  { layer: 'bone', region: 'leg-left', file: 'lod1-leg-left-bone.glb' },
  { layer: 'skin', region: 'leg-right', file: 'lod1-leg-right-skin.glb' },
  { layer: 'muscle', region: 'leg-right', file: 'lod1-leg-right-muscle.glb' },
  { layer: 'bone', region: 'leg-right', file: 'lod1-leg-right-bone.glb' },
];

const B64 = (() => {
  const table = new Uint8Array(128);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < alphabet.length; i++) table[alphabet.charCodeAt(i)] = i;
  return table;
})();

function decodeBase64(input: string): ArrayBuffer {
  const clean = input.replace(/=+$/, '');
  const len = clean.length;
  const out = new Uint8Array((len * 3) >> 2);
  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const a = B64[clean.charCodeAt(i)];
    const b = B64[clean.charCodeAt(i + 1)];
    const c = i + 2 < len ? B64[clean.charCodeAt(i + 2)] : 0;
    const d = i + 3 < len ? B64[clean.charCodeAt(i + 3)] : 0;
    out[p++] = (a << 2) | (b >> 4);
    if (i + 2 < len) out[p++] = ((b & 15) << 4) | (c >> 2);
    if (i + 3 < len) out[p++] = ((c & 3) << 6) | d;
  }
  return out.buffer;
}

type Pose = { zoom: number; turn: number; scroll: number; slide: number; layers: AtlasLayer[] };

type MeshEntry = { layer: AtlasLayer; region: string; object: THREE.Object3D };
type DetailEntry = { layer: AtlasLayer; region: string; root: THREE.Object3D };

function isShown(object: THREE.Object3D): boolean {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (!current.visible) return false;
    current = current.parent;
  }
  return true;
}

/** The anatomy name a mesh carries (e.g. 'Humerus.l'), so saved marks name the structure, not the file chunk. */
function meshName(object: THREE.Object3D): string {
  let current: THREE.Object3D | null = object;
  while (current) {
    const anatomy = current.userData.anatomy;
    if (typeof anatomy === 'string' && anatomy) return anatomy;
    current = current.parent;
  }
  return object.name || regionOf(object);
}

const round = (n: number) => Math.round(n * 10000) / 10000;

export type BodyPicker = MutableRefObject<
  ((x: number, y: number, viewWidth: number, viewHeight: number) => BodyHit | null) | null
>;

export function AtlasBody({
  zoom,
  turn,
  scroll,
  slide = 0,
  layer,
  background,
  onReady,
  onError,
  visible,
  picker,
  pin,
}: {
  zoom: number;
  turn: number;
  scroll: number;
  slide?: number;
  layer: Layer;
  background: string;
  onReady?: () => void;
  onError?: (message: string) => void;
  visible: boolean;
  picker?: BodyPicker;
  /** A saved 3D mark to pin on the body. It stays on the tapped spot as the view turns and zooms. */
  pin?: BodyMark;
}) {
  const pose = useRef<Pose>({ zoom, turn, scroll, slide, layers: selectedLayers(layer) });
  pose.current = { zoom, turn, scroll, slide, layers: selectedLayers(layer) };
  const pinRef = useRef(pin);
  pinRef.current = pin;
  const alive = useRef(true);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const files = useRef<Partial<Record<AtlasFile, ArrayBuffer>>>({});
  const [readyToDraw, setReadyToDraw] = useState(false);

  useEffect(() => {
    alive.current = true;
    try {
      for (const atlasLayer of ORDER) {
        const file = LOD0[atlasLayer];
        const packed = EMBEDDED_LOD0[file];
        if (!packed) throw new Error(`Missing ${file}`);
        files.current[file] = decodeBase64(packed);
      }
      setReadyToDraw(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The body model did not load.';
      console.warn('atlas load failed', error);
      onErrorRef.current?.(message);
    }
    return () => {
      alive.current = false;
    };
  }, []);

  const onContextCreate = async (gl: ExpoWebGLRenderingContext) => {
    const webgl = gl as unknown as WebGL2RenderingContext;
    const width = gl.drawingBufferWidth || webgl.canvas?.width || 1;
    const height = gl.drawingBufferHeight || webgl.canvas?.height || 1;
    let renderer: THREE.WebGLRenderer;
    if (useRawWebglContext(Platform.OS)) {
      renderer = new THREE.WebGLRenderer({
        canvas: webgl.canvas as HTMLCanvasElement,
        context: webgl,
        antialias: true,
        alpha: true,
      });
    } else {
      const canvas = {
        width,
        height,
        style: {},
        addEventListener: () => {},
        removeEventListener: () => {},
        clientWidth: width,
        clientHeight: height,
        getContext: () => gl,
      };
      const attributes = {
        alpha: true,
        antialias: true,
        depth: true,
        failIfMajorPerformanceCaveat: false,
        powerPreference: 'default' as const,
        premultipliedAlpha: true,
        preserveDrawingBuffer: false,
        stencil: true,
        desynchronized: false,
      };
      const readAttributes = gl.getContextAttributes?.bind(gl);
      gl.getContextAttributes = () => ({ ...attributes, ...(readAttributes?.() ?? {}) });
      // Expo Go's context is marked WebGL 1. Three r170 rejects that class.
      // Forward the methods, but report a prototype Three will accept.
      const context = new Proxy(gl, {
        getPrototypeOf() {
          return Object.prototype;
        },
        get(target, prop) {
          const value = Reflect.get(target, prop, target);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      const WebGL1 = globalThis.WebGLRenderingContext;
      const previousHasInstance = WebGL1
        ? Object.getOwnPropertyDescriptor(WebGL1, Symbol.hasInstance)
        : undefined;
      if (WebGL1) {
        Object.defineProperty(WebGL1, Symbol.hasInstance, {
          configurable: true,
          value: () => false,
        });
      }
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvas as unknown as HTMLCanvasElement,
          context: context as unknown as WebGLRenderingContext,
          antialias: true,
          alpha: true,
        });
      } finally {
        if (WebGL1) {
          if (previousHasInstance) Object.defineProperty(WebGL1, Symbol.hasInstance, previousHasInstance);
          else delete WebGL1[Symbol.hasInstance];
        }
      }
    }
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.setClearColor(new THREE.Color(background), 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xf7f3ec, 0xc8b8a4, 1.15));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.35);
    key.position.set(1.4, 2.6, 2.2);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xd9cfc3, 0.45);
    fill.position.set(-1.8, 1.2, -1.4);
    scene.add(fill);

    const camera = new THREE.PerspectiveCamera(34, width / Math.max(height, 1), 0.05, 40);
    const entries: MeshEntry[] = [];
    const detail: DetailEntry[] = [];
    const materials = new Map<string, THREE.MeshStandardMaterial>();
    let selectedMesh: THREE.Mesh | null = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    if (picker) {
      picker.current = (x, y, viewWidth, viewHeight) => {
        if (viewWidth <= 0 || viewHeight <= 0) return null;
        pointer.x = (x / viewWidth) * 2 - 1;
        pointer.y = -(y / viewHeight) * 2 + 1;
        raycaster.setFromCamera(pointer, camera);
        const hits = raycaster.intersectObjects(scene.children, true);
        const hit = hits.find(
          (item) => (item.object as THREE.Mesh).isMesh && !item.object.userData.pin && isShown(item.object),
        );
        selectedMesh = hit ? (hit.object as THREE.Mesh) : null;
        if (!hit) return null;
        // The body's roots are never moved (the camera is), so world space is the model's own space.
        const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : null;
        // Materials are double-sided, so a hit can land on a back face; point the normal back toward the viewer.
        if (normal && normal.dot(raycaster.ray.direction) > 0) normal.negate();
        return {
          label: partLabel(hit.object),
          mark: {
            mesh: meshName(hit.object),
            point: { x: round(hit.point.x), y: round(hit.point.y), z: round(hit.point.z) },
            ...(normal ? { normal: { x: round(normal.x), y: round(normal.y), z: round(normal.z) } } : {}),
          },
        };
      };
    }

    // Saved-mark pin: a marker dot with a white rim, drawn over the body so a mark on a deeper layer still shows.
    const pinGroup = new THREE.Group();
    const pinDot = (color: string, radius: number, order: number) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 16, 12),
        new THREE.MeshBasicMaterial({ color, depthTest: false, depthWrite: false, transparent: true }),
      );
      dot.renderOrder = order;
      dot.userData.pin = true;
      return dot;
    };
    pinGroup.add(pinDot(colors.white, 1.45, 998), pinDot(colors.marker, 1, 999));
    pinGroup.visible = false;
    scene.add(pinGroup);
    let pinRadius = 0.012;
    const lift = new THREE.Vector3();
    const placePin = () => {
      const mark = pinRef.current;
      pinGroup.visible = Boolean(mark);
      if (!mark) return;
      pinGroup.position.set(mark.point.x, mark.point.y, mark.point.z);
      if (mark.normal) pinGroup.position.add(lift.set(mark.normal.x, mark.normal.y, mark.normal.z).multiplyScalar(pinRadius));
      // Keep the pin about the same size on screen as the camera zooms in.
      pinGroup.scale.setScalar(pinRadius / Math.max(pose.current.zoom, 1));
    };

    const paint = (root: THREE.Object3D, atlasLayer: AtlasLayer, visible: ReadonlySet<AtlasLayer>) => {
      const deeper = ORDER.slice(ORDER.indexOf(atlasLayer) + 1).some((item) => visible.has(item));
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const vertexColors = Boolean(mesh.geometry?.getAttribute('color'));
        const keyName = `${atlasLayer}:${deeper}:${vertexColors}`;
        let material = materials.get(keyName);
        if (!material) {
          material = new THREE.MeshStandardMaterial({
            color: vertexColors ? '#ffffff' : COLOR[atlasLayer],
            vertexColors,
            roughness: atlasLayer === 'bone' ? 0.84 : 0.62,
            metalness: 0,
            side: THREE.DoubleSide,
            transparent: deeper,
            opacity: deeper ? 0.32 : 1,
            depthWrite: !deeper,
          });
          if (vertexColors && atlasLayer === 'skin') material.color.set(COLOR.skin);
          materials.set(keyName, material);
        }
        mesh.material = material;
        const look = meshLook(Boolean(selectedMesh), mesh === selectedMesh);
        if (look.kind === 'dim') {
          const dimKey = `${keyName}:dim`;
          let dim = materials.get(dimKey);
          if (!dim) {
            dim = material.clone();
            dim.transparent = true;
            dim.opacity = look.opacity;
            dim.depthWrite = false;
            materials.set(dimKey, dim);
          }
          mesh.material = dim;
        } else if (look.kind === 'highlight') {
          let highlight = mesh.userData.hi as THREE.MeshStandardMaterial | undefined;
          if (!highlight || highlight.userData.source !== material.uuid) {
            highlight = material.clone();
            highlight.color.set(look.color);
            highlight.emissive.set(look.emissive);
            highlight.emissiveIntensity = look.intensity;
            highlight.opacity = look.opacity;
            highlight.transparent = false;
            highlight.depthWrite = true;
            highlight.userData.source = material.uuid;
            mesh.userData.hi = highlight;
          }
          mesh.material = highlight;
        }
        mesh.frustumCulled = true;
      });
    };

    const apply = () => {
      const visible = new Set(pose.current.layers);
      const covered = (atlasLayer: AtlasLayer, region: string) =>
        detail.some((item) => item.layer === atlasLayer && item.region === region);
      for (const entry of entries) {
        entry.object.visible = showRegionChunk(
          pose.current.zoom,
          visible.has(entry.layer),
          covered(entry.layer, entry.region),
        );
        if (entry.object.visible) paint(entry.object, entry.layer, visible);
      }
      for (const item of detail) {
        item.root.visible = showDetail(pose.current.zoom, visible.has(item.layer));
        if (item.root.visible) paint(item.root, item.layer, visible);
      }
    };

    let frame = 0;
    const home = {
      center: new THREE.Vector3(0, 0.9, 0),
      distance: 3.1,
      above: 0.95,
      below: 0.7,
      side: 0.8,
    };

    const frameCamera = () => {
      const { zoom: level, turn: yaw, scroll: lift, slide: across } = pose.current;
      const distance = home.distance / Math.max(level, 0.4);
      const rad = THREE.MathUtils.degToRad(yaw);
      const shift = lift >= 0 ? lift * home.above : lift * home.below;
      const y = home.center.y + shift;
      // Same world distance per swipe as the vertical move, so the body follows the finger.
      const side = -across * home.side;
      const x = home.center.x + side * Math.cos(rad);
      const depth = home.center.z - side * Math.sin(rad);
      camera.position.set(x + Math.sin(rad) * distance, y, depth + Math.cos(rad) * distance);
      camera.lookAt(x, y, depth);
    };

    const loop = () => {
      if (!alive.current) return;
      frame = requestAnimationFrame(loop);
      apply();
      placePin();
      frameCamera();
      renderer.render(scene, camera);
      gl.endFrameEXP();
    };
    loop();

    const loader = new GLTFLoader();
    const load = async (file: AtlasFile) => {
      let buffer = files.current[file];
      if (!buffer) {
        const response = await fetch(atlasUrl(file));
        if (!response.ok) throw new Error(`Could not load ${file}`);
        buffer = await response.arrayBuffer();
        files.current[file] = buffer;
      }
      const bytes = buffer;
      return await new Promise<THREE.Group>((resolve, reject) => {
        loader.parse(bytes, '', (gltf) => resolve(gltf.scene), reject);
      });
    };

    try {
      for (const atlasLayer of ORDER) {
        const root = await load(LOD0[atlasLayer]);
        if (!alive.current) return;
        root.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.userData.regionChunk = true;
          const region = regionOf(object);
          entries.push({ layer: atlasLayer, region, object });
        });
        scene.add(root);
      }
      const box = new THREE.Box3();
      for (const entry of entries) box.expandByObject(entry.object);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = Math.max(size.x, size.y) * 0.5;
      home.center.copy(center);
      home.distance = radius / Math.tan((camera.fov * Math.PI) / 360) + size.z * 0.15;
      const half = size.y * 0.5;
      home.above = half + size.y * 0.42;
      home.below = half + size.y * 0.12;
      home.side = (home.above + home.below) / 2;
      pinRadius = size.y * 0.008;
      frameCamera();
      onReady?.();

      try {
        for (const item of DETAIL) {
          try {
            const root = await load(item.file);
            if (!alive.current) return;
            root.visible = false;
            detail.push({ layer: item.layer, region: item.region, root });
            scene.add(root);
          } catch (error) {
            console.warn('atlas detail load failed', item.file, error);
          }
        }
      } catch (error) {
        console.warn('atlas detail load failed', error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The body model did not load.';
      console.warn('atlas load failed', error);
      onError?.(message);
    }
  };

  if (!readyToDraw) return null;

  return (
    <GLView
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onContextCreate={onContextCreate}
    />
  );
}
