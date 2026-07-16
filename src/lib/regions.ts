export interface RegionConfig {
  code: string
  label: string
  flag: string
  currency: string
  fx: number // multiplier from USD base to this region's currency
  retailers: string[]
}

export const REGIONS: RegionConfig[] = [
  { code: "US", label: "United States", flag: "🇺🇸", currency: "USD", fx: 1, retailers: ["Amazon", "Best Buy"] },
  { code: "IN", label: "India", flag: "🇮🇳", currency: "INR", fx: 83 * 1.18, retailers: ["Amazon", "Flipkart"] },
  { code: "GB", label: "United Kingdom", flag: "🇬🇧", currency: "GBP", fx: 0.8 * 1.2, retailers: ["Amazon", "Currys"] },
  { code: "DE", label: "Germany", flag: "🇩🇪", currency: "EUR", fx: 0.92, retailers: ["Amazon", "MediaMarkt"] },
  { code: "CA", label: "Canada", flag: "🇨🇦", currency: "CAD", fx: 1.37, retailers: ["Amazon", "Best Buy"] },
  { code: "AU", label: "Australia", flag: "🇦🇺", currency: "AUD", fx: 1.54, retailers: ["Amazon", "JB Hi-Fi"] },
]

export const REGION_CODES = REGIONS.map(r => r.code)

export function getRegion(code: string): RegionConfig {
  return REGIONS.find(r => r.code === code) ?? REGIONS[0]
}

// ponytail: convert USD base price to region currency for slider max
export function usdToLocal(usd: number, regionCode = "US"): number {
  return Math.round(usd * getRegion(regionCode).fx)
}
