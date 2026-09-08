import * as THREE from "three";
import { STRUCTURE_BY_ID } from "@/lib/anatomy/registry";
import type {
  AnatomyAnimationMode,
  AnatomySceneHandle,
  AnatomySceneSnapshot,
  AnatomySceneState,
  AnatomyStructureId,
} from "@/lib/anatomy/types";

type Progress = (value: number) => void;
type OrganScene = "brain" | "kidney";
type FocusTarget = { position: [number, number, number]; target: [number, number, number] };

const HIGHLIGHT = new THREE.Color(0xfbbf24);

const FOCUS: Record<OrganScene, Partial<Record<AnatomyStructureId, FocusTarget>>> = {
  brain: {
    brain: { position: [4.8, 2.8, 6.2], target: [0, 0.3, 0] },
    cerebrum: { position: [4.2, 2.4, 5.4], target: [0, 0.6, 0] },
    "frontal-lobe": { position: [-4.2, 2.2, 4.6], target: [-1, 0.6, 0] },
    "parietal-lobe": { position: [0.6, 4.5, 4.8], target: [0, 1.1, 0] },
    "temporal-lobe": { position: [-3.6, -0.2, 4.4], target: [-0.7, -0.25, 0] },
    "occipital-lobe": { position: [4.3, 1.6, 4.6], target: [1.2, 0.6, 0] },
    cerebellum: { position: [4.2, -1.8, 4.2], target: [1.1, -1, 0] },
    brainstem: { position: [3.5, -2.4, 4.2], target: [0.35, -1.1, 0] },
    "spinal-cord": { position: [3.2, -3.2, 4.5], target: [0.35, -2, 0] },
  },
  kidney: {
    kidney: { position: [4.8, 1.8, 6], target: [0, 0, 0] },
    "renal-cortex": { position: [4.3, 1.5, 5.2], target: [-0.2, 0.2, 0] },
    "renal-medulla": { position: [3.8, 1.2, 4.8], target: [-0.2, 0, 0] },
    "renal-pelvis": { position: [3.4, 0.5, 4.2], target: [0.5, -0.1, 0] },
    "renal-artery": { position: [4.2, 0.8, 4.6], target: [1.2, 0.5, 0] },
    "renal-vein": { position: [4.2, 0.2, 4.6], target: [1.2, 0, 0] },
    ureter: { position: [3.8, -2.2, 4.6], target: [0.75, -1.5, 0] },
    nephron: { position: [-4, 1.8, 4.8], target: [-0.9, 0.6, 0] },
    glomerulus: { position: [-3.8, 2.2, 4.4], target: [-0.8, 0.9, 0] },
    "collecting-duct": { position: [3.6, -0.8, 4.3], target: [0.35, -0.5, 0] },
  },
};

function material(color: THREE.ColorRepresentation, opacity = 0.9) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.58,
    metalness: 0.03,
    transparent: opacity < 1,
    opacity,
    side: THREE.DoubleSide,
  });
}

function dispose(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    for (const item of materials) item.dispose();
  });
}

