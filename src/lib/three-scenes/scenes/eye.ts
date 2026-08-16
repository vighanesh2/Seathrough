import * as THREE from "three";
import {
  STRUCTURE_BY_ID,
  structuresForReveal,
} from "@/lib/anatomy/registry";
import {
  lensThicknessAt,
  pupilScaleAt,
  visionPhaseAt,
} from "@/lib/anatomy/physiology";
import type {
  AnatomyAnimationMode,
  AnatomySceneHandle,
  AnatomySceneSnapshot,
  AnatomySceneState,
  AnatomyStructureId,
} from "@/lib/anatomy/types";

const LIGHT = new THREE.Color(0xfbbf24);
const SIGNAL = new THREE.Color(0x38bdf8);
const HIGHLIGHT = new THREE.Color(0xfbbf24);
const INVERTED = new THREE.Color(0xf43f5e);
const UPRIGHT = new THREE.Color(0x22c55e);

type Progress = (value: number) => void;

type RayParticle = {
  mesh: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  offset: number;
  speed: number;
};

const FOCUS_TARGETS: Partial<
  Record<
    AnatomyStructureId,
    { position: [number, number, number]; target: [number, number, number] }
  >
> = {
  eye: { position: [4.2, 1.6, 5.4], target: [0.2, 0.1, 0] },
  sclera: { position: [3.8, 1.4, 4.8], target: [0.35, 0.1, 0] },
  cornea: { position: [-2.8, 1.2, 4.2], target: [-1.35, 0.15, 0] },
  iris: { position: [-1.6, 1.1, 3.8], target: [-0.55, 0.15, 0] },
  pupil: { position: [-1.4, 1, 3.5], target: [-0.55, 0.15, 0] },
  lens: { position: [-0.4, 1.1, 3.6], target: [-0.05, 0.15, 0] },
  "aqueous-humor": { position: [-2, 1.3, 3.8], target: [-0.95, 0.15, 0] },
  vitreous: { position: [1.6, 1.2, 4.2], target: [0.85, 0.1, 0] },
  retina: { position: [3.4, 0.9, 4], target: [1.55, 0.05, 0] },
  fovea: { position: [3.6, 0.5, 3.6], target: [1.62, -0.05, 0] },
  photoreceptors: { position: [3.8, 0.2, 3.4], target: [1.55, -0.15, 0] },
  "optic-nerve": { position: [4.2, -1.2, 4], target: [2.1, -0.85, 0] },
  "visual-cortex": { position: [5.6, -0.4, 4.8], target: [3.6, -0.2, 0] },
};

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

function register(
  object: THREE.Object3D,
  id: AnatomyStructureId,
  pickables: THREE.Object3D[],
  structureObjects: Map<AnatomyStructureId, THREE.Object3D[]>,
  structureMaterials: Map<AnatomyStructureId, THREE.MeshStandardMaterial[]>,
): void {
  object.userData.structureId = id;
  pickables.push(object);
  const objects = structureObjects.get(id) ?? [];
  objects.push(object);
  structureObjects.set(id, objects);
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.userData.structureId = id;
    const material = child.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      const list = structureMaterials.get(id) ?? [];
      list.push(material);
      structureMaterials.set(id, list);
    } else if (material instanceof THREE.MeshPhysicalMaterial) {
      // Physical materials still get highlight via emissive if present.
      const asStd = material as unknown as THREE.MeshStandardMaterial;
      const list = structureMaterials.get(id) ?? [];
      list.push(asStd);
      structureMaterials.set(id, list);
    }
  });
}

function makeArrow(
  color: THREE.ColorRepresentation,
  upright: boolean,
): THREE.Group {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const shaft = new THREE.Mesh(
    new THREE.PlaneGeometry(0.08, 0.55),
    material,
  );
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.14, 3), material);
  head.position.y = upright ? 0.32 : -0.32;
  head.rotation.z = upright ? 0 : Math.PI;
  group.add(shaft, head);
  group.userData.arrowMaterial = material;
  return group;
}

function animationRelevant(
  mode: AnatomyAnimationMode,
  kind: "rays" | "photoreceptors" | "neural" | "world",
): boolean {
  if (mode === "overview" || mode === "light-path") {
    return kind === "rays" || kind === "world";
  }
  if (mode === "accommodation") return kind === "rays" || kind === "world";
  if (mode === "pupil-reflex") return kind === "rays";
  if (mode === "photoreceptors") {
    return kind === "photoreceptors" || kind === "rays";
  }
  if (mode === "neural-signal") {
    return kind === "neural" || kind === "photoreceptors" || kind === "world";
  }
  return true;
}

