"use client"

import { useRef, useState, useEffect } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import type { LaptopDetail } from "@/lib/types"
import type { ExplodeLayerId } from "@/lib/layer-specs"
import type { Mesh, MeshStandardMaterial } from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface ExplodedLaptopProps {
  laptop: LaptopDetail
  activeLayer: ExplodeLayerId | null
  onSelectLayer: (id: ExplodeLayerId | null) => void
}

const LAYER_IDS: ExplodeLayerId[] = [
  "display", "heatsink", "gpu", "cpu", "ram", "ssd", "battery", "motherboard",
]

const OFFSET = 0.4
const BOX_SIZE: [number, number, number] = [3, 0.15, 2]
const BASE_COLOR = "#1A1D28"
const ACTIVE_COLOR = "#FF5500"

function LayerBox({
  index,
  active,
  onClick,
  reducedMotion,
}: {
  index: number
  active: boolean
  onClick: () => void
  reducedMotion: boolean
}) {
  const meshRef = useRef<Mesh>(null!)
  const targetY = index * OFFSET + (active ? 1.5 : 0)
  const materialRef = useRef<MeshStandardMaterial>(null!)

  useFrame(() => {
    if (!meshRef.current || reducedMotion) {
      if (reducedMotion && meshRef.current) {
        meshRef.current.position.y = targetY
      }
      return
    }
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * 0.08
  })

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.emissive.set(active ? ACTIVE_COLOR : "#000000")
    }
  }, [active])

  return (
    <mesh
      ref={meshRef}
      position={[0, index * OFFSET, 0]}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <boxGeometry args={BOX_SIZE} />
      <meshStandardMaterial
        ref={materialRef}
        color={BASE_COLOR}
        emissive={active ? ACTIVE_COLOR : "#000000"}
        roughness={0.6}
        metalness={0.3}
      />
    </mesh>
  )
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
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 8, 5]} intensity={1} />
      {LAYER_IDS.map((id, i) => (
        <LayerBox
          key={id}
          index={i}
          active={activeLayer === id}
          onClick={() => onSelectLayer(activeLayer === id ? null : id)}
          reducedMotion={reducedMotion}
        />
      ))}
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
      className="h-64 rounded border border-border bg-card"
    >
      <Canvas
        dpr={[1, 1.75]}
        frameloop={frameloop}
        gl={{ antialias: true, powerPreference: "high-performance" }}
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
