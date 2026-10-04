/**
 * Hero catalog note (pure, unit-tested): live count when the catalog
 * answers, honest "syncing" state when it does not. Never a fake number.
 */
export function heroCatalogNote(machineCount: number): string {
  if (Number.isFinite(machineCount) && machineCount > 0) {
    return `Live catalog · ${machineCount.toLocaleString()} machines`
  }
  return "Live catalog · syncing"
}
