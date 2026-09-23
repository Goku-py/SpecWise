"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

interface SceneShellProps {
  children: ReactNode;
  quality: "high" | "low";
  poster: ReactNode;
  className?: string;
}

class CanvasErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }
  componentDidCatch(): void {
    // Fallback poster renders; nothing to report.
  }
  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Shared R3F Canvas wrapper. IO-gated frameloop, clamped DPR, fixed camera.
 * WebGL failure or render errors fall back to the static poster.
 */
export function SceneShell({ children, quality, poster, className }: SceneShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const [inView, setInView] = useState(false);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Reduced motion still renders one static frame, then stops.
  const frameloop: "always" | "never" = !inView || reduced ? "never" : "always";
  const dpr: [number, number] = quality === "low" ? [1, 1.25] : [1, 1.75];

  if (webglFailed) {
    return (
      <div ref={containerRef} aria-hidden="true" className={className}>
        {poster}
      </div>
    );
  }

  return (
    <div ref={containerRef} aria-hidden="true" className={className}>
      <CanvasErrorBoundary fallback={poster}>
        <Canvas
          frameloop={frameloop}
          dpr={dpr}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ fov: 40, position: [3.5, 1.8, 4.8] }}
          style={{ background: "transparent" }}
          onCreated={(state) => {
            try {
              // Probe the context; a lost context throws here.
              state.gl.getContext();
            } catch {
              setWebglFailed(true);
            }
          }}
        >
          {children}
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
