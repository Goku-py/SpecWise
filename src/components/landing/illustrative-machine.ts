import type { ScorableLaptop } from "@/lib/types";

/**
 * P0 illustrative machine — display-only projection of a catalog laptop.
 * Deliberately narrow: no scores, weights, capabilities, strengths, or
 * ranking metadata may live here (or be added here later).
 */
export interface IllustrativeMachine {
  id: string;
  slug: string;
  brand: string;
  model: string;
  variant: string | null;
  imageUrl: string | null;
  cpuFamily: string;
  gpuModel: string | null;
  gpuVRAM: number | null;
  ramAmount: number;
  storageAmount: number;
  displaySize: number;
  displayResolution: string | null;
  displayRefreshRate: number;
  weight: number | null;
  batteryLife: number | null;
  price: number;
  currency: string;
  priceMissing: boolean;
  priceStale: boolean;
}

export type ScorableLaptopWithSlug = ScorableLaptop & { slug?: string | null };

/** Project a scorable laptop onto its display-only illustrative shape. */
export function toIllustrativeMachine(scorable: ScorableLaptopWithSlug): IllustrativeMachine {
  return {
    id: scorable.id,
    slug: scorable.slug ?? scorable.id,
    brand: scorable.brand,
    model: scorable.model,
    variant: scorable.variant,
    imageUrl: scorable.imageUrl,
    cpuFamily: scorable.cpuFamily,
    gpuModel: scorable.gpuModel,
    gpuVRAM: scorable.gpuVRAM,
    ramAmount: scorable.ramAmount,
    storageAmount: scorable.storageAmount,
    displaySize: scorable.displaySize,
    displayResolution: scorable.displayResolution,
    displayRefreshRate: scorable.displayRefreshRate,
    weight: scorable.weight,
    batteryLife: scorable.batteryLife,
    price: scorable.price,
    currency: scorable.currency,
    priceMissing: scorable.priceMissing ?? false,
    priceStale: scorable.priceStale ?? false,
  };
}
