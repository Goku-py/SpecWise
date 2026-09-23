/**
 * Landing P2 invariants — interactive hardware narrative stays descriptive.
 * Fast, no DB, no scoring engine.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  PART_IDS,
  WORKLOAD_HIGHLIGHTS,
  type PartId,
} from "@/components/three/workload-highlights";
import { WORKLOAD_IDS } from "@/components/landing/data/illustrative-picks";
import {
  workloadInitialState,
  workloadReducer,
} from "@/components/landing/workload-context";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const landingDir = join(repoRoot, "src", "components", "landing");
const heroDir = join(repoRoot, "src", "components", "hero");
const threeDir = join(repoRoot, "src", "components", "three");

function listTsFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name)) out.push(full);
    }
  };
  walk(dir);
  return out;
}

describe("workloadReducer", () => {
  it("starts with null selection", () => {
    expect(workloadInitialState.selected).toBeNull();
  });

  it("select sets the id", () => {
    expect(workloadReducer({ selected: null }, { type: "select", id: "dev" })).toEqual({
      selected: "dev",
    });
  });

  it("selecting the same id toggles back to null", () => {
    expect(workloadReducer({ selected: "dev" }, { type: "select", id: "dev" })).toEqual({
      selected: null,
    });
  });

  it("clear nulls the selection", () => {
    expect(workloadReducer({ selected: "gaming" }, { type: "clear" })).toEqual({
      selected: null,
    });
  });

  it("unknown action is a no-op", () => {
    const state = { selected: "dev" as const };
    // @ts-expect-error intentional unknown action for boundary coverage
    expect(workloadReducer(state, { type: "bogus" })).toEqual(state);
  });
});

describe("P2 boundary: no scoring or quiz-store in landing + hero + three", () => {
  it("descriptive sources only", () => {
    const threeFiles = [
      ...listTsFiles(threeDir).filter((f) => /hero-.*\.tsx$/.test(f.split(/[\\/]/).pop()!)),
      join(threeDir, "scene-shell.tsx"),
      join(threeDir, "workload-highlights.ts"),
      join(threeDir, "hero-scene-bundle.tsx"),
    ];
    const files = [...listTsFiles(landingDir), ...listTsFiles(heroDir), ...threeFiles];
    expect(files.length).toBeGreaterThan(0);
    const banned =
      /runV3|v3\/engine|v3\/scoring|useV3QuizStore|whyAbove|Match Score|Best Match|benchmark/i;
    for (const file of files) {
      const src = readFileSync(file, "utf-8");
      expect(src, `${file} leaks scoring language`).not.toMatch(banned);
    }
  });

  it("no landing file imports useV3QuizStore", () => {
    for (const file of listTsFiles(landingDir)) {
      const src = readFileSync(file, "utf-8");
      expect(src, `${file} imports the quiz store`).not.toContain("useV3QuizStore");
    }
    for (const file of listTsFiles(heroDir)) {
      const src = readFileSync(file, "utf-8");
      expect(src, `${file} imports the quiz store`).not.toContain("useV3QuizStore");
    }
  });
});

describe("WORKLOAD_HIGHLIGHTS part coverage", () => {
  it("parts are subsets of PART_IDS and every part appears in >=1 workload", () => {
    const allowed = new Set<PartId>(PART_IDS as readonly PartId[]);
    const seen = new Set<PartId>();
    for (const id of WORKLOAD_IDS) {
      for (const p of WORKLOAD_HIGHLIGHTS[id].parts) {
        expect(allowed.has(p), `${id} part ${p}`).toBe(true);
        seen.add(p);
      }
    }
    for (const part of PART_IDS) {
      expect(seen.has(part), `part ${part} uncovered`).toBe(true);
    }
  });
});

describe("catalog locked labels", () => {
  it("catalog-proof.tsx keeps the badge copy", () => {
    const src = readFileSync(join(landingDir, "catalog-proof.tsx"), "utf-8");
    expect(src).toContain("Example machines");
    expect(src).toContain("Illustrative preview");
  });

  it("machine card keeps illustrative copy", () => {
    const src = readFileSync(join(landingDir, "illustrative-machine-card.tsx"), "utf-8");
    expect(src).toContain("Illustrative pick");
    expect(src).toContain("your quiz result will differ");
    expect(src).toContain("Check my match");
  });
});

describe("workload-experience explicit preview controls", () => {
  it("contains aria-pressed preview buttons and prefill links", () => {
    const src = readFileSync(join(landingDir, "workload-experience.tsx"), "utf-8");
    expect(src).toContain("aria-pressed");
    expect(src).toContain("Preview ");
    expect(src).toContain("Start match");
    expect(src).toContain("buildWorkloadPrefillPath");
  });
});
