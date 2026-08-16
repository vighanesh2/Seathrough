import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  STRUCTURE_BY_ID,
  structuresForReveal,
} from "@/lib/anatomy/registry";
import {
  cardiacPhaseAt,
  valveStateForPhase,
} from "@/lib/anatomy/physiology";
import type {
  AnatomyAnimationMode,
  AnatomySceneHandle,
  AnatomySceneSnapshot,
  AnatomySceneState,
  AnatomyStructureId,
} from "@/lib/anatomy/types";

const MODEL_ROOT = "/models/cardiopulmonary";
const DEOXYGENATED = new THREE.Color(0x2563eb);
const OXYGENATED = new THREE.Color(0xef4444);
const AIR = new THREE.Color(0x22d3ee);
const HIGHLIGHT = new THREE.Color(0xfbbf24);

type Progress = (value: number) => void;

type LoadedModels = {
  heart: THREE.Group;
  lungs: THREE.Group;
  bronchi: THREE.Group;
};

type FlowParticle = {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  offset: number;
  speed: number;
  oxygenated: boolean;
};

const FOCUS_TARGETS: Partial<
  Record<
    AnatomyStructureId,
    { position: [number, number, number]; target: [number, number, number] }
  >
> = {
  heart: { position: [3.5, 2.2, 5.4], target: [0.15, 0, 0.75] },
  "right-atrium": { position: [2.3, 1.5, 4], target: [-0.35, 0.42, 1] },
  "tricuspid-valve": { position: [2.1, 1.1, 3.6], target: [-0.28, 0, 1.08] },
  "right-ventricle": { position: [2.4, 0.4, 4], target: [-0.25, -0.45, 1] },
  "pulmonary-valve": { position: [2.2, 1.6, 3.8], target: [-0.15, 0.55, 1] },
  "pulmonary-trunk": { position: [2.7, 2.4, 4.3], target: [-0.1, 0.85, 0.7] },
  "right-pulmonary-artery": { position: [-4, 1.8, 3.5], target: [-1.1, 0.55, 0] },
  "left-pulmonary-artery": { position: [4, 1.8, 3.5], target: [1.1, 0.55, 0] },
  "right-lung": { position: [-4.6, 2.4, 4.6], target: [-1.05, 0, -0.45] },
  "left-lung": { position: [4.6, 2.4, 4.6], target: [1.05, 0, -0.45] },
  alveoli: { position: [4.2, 0.2, 3.3], target: [2.25, -0.45, 0.4] },
  "right-pulmonary-veins": { position: [-3.8, 1.1, 3.6], target: [-0.8, 0.2, 0.4] },
  "left-pulmonary-veins": { position: [3.8, 1.1, 3.6], target: [0.8, 0.2, 0.4] },
  "left-atrium": { position: [-2.4, 1.6, 4], target: [0.35, 0.4, 0.9] },
  "mitral-valve": { position: [-2.2, 1.1, 3.7], target: [0.3, 0, 1.05] },
  "left-ventricle": { position: [-2.5, 0.3, 4.2], target: [0.32, -0.45, 1] },
  "aortic-valve": { position: [-2.3, 1.6, 3.9], target: [0.22, 0.55, 1.05] },
  aorta: { position: [-2.8, 2.8, 4.3], target: [0.4, 1.25, 0.7] },
  "superior-vena-cava": { position: [2.8, 2.8, 4.2], target: [-0.55, 1.25, 0.8] },
  "inferior-vena-cava": { position: [2.8, -2.1, 4.1], target: [-0.5, -1.05, 0.9] },
  trachea: { position: [3.6, 3.2, 4.8], target: [0, 1.6, -0.1] },
  "main-bronchi": { position: [3.7, 2.2, 4.6], target: [0, 0.75, -0.3] },
  diaphragm: { position: [3.8, -2.4, 4.6], target: [0, -1.55, -0.35] },
};

function normalizeModel(group: THREE.Group): THREE.Group {
  const scale = 14;
  group.scale.setScalar(scale);
  group.position.set(0, -0.48 * scale, 0.03 * scale);
  return group;
}