function makeSceneHandle(input: {
  scene: OrganScene;
  root: THREE.Group;
  initial: Partial<AnatomySceneState>;
  allowedModes: readonly AnatomyAnimationMode[];
  objects: Map<AnatomyStructureId, THREE.Object3D[]>;
  materials: Map<AnatomyStructureId, THREE.MeshStandardMaterial[]>;
  pickables: THREE.Object3D[];
  particles: Array<{
    mesh: THREE.Mesh;
    curve: THREE.CatmullRomCurve3;
    offset: number;
    modes: AnatomyAnimationMode[];
  }>;
}): AnatomySceneHandle {
  const state: AnatomySceneState = {
    reveal: input.initial.reveal ?? 6,
    selectedStructure: input.initial.selectedStructure ?? null,
    focusedStructures: input.initial.focusedStructures ?? [],
    animationMode: input.allowedModes.includes(
      input.initial.animationMode ?? "overview",
    )
      ? input.initial.animationMode ?? "overview"
      : "overview",
    playing: input.initial.playing ?? true,
    speed: input.initial.speed ?? 1,
    reducedMotion: input.initial.reducedMotion ?? false,
  };
  let snapshot: AnatomySceneSnapshot = {
    selectedStructure: state.selectedStructure,
    focusedStructures: [...state.focusedStructures],
    animationMode: state.animationMode,
  };
  let elapsed = 0;

  function applyState() {
    const focused = new Set(state.focusedStructures);
    if (state.selectedStructure) focused.add(state.selectedStructure);
    for (const [id, objects] of input.objects) {
      const structure = STRUCTURE_BY_ID[id];
      for (const object of objects) {
        object.visible = !structure || structure.reveal <= state.reveal;
      }
    }
    for (const [id, materials] of input.materials) {
      const active = focused.has(id);
      for (const item of materials) {
        item.emissive.copy(active ? HIGHLIGHT : new THREE.Color(0));
        item.emissiveIntensity = active ? 0.48 : 0;
      }
    }
    for (const particle of input.particles) {
      particle.mesh.visible =
        state.reveal >= 4 &&
        (state.animationMode === "overview" ||
          particle.modes.includes(state.animationMode));
    }
    snapshot = {
      selectedStructure: state.selectedStructure,
      focusedStructures: [...state.focusedStructures],
      animationMode: state.animationMode,
    };
  }

  applyState();
  return {
    root: input.root,
    pickables: input.pickables,
    update(_time, dt) {
      if (state.playing && !state.reducedMotion) elapsed += dt * state.speed;
      for (const [index, particle] of input.particles.entries()) {
        if (!particle.mesh.visible) continue;
        if (state.playing && !state.reducedMotion) {
          particle.offset = (particle.offset + dt * state.speed * 0.18) % 1;
        }
        particle.mesh.position.copy(particle.curve.getPointAt(particle.offset));
        particle.mesh.scale.setScalar(
          0.8 + Math.sin(elapsed * 4 + index) * 0.18,
        );
      }
    },
    setState(next) {
      Object.assign(state, next);
      state.reveal = Math.max(1, Math.min(6, Math.round(state.reveal)));
      state.speed = Math.max(0.25, Math.min(2, state.speed));
      if (!input.allowedModes.includes(state.animationMode)) {
        state.animationMode = "overview";
      }
      applyState();
    },
    getState: () => ({ ...state, focusedStructures: [...state.focusedStructures] }),
    getSnapshot: () => ({ ...snapshot, focusedStructures: [...snapshot.focusedStructures] }),
    getStructureForObject(object) {
      let current: THREE.Object3D | null = object;
      while (current) {
        const id = current.userData.structureId as AnatomyStructureId | undefined;
        if (id && STRUCTURE_BY_ID[id]) return id;
        current = current.parent;
      }
      return null;
    },
    getFocusTarget(structure) {
      const focus = FOCUS[input.scene][structure];
      return focus
        ? {
            position: new THREE.Vector3(...focus.position),
            target: new THREE.Vector3(...focus.target),
          }
        : null;
    },
    dispose() {
      dispose(input.root);
      input.root.clear();
    },
  };
}

