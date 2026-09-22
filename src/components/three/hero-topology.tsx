"use client"

import { useRef, useMemo, useEffect, useLayoutEffect, useCallback, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useReducedMotion } from "@/hooks/use-reduced-motion"

interface HeroTopologyProps {
  quality?: "high" | "low"
}

const ACCENT = "#FF5500"
const ACCENT_VEC = new THREE.Color(ACCENT)
const NODE_KINDS = ["CPU", "GPU", "RAM", "DISPLAY", "THERMAL", "BATTERY", "STORAGE", "SCORE"] as const
type NodeKind = (typeof NODE_KINDS)[number]

const NODE_POS: Record<NodeKind, [number, number, number]> = {
  CPU: [-3, 1.5, 0], GPU: [-1.5, 2.5, 0], RAM: [0, 1, 0], DISPLAY: [1.5, 2, 0],
  THERMAL: [3, 1.5, 0], BATTERY: [-2, -1.5, 0], STORAGE: [1, -2, 0], SCORE: [2.5, -1, 0],
}

const LINKS: [NodeKind, NodeKind][] = [
  ["CPU", "GPU"], ["CPU", "RAM"], ["GPU", "DISPLAY"], ["RAM", "STORAGE"],
  ["CPU", "THERMAL"], ["THERMAL", "GPU"], ["BATTERY", "CPU"], ["BATTERY", "DISPLAY"],
  ["SCORE", "CPU"], ["SCORE", "GPU"], ["SCORE", "DISPLAY"], ["SCORE", "RAM"],
  ["SCORE", "STORAGE"], ["SCORE", "BATTERY"], ["SCORE", "THERMAL"],
]

const HIGH_COUNT = 200
const LOW_COUNT = 80

/* ── Helpers ────────────────────────────────────────────────────── */

// Particle buffers are created in an effect context (not render), so the
// Math.random calls here are fine; mutation happens on ref contents only.
function createParticleBuffers(count: number): { pos: Float32Array; vel: Float32Array } {
  const pos = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) pos[i] = (Math.random() - 0.5) * (i % 3 === 0 ? 12 : i % 3 === 1 ? 8 : 4)
  const vel = new Float32Array(count * 3)
  for (let i = 0; i < count * 3; i++) vel[i] = (Math.random() - 0.5) * 0.002
  return { pos, vel }
}

/* ── Hooks ──────────────────────────────────────────────────────── */

function useFrameloop(ref: React.RefObject<HTMLDivElement | null>): "always" | "never" {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return inView ? "always" : "never"
}

/* ── ParticleField ──────────────────────────────────────────────── */