function modelStructure(name: string): AnatomyStructureId | null {
  const n = name.toLowerCase();
  if (n.includes("mitral_valve")) return "mitral-valve";
  if (n.includes("tricuspid_valve")) return "tricuspid-valve";
  if (n.includes("aortic_valve")) return "aortic-valve";
  if (n.includes("pulmonary_valve")) return "pulmonary-valve";
  if (n.includes("left_cardiac_atrium")) return "left-atrium";
  if (n.includes("right_cardiac_atrium")) return "right-atrium";
  if (n.includes("left_ventricle")) return "left-ventricle";
  if (n.includes("right_ventricle")) return "right-ventricle";
  if (n.includes("main_bronch") || n.includes("main bronch")) {
    return "main-bronchi";
  }
  if (n.includes("_left_") || n.includes("_l") || n.endsWith("_l")) {
    return "left-lung";
  }
  if (n.includes("_right_") || n.includes("_r") || n.endsWith("_r")) {
    return "right-lung";
  }
  return null;
}

async function loadModels(onProgress?: Progress): Promise<LoadedModels> {
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_url, loaded, total) => {
    onProgress?.(total > 0 ? loaded / total : 0);
  };
  const loader = new GLTFLoader(manager);
  const [heart, lungs, bronchi] = await Promise.all([
    loader.loadAsync(`${MODEL_ROOT}/heart-male-v1.2.glb`),
    loader.loadAsync(`${MODEL_ROOT}/lung-male-v1.3.glb`),
    loader.loadAsync(`${MODEL_ROOT}/main-bronchus-male-v1.0.glb`),
  ]);
  onProgress?.(1);
  return {
    heart: normalizeModel(heart.scene),
    lungs: normalizeModel(lungs.scene),
    bronchi: normalizeModel(bronchi.scene),
  };
}

function tube(
  points: THREE.Vector3[],
  color: THREE.ColorRepresentation,
  radius = 0.055,
): { mesh: THREE.Mesh; curve: THREE.CatmullRomCurve3 } {
  const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.25);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 36, radius, 8, false),
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.82,
      roughness: 0.38,
    }),
  );
  return { mesh, curve };
}

function createValve(
  position: THREE.Vector3,
  color: THREE.ColorRepresentation,
  structure: AnatomyStructureId,
): THREE.Group {
  const group = new THREE.Group();
  group.position.copy(position);
  group.userData.structureId = structure;
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.018, 8, 24),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.12,
    }),
  );
  const leafletMaterial = new THREE.MeshStandardMaterial({
    color: 0xfecdd3,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const leafletA = new THREE.Mesh(
    new THREE.CircleGeometry(0.095, 16, 0, Math.PI),
    leafletMaterial,
  );
  const leafletB = leafletA.clone();
  leafletB.rotation.z = Math.PI;
  leafletA.userData.leaflet = true;
  leafletB.userData.leaflet = true;
  group.add(ring, leafletA, leafletB);
  return group;
}

function createAlveoli(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(2.25, -0.45, 0.4);
  group.userData.structureId = "alveoli";
  const material = new THREE.MeshPhysicalMaterial({
    color: 0xfda4af,
    transparent: true,
    opacity: 0.55,
    roughness: 0.55,
    transmission: 0.12,
  });
  for (let i = 0; i < 14; i += 1) {
    const a = (i / 14) * Math.PI * 2;
    const r = i % 3 === 0 ? 0.27 : 0.19;
    const sac = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 14, 12),
      material,
    );
    sac.position.set(
      Math.cos(a) * r,
      Math.sin(a) * r,
      Math.sin(a * 2) * 0.09,
    );
    sac.userData.alveolusSac = true;
    group.add(sac);
  }
  const capillary = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.31, 0.018, 72, 7, 2, 3),
    new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xdc2626,
      emissiveIntensity: 0.18,
    }),
  );
  capillary.scale.z = 0.42;
  group.add(capillary);

  for (let i = 0; i < 12; i += 1) {
    const oxygen = i % 2 === 0;
    const particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 7, 6),
      new THREE.MeshBasicMaterial({ color: oxygen ? 0x22d3ee : 0x64748b }),
    );
    const a = (i / 12) * Math.PI * 2;
    particle.userData.gasParticle = true;
    particle.userData.oxygen = oxygen;
    particle.userData.phase = i / 12;
    particle.userData.from = new THREE.Vector3(
      Math.cos(a) * (oxygen ? 0.1 : 0.32),
      Math.sin(a) * (oxygen ? 0.1 : 0.32),
      0.08,
    );
    particle.userData.to = new THREE.Vector3(
      Math.cos(a) * (oxygen ? 0.32 : 0.1),
      Math.sin(a) * (oxygen ? 0.32 : 0.1),
      -0.03,
    );
    group.add(particle);
  }
  return group;
}

