"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import * as THREE from "three";
import { HeroLaptop } from "./hero-laptop";
import type { PartId } from "./workload-highlights";

export interface PointerState {
  x: number;
  y: number;
}

interface HeroLaptopSceneProps {
  quality: "high" | "low";
  activeParts: ReadonlySet<PartId>;
  inView: boolean;
  pointerRef: RefObject<PointerState>;
  reduced: boolean;
}

const BASE_CAM: [number, number, number] = [3.5, 1.8, 4.8];
const LOOK_AT = new THREE.Vector3(0, 0.25, 0);

/**
 * Procedural studio reflections: PMREM + RoomEnvironment gives the aluminum
 * real metallic response with zero external assets (no HDR fetch).
 */
function StudioEnv() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.45;
    return () => {
      scene.environment = null;
      envTex.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

function Rig({
  pointerRef,
  reduced,
}: {
  pointerRef: RefObject<PointerState>;
  reduced: boolean;
}) {
  const { camera } = useThree();
  useFrame((_, dt) => {
    if (reduced) return;
    const p = pointerRef.current ?? { x: 0, y: 0 };
    const tx = BASE_CAM[0] + p.x * 0.5;
    const ty = BASE_CAM[1] + p.y * 0.3;
    camera.position.x = THREE.MathUtils.damp(camera.position.x, tx, 4, dt);
    camera.position.y = THREE.MathUtils.damp(camera.position.y, ty, 4, dt);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, BASE_CAM[2], 4, dt);
    camera.lookAt(LOOK_AT);
  });
  return null;
}

/**
 * Scene content for the hero laptop: lights, faint blueprint grid, laptop.
 * Pointer parallax + scroll explode; both inert when reduced or low quality.
 */
export default function HeroLaptopScene({
  quality,
  activeParts,
  inView: _inView,
  pointerRef,
  reduced,
}: HeroLaptopSceneProps) {
  const [explodeTarget, setExplodeTarget] = useState(0);
  const animated = !reduced && quality === "high";

  useEffect(() => {
    if (!animated) {
      setExplodeTarget(0);
      return;
    }
    let raf = 0;
    let queued = false;
    const update = (): void => {
      queued = false;
      const vh = window.innerHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / vh, 0), 1) * 0.85;
      setExplodeTarget(progress);
    };
    const onScroll = (): void => {
      if (queued) return;
      queued = true;
      raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(raf);
    };
  }, [animated]);

  return (
    <>
      {/* studio: soft ambient + warm key + cool rims */}
      <ambientLight intensity={0.35} />
      <directionalLight position={[5, 7, 4]} intensity={1.6} color="#FFF4E8" />
      <directionalLight position={[-4, 3, -2]} intensity={0.35} color="#9DB8FF" />
      <pointLight position={[-5, 2, 3]} intensity={0.4} color="#38E1FF" />
      <pointLight position={[0, 1, -4]} intensity={0.3} color="#FF5500" />
      <gridHelper
        args={[14, 28, "#1A1E29", "#11141C"]}
        position={[0, -1.1, 0]}
        material-transparent
        material-opacity={0.35}
      />
      <ContactShadows position={[0, -1.02, 0]} opacity={0.7} scale={11} blur={2.4} far={3.5} resolution={512} color="#000000" />
      <StudioEnv />
      <Rig pointerRef={pointerRef} reduced={reduced} />
      <YawGroup pointerRef={pointerRef} reduced={reduced}>
        <HeroLaptop explode={explodeTarget} activeParts={activeParts} reduced={reduced} />
      </YawGroup>
    </>
  );
}

function YawGroup({
  children,
  pointerRef,
  reduced,
}: {
  children: React.ReactNode;
  pointerRef: RefObject<PointerState>;
  reduced: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null!);
  const yaw = useRef(0);
  useFrame((_, dt) => {
    if (reduced || !groupRef.current) return;
    const p = pointerRef.current ?? { x: 0, y: 0 };
    yaw.current = THREE.MathUtils.damp(yaw.current, p.x * 0.12, 4, dt);
    groupRef.current.rotation.y = yaw.current;
  });
  return <group ref={groupRef}>{children}</group>;
}