function ParticleField({ count, reduced }: { count: number; reduced: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const scratch = useMemo(() => new THREE.Object3D(), [])
  const posRef = useRef<Float32Array | null>(null)
  const velRef = useRef<Float32Array | null>(null)
  const { geom, mat } = useMemo(() => ({
    geom: new THREE.SphereGeometry(0.04, 6, 6),
    mat: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT_VEC, emissiveIntensity: 0.3, transparent: true, opacity: 0.6 }),
  }), [])

  useLayoutEffect(() => {
    const { pos, vel } = createParticleBuffers(count)
    posRef.current = pos
    velRef.current = vel
    const d = new THREE.Object3D()
    for (let i = 0; i < count; i++) {
      d.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); d.updateMatrix()
      ref.current.setMatrixAt(i, d.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  }, [count])

  useFrame(() => {
    const pos = posRef.current
    const vel = velRef.current
    if (reduced || !pos || !vel) return
    for (let i = 0; i < count; i++) {
      for (let j = 0; j < 3; j++) {
        pos[i * 3 + j] += vel[i * 3 + j]
        const bound = j === 0 ? 6 : j === 1 ? 4 : 2
        if (Math.abs(pos[i * 3 + j]) > bound) { vel[i * 3 + j] *= -1; pos[i * 3 + j] = Math.sign(pos[i * 3 + j]) * bound }
      }
      scratch.position.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); scratch.updateMatrix()
      ref.current.setMatrixAt(i, scratch.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  useEffect(() => () => { geom.dispose(); mat.dispose() }, [geom, mat])
  return <instancedMesh ref={ref} args={[geom, mat, count]} />
}

/* ── ConnectionLinks ────────────────────────────────────────────── */

function ConnectionLinks() {
  const { geom, mat } = useMemo(() => {
    const pts: number[] = []
    for (const [a, b] of LINKS) { const pa = NODE_POS[a], pb = NODE_POS[b]; pts.push(pa[0], pa[1], pa[2], pb[0], pb[1], pb[2]) }
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3))
    return { geom: g, mat: new THREE.LineBasicMaterial({ color: ACCENT_VEC, transparent: true, opacity: 0.12 }) }
  }, [])
  useEffect(() => () => { geom.dispose(); mat.dispose() }, [geom, mat])
  return <lineSegments args={[geom, mat]} />
}

/* ── HardwareNodes ──────────────────────────────────────────────── */

function HardwareNodes({ onHover }: { onHover: (i: number | null) => void }) {
  const ref = useRef<THREE.InstancedMesh>(null!)
  const { camera } = useThree()
  const [hovered, setHovered] = useState<number | null>(null)
  const sc = useRef<Float32Array>(new Float32Array(8).fill(1))
  const em = useRef<Float32Array>(new Float32Array(8).fill(0.4))
  const scratch = useMemo(() => new THREE.Object3D(), [])
  const { geom, mat } = useMemo(() => ({
    geom: new THREE.SphereGeometry(0.18, 16, 16),
    mat: new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT_VEC, emissiveIntensity: 0.4, metalness: 0.2, roughness: 0.6 }),
  }), [])

  useEffect(() => {
    const d = new THREE.Object3D()
    for (let i = 0; i < 8; i++) { const p = NODE_POS[NODE_KINDS[i]]; d.position.set(p[0], p[1], p[2]); d.updateMatrix(); ref.current.setMatrixAt(i, d.matrix) }
    ref.current.instanceMatrix.needsUpdate = true
  }, [])
  useEffect(() => () => { geom.dispose(); mat.dispose() }, [geom, mat])

  useFrame((_, dt) => {
    for (let i = 0; i < 8; i++) {
      sc.current[i] = THREE.MathUtils.lerp(sc.current[i], i === hovered ? 1.2 : 1, dt * 8)
      em.current[i] = THREE.MathUtils.lerp(em.current[i], i === hovered ? 1.0 : 0.4, dt * 8)
      const p = NODE_POS[NODE_KINDS[i]]
      scratch.position.set(p[0], p[1], p[2]); scratch.scale.setScalar(sc.current[i]); scratch.updateMatrix()
      ref.current.setMatrixAt(i, scratch.matrix)
    }
    ref.current.instanceMatrix.needsUpdate = true
  })

  const rc = useMemo(() => new THREE.Raycaster(), [])
  const ptrRef = useRef<THREE.Vector2>(new THREE.Vector2())
  const move = useCallback((e: React.PointerEvent) => {
    const ptr = ptrRef.current
    const r = (e.target as HTMLElement).getBoundingClientRect()
    ptr.x = ((e.clientX - r.left) / r.width) * 2 - 1; ptr.y = -((e.clientY - r.top) / r.height) * 2 + 1
    rc.setFromCamera(ptr, camera)
    const hits = rc.intersectObject(ref.current)
    const idx = hits.length > 0 ? (hits[0].instanceId ?? null) : null
    setHovered(idx); onHover(idx)
  }, [camera, rc, onHover])

  return <instancedMesh ref={ref} args={[geom, mat, 8]} onPointerMove={move} onPointerLeave={() => { setHovered(null); onHover(null) }} />
}

/* ── Scene ──────────────────────────────────────────────────────── */

function Scene({ reduced }: { reduced: boolean }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, -3, 3]} intensity={0.4} color={ACCENT} />
      <ParticleField count={reduced ? LOW_COUNT : HIGH_COUNT} reduced={reduced} />
      <ConnectionLinks />
      <HardwareNodes onHover={() => {}} />
    </>
  )
}

/* ── Export ──────────────────────────────────────────────────────── */

export default function HeroTopology({ quality = "high" }: HeroTopologyProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const frameloop = useFrameloop(containerRef)
  const dpr: [number, number] = quality === "low" ? [1, 1.5] : [1, 1.75]

  return (
    <div ref={containerRef} className="absolute inset-0 h-full w-full bg-transparent" aria-hidden="true">
      <Canvas frameloop={frameloop} dpr={dpr} gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 6], fov: 50 }} style={{ background: "transparent" }}>
        <Scene reduced={reduced} />
      </Canvas>
    </div>
  )
}
