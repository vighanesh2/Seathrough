import * as THREE from "three";
import type { ThreeSceneId, ThreeScenePlan } from "@/lib/three-scenes/decide";

export type ThreeSceneHandle = {
  root: THREE.Group;
  /** Called each frame with elapsed seconds. */
  update?: (elapsed: number, dt: number) => void;
  dispose?: () => void;
};

type BuildInput = {
  plan: ThreeScenePlan;
  reveal: number;
};

/**
 * Build a disposable Three.js group for the given scene + reveal step.
 */
export function buildThreeScene(input: BuildInput): ThreeSceneHandle {
  switch (input.plan.id as ThreeSceneId) {
    case "pythagoras":
      return buildPythagoras(input);
    case "solar_system":
      return buildSolarSystem(input);
    case "atom":
      return buildAtom(input);
    case "wave":
      return buildWave(input);
    case "molecule":
      return buildMolecule(input);
    case "vectors":
      return buildVectors(input);
    case "heart":
      return buildHeart(input);
    case "cell":
      return buildCell(input);
    case "generic":
      return buildGeneric(input);
    default:
      return buildGeneric(input);
  }
}

function buildPythagoras({ plan, reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const a = Number(plan.params.a ?? 3);
  const b = Number(plan.params.b ?? 4);
  const c = Math.hypot(a, b);
  const scale = 0.55;

  const ax = a * scale;
  const by = b * scale;

  // Right triangle frame
  const tri = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(ax, 0, 0),
    new THREE.Vector3(0, by, 0),
    new THREE.Vector3(0, 0, 0),
  ]);
  root.add(
    new THREE.Line(
      tri,
      new THREE.LineBasicMaterial({ color: 0x1a2b3c, linewidth: 2 }),
    ),
  );

  // Right-angle marker
  const mark = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0.18, 0, 0),
    new THREE.Vector3(0.18, 0.18, 0),
    new THREE.Vector3(0, 0.18, 0),
  ]);
  root.add(new THREE.Line(mark, new THREE.LineBasicMaterial({ color: 0xb86a1e })));

  if (reveal >= 2) {
    // Square on a (bottom)
    root.add(squareOnEdge(0, 0, ax, 0, 0x1b6ca8, -1));
  }
  if (reveal >= 3) {
    // Square on b (left)
    root.add(squareOnEdge(0, 0, 0, by, 0x2a7a5c, 1));
  }
  if (reveal >= 4) {
    // Square on hypotenuse
    root.add(squareOnEdge(ax, 0, 0, by, 0xb86a1e, 1));
  }
  if (reveal >= 5) {
    const labels = [
      { text: `a=${a}`, x: ax / 2, y: -0.35 },
      { text: `b=${b}`, x: -0.45, y: by / 2 },
      { text: `c=${c.toFixed(1)}`, x: ax / 2 - 0.2, y: by / 2 + 0.35 },
    ];
    for (const L of labels) {
      root.add(makeSpriteLabel(L.text, L.x, L.y, 0));
    }
  }

  root.position.set(-ax / 2, -by / 2, 0);
  return { root };
}

function squareOnEdge(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: number,
  outwardSign: number,
): THREE.Mesh {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * outwardSign;
  const ny = (dx / len) * outwardSign;

  const p0 = new THREE.Vector3(x1, y1, 0);
  const p1 = new THREE.Vector3(x2, y2, 0);
  const p2 = new THREE.Vector3(x2 + nx * len, y2 + ny * len, 0);
  const p3 = new THREE.Vector3(x1 + nx * len, y1 + ny * len, 0);

  const geom = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    p0.x,
    p0.y,
    p0.z,
    p1.x,
    p1.y,
    p1.z,
    p2.x,
    p2.y,
    p2.z,
    p0.x,
    p0.y,
    p0.z,
    p2.x,
    p2.y,
    p2.z,
    p3.x,
    p3.y,
    p3.z,
  ]);
  geom.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geom.computeVertexNormals();
  return new THREE.Mesh(
    geom,
    new THREE.MeshStandardMaterial({
      color,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
    }),
  );
}

