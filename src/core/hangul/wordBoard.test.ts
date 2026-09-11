import { describe, expect, it } from "vitest";
import { createWordBoard } from "./board";
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
        expect(board.filter(t => !t.transform && t.symbol === symbol).length)
          .toBeGreaterThanOrEqual(taps.filter(t => t === symbol).length);
      }
      expect(composeTargetInput(word, [...word].flatMap(c => [...requiredBoardSymbols(c), "\u0000"]))).toBe(word);
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
