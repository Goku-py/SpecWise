/**
 * Landing P1 invariants — procedural storytelling stays descriptive.
 * Fast, no DB, no scoring engine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { WorkloadId } from "@/lib/recommend/v3/types";
import { parseV3ShareParams } from "@/lib/share";
import { WORKLOAD_IDS } from "@/components/landing/data/illustrative-picks";
import { buildWorkloadPrefillPath } from "@/components/landing/lib/prefill";
import {
  HARDWARE_VOCAB,
  PART_IDS,
  WORKLOAD_HIGHLIGHTS,
  type PartId,
} from "@/components/three/workload-highlights";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const landingDir = join(repoRoot, "src", "components", "landing");
const threeDir = join(repoRoot, "src", "components", "three");

const NEW_THREE_FILES = [
  join(threeDir, "scene-shell.tsx"),
  join(threeDir, "workload-highlights.ts"),
  join(threeDir, "hero-laptop.tsx"),
  join(threeDir, "hero-laptop-scene.tsx"),
];
const WRAPPER_FILE = join(repoRoot, "src", "components", "hero", "hero-laptop-wrapper.tsx");

function listLandingFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  };
  walk(landingDir);
  return out;
}

describe("P1 boundary: no scoring or ranking language in landing + new 3D files", () => {
  it("landing sources and new three files stay descriptive", () => {
    const banned =
      /runV3|v3\/engine|v3\/scoring|whyAbove|Match Score|Best Match|Recommended for you|benchmark/i;
    const files = [...listLandingFiles(), ...NEW_THREE_FILES, WRAPPER_FILE];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      expect(src, `${file} leaks scoring language`).not.toMatch(banned);
    }
  });
});

describe("WORKLOAD_HIGHLIGHTS", () => {
  it("covers all 6 workloads with non-empty parts subsets of PART_IDS", () => {
    expect([...WORKLOAD_IDS].sort()).toEqual(
      (["dev", "gaming", "ai-ml", "video-photo", "cad-3d", "study-office"] as WorkloadId[]).sort()
    );
    const allowed = new Set<PartId>(PART_IDS as readonly PartId[]);
    for (const id of WORKLOAD_IDS) {
      const h = WORKLOAD_HIGHLIGHTS[id];
      expect(h, id).toBeDefined();
      expect(h.label.length, `${id} label`).toBeGreaterThan(0);
      expect(h.blurb.length, `${id} blurb`).toBeGreaterThan(0);
      expect(h.parts.length, `${id} parts`).toBeGreaterThan(0);
      for (const p of h.parts) {
        expect(allowed.has(p), `${id} part ${p}`).toBe(true);
      }
    }
  });
});

describe("HARDWARE_VOCAB", () => {
  it("covers all parts with plain lines and no figures", () => {
    for (const part of PART_IDS) {
      const v = HARDWARE_VOCAB[part];
      expect(v, part).toBeDefined();
      expect(v.label.length, `${part} label`).toBeGreaterThan(0);
      expect(v.line.length, `${part} line`).toBeGreaterThan(0);
      expect(v.line, `${part} line must carry no digits`).not.toMatch(/\d/);
    }
  });
});

describe("workload prefill still parses", () => {
  it.each(WORKLOAD_IDS)("prefill for %s parses and carries the primary workload", (id) => {
    const path = buildWorkloadPrefillPath(id, "US", "USD");
    expect(path.startsWith("/quiz?s=")).toBe(true);
    const raw = decodeURIComponent(path.slice("/quiz?s=".length));
    const profile = parseV3ShareParams({ s: raw });
    expect(profile).not.toBeNull();
    expect(profile!.region).toBe("US");
    expect(profile!.workloads).toHaveLength(1);
    expect(profile!.workloads[0].id).toBe(id);
    expect(profile!.workloads[0].importance).toBe("primary");
  });
});

describe("hero hosts the 3D wrapper with a single H1", () => {
  it("hero.tsx renders HeroLaptopWrapper", () => {
    const src = readFileSync(join(landingDir, "hero.tsx"), "utf-8");
    expect(src).toContain("HeroLaptopWrapper");
    expect(src).not.toContain("HeroVisual");
    expect((src.match(/<h1/g) ?? []).length).toBe(1);
  });
});