function buildSolarSystem({ reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xf5a623,
      emissive: 0xf5a623,
      emissiveIntensity: 0.6,
    }),
  );
  root.add(sun);

  const planets: Array<{ mesh: THREE.Mesh; radius: number; speed: number }> =
    [];

  if (reveal >= 2) {
    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x1b6ca8 }),
    );
    root.add(earth);
    planets.push({ mesh: earth, radius: 2.2, speed: 0.7 });
    const orbit = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(circlePoints(2.2, 64)),
      new THREE.LineBasicMaterial({ color: 0x9ab0c0 }),
    );
    root.add(orbit);
  }
  if (reveal >= 3) {
    const mars = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xc0392b }),
    );
    root.add(mars);
    planets.push({ mesh: mars, radius: 3.1, speed: 0.45 });
    root.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(circlePoints(3.1, 64)),
        new THREE.LineBasicMaterial({ color: 0x9ab0c0 }),
      ),
    );
  }
  if (reveal >= 4) {
    root.add(makeSpriteLabel("Sun", 0, 0.9, 0));
  }

  return {
    root,
    update(elapsed) {
      for (const p of planets) {
        p.mesh.position.x = Math.cos(elapsed * p.speed) * p.radius;
        p.mesh.position.z = Math.sin(elapsed * p.speed) * p.radius;
      }
    },
  };
}

function buildAtom({ reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const nucleus = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xc0392b }),
  );
  root.add(nucleus);

  const electrons: Array<{ mesh: THREE.Mesh; r: number; speed: number; tilt: number }> =
    [];

  if (reveal >= 2) {
    const e1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x1b6ca8 }),
    );
    root.add(e1);
    electrons.push({ mesh: e1, r: 1.4, speed: 1.4, tilt: 0.4 });
  }
  if (reveal >= 3) {
    const e2 = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x2a7a5c }),
    );
    root.add(e2);
    electrons.push({ mesh: e2, r: 2.0, speed: -0.9, tilt: -0.6 });
  }
  if (reveal >= 4) {
    root.add(makeSpriteLabel("nucleus", 0, 0.7, 0));
  }

  return {
    root,
    update(elapsed) {
      for (const e of electrons) {
        e.mesh.position.x = Math.cos(elapsed * e.speed) * e.r;
        e.mesh.position.y = Math.sin(elapsed * e.speed * 0.3) * e.tilt;
        e.mesh.position.z = Math.sin(elapsed * e.speed) * e.r;
      }
    },
  };
}

function buildWave({ reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const points: THREE.Vector3[] = [];
  const n = 80;
  for (let i = 0; i <= n; i += 1) {
    const x = (i / n) * 6 - 3;
    const y = Math.sin(x * 1.6) * (reveal >= 2 ? 0.8 : 0.35);
    points.push(new THREE.Vector3(x, y, 0));
  }
  root.add(
    new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0x1b6ca8 }),
    ),
  );

  if (reveal >= 3) {
    // Amplitude markers
    root.add(
      new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(-2.4, 0, 0),
        0.8,
        0xb86a1e,
        0.15,
        0.1,
      ),
    );
  }
  if (reveal >= 4) {
    root.add(makeSpriteLabel("wavelength →", 0.2, -1.1, 0));
  }

  let phase = 0;
  return {
    root,
    update(_elapsed, dt) {
      if (reveal < 2) return;
      phase += dt * 2.2;
      const pos = (root.children[0] as THREE.Line).geometry.getAttribute(
        "position",
      ) as THREE.BufferAttribute;
      for (let i = 0; i <= n; i += 1) {
        const x = (i / n) * 6 - 3;
        pos.setY(i, Math.sin(x * 1.6 + phase) * 0.8);
      }
      pos.needsUpdate = true;
    },
  };
}

function buildMolecule({ reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const O = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xe74c3c }),
  );
  root.add(O);

  if (reveal >= 2) {
    const H1 = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xecf0f1 }),
    );
    H1.position.set(-0.85, 0.55, 0);
    const H2 = H1.clone();
    H2.position.set(0.85, 0.55, 0);
    root.add(H1, H2);
    root.add(bond(O.position, H1.position));
    root.add(bond(O.position, H2.position));
  }
  if (reveal >= 3) {
    root.add(makeSpriteLabel("H₂O", 0, -1.0, 0));
  }
  return { root };
}

function buildVectors({ reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const origin = new THREE.Vector3(0, 0, 0);

  if (reveal >= 1) {
    root.add(
      new THREE.ArrowHelper(
        new THREE.Vector3(1, 0, 0),
        origin,
        1.8,
        0x1b6ca8,
        0.25,
        0.15,
      ),
    );
  }
  if (reveal >= 2) {
    root.add(
      new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, 0),
        origin,
        1.5,
        0x2a7a5c,
        0.25,
        0.15,
      ),
    );
  }
  if (reveal >= 3) {
    root.add(
      new THREE.ArrowHelper(
        new THREE.Vector3(0.7, 0.7, 0).normalize(),
        origin,
        2.2,
        0xb86a1e,
        0.25,
        0.15,
      ),
    );
  }
  if (reveal >= 4) {
    root.add(makeSpriteLabel("resultant", 1.2, 1.2, 0));
  }
  return { root };
}

