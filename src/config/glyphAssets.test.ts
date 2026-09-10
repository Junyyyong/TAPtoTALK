import { describe, expect, it } from "vitest";
import { GLYPH_ASSETS } from "./glyphAssets";
import { createAlphabetStageBoard } from "../core/hangul/alphabetGame";
import { ALPHABET_ORDER } from "../content/prompts";
import { readFileSync } from "node:fs";

describe("uploaded glyph mapping", () => {
  it("uses the longer uploaded strokes for both vowels and diagonals", () => {
    for (const value of ["ㅣ", "ㅡ", "╱", "╲"]) {
      const svg = decodeURIComponent(GLYPH_ASSETS[value]!.url.split(",").slice(1).join(","));
      expect(svg).toContain("81.6377953");
      expect(svg).toContain("10.6647949");
    }
  });
  it("maps the 31 sheet outlines and shares the new ieung for the circle trap", () => {
    expect(Object.keys(GLYPH_ASSETS)).toHaveLength(32);
    expect(GLYPH_ASSETS["○"]).toEqual(GLYPH_ASSETS["ㅇ"]);
    expect(new Set(Object.values(GLYPH_ASSETS).map(asset => asset.url)).size).toBe(31);
    for (const asset of Object.values(GLYPH_ASSETS)) {
      expect(asset.url).toMatch(/^data:image\/svg\+xml,/);
    }
    for (const value of ALPHABET_ORDER) expect(GLYPH_ASSETS[value]).toBeDefined();
    expect(GLYPH_ASSETS["ㅍ-stem-one"]).toBeDefined();
    expect(GLYPH_ASSETS["ㅍ-stem-three"]).toBeDefined();
  });
  it("keeps one answer and three traps in each uploaded set", () => {
    for (const value of ["ㅁ", "ㆍ"]) {
      const board = createAlphabetStageBoard([value], ALPHABET_ORDER, 2);
      expect(board.every(tile => GLYPH_ASSETS[tile.value])).toBe(true);
      expect(board.filter(tile => !tile.shape && !tile.transform).map(tile => tile.value)).toEqual([value]);
      expect(board.filter(tile => tile.shape)).toHaveLength(3);
    }
  });
  it("ships valid centered SVG assets rather than font-dependent labels", () => {
    for (const { url, file } of Object.values(GLYPH_ASSETS)) {
      const svg = readFileSync(`public${file}`, "utf8");
      expect(decodeURIComponent(url.slice("data:image/svg+xml,".length))).toBe(svg);
      expect(svg).toContain('viewBox="0 0 100 100"');
      expect(svg.match(/xmlns=/g)).toHaveLength(1);
      expect(svg).not.toContain("<text");
      expect(svg).not.toContain("font-family");
      expect(svg).toMatch(/<(path|rect|circle|polygon)\b/);
    }
  });
});
