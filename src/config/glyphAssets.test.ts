import { describe, expect, it } from "vitest";
import { GLYPH_ASSETS } from "./glyphAssets";
import { createAlphabetStageBoard } from "../core/hangul/alphabetGame";
import { ALPHABET_ORDER } from "../content/prompts";

describe("uploaded glyph mapping", () => {
  it("maps all eight original SVGs, including the correct answers", () => {
    expect(Object.keys(GLYPH_ASSETS)).toHaveLength(8);
    expect(decodeURIComponent(GLYPH_ASSETS["ㅁ"]!.url).normalize("NFC")).toContain("ㅁ-02.svg");
    expect(decodeURIComponent(GLYPH_ASSETS["ㆍ"]!.url).normalize("NFC")).toContain("모음천소스-03.svg");
    expect(new Set(Object.values(GLYPH_ASSETS).map(asset => asset.url)).size).toBe(8);
    for (const asset of Object.values(GLYPH_ASSETS)) {
      expect(asset.width).toBeGreaterThan(0);
      expect(asset.height).toBeGreaterThan(0);
    }
  });
  it("keeps one answer and three traps in each uploaded set", () => {
    for (const value of ["ㅁ", "ㆍ"]) {
      const board = createAlphabetStageBoard([value], ALPHABET_ORDER, 2);
      expect(board.every(tile => GLYPH_ASSETS[tile.value])).toBe(true);
      expect(board.filter(tile => !tile.shape && !tile.transform).map(tile => tile.value)).toEqual([value]);
      expect(board.filter(tile => tile.shape)).toHaveLength(3);
    }
  });
});
