/** Consistent sans-serif outlines, independent of old-Hangul font fallback. */
const IEUNG_OUTLINES: Readonly<Record<string, string>> = {
  "ㅇ": '<circle cx="32" cy="32" r="20"/>',
  "ㆁ": '<circle cx="32" cy="38" r="20"/><path d="M32 6V18"/>',
  "ㆆ": '<circle cx="32" cy="38" r="20"/><path d="M12 10H52"/>',
  "ㆀ": '<ellipse cx="18" cy="32" rx="10" ry="20"/><ellipse cx="46" cy="32" rx="10" ry="20"/>',
};

export function createAlphabetGlyph(value: string): SVGSVGElement | undefined {
  const outline = IEUNG_OUTLINES[value];
  if (!outline) return undefined;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("class", "alphabet-outline");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "7");
  svg.setAttribute("stroke-linecap", "butt");
  svg.innerHTML = outline;
  return svg;
}