function createDiaphragm(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(
    1.8,
    40,
    16,
    0,
    Math.PI * 2,
    0,
    Math.PI / 2.7,
  );
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshPhysicalMaterial({
      color: 0x7c3aed,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      roughness: 0.8,
    }),
  );
  mesh.position.set(0, -1.72, -0.35);
  mesh.rotation.x = Math.PI;
  mesh.scale.z = 0.35;
  mesh.userData.structureId = "diaphragm";
  return mesh;
}

function createTrachea(): THREE.Group {
  const group = new THREE.Group();
  group.userData.structureId = "trachea";
  const material = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.58,
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.14, 1.45, 18, 1, true),
    material,
  );
  stem.position.set(0, 1.55, -0.22);
  group.add(stem);
  for (let i = 0; i < 9; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.135, 0.015, 6, 20),
      material,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.9 + i * 0.16, -0.22);
    group.add(ring);
  }
  return group;
}

function animationRelevant(
  mode: AnatomyAnimationMode,
  kind: "blood" | "air" | "alveoli",
): boolean {
  if (mode === "overview" || mode === "cardiac-cycle") return kind !== "alveoli";
  if (mode === "pulmonary-circulation" || mode === "systemic-outflow") {
    return kind === "blood";
  }
  if (mode === "ventilation") return kind === "air";
  return kind === "air" || kind === "alveoli";
}

function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) value.dispose();
      }
      material.dispose();
    }
  });
}

