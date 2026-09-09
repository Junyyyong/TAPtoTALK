/** Build old-Hangul choices from the same font glyph as the modern answer. */
const IEUNG_VARIANTS: Readonly<Record<string, string>> = {
  "ㆁ": "stem",
  "ㆆ": "bar",
  "ㆀ": "double",
};

export function createAlphabetGlyph(value: string): HTMLSpanElement | undefined {
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
