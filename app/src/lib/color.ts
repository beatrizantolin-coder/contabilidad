/** Aclara un color hex mezclándolo con blanco en la proporción `amount` (0-1). */
export function tintColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return "#" + [nr, ng, nb].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Color de una subcategoría o sub-subcategoría: siempre derivado del color de su categoría principal. */
export function subcategoryColor(categoryColor: string): string {
  return tintColor(categoryColor, 0.2);
}