function sceneBuilder(scene: OrganScene) {
  const root = new THREE.Group();
  root.name = scene;
  const objects = new Map<AnatomyStructureId, THREE.Object3D[]>();
  const materials = new Map<AnatomyStructureId, THREE.MeshStandardMaterial[]>();
  const pickables: THREE.Object3D[] = [];
  const particles: Array<{
    mesh: THREE.Mesh;
    curve: THREE.CatmullRomCurve3;
    offset: number;
    modes: AnatomyAnimationMode[];
  }> = [];

  function add(
    id: AnatomyStructureId,
    object: THREE.Object3D,
    options: { pickable?: boolean } = {},
  ) {
    object.userData.structureId = id;
    object.traverse((child) => {
      child.userData.structureId = id;
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        const list = materials.get(id) ?? [];
        for (const mat of mats) {
          if (mat instanceof THREE.MeshStandardMaterial) list.push(mat);
        }
        materials.set(id, list);
      }
    });
    objects.set(id, [...(objects.get(id) ?? []), object]);
    if (options.pickable !== false) pickables.push(object);
    root.add(object);
    return object;
  }

  function addParticles(
    curve: THREE.CatmullRomCurve3,
    color: THREE.ColorRepresentation,
    modes: AnatomyAnimationMode[],
    count = 5,
  ) {
    for (let index = 0; index < count; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 12, 12),
        new THREE.MeshBasicMaterial({ color }),
      );
      root.add(mesh);
      particles.push({ mesh, curve, offset: index / count, modes });
    }
  }

  return { root, objects, materials, pickables, particles, add, addParticles };
}

export async function loadBrainScene(
  initial: Partial<AnatomySceneState> = {},
  onProgress?: Progress,
): Promise<AnatomySceneHandle> {
  onProgress?.(0.15);
  const builder = sceneBuilder("brain");
  const lobe = (
    id: AnatomyStructureId,
    color: THREE.ColorRepresentation,
    position: [number, number, number],
    scale: [number, number, number],
  ) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material(color));
    mesh.position.set(...position);
    mesh.scale.set(...scale);
    builder.add(id, mesh);
  };

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1.8, 40, 28),
    material(0xd9a8a8, 0.13),
  );
  shell.scale.set(1.3, 0.95, 1);
  shell.position.y = 0.35;
  builder.add("brain", shell, { pickable: false });
  lobe("frontal-lobe", 0xf08a8a, [-1.05, 0.55, 0.12], [1.15, 1.18, 1.1]);
  lobe("parietal-lobe", 0xf2c66d, [0.15, 1.05, 0], [1.25, 0.95, 1.08]);
  lobe("temporal-lobe", 0x70b7a5, [-0.05, -0.35, 0.12], [1.25, 0.72, 1.02]);
  lobe("occipital-lobe", 0x7f9ed6, [1.28, 0.45, 0], [0.82, 1.02, 0.96]);

  const cerebrumBridge = new THREE.Mesh(
    new THREE.TorusGeometry(1.15, 0.055, 10, 48, Math.PI),
    material(0xf6d7d7),
  );
  cerebrumBridge.rotation.x = Math.PI / 2;
  cerebrumBridge.position.set(0, 0.55, 0.95);
  builder.add("cerebrum", cerebrumBridge);

  const cerebellum = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 28, 20),
    material(0xb886b8),
  );
  cerebellum.position.set(1.05, -0.85, -0.15);
  cerebellum.scale.set(1.15, 0.75, 0.9);
  builder.add("cerebellum", cerebellum);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.22, 1.35, 18),
    material(0xe6b080),
  );
  stem.position.set(0.35, -1.15, 0);
  stem.rotation.z = -0.12;
  builder.add("brainstem", stem);
  const cord = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.13, 1.6, 16),
    material(0xe8d6bd),
  );
  cord.position.set(0.48, -2.35, 0);
  builder.add("spinal-cord", cord);

  const sensoryCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.48, -3.1, 0),
    new THREE.Vector3(0.3, -1.2, 0.2),
    new THREE.Vector3(-0.1, 0.2, 0.5),
    new THREE.Vector3(0.2, 1.2, 0.5),
  ]);
  const motorCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.2, 0.8, 0.7),
    new THREE.Vector3(-0.3, 0.2, 0.55),
    new THREE.Vector3(0.3, -1.1, 0.25),
    new THREE.Vector3(0.48, -3.1, 0),
  ]);
  builder.addParticles(sensoryCurve, 0x38bdf8, ["sensory-processing", "neural-signal"]);
  builder.addParticles(motorCurve, 0xfbbf24, ["motor-control", "neural-signal"]);
  onProgress?.(1);
  return makeSceneHandle({
    scene: "brain",
    initial,
    allowedModes: ["overview", "sensory-processing", "motor-control", "neural-signal"],
    ...builder,
  });
}

