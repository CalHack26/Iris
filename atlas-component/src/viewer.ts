import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  LAYERS,
  REGION_LABELS,
  type LayerId,
  isTranslucent,
  layerById,
  prettyName,
} from "./tokens";

export type FocusState = {
  region: string | null;
  detailed: boolean;
};

type ManifestFile = {
  lod0: string | null;
  lod1: Record<string, string>;
};

type Manifest = {
  regions: { id: string; label: string }[];
  files: Record<string, ManifestFile>;
  attribution?: string[];
};

type Lod0Entry = {
  layer: LayerId;
  region: string;
  object: THREE.Object3D;
};

type Hooks = {
  onReady: () => void;
  onProgress: (ratio: number) => void;
  onFocus: (focus: FocusState) => void;
  onPick: (name: string | null) => void;
  onError: (message: string) => void;
  onContextLost: () => void;
};

const ATLAS = (file: string) => new URL(`atlas/${file}`, document.baseURI).href;

export class AtlasViewer {
  readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera: THREE.PerspectiveCamera;
  private readonly controls: OrbitControls;
  private readonly loader = new GLTFLoader();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private readonly materials = new Map<string, THREE.MeshStandardMaterial>();
  private readonly lod0: Lod0Entry[] = [];
  private readonly regionBoxes = new Map<string, THREE.Box3>();
  private readonly lod1 = new Map<LayerId, THREE.Object3D>();
  private readonly pendingDetail = new Set<LayerId>();
  private readonly pointers = new Set<number>();
  private manifest: Manifest | null = null;
  private visible = new Set<LayerId>(["muscle"]);
  private detailDistance = 2.4;
  private home = { position: new THREE.Vector3(), target: new THREE.Vector3() };
  private loadedRegion: string | null = null;
  private wantedRegion: string | null = null;
  private wantedAt = 0;
  private loadToken = 0;
  private frame = 0;
  private alive = true;
  private running = true;
  private press: { x: number; y: number; pointer: number } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly hooks: Hooks,
  ) {
    const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      failIfMajorPerformanceCaveat: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, memory <= 4 ? 1 : 1.35));
    this.renderer.setClearColor(0xe7e1d6, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = false;

    this.scene.background = new THREE.Color(0xe7e1d6);
    this.scene.add(new THREE.HemisphereLight(0xf7f3ec, 0xc8b8a4, 1.15));
    const key = new THREE.DirectionalLight(0xfff8f0, 1.35);
    key.position.set(1.4, 2.6, 2.2);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xd9cfc3, 0.45);
    fill.position.set(-1.8, 1.2, -1.4);
    this.scene.add(fill);

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.05, 40);
    this.camera.position.set(0, 0.9, 3.1);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 0.7;
    this.controls.zoomToCursor = true;
    this.controls.minDistance = 0.32;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.96;
    this.controls.minPolarAngle = 0.12;
    this.controls.target.set(0, 0.85, 0);

    canvas.addEventListener("pointerdown", this.onPointerDown);
    canvas.addEventListener("pointerup", this.onPointerUp);
    canvas.addEventListener("pointercancel", this.onPointerUp);
    canvas.addEventListener("webglcontextlost", this.onContextLost, false);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.resize();
  }

  resize() {
    const width = this.canvas.clientWidth || 1;
    const height = this.canvas.clientHeight || 1;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  setVisible(layers: LayerId[]) {
    this.visible = new Set(layers.length ? layers : ["muscle"]);
    for (const layer of [...this.lod1.keys()]) {
      if (this.visible.has(layer)) continue;
      const root = this.lod1.get(layer);
      if (!root) continue;
      this.scene.remove(root);
      disposeGeometries(root);
      this.lod1.delete(layer);
    }
    this.applyVisibility();
    if (this.loadedRegion) void this.ensureDetail(this.loadedRegion, this.loadToken);
  }

  reset() {
    this.camera.position.copy(this.home.position);
    this.controls.target.copy(this.home.target);
    this.controls.update();
    this.hooks.onPick(null);
  }

  destroy() {
    this.alive = false;
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.loadToken += 1;
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointerup", this.onPointerUp);
    this.canvas.removeEventListener("pointercancel", this.onPointerUp);
    this.canvas.removeEventListener("webglcontextlost", this.onContextLost);
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.unloadDetail();
    for (const entry of this.lod0) disposeGeometries(entry.object);
    this.materials.forEach((material) => material.dispose());
    this.controls.dispose();
    this.renderer.dispose();
  }

  async start() {
    this.loop();
    let manifest: Manifest;
    try {
      const response = await fetch(ATLAS("manifest.json"));
      if (!response.ok) throw new Error(`manifest ${response.status}`);
      manifest = (await response.json()) as Manifest;
    } catch (error) {
      this.hooks.onError(error instanceof Error ? error.message : "Could not read the atlas.");
      return;
    }
    if (!this.alive) return;
    this.manifest = manifest;
    const jobs: Promise<void>[] = [];
    for (const layer of LAYERS) {
      const file = manifest.files[layer.id]?.lod0;
      if (file) jobs.push(this.loadLod0(layer.id, file));
    }
    if (!jobs.length) {
      this.hooks.onError("The atlas manifest has no body meshes.");
      return;
    }
    const total = jobs.length;
    let finished = 0;
    await Promise.all(
      jobs.map(async (job) => {
        await job;
        finished += 1;
        this.hooks.onProgress(finished / total);
      }),
    );
    if (!this.alive) return;
    if (!this.lod0.length) {
      this.hooks.onError("None of the body meshes could be loaded.");
      return;
    }
    this.fitCamera();
    this.applyVisibility();
    this.hooks.onReady();
    this.hooks.onFocus({ region: null, detailed: false });
  }

  private async loadLod0(layer: LayerId, file: string) {
    try {
      const gltf = await this.loader.loadAsync(ATLAS(file));
      if (!this.alive) {
        disposeGeometries(gltf.scene);
        return;
      }
      gltf.scene.updateMatrixWorld(true);
      gltf.scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        const region = regionOf(object) ?? "torso";
        object.userData.layer = layer;
        object.userData.region = region;
        object.userData.pickName = labelFor(object, region);
        this.lod0.push({ layer, region, object });
        const box = new THREE.Box3().setFromObject(object);
        const existing = this.regionBoxes.get(region);
        if (existing) existing.union(box);
        else this.regionBoxes.set(region, box);
      });
      this.scene.add(gltf.scene);
    } catch (error) {
      console.warn("lod0 failed", layer, error);
    }
  }

  private fitCamera() {
    const box = new THREE.Box3();
    for (const entry of this.lod0) box.expandByObject(entry.object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const radius = Math.max(size.x, size.y) * 0.5;
    const distance = radius / Math.tan((this.camera.fov * Math.PI) / 360) + size.z * 0.15;
    this.home.target.copy(center);
    this.home.position.set(center.x, center.y + size.y * 0.02, center.z + distance * 1.08);
    this.detailDistance = distance * 0.62;
    this.controls.minDistance = Math.max(0.22, size.y * 0.12);
    this.controls.maxDistance = distance * 2.4;
    this.reset();
    this.addGround(box);
  }

  private addGround(box: THREE.Box3) {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext("2d");
    if (!context) return;
    const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 64);
    gradient.addColorStop(0, "rgba(60, 48, 36, 0.28)");
    gradient.addColorStop(1, "rgba(60, 48, 36, 0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
    const size = Math.max(box.getSize(new THREE.Vector3()).x, 0.4) * 1.15;
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(size * 0.55, 48), material);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, box.min.y + 0.004, 0);
    shadow.renderOrder = 0;
    this.scene.add(shadow);
  }

  private loop = () => {
    if (!this.alive) return;
    this.frame = requestAnimationFrame(this.loop);
    if (!this.running) return;
    this.controls.update();
    this.updateDetail();
    this.renderer.render(this.scene, this.camera);
  };

  private updateDetail() {
    if (!this.manifest || !this.lod0.length) return;
    const distance = this.camera.position.distanceTo(this.controls.target);
    const region = distance < this.detailDistance ? this.regionAt(this.controls.target) : null;
    if (region !== this.wantedRegion) {
      this.wantedRegion = region;
      this.wantedAt = performance.now();
    }
    if (performance.now() - this.wantedAt < 320) return;
    if (region === this.loadedRegion) return;
    const token = ++this.loadToken;
    this.loadedRegion = region;
    this.unloadDetail();
    this.applyVisibility();
    const label = region ? (REGION_LABELS[region] ?? region) : null;
    this.hooks.onFocus({ region: label, detailed: region !== null });
    if (region) void this.ensureDetail(region, token);
  }

  private regionAt(point: THREE.Vector3): string | null {
    let best: { id: string; volume: number } | null = null;
    for (const [id, box] of this.regionBoxes) {
      if (!box.containsPoint(point)) continue;
      const size = box.getSize(new THREE.Vector3());
      const volume = size.x * size.y * size.z;
      if (!best || volume < best.volume) best = { id, volume };
    }
    if (best) return best.id;
    let nearest: { id: string; distance: number } | null = null;
    const clamped = new THREE.Vector3();
    for (const [id, box] of this.regionBoxes) {
      box.clampPoint(point, clamped);
      const distance = clamped.distanceTo(point);
      if (!nearest || distance < nearest.distance) nearest = { id, distance };
    }
    if (nearest && nearest.distance < 0.1) return nearest.id;
    return null;
  }

  private async ensureDetail(region: string, token: number) {
    if (!this.manifest) return;
    const pending = LAYERS.filter(
      (layer) => this.visible.has(layer.id) && !this.lod1.has(layer.id) && !this.pendingDetail.has(layer.id),
    );
    await Promise.all(
      pending.map(async (layer) => {
        const file = this.manifest?.files[layer.id]?.lod1?.[region];
        if (!file) return;
        this.pendingDetail.add(layer.id);
        try {
          const gltf = await this.loader.loadAsync(ATLAS(file));
          if (!this.alive || token !== this.loadToken || this.loadedRegion !== region || !this.visible.has(layer.id)) {
            disposeGeometries(gltf.scene);
            return;
          }
          gltf.scene.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            object.userData.layer = layer.id;
            object.userData.region = regionOf(object) ?? region;
            object.userData.pickName = labelFor(object, region);
          });
          this.lod1.set(layer.id, gltf.scene);
          this.scene.add(gltf.scene);
        } catch (error) {
          console.warn("lod1 failed", layer.id, region, error);
        } finally {
          this.pendingDetail.delete(layer.id);
        }
      }),
    );
    if (token === this.loadToken) this.applyVisibility();
  }

  private unloadDetail() {
    for (const root of this.lod1.values()) {
      this.scene.remove(root);
      disposeGeometries(root);
    }
    this.lod1.clear();
  }

  private applyVisibility() {
    for (const entry of this.lod0) {
      const covered = this.loadedRegion === entry.region && this.lod1.has(entry.layer);
      entry.object.visible = this.visible.has(entry.layer) && !covered;
      if (entry.object.visible) this.paint(entry.object, entry.layer);
    }
    for (const [layer, root] of this.lod1) {
      root.visible = this.visible.has(layer);
      if (root.visible) this.paint(root, layer);
    }
  }

  private paint(root: THREE.Object3D, layer: LayerId) {
    root.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const vertexColors = Boolean(mesh.geometry?.getAttribute("color"));
      mesh.material = this.materialFor(layer, vertexColors);
      mesh.renderOrder = ["bone", "organ", "muscle", "skin"].indexOf(layer) + 1;
      mesh.frustumCulled = true;
    });
  }

  private materialFor(layer: LayerId, vertexColors: boolean): THREE.MeshStandardMaterial {
    const translucent = isTranslucent(layer, this.visible);
    const key = `${layer}:${translucent ? "thin" : "solid"}:${vertexColors ? "vc" : "flat"}`;
    const existing = this.materials.get(key);
    if (existing) return existing;
    const spec = layerById(layer);
    const material = new THREE.MeshStandardMaterial({
      color: spec?.color ?? "#cccccc",
      roughness: spec?.roughness ?? 0.7,
      metalness: 0,
      side: THREE.DoubleSide,
      vertexColors,
      transparent: translucent,
      opacity: translucent ? 0.32 : 1,
      depthWrite: !translucent,
    });
    this.materials.set(key, material);
    return material;
  }

  private onPointerDown = (event: PointerEvent) => {
    this.pointers.add(event.pointerId);
    this.press = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
  };

  private onPointerUp = (event: PointerEvent) => {
    const press = this.press;
    this.pointers.delete(event.pointerId);
    this.press = null;
    if (!press || press.pointer !== event.pointerId || this.pointers.size > 0) return;
    const moved = Math.hypot(event.clientX - press.x, event.clientY - press.y);
    if (moved > 8) return;
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.scene.children, true);
    const hit = hits.find((item) => item.object.visible && (item.object as THREE.Mesh).isMesh && item.object.userData.pickName);
    this.hooks.onPick(hit ? String(hit.object.userData.pickName) : null);
  };

  private onVisibility = () => {
    this.running = document.visibilityState === "visible";
  };

  private onContextLost = (event: Event) => {
    event.preventDefault();
    this.running = false;
    this.hooks.onContextLost();
  };
}

function regionOf(object: THREE.Object3D): string | null {
  const direct = object.userData.atlas_region ?? object.parent?.userData.atlas_region;
  if (typeof direct === "string" && direct) return direct;
  const raw = String(object.userData.name || object.parent?.userData.name || "");
  if (!raw.includes("::")) return null;
  return raw.split("::")[1] || null;
}

function labelFor(object: THREE.Object3D, region: string): string {
  const original = String(object.userData.name || "");
  if (/^(skin|muscle|organ|bone)::/.test(original)) {
    return REGION_LABELS[region] ?? region;
  }
  const anatomy = object.userData.anatomy ?? object.parent?.userData.anatomy;
  if (typeof anatomy === "string" && anatomy) return prettyName(anatomy);
  return REGION_LABELS[region] ?? region;
}

function disposeGeometries(root: THREE.Object3D) {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry?.dispose();
  });
}
