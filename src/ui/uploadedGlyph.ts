import { GLYPH_ASSETS } from "../config/glyphAssets";

export function createUploadedGlyph(value: string, transform?: string): HTMLSpanElement | undefined {
  const asset = GLYPH_ASSETS[transform?.startsWith("stem-") ? `${value}-${transform}` : value];
  if (!asset) return undefined;
  const glyph = document.createElement("span");
  glyph.className = "uploaded-glyph";
  if (["♥", ",", "★"].includes(value)) glyph.classList.add("uploaded-glyph--dot-trap");
  glyph.setAttribute("aria-hidden", "true");
  glyph.style.setProperty("--glyph-mask", `url("${asset.url}")`);
  if (transform?.startsWith("rotate-")) glyph.style.transform = `rotate(${Number(transform.slice(7))}deg)`;
  else if (transform === "flip-x") glyph.style.transform = "scaleX(-1)";
  else if (transform === "flip-y") glyph.style.transform = "scaleY(-1)";
  else if (transform === "flip-x-rotate-90") glyph.style.transform = "rotate(90deg) scaleX(-1)";
  return glyph;
}
