/** Visual aliases in the current TAPtoTALK outlines, independent of input identity. */
export function trapLooksLikeTarget(value: string, transform: string | undefined, targets: readonly string[]): boolean {
  if (!transform) return targets.includes(value === "○" ? "ㅇ" : value);
  if (transform === "rotate-180") {
    if (value === "ㄱ") return targets.includes("ㄴ");
    if (value === "ㄴ") return targets.includes("ㄱ");
    if (value === "ㄹ" || value === "ㅍ") return targets.includes(value);
  }
  if (transform === "rotate-90" || transform === "rotate-270") {
    if (value === "ㅣ") return targets.includes("ㅡ");
    if (value === "ㅡ") return targets.includes("ㅣ");
  }
  return false;
}
