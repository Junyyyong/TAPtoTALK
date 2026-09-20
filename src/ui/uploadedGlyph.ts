import { GLYPH_ASSETS } from "../config/glyphAssets";

export function createUploadedGlyph(value: string, transform?: string): HTMLSpanElement | undefined {
  const asset = GLYPH_ASSETS[transform?.startsWith("stem-") ? `${value}-${transform}` : value];
  if (!asset) return undefined;
  const glyph = document.createElement("span");
  glyph.className = "uploaded-glyph";
  if (value === "△") glyph.classList.add("uploaded-glyph--triangle");
  if (["♥", ",", "★"].includes(value)) glyph.classList.add("uploaded-glyph--dot-trap");
  glyph.setAttribute("aria-hidden", "true");
  glyph.style.setProperty("--glyph-mask", `url("${asset.url}")`);
  if (transform?.startsWith("rotate-")) glyph.style.transform = `rotate(${Number(transform.slice(7))}deg)`;
  else if (transform === "flip-x") glyph.style.transform = "scaleX(-1)";
  else if (transform === "flip-y") glyph.style.transform = "scaleY(-1)";
  else if (transform === "flip-x-rotate-90") glyph.style.transform = "rotate(90deg) scaleX(-1)";
  // Stretch along the stroke only: keep the uploaded thickness and center.
  const lineStretch: Record<string, string> = {
    "ㅣ": "scaleY(1.4)",
    "ㅡ": "scaleX(1.4)",
    "╱": "rotate(-45deg) scaleX(1.4) rotate(45deg)",
    "╲": "rotate(45deg) scaleX(1.4) rotate(-45deg)",
  };
  if (lineStretch[value]) glyph.style.transform = `${glyph.style.transform} ${lineStretch[value]}`.trim();
  return glyph;
}