export async function loadKidneyScene(
  initial: Partial<AnatomySceneState> = {},
  onProgress?: Progress,
): Promise<AnatomySceneHandle> {
  onProgress?.(0.15);
  const builder = sceneBuilder("kidney");
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 40, 30, 0.2, Math.PI * 1.72),
    material(0xb64055, 0.28),
  );
  shell.scale.set(0.85, 1.35, 0.72);
  builder.add("kidney", shell, { pickable: false });

  const cortex = new THREE.Mesh(
    new THREE.SphereGeometry(1.42, 36, 26, 0.25, Math.PI * 1.68),
    material(0xd96b7b, 0.34),
  );
  cortex.scale.set(0.84, 1.32, 0.7);
  builder.add("renal-cortex", cortex);

  for (let index = 0; index < 6; index += 1) {
    const angle = -1.1 + index * 0.43;
    const pyramid = new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.9, 18),
      material(0x8f263d),
    );
    pyramid.position.set(
      Math.cos(angle) * 0.65 - 0.25,
      Math.sin(angle) * 1.05,
      0.15,
    );
    pyramid.rotation.z = -angle + Math.PI / 2;
    builder.add("renal-medulla", pyramid);
  }

  const pelvis = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 1.15, 24),
    material(0xf0c987),
  );
  pelvis.position.set(0.65, -0.05, 0.1);
  pelvis.rotation.z = -Math.PI / 2;
  builder.add("renal-pelvis", pelvis);
  const ureter = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.08, 2.25, 14),
    material(0xe9be78),
  );
  ureter.position.set(0.88, -1.75, 0.1);
  ureter.rotation.z = -0.08;
  builder.add("ureter", ureter);

  const artery = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 1.45, 16),
    material(0xd83a45),
  );
  artery.rotation.z = Math.PI / 2;
  artery.position.set(1.35, 0.52, 0.15);
  builder.add("renal-artery", artery);
  const vein = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.15, 1.4, 16),
    material(0x3976c4),
  );
  vein.rotation.z = Math.PI / 2;
  vein.position.set(1.35, 0.15, 0.15);
  builder.add("renal-vein", vein);

  const nephron = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.48, 0.055, 90, 10, 2, 3),
    material(0x47a99a),
  );
  nephron.position.set(-0.7, 0.65, 0.72);
  nephron.scale.setScalar(0.72);
  builder.add("nephron", nephron);
  const glomerulus = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.22, 0.045, 70, 8, 2, 3),
    material(0xe05260),
  );
  glomerulus.position.set(-0.95, 1.15, 0.72);
  builder.add("glomerulus", glomerulus);
  const duct = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 1.7, 12),
    material(0xf2ca72),
  );
  duct.position.set(0.15, -0.35, 0.7);
  builder.add("collecting-duct", duct);

  const bloodCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.05, 0.52, 0.15),
    new THREE.Vector3(0.7, 0.5, 0.35),
    new THREE.Vector3(-0.9, 1.15, 0.72),
    new THREE.Vector3(-0.65, 0.65, 0.72),
  ]);
  const urineCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.65, 0.65, 0.72),
    new THREE.Vector3(0.15, -0.35, 0.7),
    new THREE.Vector3(0.65, -0.1, 0.2),
    new THREE.Vector3(0.88, -2.75, 0.1),
  ]);
  builder.addParticles(bloodCurve, 0x38bdf8, ["filtration", "reabsorption"]);
  builder.addParticles(urineCurve, 0xfbbf24, ["reabsorption", "urine-flow"]);
  onProgress?.(1);
  return makeSceneHandle({
    scene: "kidney",
    initial,
    allowedModes: ["overview", "filtration", "reabsorption", "urine-flow"],
    ...builder,
  });
}
