/**
 * Shared comparison row definitions (pure, zero-deps).
 *
 * Single source imported by BOTH `/compare` (multi-id, server-resolved) and
 * `/compare/[slugs]` (canonical pair). Rows are factual catalog projections
 * over `LaptopDetail` — unknown specs stay "—" (existing convention). No
 * scoring, ranking, or winners here; stored personalization renders
 * separately in `ComparePersonalization`.
 */
import type { LaptopDetail } from "@/lib/types";

export interface CompareRowDef {
  label: string;
  get: (l: LaptopDetail) => string;
}

/** ~13 difference-relevant rows (price renders separately, region-aware). */
export const COMPARE_DETAIL_ROWS: CompareRowDef[] = [
  { label: "OS", get: l => l.os || "—" },
  {
    label: "CPU",
    get: l => `${l.cpuBrand} ${l.cpuFamily}${l.cpuGeneration ? ` (${l.cpuGeneration})` : ""}`,
  },
  { label: "CPU Cores", get: l => (l.cpuCores != null ? `${l.cpuCores} cores` : "—") },
  {
    label: "GPU",
    get: l =>
      l.gpuType.toLowerCase() === "integrated"
        ? "Integrated"
        : `${l.gpuModel ?? "Dedicated"}${l.gpuVRAM != null ? ` · ${l.gpuVRAM} GB` : ""}`,
  },
  {
    label: "RAM",
    get: l =>
      `${l.ramAmount} GB${l.ramType ? ` ${l.ramType}` : ""}${l.ramUpgradeable ? " (upgradeable)" : " (soldered)"}`,
  },
  {
    label: "Storage",
    get: l =>
      `${l.storageAmount} GB ${l.storageType}${l.storageExpandable ? " + expandable" : ""}`,
  },
  {
    label: "Display",
    get: l =>
      `${l.displaySize}"${l.displayResolution ? ` ${l.displayResolution}` : ""} ${l.displayRefreshRate}Hz`,
  },
  { label: "Panel", get: l => l.displayPanelType ?? "—" },
  { label: "Battery", get: l => (l.batteryLife != null ? `${l.batteryLife} hours` : "—") },
  { label: "Weight", get: l => (l.weight != null ? `${l.weight} kg` : "—") },
  { label: "Build", get: l => l.buildMaterial ?? "—" },
  { label: "Ports", get: l => (l.ports.length > 0 ? l.ports.join(", ") : "—") },
  { label: "Wireless", get: l => l.wireless ?? "—" },
];

export interface VisibleCompareRow {
  label: string;
  cells: string[];
}

/**
 * Project rows to per-laptop cells, collapsing rows identical across all
 * compared laptops (single laptop → nothing collapses). Callers show
 * `hiddenCount` as an "N identical specs hidden" note.
 */
export function visibleCompareRows(laptops: LaptopDetail[]): {
  rows: VisibleCompareRow[];
  hiddenCount: number;
} {
  let hiddenCount = 0;
  const rows: VisibleCompareRow[] = [];
  for (const def of COMPARE_DETAIL_ROWS) {
    const cells = laptops.map(def.get);
    if (laptops.length > 1 && cells.every(c => c === cells[0])) {
      hiddenCount += 1;
      continue;
    }
    rows.push({ label: def.label, cells });
  }
  return { rows, hiddenCount };
}