/**
 * Procedural cross-section eye: light enters from the left, image lands
 * inverted on the retina, neural signal travels to cortex on the right.
 */
export async function loadEyeScene(
  initial: Partial<AnatomySceneState> = {},
  onProgress?: Progress,
): Promise<AnatomySceneHandle> {
  onProgress?.(0.2);
  const root = new THREE.Group();
  root.name = "eye";

  const state: AnatomySceneState = {
    reveal: initial.reveal ?? 6,
    selectedStructure: initial.selectedStructure ?? null,
    focusedStructures: initial.focusedStructures ?? [],
    animationMode:
      initial.animationMode &&
      ["overview", "light-path", "accommodation", "pupil-reflex", "photoreceptors", "neural-signal"].includes(
        initial.animationMode,
      )
        ? initial.animationMode
        : "overview",
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

  // --- Globe shell (sclera), sagittal half so interior reads clearly ---
  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(
      1.55,
      48,
      32,
      0,
      Math.PI,
      0,
      Math.PI,
    ),
    new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.55,
      metalness: 0.02,
      transparent: true,
      opacity: 0.88,
      side: THREE.DoubleSide,
    }),
  );
  sclera.rotation.y = Math.PI / 2;
  register(sclera, "sclera", pickables, structureObjects, structureMaterials);
  root.add(sclera);

  // Invisible whole-eye pick proxy
  const eyeProxy = new THREE.Mesh(
    new THREE.SphereGeometry(1.55, 16, 12),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  register(eyeProxy, "eye", pickables, structureObjects, structureMaterials);
  root.add(eyeProxy);

  // --- Cornea (front dome, left) ---
  const cornea = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2.15),
    new THREE.MeshPhysicalMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.42,
      roughness: 0.08,
      transmission: 0.55,
      thickness: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  cornea.position.set(-1.28, 0.12, 0);
  cornea.rotation.z = -Math.PI / 2;
  register(cornea, "cornea", pickables, structureObjects, structureMaterials);
  root.add(cornea);

  // --- Aqueous humor ---
  const aqueous = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 20, 16),
    new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.22,
      roughness: 0.2,
    }),
  );
  aqueous.position.set(-0.85, 0.12, 0);
  aqueous.scale.set(1.1, 0.85, 0.7);
  register(
    aqueous,
    "aqueous-humor",
    pickables,
    structureObjects,
    structureMaterials,
  );
  root.add(aqueous);

  // --- Iris + pupil ---
  const irisGroup = new THREE.Group();
  irisGroup.position.set(-0.52, 0.12, 0);
  const irisMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e3a5f,
    roughness: 0.65,
    side: THREE.DoubleSide,
  });
  const iris = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.48, 48),
    irisMaterial,
  );
  iris.rotation.y = Math.PI / 2;
  irisGroup.add(iris);
  register(iris, "iris", pickables, structureObjects, structureMaterials);

  const pupilMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 32),
    new THREE.MeshBasicMaterial({
      color: 0x020617,
      side: THREE.DoubleSide,
    }),
  );
  pupilMesh.rotation.y = Math.PI / 2;
  irisGroup.add(pupilMesh);
  register(
    pupilMesh,
    "pupil",
    pickables,
    structureObjects,
    structureMaterials,
  );
  root.add(irisGroup);

  // --- Lens ---
  const lensGroup = new THREE.Group();
  lensGroup.position.set(-0.08, 0.12, 0);
  const lensMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xf0f9ff,
    transparent: true,
    opacity: 0.55,
    roughness: 0.12,
    transmission: 0.4,
    thickness: 0.5,
  });
  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(0.38, 28, 20),
    lensMaterial,
  );
  lens.scale.set(0.55, 1, 0.85);
  lensGroup.add(lens);
  register(lens, "lens", pickables, structureObjects, structureMaterials);
  root.add(lensGroup);

  // --- Vitreous ---
  const vitreous = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 28, 20, 0, Math.PI, 0, Math.PI),
    new THREE.MeshPhysicalMaterial({
      color: 0xecfeff,
      transparent: true,
      opacity: 0.14,
      roughness: 0.3,
      side: THREE.DoubleSide,
    }),
  );
  vitreous.position.set(0.35, 0.05, 0);
  vitreous.rotation.y = Math.PI / 2;
  register(vitreous, "vitreous", pickables, structureObjects, structureMaterials);
  root.add(vitreous);

  // --- Retina lining (inner back half) ---
  const retina = new THREE.Mesh(
    new THREE.SphereGeometry(
      1.42,
      40,
      28,
      0,
      Math.PI,
      Math.PI * 0.15,
      Math.PI * 0.7,
    ),
    new THREE.MeshStandardMaterial({
      color: 0x9f1239,
      transparent: true,
      opacity: 0.55,
      roughness: 0.7,
      side: THREE.DoubleSide,
    }),
  );
  retina.rotation.y = -Math.PI / 2;
  retina.position.set(0.15, 0.05, 0);
  register(retina, "retina", pickables, structureObjects, structureMaterials);
  root.add(retina);

  // --- Fovea ---
  const fovea = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.35,
      roughness: 0.4,
    }),
  );
  fovea.position.set(1.48, -0.02, 0);
  register(fovea, "fovea", pickables, structureObjects, structureMaterials);
  root.add(fovea);

  // --- Photoreceptor sparkles ---
  const photoreceptorGroup = new THREE.Group();
  photoreceptorGroup.position.set(1.42, -0.05, 0);
  const photoParticles: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    const r = 0.12 + (i % 3) * 0.05;
    const spark = new THREE.Mesh(
      new THREE.SphereGeometry(0.028, 8, 6),
      new THREE.MeshBasicMaterial({
        color: i % 2 === 0 ? 0xfde68a : 0x7dd3fc,
      }),
    );
    spark.position.set(
      Math.cos(a) * 0.04,
      Math.sin(a) * r,
      Math.cos(a * 1.7) * r * 0.55,
    );
    spark.userData.phase = i / 18;
    photoParticles.push(spark);
    photoreceptorGroup.add(spark);
  }
  register(
    photoreceptorGroup,
    "photoreceptors",
    pickables,
    structureObjects,
    structureMaterials,
  );
  root.add(photoreceptorGroup);

  // --- Optic nerve ---
  const opticNerve = new THREE.Group();
  const nerveCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.55, -0.55, 0),
    new THREE.Vector3(2.15, -0.95, 0),
    new THREE.Vector3(2.85, -0.75, 0),
    new THREE.Vector3(3.45, -0.25, 0),
  ]);
  const nerveMesh = new THREE.Mesh(
    new THREE.TubeGeometry(nerveCurve, 32, 0.09, 10, false),
    new THREE.MeshStandardMaterial({
      color: 0xfcd34d,
      roughness: 0.55,
      emissive: 0xfbbf24,
      emissiveIntensity: 0.12,
    }),
  );
  opticNerve.add(nerveMesh);
  register(
    opticNerve,
    "optic-nerve",
    pickables,
    structureObjects,
    structureMaterials,
  );
  root.add(opticNerve);

  // --- Visual cortex (simplified occipital lobe) ---
  const cortex = new THREE.Group();
  cortex.position.set(3.65, -0.15, 0);
  const cortexBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 18),
    new THREE.MeshStandardMaterial({
      color: 0xfbcfe8,
      roughness: 0.7,
      transparent: true,
      opacity: 0.85,
    }),
  );
  cortexBody.scale.set(1.15, 0.85, 0.75);
  cortex.add(cortexBody);
  register(
    cortexBody,
    "visual-cortex",
    pickables,
    structureObjects,
    structureMaterials,
  );
  root.add(cortex);

  // --- World object (left) and inverted retinal image ---
  const worldObject = makeArrow(UPRIGHT, true);
  worldObject.position.set(-3.15, 0.55, 0);
  worldObject.scale.setScalar(1.15);
  root.add(worldObject);

  const retinalImage = makeArrow(INVERTED, false);
  retinalImage.position.set(1.35, 0.05, 0.02);
  retinalImage.scale.setScalar(0.55);
  root.add(retinalImage);

  const corticalImage = makeArrow(UPRIGHT, true);
  corticalImage.position.set(3.65, 0.35, 0.15);
  corticalImage.scale.setScalar(0.45);
  corticalImage.visible = false;
  root.add(corticalImage);

  // --- Light rays ---
  const rayLayer = new THREE.Group();
  root.add(rayLayer);
  const rayCurves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.1, 0.85, 0),
      new THREE.Vector3(-1.55, 0.45, 0),
      new THREE.Vector3(-0.55, 0.22, 0),
      new THREE.Vector3(-0.08, 0.18, 0),
      new THREE.Vector3(0.7, 0.05, 0),
      new THREE.Vector3(1.4, -0.35, 0),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.1, 0.55, 0),
      new THREE.Vector3(-1.5, 0.28, 0),
      new THREE.Vector3(-0.55, 0.15, 0),
      new THREE.Vector3(-0.08, 0.12, 0),
      new THREE.Vector3(0.75, 0.05, 0),
      new THREE.Vector3(1.45, 0.02, 0),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.1, 0.25, 0),
      new THREE.Vector3(-1.5, 0.12, 0),
      new THREE.Vector3(-0.55, 0.08, 0),
      new THREE.Vector3(-0.08, 0.08, 0),
      new THREE.Vector3(0.75, 0.08, 0),
      new THREE.Vector3(1.4, 0.4, 0),
    ]),
  ];

  // Guide tubes (subtle)
  for (const curve of rayCurves) {
    const guide = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 48, 0.012, 6, false),
      new THREE.MeshBasicMaterial({
        color: LIGHT,
        transparent: true,
        opacity: 0.22,
      }),
    );
    rayLayer.add(guide);
  }

  const rayParticles: RayParticle[] = [];
  rayCurves.forEach((curve, curveIndex) => {
    for (let i = 0; i < 7; i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.04, 8, 6),
        new THREE.MeshBasicMaterial({ color: LIGHT }),
      );
      rayLayer.add(mesh);
      rayParticles.push({
        mesh,
        curve,
        offset: (i / 7 + curveIndex * 0.11) % 1,
        speed: 0.22 + curveIndex * 0.02,
      });
    }
  });

  // Neural signal particles along optic nerve → cortex
  const neuralLayer = new THREE.Group();
  root.add(neuralLayer);
  const neuralCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(1.5, -0.15, 0),
    new THREE.Vector3(1.7, -0.55, 0),
    new THREE.Vector3(2.4, -0.85, 0),
    new THREE.Vector3(3.2, -0.4, 0),
    new THREE.Vector3(3.55, -0.1, 0),
  ]);
  const neuralParticles: RayParticle[] = [];
  for (let i = 0; i < 10; i += 1) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 8, 6),
      new THREE.MeshBasicMaterial({ color: SIGNAL }),
    );
    neuralLayer.add(mesh);
    neuralParticles.push({
      mesh,
      curve: neuralCurve,
      offset: i / 10,
      speed: 0.28,
    });
  }

  onProgress?.(1);

  let animationTime = 0;
  let snapshot: AnatomySceneSnapshot = {
    selectedStructure: state.selectedStructure,
    focusedStructures: state.focusedStructures,
    animationMode: state.animationMode,
    visionPhase: "incoming",
    imageOrientation: "inverted",
  };

  function applyState(): void {
    const visible = new Set(
      structuresForReveal(state.reveal, "eye").map((structure) => structure.id),
    );
    for (const [id, objects] of structureObjects) {
      for (const object of objects) object.visible = visible.has(id);
    }

    cornea.visible = state.reveal >= 1 && visible.has("cornea");
    irisGroup.visible =
      state.reveal >= 2 && (visible.has("iris") || visible.has("pupil"));
    lensGroup.visible = state.reveal >= 2 && visible.has("lens");
    aqueous.visible = state.reveal >= 3 && visible.has("aqueous-humor");
    vitreous.visible = state.reveal >= 3 && visible.has("vitreous");
    retina.visible = state.reveal >= 3 && visible.has("retina");
    fovea.visible = state.reveal >= 4 && visible.has("fovea");
    photoreceptorGroup.visible =
      state.reveal >= 4 && visible.has("photoreceptors");
    opticNerve.visible = state.reveal >= 4 && visible.has("optic-nerve");
    cortex.visible = state.reveal >= 5 && visible.has("visual-cortex");

    worldObject.visible =
      state.reveal >= 1 && animationRelevant(state.animationMode, "world");
    retinalImage.visible =
      state.reveal >= 3 && animationRelevant(state.animationMode, "world");
    corticalImage.visible =
      state.reveal >= 5 &&
      (state.animationMode === "neural-signal" ||
        state.animationMode === "overview");

    rayLayer.visible =
      state.reveal >= 2 && animationRelevant(state.animationMode, "rays");
    neuralLayer.visible =
      state.reveal >= 4 && animationRelevant(state.animationMode, "neural");
    photoreceptorGroup.visible =
      photoreceptorGroup.visible &&
      (state.animationMode === "overview" ||
        animationRelevant(state.animationMode, "photoreceptors"));

    const focused = new Set(state.focusedStructures);
    if (state.selectedStructure) focused.add(state.selectedStructure);
    for (const [id, materials] of structureMaterials) {
      const active = focused.has(id);
      for (const material of materials) {
        if ("emissive" in material) {
          material.emissive.copy(active ? HIGHLIGHT : new THREE.Color(0));
          material.emissiveIntensity = active ? 0.45 : material.userData.baseEmissive ?? 0;
        }
        if (typeof material.opacity === "number" && id !== "eye") {
          const base =
            id === "cornea" || id === "vitreous" || id === "aqueous-humor"
              ? id === "vitreous"
                ? 0.14
                : id === "aqueous-humor"
                  ? 0.22
                  : 0.42
              : id === "retina"
                ? 0.55
                : 0.88;
          material.opacity = active ? Math.min(0.98, base + 0.25) : base;
        }
      }
    }

    snapshot = {
      ...snapshot,
      selectedStructure: state.selectedStructure,
      focusedStructures: [...state.focusedStructures],
      animationMode: state.animationMode,
      imageOrientation:
        state.animationMode === "neural-signal" ? "cortical" : "inverted",
    };
  }

  applyState();

  return {
    root,
    pickables,
    update(_elapsed, dt) {
      if (state.playing && !state.reducedMotion) {
        animationTime += dt * state.speed;
      }
      const cycle = (animationTime * 0.35) % 1;
      const phase = visionPhaseAt(cycle);
      snapshot = { ...snapshot, visionPhase: phase };

      const pupilScale = state.reducedMotion
        ? 1
        : pupilScaleAt(cycle, state.animationMode);
      pupilMesh.scale.setScalar(Math.max(0.45, Math.min(1.5, pupilScale)));
      iris.scale.setScalar(1);

      const thickness = state.reducedMotion
        ? 1
        : lensThicknessAt(cycle, state.animationMode);
      lens.scale.set(0.55 * thickness, 1, 0.85);

      // Subtle cornea shimmer
      if (!state.reducedMotion && cornea.material instanceof THREE.MeshPhysicalMaterial) {
        cornea.material.opacity = 0.38 + Math.sin(animationTime * 1.4) * 0.04;
      }

      for (const particle of rayParticles) {
        if (state.playing && !state.reducedMotion) {
          particle.offset =
            (particle.offset + dt * particle.speed * state.speed + 1) % 1;
        }
        particle.mesh.position.copy(
          particle.curve.getPointAt(particle.offset),
        );
        const dim = particle.offset > 0.85 ? 0.55 : 1;
        particle.mesh.scale.setScalar(dim);
      }

      for (const particle of neuralParticles) {
        if (state.playing && !state.reducedMotion) {
          particle.offset =
            (particle.offset + dt * particle.speed * state.speed + 1) % 1;
        }
        particle.mesh.position.copy(
          particle.curve.getPointAt(particle.offset),
        );
      }

      photoParticles.forEach((spark, index) => {
        const pulse =
          state.reducedMotion || !state.playing
            ? 1
            : 1 +
              Math.sin(animationTime * 4 + index * 0.5) *
                (state.animationMode === "photoreceptors" ? 0.55 : 0.2);
        spark.scale.setScalar(pulse);
        spark.visible =
          state.animationMode !== "photoreceptors" ||
          (animationTime * 3 + index) % 1 > 0.35;
      });

      // Retinal inverted image pulse when light arrives
      const imagePulse =
        phase === "inverted" || phase === "transducing" ? 1.08 : 1;
      retinalImage.scale.setScalar(0.55 * imagePulse);
      corticalImage.visible =
        state.reveal >= 5 &&
        (state.animationMode === "neural-signal" ||
          (state.animationMode === "overview" && phase === "cortical"));
      if (corticalImage.visible && !state.reducedMotion) {
        corticalImage.scale.setScalar(
          0.45 * (1 + Math.sin(animationTime * 3) * 0.08),
        );
      }
    },
    setState(next) {
      Object.assign(state, next);
      state.reveal = Math.max(1, Math.min(6, Math.round(state.reveal)));
      state.speed = Math.max(0.25, Math.min(2, state.speed));
      if (
        next.animationMode &&
        !(
          [
            "overview",
            "light-path",
            "accommodation",
            "pupil-reflex",
            "photoreceptors",
            "neural-signal",
          ] as string[]
        ).includes(next.animationMode)
      ) {
        state.animationMode = "overview";
      }
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
