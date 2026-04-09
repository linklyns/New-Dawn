/**
 * Formats a safehouse name by extracting just the number
 * E.g. "Lighthouse Safehouse 3" -> "Safehouse 3"
 */
export function formatSafehouseName(name: string): string {
  const match = name.match(/Safehouse\s*(\d+)/i);
  return match ? `Safehouse ${match[1]}` : name;
}
