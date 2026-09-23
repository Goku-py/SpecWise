"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { PartId } from "./workload-highlights";

const ACCENT = "#FF5500";
const ELECTRIC = "#38E1FF";
// Unibody aluminum palette — neutral studio metals; color comes only from
// workload highlights, never from the materials themselves.
const ALU = "#3B414E";
const ALU_DARK = "#2B2F3A";
const ALU_DECK = "#444A58";
const KEY = "#101219";
const KEY_GLOW = "#16233B";
const TRACKPAD = "#1A1E29";
const BEZEL = "#05060A";

type Tone = "accent" | "electric";

const TONE: Record<PartId, Tone> = {
  cpu: "accent",
  gpu: "accent",
  vram: "accent",
  ram: "electric",
  storage: "electric",
  display: "electric",
  battery: "electric",
  chassis: "electric",
};

const TONE_COLOR: Record<Tone, string> = { accent: ACCENT, electric: ELECTRIC };

interface HeroLaptopProps {
  explode: number;
  activeParts: ReadonlySet<PartId>;
  reduced: boolean;
}

function useGlowLerp(
  matRef: React.RefObject<THREE.MeshStandardMaterial | null>,
  active: boolean,
  reduced: boolean,
  base: number,
  gain: number
): void {
  const k = useRef(0);
  useFrame((_, dt) => {
    const target = active ? 1 : 0;
    k.current = reduced ? target : THREE.MathUtils.damp(k.current, target, 6, dt);
    if (matRef.current) matRef.current.emissiveIntensity = base + k.current * gain;
  });
}

