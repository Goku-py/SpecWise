"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { ContactShadows, Html } from "@react-three/drei"
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js"
import * as THREE from "three"
import type { LaptopDetail } from "@/lib/types"
import type { ExplodeLayerId } from "@/lib/layer-specs"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface ExplodedLaptopProps {
  laptop: LaptopDetail
  activeLayer: ExplodeLayerId | null
  onSelectLayer: (id: ExplodeLayerId | null) => void
}

const LAYER_IDS: ExplodeLayerId[] = [
  "display", "heatsink", "gpu", "cpu", "ram", "ssd", "battery", "motherboard",
]

const LAYER_LABEL: Record<ExplodeLayerId, string> = {
  display: "Display",
  heatsink: "Heatsink",
  gpu: "GPU",
  cpu: "CPU",
  ram: "RAM",
  ssd: "SSD",
  battery: "Battery",
  motherboard: "Board",
}

const OFFSET = 0.56
const ACTIVE_LIFT = 0.9
const ACTIVE_COLOR = "#FF5500"
const COPPER = "#B0703C"
const PCB = "#1E4D3B"
const ALU = "#3B414E"

/** Procedural studio reflections so metals read as metal (no HDR fetch). */
function StudioEnv() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envTex
    scene.environmentIntensity = 0.5
    return () => {
      scene.environment = null
      envTex.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function LayerShell({
  index,
  id,
  active,
  onClick,
  reducedMotion,
  children,
}: {
  index: number
  id: ExplodeLayerId
  active: boolean
  onClick: () => void
  reducedMotion: boolean
  children: React.ReactNode
}) {
  const ref = useRef<THREE.Group>(null!)
  // index 0 (display) floats on top, motherboard forms the base
  const restY = (LAYER_IDS.length - 1 - index) * OFFSET
  useFrame((_, dt) => {
    const g = ref.current
    if (!g) return
    const target = restY + (active ? ACTIVE_LIFT : 0)
    g.position.y = reducedMotion ? target : THREE.MathUtils.damp(g.position.y, target, 6, dt)
  })
  return (
    <group ref={ref} position={[0, restY, 0]}>
      <group
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
      >
        {children}
      </group>
      {/* floating name tag — always visible, highlighted when active */}
      <Html position={[2.35, 0.1, 0]} center distanceFactor={9} occlude={false}>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            color: active ? ACTIVE_COLOR : "#9CA3AF",
            background: "rgba(9,10,15,0.72)",
            border: `1px solid ${active ? ACTIVE_COLOR : "#1F2430"}`,
            borderRadius: 4,
            padding: "2px 6px",
            cursor: "pointer",
          }}
        >
          {LAYER_LABEL[id]}
        </button>
      </Html>
    </group>
  )
}

function GlowMat({
  active,
  color,
  emissiveBase = "#000000",
  metalness = 0.7,
  roughness = 0.4,
}: {
  active: boolean
  color: string
  emissiveBase?: string
  metalness?: number
  roughness?: number
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null!)
  useFrame(() => {
    if (matRef.current) matRef.current.emissive.set(active ? ACTIVE_COLOR : emissiveBase)
  })
  return (
    <meshStandardMaterial
      ref={matRef}
      color={color}
      emissive={active ? ACTIVE_COLOR : emissiveBase}
      emissiveIntensity={active ? 0.85 : 0.12}
      metalness={metalness}
      roughness={roughness}
    />
  )
}

