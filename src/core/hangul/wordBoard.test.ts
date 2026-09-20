import { describe, expect, it } from "vitest";
import { createWordBoard, inputValueForTile, MIRROR_TRAP_TOKEN } from "./board";
import { requiredBoardSymbols, composeTargetInput } from "./target";
import { WORD_STAGES } from "../../content/learningJourney";
import { EXTRA_WORDS, isWordBonusStage } from "../../content/wordJourney";

describe("8×8 Word board", () => {
  it("keeps every current word solvable without tense blocks", () => {
    for (const { word } of [...WORD_STAGES, ...Object.values(EXTRA_WORDS).flat()]) {
      const board = createWordBoard(word);
      expect(board).toHaveLength(64);
      expect(board.some(t => "ㄲㄸㅃㅆㅉ".includes(t.symbol))).toBe(false);
      const taps = requiredBoardSymbols(word);
      for (const symbol of new Set(taps)) {
        expect(board.filter(t => !t.shape && !t.transform && t.symbol === symbol).length)
          .toBeGreaterThanOrEqual(taps.filter(t => t === symbol).length);
      }
      expect(composeTargetInput(word, [...word].flatMap(c => [...requiredBoardSymbols(c), "\u0000"]))).toBe(word);
    }
  });
  it("includes vowel shape traps without consuming any reserved answer blocks", () => {
    for (const { word } of [...WORD_STAGES, ...Object.values(EXTRA_WORDS).flat()]) {
      const board = createWordBoard(word);
      expect(board.filter(t => t.shape).map(t => t.shape).sort()).toEqual([",", "╱", "╲", "★", "♥"].sort());
      for (const tile of board) {
        if (tile.shape) {
          expect(tile.required).toBe(false);
          expect(inputValueForTile(tile)).toBe(MIRROR_TRAP_TOKEN);
        }
        if (tile.required) expect(inputValueForTile(tile)).toBe(tile.symbol);
      }
      expect(board.filter(t => t.required)).toHaveLength(Math.ceil(requiredBoardSymbols(word).length * 1.5));
    }
  });
  it("supports repeated basic consonants in 꾀, 아빠 and 읽", () => {
    for (const word of ["꾀", "아빠", "읽"]) {
      const taps = requiredBoardSymbols(word);
      expect(composeTargetInput(word, taps)).toBe(word);
      expect(createWordBoard(word)).toHaveLength(64);
    }
    expect(requiredBoardSymbols("꾀")).toEqual(["ㄱ", "ㄱ", "ㆍ", "ㅡ", "ㅣ"]);
  });
  it("shows bonus only after each ten completed stages", () => {
    for (let n = 0; n <= 101; n++) expect(isWordBonusStage(n)).toBe(n > 0 && n % 10 === 0);
    expect(isWordBonusStage(10.5)).toBe(false);
  });
});
