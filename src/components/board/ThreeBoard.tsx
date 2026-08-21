"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  ANATOMY_MODE_LABELS,
  STRUCTURE_BY_ID,
  structuresForReveal,
} from "@/lib/anatomy/registry";
import type {
  AnatomyAnimationMode,
  AnatomySceneHandle,
  AnatomyStructureId,
} from "@/lib/anatomy/types";
import { buildThreeScene } from "@/lib/three-scenes/buildScene";
import { loadThreeScene } from "@/lib/three-scenes/loadScene";
import type { ThreeSceneHandle } from "@/lib/three-scenes/buildScene";
import type { ThreeScenePlan } from "@/lib/three-scenes/decide";

type ThreeBoardProps = {
  plan: ThreeScenePlan;
  className?: string;
  playing?: boolean;
  speed?: number;
  selectedStructure?: AnatomyStructureId | null;
  focusStructures?: AnatomyStructureId[];
  animationMode?: AnatomyAnimationMode;
  onSelectStructure?: (structure: AnatomyStructureId | null) => void;
  showStructureControls?: boolean;
};

/**
 * Interactive Three.js panel. Drag to orbit, scroll to zoom.
 * The renderer remains mounted while scene reveal and focus state change.
 */
export function ThreeBoard({
  plan,
  className,
  playing = true,
  speed = 1,
  selectedStructure = null,
  focusStructures = [],
  animationMode = "overview",
  onSelectStructure,
  showStructureControls = false,
}: ThreeBoardProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const runtimeRef = useRef<ThreeSceneHandle | null>(null);
  const anatomyRef = useRef<AnatomySceneHandle | null>(null);
  const playingRef = useRef(playing);
  const speedRef = useRef(speed);
  const visibleRef = useRef(true);
  const reducedMotionRef = useRef(false);
  const cameraGoalRef = useRef<{
    position: THREE.Vector3;
    target: THREE.Vector3;
  } | null>(null);
  const [rendererReady, setRendererReady] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    let alive = true;

    const width = Math.max(1, mount.clientWidth);
    const height = Math.max(1, mount.clientHeight);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4f1eb);
    scene.fog = new THREE.Fog(0xf4f1eb, 10, 22);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.4, 2.8, 6);
    cameraRef.current = camera;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance",
      });
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.domElement.tabIndex = 0;
      renderer.domElement.setAttribute(
        "aria-label",
        `${plan.title} interactive 3D viewport`,
      );
      mount.appendChild(renderer.domElement);
    } catch {
      queueMicrotask(() =>
        setLoadError(
          "WebGL is unavailable. Use the structure list and written explanation instead.",
        ),
      );
      return;
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 0.2, 0);
    controls.minDistance = 2.2;
    controls.maxDistance = 13;
    controlsRef.current = controls;

    const hemi = new THREE.HemisphereLight(0xfffbeb, 0x8da0b7, 1.45);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x93c5fd, 1.1);
    fill.position.set(-5, 2, 3);
    scene.add(fill);
    const rim = new THREE.DirectionalLight(0xfda4af, 0.85);
    rim.position.set(0, 4, -6);
    scene.add(rim);

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (visibleRef.current) {
        if (playingRef.current) elapsed += dt * speedRef.current;
        runtimeRef.current?.update?.(
          elapsed,
          playingRef.current ? dt * speedRef.current : 0,
        );
      }
      const cameraGoal = cameraGoalRef.current;
      if (cameraGoal) {
        camera.position.lerp(cameraGoal.position, 0.075);
        controls.target.lerp(cameraGoal.target, 0.075);
        if (
          camera.position.distanceTo(cameraGoal.position) < 0.03 &&
          controls.target.distanceTo(cameraGoal.target) < 0.03
        ) {
          cameraGoalRef.current = null;
        }
      }
      controls.update();
      if (visibleRef.current) renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const w = Math.max(1, Math.floor(entry.contentRect.width));
      const h = Math.max(1, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    ro.observe(mount);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const pick = (event: PointerEvent): AnatomyStructureId | null => {
      const anatomy = anatomyRef.current;
      if (!anatomy) return null;
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(anatomy.pickables, true)[0];
      return hit ? anatomy.getStructureForObject(hit.object) : null;
    };
    const onPointerMove = (event: PointerEvent) => {
      renderer.domElement.style.cursor = pick(event) ? "pointer" : "grab";
    };
    const onClick = (event: PointerEvent) => {
      const structure = pick(event);
      if (structure) onSelectStructure?.(structure);
    };
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === "visible";
      last = performance.now();
    };
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibility);

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => {
      reducedMotionRef.current = motionQuery.matches;
      setReducedMotion(motionQuery.matches);
    };
    onMotion();
    motionQuery.addEventListener("change", onMotion);
    queueMicrotask(() => {
      if (alive) setRendererReady(true);
    });

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
      motionQuery.removeEventListener("change", onMotion);
      runtimeRef.current?.dispose?.();
      runtimeRef.current = null;
      anatomyRef.current = null;
      controls.dispose();
      renderer.dispose();
      scene.clear();
      sceneRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // Renderer and interaction lifecycle are intentionally mount-only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!rendererReady || !sceneRef.current) return;
    const scene = sceneRef.current;
    let cancelled = false;
    setLoadError(null);
    setLoadProgress(0);

    void loadThreeScene(plan, setLoadProgress)
      .then(({ handle, anatomy }) => {
        if (cancelled) {
          handle.dispose?.();
          return;
        }
        if (runtimeRef.current) {
          scene.remove(runtimeRef.current.root);
          runtimeRef.current.dispose?.();
        }
        runtimeRef.current = handle;
        anatomyRef.current = anatomy;
        scene.add(handle.root);
        if (anatomy) {
          anatomy.setState({
            reveal: plan.reveal,
            selectedStructure,
            focusedStructures: focusStructures,
            animationMode,
            playing,
            speed,
            reducedMotion: reducedMotionRef.current,
          });
        }
        setLoadProgress(1);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(
          error instanceof Error
            ? `The anatomy model could not load: ${error.message}`
            : "The anatomy model could not load.",
        );
      });

    return () => {
      cancelled = true;
    };
    // Changing reveal/focus updates the live scene below without reloading GLBs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, rendererReady]);

  useEffect(() => {
    playingRef.current = playing;
    speedRef.current = speed;
    anatomyRef.current?.setState({
      reveal: plan.reveal,
      selectedStructure,
      focusedStructures: focusStructures,
      animationMode,
      playing,
      speed,
      reducedMotion,
    });

    const focus = selectedStructure ?? focusStructures[0];
    if (focus && anatomyRef.current) {
      cameraGoalRef.current = anatomyRef.current.getFocusTarget(focus);
    }
  }, [
    animationMode,
    focusStructures,
    plan.reveal,
    playing,
    reducedMotion,
    selectedStructure,
    speed,
  ]);

  useEffect(() => {
    if (
      !rendererReady ||
      anatomyRef.current ||
      !runtimeRef.current ||
      !sceneRef.current
    ) {
      return;
    }
    const scene = sceneRef.current;
    const previous = runtimeRef.current;
    const next = buildThreeScene({ plan, reveal: plan.reveal });
    scene.remove(previous.root);
    previous.dispose?.();
    runtimeRef.current = next;
    scene.add(next.root);
  }, [plan, plan.reveal, rendererReady]);

  const availableStructures = useMemo(
    () =>
      plan.id === "cardiopulmonary" || plan.id === "eye"
        ? structuresForReveal(
            plan.reveal,
            plan.id === "eye" ? "eye" : "cardiopulmonary",
          )
        : [],
    [plan.id, plan.reveal],
  );

  return (
    <div
      className={
        className ??
        "relative h-full min-h-70 w-full overflow-hidden rounded-xl border border-board-edge bg-board"
      }
      aria-label={`${plan.title} — interactive 3D`}
    >
      <div ref={mountRef} className="absolute inset-0" />
      <div className="pointer-events-none absolute left-3 top-3 hidden max-w-[46%] truncate rounded-lg border border-border bg-card/85 px-2.5 py-1.5 font-sans text-[11px] text-ink shadow-sm backdrop-blur sm:block">
        <span className="font-semibold text-accent-deep">{plan.title}</span>
        <span className="text-muted">
          {" "}
          · {ANATOMY_MODE_LABELS[animationMode] ?? "drag to orbit"}
        </span>
      </div>
      {showStructureControls && availableStructures.length ? (
        <label className="absolute right-3 top-3 flex max-w-[calc(100%-1.5rem)] items-center gap-2 rounded-lg border border-border bg-card/90 px-2.5 py-1.5 font-sans text-[11px] text-muted shadow-sm backdrop-blur">
          Structure
          <select
            value={selectedStructure ?? ""}
            onChange={(event) =>
              onSelectStructure?.(
                (event.target.value as AnatomyStructureId) || null,
              )
            }
            className="max-w-40 bg-transparent font-semibold text-ink outline-none"
          >
            <option value="">Overview</option>
            {availableStructures.map((structure) => (
              <option key={structure.id} value={structure.id}>
                {structure.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {loadProgress < 1 && !loadError ? (
        <div
          className="absolute inset-x-4 bottom-4 rounded-lg border border-board-edge bg-card/90 p-3 font-sans text-xs text-ink shadow-sm"
          role="status"
        >
          <div className="mb-1.5 flex justify-between">
            <span>Loading anatomy model…</span>
            <span>{Math.round(loadProgress * 100)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-board-edge/50">
            <div
              className="h-full rounded-full bg-accent transition-[width]"
              style={{ width: `${Math.max(4, loadProgress * 100)}%` }}
            />
          </div>
        </div>
      ) : null}
      {loadError ? (
        <div
          className="absolute inset-4 grid place-items-center rounded-xl border border-error/30 bg-card/95 p-6 text-center font-sans text-sm text-error"
          role="alert"
        >
          <div>
            <p className="font-semibold">3D view unavailable</p>
            <p className="mt-1 max-w-md text-xs text-error/80">{loadError}</p>
          </div>
        </div>
      ) : null}
      {reducedMotion ? (
        <p className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-card/85 px-2 py-1 font-sans text-[10px] text-muted">
          Reduced motion: animation held on a representative frame
        </p>
      ) : null}
      {selectedStructure && STRUCTURE_BY_ID[selectedStructure] ? (
        <p className="pointer-events-none absolute bottom-3 right-3 max-w-[min(320px,70%)] rounded-lg border border-border bg-card/90 px-3 py-2 font-sans text-xs text-ink shadow-sm backdrop-blur">
          <span className="font-semibold text-accent-deep">
            {STRUCTURE_BY_ID[selectedStructure].label}
          </span>
          <span className="ml-1 text-muted">
            {STRUCTURE_BY_ID[selectedStructure].function}
          </span>
        </p>
      ) : null}
    </div>
  );
}
