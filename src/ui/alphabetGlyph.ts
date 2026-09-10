/** Build old-Hangul choices from the same font glyph as the modern answer. */
const IEUNG_VARIANTS: Readonly<Record<string, string>> = {
  "ㆁ": "stem",
  "ㆆ": "bar",
  "ㆀ": "double",
};

export function createAlphabetGlyph(value: string, transform?: string): HTMLSpanElement | SVGSVGElement | undefined {
  const paths = value === "○" ? '<ellipse cx="32" cy="34" rx="14.7" ry="11.5"/>'
    : value === "△" ? '<path d="M32 22.5L47 45.5H17Z"/>'
    : value === "ㅍ" && transform === "stem-one" ? '<path d="M12 20H52M12 46H52M32 20V46"/>'
    : value === "ㅍ" && transform === "stem-three" ? '<path d="M12 20H52M12 46H52M20 20V46M32 20V46M44 20V46"/>' : undefined;
  if (paths) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 64 64");
    svg.setAttribute("class", "alphabet-shape-outline");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "9");
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