function PartSlab({
  part,
  position,
  size,
  active,
  reduced,
}: {
  part: PartId;
  position: [number, number, number];
  size: [number, number, number];
  active: boolean;
  reduced: boolean;
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useGlowLerp(matRef, active, reduced, 0.06, 1.15);
  return (
    <mesh position={position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        ref={matRef}
        color={ALU_DARK}
        emissive={TONE_COLOR[TONE[part]]}
        emissiveIntensity={0.06}
        metalness={0.7}
        roughness={0.4}
      />
    </mesh>
  );
}

function ChassisBase({ active, reduced }: { active: boolean; reduced: boolean }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useGlowLerp(matRef, active, reduced, 0.02, 0.35);
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.9, 0.12, 2.0]} />
        <meshStandardMaterial
          ref={matRef}
          color={ALU}
          emissive={ELECTRIC}
          emissiveIntensity={0.02}
          metalness={0.9}
          roughness={0.32}
        />
      </mesh>
      {/* front lip seam — dark inset, no glow */}
      <mesh position={[0, -0.01, 1.0]}>
        <boxGeometry args={[2.7, 0.025, 0.02]} />
        <meshStandardMaterial color="#101218" metalness={0.7} roughness={0.5} />
      </mesh>
      {[-1.1, 1.1].map((x) => (
        <mesh key={x} position={[x, 0.06, -1.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 12]} />
          <meshStandardMaterial color="#1C1F28" metalness={0.85} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function KeyboardDeck() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const spaceRef = useRef<THREE.InstancedMesh>(null!);
  const { geom, mat, spaceGeom } = useMemo(
    () => ({
      geom: new THREE.BoxGeometry(0.155, 0.022, 0.155),
      mat: new THREE.MeshStandardMaterial({
        color: KEY,
        emissive: KEY_GLOW,
        emissiveIntensity: 0.35,
        roughness: 0.55,
        metalness: 0.3,
      }),
      spaceGeom: new THREE.BoxGeometry(0.85, 0.022, 0.155),
    }),
    []
  );
  useLayoutEffect(() => {
    const d = new THREE.Object3D();
    let i = 0;
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 12; c += 1) {
        d.position.set(-1.045 + c * 0.19, 0.085, -0.66 + r * 0.185);
        d.updateMatrix();
        ref.current.setMatrixAt(i, d.matrix);
        i += 1;
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
    // bottom row: 3 wide keys instead of full-width spacebar
    const widths = [-0.85, 0, 0.85];
    widths.forEach((x, k) => {
      d.position.set(x, 0.085, -0.66 + 4 * 0.185);
      d.updateMatrix();
      spaceRef.current.setMatrixAt(k, d.matrix);
    });
    spaceRef.current.instanceMatrix.needsUpdate = true;
  }, []);
  useEffect(() => () => {
    geom.dispose(); mat.dispose(); spaceGeom.dispose();
  }, [geom, mat, spaceGeom]);
  return (
    <group>
      {/* deck plate */}
      <mesh position={[0, 0.062, 0]}>
        <boxGeometry args={[2.7, 0.015, 1.86]} />
        <meshStandardMaterial color={ALU_DECK} metalness={0.9} roughness={0.35} />
      </mesh>
      <instancedMesh ref={ref} args={[geom, mat, 48]} />
      <instancedMesh ref={spaceRef} args={[spaceGeom, mat, 3]} />
      {/* glass trackpad */}
      <mesh position={[0, 0.072, 0.62]}>
        <boxGeometry args={[0.95, 0.014, 0.52]} />
        <meshStandardMaterial color={TRACKPAD} metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0, 0.079, 0.62]}>
        <boxGeometry args={[0.95, 0.002, 0.52]} />
        <meshStandardMaterial color="#0B0D14" metalness={0.4} roughness={0.6} transparent opacity={0.35} />
      </mesh>
    </group>
  );
}

function ScreenFace({ active, reduced }: { active: boolean; reduced: boolean }) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  useGlowLerp(matRef, active, reduced, 0.22, 0.5);
  // Single 512x320 desktop texture, drawn once, disposed on unmount.
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 320;
    const ctx = canvas.getContext("2d")!;
    // wallpaper: deep slate gradient
    const bg = ctx.createLinearGradient(0, 0, 512, 320);
    bg.addColorStop(0, "#182641");
    bg.addColorStop(0.55, "#0C1322");
    bg.addColorStop(1, "#060910");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 320);
    // soft glow orb, top right
    const orb = ctx.createRadialGradient(400, 60, 8, 400, 60, 150);
    orb.addColorStop(0, "rgba(56,225,255,0.20)");
    orb.addColorStop(1, "rgba(56,225,255,0)");
    ctx.fillStyle = orb;
    ctx.fillRect(0, 0, 512, 320);
    // menu bar
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    ctx.fillRect(0, 0, 512, 22);
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.fillRect(14, 9, 40, 5);
    ctx.fillRect(440, 9, 58, 5);
    // editor window
    const wx = 36, wy = 44, ww = 440, wh = 208;
    ctx.fillStyle = "rgba(8,11,19,0.92)";
    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 10);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(wx, wy, ww, wh, 10);
    ctx.stroke();
    // traffic lights
    const dots: Array<[number, string]> = [[58, "#FF5F57"], [78, "#FEBC2E"], [98, "#28C840"] ];
    dots.forEach(([x, c]) => {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(x, wy + 20, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    // sidebar + code lines
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fillRect(wx, wy + 36, 110, wh - 36);
    const rows = [92, 110, 128, 146, 164, 182, 200, 218];
    rows.forEach((y, i) => {
      const indent = 170 + ((i * 37) % 3) * 22;
      const len = 280 - ((i * 53) % 90);
      ctx.fillStyle = i === 2 ? "rgba(255,85,0,0.55)" : i === 5 ? "rgba(56,225,255,0.5)" : i % 2 ? "#2A3550" : "#3B4767";
      ctx.fillRect(indent, y, len, 8);
    });
    // dock
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(156, 292, 200, 18, 9);
    ctx.fill();
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i === 2 ? "rgba(255,85,0,0.8)" : "rgba(255,255,255,0.30)";
      ctx.beginPath();
      ctx.arc(178 + i * 30, 301, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => {
    texture.dispose();
  }, [texture]);
  return (
    <mesh position={[0, 0.95, 0.045]}>
      <planeGeometry args={[2.6, 1.6]} />
      <meshStandardMaterial
        ref={matRef}
        map={texture}
        emissive="#ffffff"
        emissiveMap={texture}
        emissiveIntensity={0.22}
        roughness={0.35}
        metalness={0.1}
      />
    </mesh>
  );
}

/**
 * Procedural laptop: aluminum unibody, instanced backlit keyboard, glass
 * trackpad, desktop-texture screen. Explode separates 4 subgroups;
 * active parts glow via emissive lerp. ~20 meshes total.
 */
export function HeroLaptop({ explode, activeParts, reduced }: HeroLaptopProps) {
  const lidRef = useRef<THREE.Group>(null!);
  const deckRef = useRef<THREE.Group>(null!);
  const internRef = useRef<THREE.Group>(null!);
  const baseRef = useRef<THREE.Group>(null!);

  useFrame((_, dt) => {
    const groups = [lidRef, deckRef, internRef, baseRef];
    const offsets = [0.9, 0.45, 0.15, 0];
    groups.forEach((g, i) => {
      if (!g.current) return;
      const target = offsets[i] * explode;
      g.current.position.y = reduced ? target : THREE.MathUtils.damp(g.current.position.y, target, 6, dt);
    });
  });

  const has = (p: PartId): boolean => activeParts.has(p);

  return (
    <group>
      <group ref={baseRef}>
        <ChassisBase active={has("chassis")} reduced={reduced} />
      </group>
      <group ref={internRef}>
        <PartSlab part="cpu" position={[-0.85, 0, -0.45]} size={[0.55, 0.05, 0.55]} active={has("cpu")} reduced={reduced} />
        <PartSlab part="gpu" position={[0, 0, -0.45]} size={[0.7, 0.05, 0.55]} active={has("gpu")} reduced={reduced} />
        <PartSlab part="vram" position={[0.85, 0, -0.45]} size={[0.4, 0.05, 0.55]} active={has("vram")} reduced={reduced} />
        <PartSlab part="ram" position={[-0.7, 0, 0.3]} size={[0.8, 0.05, 0.3]} active={has("ram")} reduced={reduced} />
        <PartSlab part="ram" position={[0.25, 0, 0.3]} size={[0.8, 0.05, 0.3]} active={has("ram")} reduced={reduced} />
        <PartSlab part="storage" position={[1.0, 0, 0.3]} size={[0.45, 0.05, 0.6]} active={has("storage")} reduced={reduced} />
        <PartSlab part="battery" position={[-0.2, 0, 0.72]} size={[1.6, 0.05, 0.4]} active={has("battery")} reduced={reduced} />
      </group>
      <group ref={deckRef}>
        <KeyboardDeck />
      </group>
      <group ref={lidRef}>
        <group position={[0, 0.06, -1.0]} rotation={[-0.12, 0, 0]}>
          {/* aluminum lid */}
          <mesh position={[0, 0.95, 0]}>
            <boxGeometry args={[2.9, 1.9, 0.07]} />
            <meshStandardMaterial color={ALU} metalness={0.9} roughness={0.32} />
          </mesh>
          {/* black bezel inset */}
          <mesh position={[0, 0.95, 0.038]}>
            <boxGeometry args={[2.74, 1.74, 0.012]} />
            <meshStandardMaterial color={BEZEL} metalness={0.4} roughness={0.5} />
          </mesh>
          <ScreenFace active={has("display")} reduced={reduced} />
          {/* webcam */}
          <mesh position={[0, 1.76, 0.048]}>
            <sphereGeometry args={[0.022, 12, 12]} />
            <meshStandardMaterial color="#0B0D14" emissive="#1E2A44" emissiveIntensity={0.5} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