export async function loadCardiopulmonaryScene(
  initial: Partial<AnatomySceneState> = {},
  onProgress?: Progress,
): Promise<AnatomySceneHandle> {
  const models = await loadModels(onProgress);
  const root = new THREE.Group();
  root.name = "cardiopulmonary";

  const state: AnatomySceneState = {
    reveal: initial.reveal ?? 6,
    selectedStructure: initial.selectedStructure ?? null,
    focusedStructures: initial.focusedStructures ?? [],
    animationMode: initial.animationMode ?? "overview",
    playing: initial.playing ?? true,
    speed: initial.speed ?? 1,
    reducedMotion: initial.reducedMotion ?? false,
  };

  const pickables: THREE.Object3D[] = [];
  const structureMaterials = new Map<
    AnatomyStructureId,
    THREE.MeshStandardMaterial[]
  >();
  const structureObjects = new Map<AnatomyStructureId, THREE.Object3D[]>();
  const sourceGroups = [models.heart, models.lungs, models.bronchi];
  const heartBaseScale = models.heart.scale.clone();
  const lungsBaseScale = models.lungs.scale.clone();
  const bronchiBaseScale = models.bronchi.scale.clone();

  for (const group of sourceGroups) {
    group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      const structure =
        modelStructure(object.name) ??
        (group === models.heart
          ? "heart"
          : group === models.bronchi
            ? "main-bronchi"
            : null);
      if (!structure) return;
      object.userData.structureId = structure;
      object.material = new THREE.MeshStandardMaterial({
        color:
          structure.includes("lung")
            ? 0xf59eaa
            : structure.includes("valve")
              ? 0xfecdd3
              : structure === "main-bronchi"
                ? 0xfbbf24
                : 0xb91c1c,
        vertexColors: false,
        transparent: true,
        opacity: structure.includes("lung") ? 0.3 : 0.76,
        roughness: 0.55,
        metalness: 0,
        side: THREE.DoubleSide,
        depthWrite: !structure.includes("lung"),
      });
      const list = structureMaterials.get(structure) ?? [];
      list.push(object.material);
      structureMaterials.set(structure, list);
      const objects = structureObjects.get(structure) ?? [];
      objects.push(object);
      structureObjects.set(structure, objects);
      pickables.push(object);
    });
  }

  root.add(models.lungs, models.bronchi, models.heart);

  const bloodLayer = new THREE.Group();
  const airLayer = new THREE.Group();
  const overlayLayer = new THREE.Group();
  root.add(bloodLayer, airLayer, overlayLayer);

  const bloodSegments = [
    {
      id: "superior-vena-cava" as const,
      oxygenated: false,
      points: [[-0.55, 2, 0.8], [-0.52, 1.2, 0.9], [-0.35, 0.45, 1.05]],
    },
    {
      id: "inferior-vena-cava" as const,
      oxygenated: false,
      points: [[-0.5, -1.8, 0.85], [-0.48, -0.6, 0.95], [-0.35, 0.4, 1.05]],
    },
    {
      id: "right-ventricle" as const,
      oxygenated: false,
      points: [[-0.35, 0.38, 1.06], [-0.3, -0.15, 1.18], [-0.2, -0.55, 1.12]],
    },
    {
      id: "pulmonary-trunk" as const,
      oxygenated: false,
      points: [[-0.2, -0.5, 1.12], [-0.15, 0.35, 1.22], [-0.08, 0.95, 0.75]],
    },
    {
      id: "right-pulmonary-artery" as const,
      oxygenated: false,
      points: [[-0.08, 0.92, 0.75], [-0.75, 0.82, 0.2], [-1.45, 0.25, -0.55]],
    },
    {
      id: "left-pulmonary-artery" as const,
      oxygenated: false,
      points: [[-0.04, 0.92, 0.72], [0.75, 0.82, 0.18], [1.4, 0.2, -0.55]],
    },
    {
      id: "right-pulmonary-veins" as const,
      oxygenated: true,
      points: [[-1.42, -0.02, -0.55], [-0.72, 0.12, 0.22], [0.3, 0.4, 0.92]],
    },
    {
      id: "left-pulmonary-veins" as const,
      oxygenated: true,
      points: [[1.42, -0.02, -0.55], [0.82, 0.15, 0.25], [0.32, 0.4, 0.92]],
    },
    {
      id: "left-ventricle" as const,
      oxygenated: true,
      points: [[0.32, 0.38, 0.94], [0.35, -0.12, 1.1], [0.3, -0.6, 1.08]],
    },
    {
      id: "aorta" as const,
      oxygenated: true,
      points: [[0.3, -0.55, 1.08], [0.35, 0.35, 1.22], [0.45, 1.22, 0.82], [0.8, 1.8, 0.45]],
    },
  ];

  const flowParticles: FlowParticle[] = [];
  bloodSegments.forEach((segment, segmentIndex) => {
    const { mesh, curve } = tube(
      segment.points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
      segment.oxygenated ? OXYGENATED : DEOXYGENATED,
      segment.id.includes("ventricle") ? 0.045 : 0.065,
    );
    mesh.userData.structureId = segment.id;
    bloodLayer.add(mesh);
    pickables.push(mesh);
    const objects = structureObjects.get(segment.id) ?? [];
    objects.push(mesh);
    structureObjects.set(segment.id, objects);
    for (let i = 0; i < 5; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 10, 8),
        new THREE.MeshBasicMaterial({
          color: segment.oxygenated ? OXYGENATED : DEOXYGENATED,
        }),
      );
      bloodLayer.add(particle);
      flowParticles.push({
        mesh: particle,
        curve,
        offset: (i / 5 + segmentIndex * 0.071) % 1,
        speed: 0.14 + (segmentIndex % 3) * 0.018,
        oxygenated: segment.oxygenated,
      });
    }
  });

  const airwayCurves = [
    tube(
      [
        new THREE.Vector3(0, 2.3, -0.22),
        new THREE.Vector3(0, 0.9, -0.22),
        new THREE.Vector3(-1.25, 0.05, -0.6),
      ],
      AIR,
      0.025,
    ),
    tube(
      [
        new THREE.Vector3(0, 2.3, -0.22),
        new THREE.Vector3(0, 0.9, -0.22),
        new THREE.Vector3(1.2, 0.05, -0.6),
      ],
      AIR,
      0.025,
    ),
  ];
  const airParticles: FlowParticle[] = [];
  airwayCurves.forEach(({ mesh, curve }, curveIndex) => {
    (mesh.material as THREE.MeshStandardMaterial).opacity = 0.34;
    airLayer.add(mesh);
    for (let i = 0; i < 9; i += 1) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 8, 6),
        new THREE.MeshBasicMaterial({ color: AIR }),
      );
      airLayer.add(particle);
      airParticles.push({
        mesh: particle,
        curve,
        offset: (i / 9 + curveIndex * 0.08) % 1,
        speed: 0.12,
        oxygenated: true,
      });
    }
  });

  const trachea = createTrachea();
  const diaphragm = createDiaphragm();
  const alveoli = createAlveoli();
  const valveOverlays = {
    "tricuspid-valve": createValve(
      new THREE.Vector3(-0.28, 0, 1.11),
      0x60a5fa,
      "tricuspid-valve",
    ),
    "pulmonary-valve": createValve(
      new THREE.Vector3(-0.15, 0.55, 1.08),
      0x60a5fa,
      "pulmonary-valve",
    ),
    "mitral-valve": createValve(
      new THREE.Vector3(0.3, 0, 1.08),
      0xf87171,
      "mitral-valve",
    ),
    "aortic-valve": createValve(
      new THREE.Vector3(0.24, 0.55, 1.1),
      0xf87171,
      "aortic-valve",
    ),
  };
  overlayLayer.add(
    trachea,
    diaphragm,
    alveoli,
    ...Object.values(valveOverlays),
  );
  [trachea, diaphragm, alveoli, ...Object.values(valveOverlays)].forEach(
    (object) => {
      pickables.push(object);
      const id = object.userData.structureId as AnatomyStructureId;
      const objects = structureObjects.get(id) ?? [];
      objects.push(object);
      structureObjects.set(id, objects);
    },
  );

  let animationTime = 0;
  let snapshot: AnatomySceneSnapshot = {
    selectedStructure: state.selectedStructure,
    focusedStructures: state.focusedStructures,
    animationMode: state.animationMode,
    cardiacPhase: "filling",
    oxygenation: "mixed",
  };

  function applyState(): void {
    const visible = new Set(
      structuresForReveal(state.reveal).map((structure) => structure.id),
    );
    for (const [id, objects] of structureObjects) {
      for (const object of objects) object.visible = visible.has(id);
    }
    models.heart.visible = state.reveal >= 1;
    models.lungs.visible = state.reveal >= 1;
    models.bronchi.visible = state.reveal >= 2;
    bloodLayer.visible = state.reveal >= 3;
    trachea.visible = state.reveal >= 2;
    diaphragm.visible = state.reveal >= 4;
    alveoli.visible = state.reveal >= 5;

    const focused = new Set(state.focusedStructures);
    if (state.selectedStructure) focused.add(state.selectedStructure);
    for (const [id, materials] of structureMaterials) {
      const active = focused.has(id);
      for (const material of materials) {
        material.emissive.copy(active ? HIGHLIGHT : new THREE.Color(0));
        material.emissiveIntensity = active ? 0.48 : 0;
        material.opacity = active
          ? 0.95
          : id.includes("lung")
            ? state.animationMode === "gas-exchange"
              ? 0.18
              : 0.3
            : 0.76;
      }
    }
    bloodLayer.visible =
      bloodLayer.visible &&
      animationRelevant(state.animationMode, "blood");
    airLayer.visible =
      state.reveal >= 2 && animationRelevant(state.animationMode, "air");
    alveoli.visible =
      state.reveal >= 5 &&
      animationRelevant(state.animationMode, "alveoli");
    snapshot = {
      ...snapshot,
      selectedStructure: state.selectedStructure,
      focusedStructures: [...state.focusedStructures],
      animationMode: state.animationMode,
      oxygenation:
        state.animationMode === "pulmonary-circulation"
          ? "oxygenating"
          : state.animationMode === "systemic-outflow"
            ? "oxygenated"
            : "mixed",
    };
  }

  function updateParticle(
    particle: FlowParticle,
    dt: number,
    direction = 1,
  ): void {
    if (state.playing && !state.reducedMotion) {
      particle.offset =
        (particle.offset + dt * particle.speed * state.speed * direction + 1) %
        1;
    }
    particle.mesh.position.copy(particle.curve.getPointAt(particle.offset));
  }

  applyState();

  return {
    root,
    pickables,
    update(_elapsed, dt) {
      if (state.playing && !state.reducedMotion) {
        animationTime += dt * state.speed;
      }
      const cycle = animationTime % 1;
      const phase = cardiacPhaseAt(cycle);
      snapshot = { ...snapshot, cardiacPhase: phase };

      const contraction =
        phase === "ventricular-systole" || phase === "ejection"
          ? 0.975
          : phase === "atrial-systole"
            ? 0.987
            : 1;
      models.heart.scale.copy(heartBaseScale).multiplyScalar(contraction);

      const breath = state.reducedMotion
        ? 0
        : Math.sin(animationTime * Math.PI * 0.48);
      const lungFactor =
        animationRelevant(state.animationMode, "air") && state.playing
          ? 1 + breath * 0.025
          : 1;
      models.lungs.scale.set(
        lungsBaseScale.x * (1 + (lungFactor - 1) * 0.7),
        lungsBaseScale.y * lungFactor,
        lungsBaseScale.z * (1 + (lungFactor - 1) * 0.85),
      );
      models.bronchi.scale.copy(bronchiBaseScale).multiplyScalar(
        1 + (lungFactor - 1) * 0.35,
      );
      diaphragm.position.y = -1.72 - breath * 0.08;

      for (const particle of flowParticles) updateParticle(particle, dt);
      const inhaling = Math.cos(animationTime * Math.PI * 0.48) >= 0;
      for (const particle of airParticles) {
        updateParticle(particle, dt, inhaling ? 1 : -1);
      }

      const valveState = valveStateForPhase(phase);
      for (const [id, valve] of Object.entries(valveOverlays)) {
        const open =
          id === "tricuspid-valve"
            ? valveState.tricuspidOpen
            : id === "mitral-valve"
              ? valveState.mitralOpen
              : id === "pulmonary-valve"
                ? valveState.pulmonaryOpen
                : valveState.aorticOpen;
        valve.children
          .filter((child) => child.userData.leaflet)
          .forEach((leaflet, index) => {
            leaflet.rotation.y = open
              ? (index === 0 ? 1 : -1) * 0.72
              : 0;
          });
      }

      alveoli.children.forEach((child, index) => {
        if (child.userData.alveolusSac) {
          const pulse = state.reducedMotion
            ? 1
            : 1 + Math.sin(animationTime * 1.5 + index * 0.35) * 0.035;
          child.scale.setScalar(pulse);
        }
        if (child.userData.gasParticle) {
          const from = child.userData.from as THREE.Vector3;
          const to = child.userData.to as THREE.Vector3;
          const phaseOffset = Number(child.userData.phase ?? 0);
          const progress =
            state.reducedMotion || !state.playing
              ? 0.5
              : (animationTime * 0.22 + phaseOffset) % 1;
          child.position.lerpVectors(from, to, progress);
        }
      });
    },
    setState(next) {
      Object.assign(state, next);
      state.reveal = Math.max(1, Math.min(6, Math.round(state.reveal)));
      state.speed = Math.max(0.25, Math.min(2, state.speed));
      applyState();
    },
    getState: () => ({
      ...state,
      focusedStructures: [...state.focusedStructures],
    }),
    getSnapshot: () => ({
      ...snapshot,
      focusedStructures: [...snapshot.focusedStructures],
    }),
    getStructureForObject(object) {
      let current: THREE.Object3D | null = object;
      while (current) {
        const id = current.userData.structureId as
          | AnatomyStructureId
          | undefined;
        if (id && STRUCTURE_BY_ID[id]) return id;
        current = current.parent;
      }
      return null;
    },
    getFocusTarget(structure) {
      const target = FOCUS_TARGETS[structure];
      if (!target) return null;
      return {
        position: new THREE.Vector3(...target.position),
        target: new THREE.Vector3(...target.target),
      };
    },
    dispose() {
      disposeObject(root);
      root.clear();
    },
  };
}