/** Recognizable mini-model per layer — silhouette + material tells the story. */
function LayerModel({ id, active }: { id: ExplodeLayerId; active: boolean }) {
  switch (id) {
    case "display":
      return (
        <group>
          <mesh>
            <boxGeometry args={[3, 0.1, 2]} />
            <GlowMat active={active} color={ALU} />
          </mesh>
          {/* glowing screen face */}
          <mesh position={[0, 0.055, 0]}>
            <boxGeometry args={[2.7, 0.012, 1.7]} />
            <meshStandardMaterial
              color="#0A1626"
              emissive={active ? ACTIVE_COLOR : "#1D4E63"}
              emissiveIntensity={active ? 0.9 : 0.55}
              roughness={0.3}
              metalness={0.2}
            />
          </mesh>
        </group>
      )
    case "heatsink":
      return (
        <group>
          {/* copper base plate */}
          <mesh>
            <boxGeometry args={[2.2, 0.06, 1.4]} />
            <GlowMat active={active} color={COPPER} metalness={0.9} roughness={0.3} />
          </mesh>
          {/* cooling fins */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh key={i} position={[-0.85 + i * 0.34, 0.12, 0]}>
              <boxGeometry args={[0.06, 0.18, 1.4]} />
              <GlowMat active={active} color={COPPER} metalness={0.9} roughness={0.35} />
            </mesh>
          ))}
          {/* heat pipe */}
          <mesh position={[0, 0.05, 0.55]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 2.2, 10]} />
            <GlowMat active={active} color="#8A5326" metalness={0.95} roughness={0.25} />
          </mesh>
        </group>
      )
    case "gpu":
      return (
        <group>
          <mesh>
            <boxGeometry args={[1.1, 0.12, 1.1]} />
            <GlowMat active={active} color="#151923" metalness={0.5} roughness={0.45} />
          </mesh>
          {/* die */}
          <mesh position={[0, 0.075, 0]}>
            <boxGeometry args={[0.55, 0.04, 0.55]} />
            <meshStandardMaterial
              color="#0C0F16"
              emissive={active ? ACTIVE_COLOR : "#2A3B5C"}
              emissiveIntensity={active ? 0.9 : 0.5}
              roughness={0.3}
              metalness={0.6}
            />
          </mesh>
        </group>
      )
    case "cpu":
      return (
        <group>
          {/* pins substrate */}
          <mesh>
            <boxGeometry args={[0.9, 0.05, 0.9]} />
            <GlowMat active={active} color={PCB} metalness={0.2} roughness={0.6} />
          </mesh>
          {/* heat spreader */}
          <mesh position={[0, 0.06, 0]}>
            <boxGeometry args={[0.7, 0.07, 0.7]} />
            <GlowMat active={active} color="#9AA2B5" metalness={0.95} roughness={0.25} />
          </mesh>
        </group>
      )
    case "ram":
      return (
        <group>
          <mesh>
            <boxGeometry args={[1.7, 0.05, 0.55]} />
            <GlowMat active={active} color={PCB} metalness={0.2} roughness={0.6} />
          </mesh>
          {/* memory chips */}
          {[-0.6, -0.2, 0.2, 0.6].map((x) => (
            <mesh key={x} position={[x, 0.05, 0]}>
              <boxGeometry args={[0.28, 0.05, 0.4]} />
              <GlowMat active={active} color="#101319" metalness={0.4} roughness={0.5} />
            </mesh>
          ))}
          {/* gold contacts */}
          <mesh position={[0, -0.01, 0.31]}>
            <boxGeometry args={[1.6, 0.02, 0.06]} />
            <meshStandardMaterial color="#C9A227" metalness={0.95} roughness={0.3} />
          </mesh>
        </group>
      )
    case "ssd":
      return (
        <group>
          <mesh>
            <boxGeometry args={[0.9, 0.05, 0.32]} />
            <GlowMat active={active} color={PCB} metalness={0.2} roughness={0.6} />
          </mesh>
          <mesh position={[-0.2, 0.045, 0]}>
            <boxGeometry args={[0.35, 0.045, 0.24]} />
            <GlowMat active={active} color="#101319" metalness={0.4} roughness={0.5} />
          </mesh>
          {/* label stripe */}
          <mesh position={[0.22, 0.052, 0]}>
            <boxGeometry args={[0.3, 0.012, 0.24]} />
            <meshStandardMaterial color="#D7DBE3" metalness={0.1} roughness={0.7} />
          </mesh>
        </group>
      )
    case "battery":
      return (
        <group>
          <mesh>
            <boxGeometry args={[2.5, 0.16, 1.1]} />
            <GlowMat active={active} color="#23262F" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* cell dividers */}
          {[-0.62, 0, 0.62].map((x) => (
            <mesh key={x} position={[x, 0.085, 0]}>
              <boxGeometry args={[0.03, 0.012, 1.0]} />
              <meshStandardMaterial color="#0C0E13" roughness={0.7} />
            </mesh>
          ))}
          {/* charge label */}
          <mesh position={[-0.95, 0.085, 0]}>
            <boxGeometry args={[0.4, 0.012, 0.5]} />
            <meshStandardMaterial
              color="#0C0E13"
              emissive={active ? ACTIVE_COLOR : "#00D26A"}
              emissiveIntensity={active ? 0.9 : 0.5}
            />
          </mesh>
        </group>
      )
    case "motherboard":
      return (
        <group>
          <mesh>
            <boxGeometry args={[3, 0.07, 2]} />
            <GlowMat active={active} color={PCB} metalness={0.2} roughness={0.65} />
          </mesh>
          {/* traces */}
          {[-0.5, 0, 0.5].map((z) => (
            <mesh key={z} position={[0, 0.04, z]}>
              <boxGeometry args={[2.7, 0.008, 0.05]} />
              <meshStandardMaterial color="#2E7D5F" roughness={0.6} />
            </mesh>
          ))}
          {/* chipset + caps */}
          <mesh position={[-0.9, 0.08, -0.4]}>
            <boxGeometry args={[0.5, 0.1, 0.5]} />
            <GlowMat active={active} color="#101319" metalness={0.4} roughness={0.5} />
          </mesh>
          {[0.3, 0.65, 1.0].map((x) => (
            <mesh key={x} position={[x, 0.09, 0.5]}>
              <cylinderGeometry args={[0.07, 0.07, 0.12, 10]} />
              <GlowMat active={active} color="#1A1E29" metalness={0.7} roughness={0.4} />
            </mesh>
          ))}
        </group>
      )
  }
}

