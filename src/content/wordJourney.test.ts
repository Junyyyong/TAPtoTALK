import { describe, expect, it } from "vitest";
import { createLetterBoard } from "../core/hangul/board";
import { composeTargetInput, requiredBoardSymbols } from "../core/hangul/target";
import { WORD_STAGES } from "./learningJourney";
import { createWordJourney, EXTRA_WORDS, wordLengthAt } from "./wordJourney";

describe("endless Word stages", () => {
  it("adds 60 unique translated words of the declared lengths, excluding all fixed words", () => {
    const all = Object.values(EXTRA_WORDS).flat();
    expect(all).toHaveLength(60);
    expect(new Set(all.map((item) => item.word)).size).toBe(60);
    const fixed = new Set(WORD_STAGES.map((item) => item.word));
    for (const [length, items] of Object.entries(EXTRA_WORDS)) {
      expect(items).toHaveLength(20);
      for (const item of items) {
        expect(item.word).toMatch(/^[가-힣]+$/);
        expect([...item.word]).toHaveLength(Number(length));
        expect(fixed.has(item.word)).toBe(false);
        expect(item.translation.trim()).not.toBe("");
        const tokens = requiredBoardSymbols(item.word);
        expect(composeTargetInput(item.word, tokens)).toBe(item.word);
        for (let run = 0; run < 5; run += 1) {
          const board = createLetterBoard(item.word);
          expect(board).toHaveLength(81);
          for (const token of new Set(tokens)) {
            expect(board.filter((tile) => tile.symbol === token && !tile.transform).length)
              .toBeGreaterThanOrEqual(tokens.filter((value) => value === token).length);
          }
        }
      }
    }
  });
  it("keeps 33 fixed stages, then ten 3-letter, ten 4-letter and endless 5-letter stages", () => {
    const next = createWordJourney();
    for (const item of WORD_STAGES) expect(next()).toEqual(item);
    const three = Array.from({ length: 10 }, next);
    const four = Array.from({ length: 10 }, next);
    expect(new Set(three.map((item) => item.word)).size).toBe(10);
    expect(new Set(four.map((item) => item.word)).size).toBe(10);
    expect(three.every((item) => item.word.length === 3)).toBe(true);
    expect(four.every((item) => item.word.length === 4)).toBe(true);
    let previous = "";
    for (let cycle = 0; cycle < 100; cycle += 1) {
      const round = Array.from({ length: 20 }, next);
      expect(new Set(round.map((item) => item.word)).size).toBe(20);
      expect(round.every((item) => item.word.length === 5)).toBe(true);
      expect(round[0]!.word).not.toBe(previous);
      previous = round.at(-1)!.word;
    }
    expect([32, 33, 42, 43, 52, 53, 10000].map(wordLengthAt)).toEqual([undefined, 3, 3, 4, 4, 5, 5]);
  });
  it("resets a new journey and rejects invalid indexes", () => {
    const next = createWordJourney(() => .5);
    for (let i = 0; i < 100; i += 1) next();
    expect(createWordJourney()()).toEqual(WORD_STAGES[0]);
    for (const index of [-1, .5, Infinity, NaN]) expect(() => wordLengthAt(index)).toThrow(RangeError);
  });
});
