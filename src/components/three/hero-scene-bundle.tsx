"use client";

import { SceneShell } from "./scene-shell";
import HeroLaptopScene, { type PointerState } from "./hero-laptop-scene";
import type { PartId } from "./workload-highlights";
import type { ReactNode, RefObject } from "react";

interface HeroSceneBundleProps {
  quality: "high" | "low";
  activeParts: ReadonlySet<PartId>;
  inView: boolean;
  pointerRef: RefObject<PointerState>;
  reduced: boolean;
  poster: ReactNode;
  className?: string;
}

/**
 * Dynamically-imported bundle boundary: SceneShell (Canvas) + scene mount
 * together, so the `next/dynamic` loading poster always renders in the DOM
 * — never inside the R3F reconciler (DOM/SVG tags crash the Canvas).
 */
export function HeroSceneBundle({
  poster,
  className,
  ...sceneProps
}: HeroSceneBundleProps) {
  return (
    <SceneShell quality={sceneProps.quality} poster={poster} className={className}>
      <HeroLaptopScene {...sceneProps} />
    </SceneShell>
  );
}