function Scene({
  activeLayer,
  onSelectLayer,
  reducedMotion,
}: {
  activeLayer: ExplodeLayerId | null
  onSelectLayer: (id: ExplodeLayerId | null) => void
  reducedMotion: boolean
}) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 8, 5]} intensity={1.5} color="#FFF4E8" />
      <directionalLight position={[-4, 3, -2]} intensity={0.4} color="#9DB8FF" />
      <StudioEnv />
      <ContactShadows position={[0, -0.6, 0]} opacity={0.65} scale={10} blur={2.2} far={4} resolution={512} color="#000000" />
      {LAYER_IDS.map((id, i) => {
        const active = activeLayer === id
        return (
          <LayerShell
            key={id}
            index={i}
            id={id}
            active={active}
            reducedMotion={reducedMotion}
            onClick={() => onSelectLayer(active ? null : id)}
          >
            <LayerModel id={id} active={active} />
          </LayerShell>
        )
      })}
    </>
  )
}

export default function ExplodedLaptop({
  activeLayer,
  onSelectLayer,
}: ExplodedLaptopProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [frameloop, setFrameloop] = useState<"always" | "never">("never")
  const reducedMotion = useReducedMotion()

  // IntersectionObserver for frameloop toggle
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        setFrameloop(entry.isIntersecting ? "always" : "never")
      },
      { threshold: 0 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="h-80 rounded border border-border bg-card"
    >
      <Canvas
        dpr={[1, 1.75]}
        frameloop={frameloop}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [4.8, 3.6, 5.8], fov: 42 }}
        onCreated={({ camera }) => camera.lookAt(0, 2.0, 0)}
      >
        <Scene
          activeLayer={activeLayer}
          onSelectLayer={onSelectLayer}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  )
}
