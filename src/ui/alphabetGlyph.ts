/** Build old-Hangul choices from the same font glyph as the modern answer. */
const IEUNG_VARIANTS: Readonly<Record<string, string>> = {
  "ㆁ": "stem",
  "ㆆ": "bar",
  "ㆀ": "double",
};

export function createAlphabetGlyph(value: string, transform?: string): HTMLSpanElement | SVGSVGElement | undefined {
  const paths = value === "○" ? '<ellipse cx="32" cy="34" rx="17" ry="16"/>'
    : value === "△" ? '<path d="M32 18L49 50H15Z"/>'
    : value === "ㅍ" && transform === "stem-one" ? '<path d="M10 17H54M10 49H54M32 17V49"/>'
    : value === "ㅍ" && transform === "stem-three" ? '<path d="M10 17H54M10 49H54M20 17V49M32 17V49M44 17V49"/>' : undefined;
  if (paths) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("class", "alphabet-shape-outline");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "7");
    svg.setAttribute("stroke-linejoin", "round");
    svg.innerHTML = paths;
    return svg;
  }
  const variant = IEUNG_VARIANTS[value];
  if (!variant) return undefined;
  const glyph = document.createElement("span");
  glyph.className = `alphabet-outline alphabet-outline--${variant}`;
  glyph.setAttribute("aria-hidden", "true");
  for (let index = 0; index < (variant === "double" ? 2 : 1); index += 1) {
    const ring = document.createElement("span");
    ring.textContent = "ㅇ";
    glyph.append(ring);
  }
  return glyph;
}
