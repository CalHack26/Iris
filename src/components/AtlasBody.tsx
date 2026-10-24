import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { EMBEDDED_LOD0 } from '@/atlas/embedded';
import { atlasUrl, type AtlasFile } from '@/atlas/files';
import type { Layer } from '@/lib/types';

const ORDER = ['skin', 'muscle', 'organ', 'bone'] as const;
type AtlasLayer = (typeof ORDER)[number];

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

/** Closer mesh for the middle of the body. Arms and the right leg have no organ detail. */
const TORSO_DETAIL: Partial<Record<AtlasLayer, AtlasFile>> = {
  skin: 'lod1-torso-skin.glb',
  muscle: 'lod1-torso-muscle.glb',
  organ: 'lod1-torso-organ.glb',
  bone: 'lod1-torso-bone.glb',
};

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

function selectedLayers(layer: Layer): AtlasLayer[] {
  if (layer === 'skin') return ['skin'];
  if (layer === 'bones') return ['bone'];
  return ['muscle', 'organ'];
}

type Pose = { zoom: number; turn: number; layers: AtlasLayer[] };

type MeshEntry = { layer: AtlasLayer; region: string; object: THREE.Object3D };

function regionOf(object: THREE.Object3D): string {
  const direct = object.userData.atlas_region ?? object.parent?.userData?.atlas_region;
  if (typeof direct === 'string' && direct) return direct;
  const raw = String(object.userData.name || object.name || '');
  const match = raw.match(/(?:skin|muscle|organ|bone)::(.+)$/);
  return match?.[1] ?? 'body';
}

export function AtlasBody({
  zoom,
  turn,
  layer,
  background,
  onReady,
  onError,
  visible,
}: {
  zoom: number;
  turn: number;
  layer: Layer;
  background: string;
  onReady?: () => void;
  onError?: (message: string) => void;
  visible: boolean;
}) {
  const pose = useRef<Pose>({ zoom, turn, layers: selectedLayers(layer) });
  pose.current = { zoom, turn, layers: selectedLayers(layer) };
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
    const width = gl.drawingBufferWidth;
    const height = gl.drawingBufferHeight;
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
    let renderer: THREE.WebGLRenderer;
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
    const detail = new Map<AtlasLayer, THREE.Object3D>();
    const materials = new Map<string, THREE.MeshStandardMaterial>();

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
        mesh.frustumCulled = true;
      });
    };

    const apply = () => {
      const visible = new Set(pose.current.layers);
      const close = pose.current.zoom >= 1.55;
      for (const entry of entries) {
        const covered = close && entry.region === 'torso' && detail.has(entry.layer);
        entry.object.visible = visible.has(entry.layer) && !covered;
        if (entry.object.visible) paint(entry.object, entry.layer, visible);
      }
      for (const [atlasLayer, root] of detail) {
        root.visible = close && visible.has(atlasLayer);
        if (root.visible) paint(root, atlasLayer, visible);
      }
    };

    let frame = 0;
    const home = { center: new THREE.Vector3(0, 0.9, 0), distance: 3.1 };

    const frameCamera = () => {
      const { zoom: z, turn: yaw } = pose.current;
      const distance = home.distance / Math.max(z, 0.4);
      const rad = THREE.MathUtils.degToRad(yaw);
      camera.position.set(
        home.center.x + Math.sin(rad) * distance,
        home.center.y,
        home.center.z + Math.cos(rad) * distance,
      );
      camera.lookAt(home.center);
    };

    const loop = () => {
      if (!alive.current) return;
      frame = requestAnimationFrame(loop);
      apply();
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
      frameCamera();
      onReady?.();

      try {
        await Promise.all(
          ORDER.map(async (atlasLayer) => {
            const file = TORSO_DETAIL[atlasLayer];
            if (!file) return;
            const root = await load(file);
            if (!alive.current) return;
            root.visible = false;
            detail.set(atlasLayer, root);
            scene.add(root);
          }),
        );
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
