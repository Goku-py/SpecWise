import type { LaptopDetail } from "./types"

export type ExplodeLayerId = "display" | "heatsink" | "gpu" | "cpu" | "ram" | "ssd" | "battery" | "motherboard"
export type LayerSpecRow = { label: string; value: string }
export type LayerSpec = { id: ExplodeLayerId; label: string; rows: LayerSpecRow[] }

const LAYER_ORDER: ExplodeLayerId[] = ["display","heatsink","gpu","cpu","ram","ssd","battery","motherboard"]

export function buildLayerSpecs(laptop: LaptopDetail): LayerSpec[] {
  // Map honest DB fields only. Use "—" for missing data. Do NOT invent values.
  return LAYER_ORDER.map(id => {
    const rows: LayerSpecRow[] = []
    switch(id) {
      case "display":
        rows.push({ label: "Size", value: `${laptop.displaySize}″` })
        if (laptop.displayResolution) rows.push({ label: "Resolution", value: laptop.displayResolution })
        rows.push({ label: "Refresh", value: `${laptop.displayRefreshRate}Hz` })
        if (laptop.displayPanelType) rows.push({ label: "Panel", value: laptop.displayPanelType })
        if (laptop.displayBrightness) rows.push({ label: "Brightness", value: `${laptop.displayBrightness} nits` })
        if (laptop.displayColorGamut) rows.push({ label: "Gamut", value: laptop.displayColorGamut })
        break
      case "heatsink":
        rows.push({ label: "Heat Pipes", value: "—" })
        rows.push({ label: "Fans", value: "—" })
        rows.push({ label: "Exhausts", value: "—" })
        rows.push({ label: "Note", value: "Thermal data not tracked" })
        break
      case "gpu":
        if (laptop.gpuModel) rows.push({ label: "Model", value: laptop.gpuModel })
        rows.push({ label: "Type", value: laptop.gpuType })
        if (laptop.gpuVRAM) rows.push({ label: "VRAM", value: `${laptop.gpuVRAM}GB` })
        rows.push({ label: "TGP", value: "—" })
        rows.push({ label: "CUDA Cores", value: "—" })
        break
      case "cpu":
        rows.push({ label: "Brand", value: laptop.cpuBrand })
        rows.push({ label: "Family", value: laptop.cpuFamily })
        if (laptop.cpuGeneration) rows.push({ label: "Generation", value: laptop.cpuGeneration })
        if (laptop.cpuCores) rows.push({ label: "Cores", value: `${laptop.cpuCores}C/${(laptop.cpuCores||4)*2}T` })
        if (laptop.cpuBenchmark) rows.push({ label: "Benchmark", value: String(laptop.cpuBenchmark) })
        break
      case "ram":
        rows.push({ label: "Capacity", value: `${laptop.ramAmount}GB` })
        if (laptop.ramType) rows.push({ label: "Type", value: laptop.ramType })
        rows.push({ label: "Upgradeable", value: laptop.ramUpgradeable ? "Yes" : "No" })
        break
      case "ssd":
        rows.push({ label: "Capacity", value: `${laptop.storageAmount}${laptop.storageType.includes("SSD") ? "GB" : "GB " + laptop.storageType}` })
        rows.push({ label: "Type", value: laptop.storageType })
        rows.push({ label: "Expandable", value: laptop.storageExpandable ? "Yes" : "No" })
        break
      case "battery":
        if (laptop.batteryCapacity) rows.push({ label: "Capacity", value: `${laptop.batteryCapacity}Wh` })
        if (laptop.batteryLife) rows.push({ label: "Life", value: `${laptop.batteryLife}h` })
        if (!laptop.batteryCapacity && !laptop.batteryLife) rows.push({ label: "Data", value: "—" })
        break
      case "motherboard":
        rows.push({ label: "Wireless", value: laptop.wireless || "—" })
        rows.push({ label: "Ports", value: laptop.ports.join(", ") || "—" })
        rows.push({ label: "Security", value: laptop.securityFeatures.join(", ") || "—" })
        break
    }
    return { id, label: id.toUpperCase(), rows }
  })
}
