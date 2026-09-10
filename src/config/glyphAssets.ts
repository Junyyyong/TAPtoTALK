/** Original user SVGs; paths and aspect ratios are preserved without redrawing. */
export const GLYPH_ASSETS: Readonly<Record<string, { url: string; width: number; height: number; group: "mieum" | "cheonjiin" }>> = {
  "★": { url: new URL("../../모음천소스-01.svg", import.meta.url).href, width: 46.5030829, height: 44.2757165, group: "cheonjiin" },
  ",": { url: new URL("../../모음천소스-02.svg", import.meta.url).href, width: 27.3217633, height: 52.2535814, group: "cheonjiin" },
  "ㆍ": { url: new URL("../../모음천소스-03.svg", import.meta.url).href, width: 32.8193676, height: 32.8193676, group: "cheonjiin" },
  "♥": { url: new URL("../../모음천소스-04.svg", import.meta.url).href, width: 39.3612637, height: 32.8193676, group: "cheonjiin" },
  "ㅱ": { url: new URL("../../ㅁ-01.svg", import.meta.url).href, width: 60.2331543, height: 65.1757044, group: "mieum" },
  "ㅁ": { url: new URL("../../ㅁ-02.svg", import.meta.url).href, width: 60.2331543, height: 49.7732646, group: "mieum" },
  "○": { url: new URL("../../ㅁ-03.svg", import.meta.url).href, width: 60.2331923, height: 51.6200096, group: "mieum" },
  "△": { url: new URL("../../ㅁ-04.svg", import.meta.url).href, width: 71.2051392, height: 61.6654663, group: "mieum" },
};
