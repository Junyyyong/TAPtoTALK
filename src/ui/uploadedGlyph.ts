import { GLYPH_ASSETS } from "../config/glyphAssets";

export function createUploadedGlyph(value: string): HTMLSpanElement | undefined {
  const asset = GLYPH_ASSETS[value];
  if (!asset) return undefined;
  const glyph = document.createElement("span");
  glyph.className = `uploaded-glyph uploaded-glyph--${asset.group}`;
  glyph.setAttribute("aria-hidden", "true");
  glyph.style.setProperty("--glyph-mask", `url("${asset.url}")`);
  const base = asset.group === "mieum" ? 60.2331543 : 32.8193676;
  glyph.style.width = `calc(var(--uploaded-size) * ${asset.width / base})`;
  glyph.style.height = `calc(var(--uploaded-size) * ${asset.height / base})`;
  return glyph;
}