function buildHeart({ reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();

  const left = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0xc0392b }),
  );
  left.position.set(-0.35, 0.1, 0);
  left.scale.set(1, 1.15, 0.9);
  const right = left.clone();
  right.position.set(0.35, 0.1, 0);
  root.add(left, right);

  if (reveal >= 2) {
    // Septum divider
    root.add(
      new THREE.Mesh(
        new THREE.BoxGeometry(0.08, 1.1, 0.7),
        new THREE.MeshStandardMaterial({ color: 0x922b21 }),
      ),
    );
  }
  if (reveal >= 3) {
    // Aorta stub
    const aorta = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.7, 12),
      new THREE.MeshStandardMaterial({ color: 0xe74c3c }),
    );
    aorta.position.set(0.15, 0.95, 0);
    root.add(aorta);
  }
  if (reveal >= 4) {
    root.add(makeSpriteLabel("left", -0.9, 0.2, 0.4));
    root.add(makeSpriteLabel("right", 0.9, 0.2, 0.4));
  }
  if (reveal >= 5) {
    root.add(makeSpriteLabel("pumps blood", 0, -1.15, 0));
  }

  let phase = 0;
  return {
    root,
    update(_elapsed, dt) {
      phase += dt * 3.2;
      const beat = 1 + Math.sin(phase) * 0.06;
      left.scale.set(beat, beat * 1.15, beat * 0.9);
      right.scale.set(beat, beat * 1.15, beat * 0.9);
    },
  };
}

function buildCell({ reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const membrane = new THREE.Mesh(
    new THREE.SphereGeometry(1.6, 32, 32),
    new THREE.MeshStandardMaterial({
      color: 0xd5f5e3,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  root.add(membrane);

  if (reveal >= 2) {
    const nucleus = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x8e44ad }),
    );
    root.add(nucleus);
  }
  if (reveal >= 3) {
    for (let i = 0; i < 5; i += 1) {
      const mito = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xe67e22 }),
      );
      const a = (i / 5) * Math.PI * 2;
      mito.position.set(Math.cos(a) * 0.95, Math.sin(a * 1.3) * 0.3, Math.sin(a) * 0.95);
      root.add(mito);
    }
  }
  if (reveal >= 4) {
    root.add(makeSpriteLabel("nucleus", 0, 0.7, 0));
  }
  return { root };
}

function buildGeneric({ plan, reveal }: BuildInput): ThreeSceneHandle {
  const root = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.7, 1),
    new THREE.MeshStandardMaterial({
      color: 0x1b6ca8,
      flatShading: true,
    }),
  );
  root.add(core);

  if (reveal >= 2) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.3, 0.06, 12, 48),
      new THREE.MeshStandardMaterial({ color: 0xb86a1e }),
    );
    ring.rotation.x = Math.PI / 2.4;
    root.add(ring);
  }
  if (reveal >= 3) {
    for (let i = 0; i < 4; i += 1) {
      const node = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0x2a7a5c }),
      );
      const a = (i / 4) * Math.PI * 2;
      node.position.set(Math.cos(a) * 1.3, 0.1, Math.sin(a) * 1.3);
      root.add(node);
    }
  }
  if (reveal >= 4) {
    root.add(makeSpriteLabel(plan.title.slice(0, 24), 0, -1.3, 0));
  }

  return {
    root,
    update(elapsed) {
      core.rotation.y = elapsed * 0.5;
      core.rotation.x = elapsed * 0.2;
    },
  };
}

function bond(a: THREE.Vector3, b: THREE.Vector3): THREE.Mesh {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06, 0.06, len, 8),
    new THREE.MeshStandardMaterial({ color: 0x7f8c8d }),
  );
  mesh.position.copy(mid);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );
  return mesh;
}

function circlePoints(r: number, n: number): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * r, 0, Math.sin(t) * r));
  }
  return pts;
}

function makeSpriteLabel(text: string, x: number, y: number, z: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = "#1a2b3c";
  ctx.font = "bold 28px Lexend, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 32);
  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
  const sprite = new THREE.Sprite(mat);
  sprite.position.set(x, y, z);
  sprite.scale.set(1.6, 0.4, 1);
  return sprite;
}
