/**
 * Serialize JSON-LD payloads safely for `dangerouslySetInnerHTML`.
 * Escapes `<` (plus `>` and `&` for good measure) so a DB-derived string
 * containing `</script>` can never break out of the script element.
 */
export function stringifyJsonLd(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
}
