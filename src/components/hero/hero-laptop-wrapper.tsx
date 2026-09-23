"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { PointerState } from "../three/hero-laptop-scene";
import { HARDWARE_VOCAB, WORKLOAD_HIGHLIGHTS, type PartId } from "../three/workload-highlights";
import { WORKLOAD_IDS } from "../landing/data/illustrative-picks";
import type { WorkloadId } from "@/lib/recommend/v3/types";
import { useWorkload } from "../landing/workload-context";

// Bundle boundary sits OUTSIDE any Canvas: the loading poster renders in the
// DOM. (Rendering a DOM poster inside <Canvas> crashes the R3F reconciler.)
const HeroSceneBundle = dynamic(
  () => import("../three/hero-scene-bundle").then((m) => m.HeroSceneBundle),
  {
    ssr: false,
    loading: () => <HeroPoster />,
  }
);

const EMPTY_PARTS: ReadonlySet<never> = new Set();

function stageForProgress(progress: number): string {
  if (progress < 0.15) return "Assembled laptop";
  if (progress < 0.45) return "Structure reveal";
  if (progress < 0.7) return "Internal components";
  return "Hardware explanation";
}

/** Static SVG poster: also the loading + WebGL fallback visual. */
export function HeroPoster() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <svg
        aria-hidden="true"
        viewBox="0 0 320 200"
        className="h-2/3 w-2/3 text-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {/* screen */}
        <rect x="80" y="30" width="160" height="100" rx="6" />
        {/* screen content lines */}
        <line x1="96" y1="52" x2="224" y2="52" strokeWidth="1.5" />
        <line x1="96" y1="66" x2="190" y2="66" strokeWidth="1.5" />
        <line x1="96" y1="80" x2="208" y2="80" strokeWidth="1.5" />
        <line x1="96" y1="94" x2="172" y2="94" strokeWidth="1.5" />
        {/* spec ticks */}
        <line x1="112" y1="112" x2="112" y2="118" stroke="var(--electric)" />
        <line x1="160" y1="112" x2="160" y2="118" stroke="var(--electric)" />
        <line x1="208" y1="112" x2="208" y2="118" stroke="var(--electric)" />
        {/* base */}
        <path d="M60 150 L260 150 L272 168 L48 168 Z" />
        <line x1="140" y1="158" x2="180" y2="158" strokeWidth="1.5" />
        {/* corner marks */}
        <path d="M40 40 h12 M40 40 v12" stroke="var(--electric)" />
        <path d="M280 40 h-12 M280 40 v12" stroke="var(--electric)" />
        <path d="M40 160 h12 M40 160 v-12" stroke="var(--electric)" />
        <path d="M280 160 h-12 M280 160 v-12" stroke="var(--electric)" />
      </svg>
      <span className="sr-only">Line-art illustration of a laptop with hardware spec callouts.</span>
    </div>
  );
}

/**
 * Hero 3D wrapper: quality detection, in-view gating, illustrative
 * workload highlight cycling. Cycle state lives here so the DOM caption
 * and the Canvas scene share it via props. An explicit workload selection
 * (from WorkloadProvider) pauses the cycle and drives activeParts only.
 */
export function HeroLaptopWrapper() {
  const figureRef = useRef<HTMLElement>(null);
  const pointerRef = useRef<PointerState>({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [inView, setInView] = useState(false);
  const [activeId, setActiveId] = useState<WorkloadId | null>(null);
  const [stage, setStage] = useState("Assembled laptop");
  const { selected: explicit } = useWorkload();

  useEffect(() => {
    const mq = window.matchMedia("(pointer:coarse)");
    const compute = (): void => {
      setQuality(mq.matches || window.innerWidth < 1024 ? "low" : "high");
    };
    compute();
    window.addEventListener("resize", compute);
    mq.addEventListener("change", compute);
    return () => {
      window.removeEventListener("resize", compute);
      mq.removeEventListener("change", compute);
    };
  }, []);

  useEffect(() => {
    const el = figureRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduced) {
      setActiveId(null);
      return;
    }
    if (explicit) {
      setActiveId(explicit);
      return;
    }
    if (!inView) return;
    let i = 0;
    setActiveId(WORKLOAD_IDS[0]);
    const timer = window.setInterval(() => {
      i = (i + 1) % WORKLOAD_IDS.length;
      setActiveId(WORKLOAD_IDS[i]);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [reduced, inView, explicit]);

  // Lightweight scroll-stage readout (same progress formula as the scene
  // explode). rAF-throttled; updates state only when the bucket changes.
  useEffect(() => {
    if (reduced) {
      setStage("Assembled laptop");
      return;
    }
    let raf = 0;
    let queued = false;
    let last = "";
    const update = (): void => {
      queued = false;
      const vh = window.innerHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / vh, 0), 1) * 0.85;
      const next = stageForProgress(progress);
      if (next !== last) {
        last = next;
        setStage(next);
      }
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
  }, [reduced]);

  const activeParts = useMemo<ReadonlySet<PartId>>(
    () => (activeId ? new Set(WORKLOAD_HIGHLIGHTS[activeId].parts) : (EMPTY_PARTS as ReadonlySet<PartId>)),
    [activeId]
  );

  const selectionPart = activeId
    ? `Showing ${WORKLOAD_HIGHLIGHTS[activeId].label} — ${WORKLOAD_HIGHLIGHTS[activeId].parts
        .map((p) => HARDWARE_VOCAB[p].label)
        .join(" · ")} · Your selection · Illustrative, not a recommendation.`
    : null;
  const cyclePart = activeId
    ? `Highlighting ${WORKLOAD_HIGHLIGHTS[activeId].label} — ${WORKLOAD_HIGHLIGHTS[activeId].parts
        .map((p) => HARDWARE_VOCAB[p].label)
        .join(" · ")} · Illustrative, not a recommendation.`
    : "Assembled view · Illustrative preview.";
  const base = explicit && activeId ? selectionPart : cyclePart;
  const caption = stage === "Assembled laptop" ? base : `${base} · ${stage}.`;

  return (
    <figure
      ref={figureRef}
      className="overflow-hidden rounded border border-border bg-card"
      style={{ boxShadow: "var(--shadow-elev-1)" }}
    >
      <div
        className="relative aspect-[4/3] min-h-64 lg:aspect-square"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgb(255 255 255 / 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          pointerRef.current = {
            x: ((e.clientX - r.left) / r.width) * 2 - 1,
            y: -(((e.clientY - r.top) / r.height) * 2 - 1),
          };
        }}
      >
        <HeroSceneBundle
          quality={quality}
          activeParts={activeParts}
          inView={inView}
          pointerRef={pointerRef}
          reduced={reduced}
          poster={<HeroPoster />}
          className="absolute inset-0 h-full w-full"
        />
      </div>
      <figcaption className="border-t border-border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
        {caption}
      </figcaption>
    </figure>
  );
}
