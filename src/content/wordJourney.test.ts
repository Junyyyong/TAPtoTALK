import { describe, expect, it } from "vitest";
import { createWordBoard } from "../core/hangul/board";
import { composeTokens } from "../core/hangul/compose";
import { composeTargetInput, requiredBoardSymbols } from "../core/hangul/target";
import { WORD_STAGES } from "./learningJourney";
import { createWordJourney, EXTRA_WORDS, wordLengthAt } from "./wordJourney";

describe("endless Word stages", () => {
  it("adds 100 unique translated words of the declared lengths, excluding all fixed words", () => {
    const all = Object.values(EXTRA_WORDS).flat();
    expect(all).toHaveLength(100);
    expect(new Set(all.map((item) => item.word)).size).toBe(100);
    expect(new Set(all.map((item) => item.id)).size).toBe(100);
    const fixed = new Set(WORD_STAGES.map((item) => item.word));
    for (const [length, items] of Object.entries(EXTRA_WORDS)) {
      expect(items).toHaveLength(length === "3" ? 23 : length === "4" ? 21 : 56);
      for (const item of items) {
        expect(item.word).toMatch(/^[가-힣]+$/);
        expect([...item.word]).toHaveLength(Number(length));
        expect(fixed.has(item.word)).toBe(false);
        expect(item.translation.trim()).not.toBe("");
        const tokens = requiredBoardSymbols(item.word);
        expect(composeTargetInput(item.word, [...item.word].flatMap(c => [...requiredBoardSymbols(c), "\u0000"]))).toBe(item.word);
        for (let run = 0; run < 5; run += 1) {
          const board = createWordBoard(item.word);
          expect(board).toHaveLength(64);
          for (const token of new Set(tokens)) {
            expect(board.filter((tile) => tile.symbol === token && !tile.transform).length)
              .toBeGreaterThanOrEqual(tokens.filter((value) => value === token).length);
          }
        }
      }
    }
  });
  it("keeps the introductory stages then cycles every extra word without recent repeats", () => {
    const next = createWordJourney();
    for (const item of WORD_STAGES) expect(next()).toEqual(item);
    const three = Array.from({ length: 10 }, next);
    const four = Array.from({ length: 10 }, next);
    expect(new Set(three.map((item) => item.word)).size).toBe(10);
    expect(new Set(four.map((item) => item.word)).size).toBe(10);
    expect(three.every((item) => item.word.length === 3)).toBe(true);
    expect(four.every((item) => item.word.length === 4)).toBe(true);
    const history = [...three, ...four].map(t => t.word);
    const remaining = Array.from({ length: 80 }, next);
    expect(new Set([...history, ...remaining.map(t => t.word)]).size).toBe(100);
    history.push(...remaining.map(t => t.word));
    for (let cycle = 0; cycle < 100; cycle += 1) {
      const round = Array.from({ length: 100 }, next);
      expect(new Set(round.map(item => item.word))).toEqual(new Set(Object.values(EXTRA_WORDS).flat().map(t => t.word)));
      for (const item of round) {
        expect(history.slice(-10)).not.toContain(item.word);
        history.push(item.word);
      }
    }
    expect([31, 32, 41, 42, 51, 52, 10000].map(wordLengthAt)).toEqual([undefined, 3, 3, 4, 4, 5, 5]);
  });
  it("resets a new journey and rejects invalid indexes", () => {
    const next = createWordJourney(() => .5);
    for (let i = 0; i < 100; i += 1) next();
    expect(createWordJourney()()).toEqual(WORD_STAGES[0]);
    for (const index of [-1, .5, Infinity, NaN]) expect(() => wordLengthAt(index)).toThrow(RangeError);
  });
  it("favours difficult vocabulary without restricting the endless pool to one length", () => {
    let seed = 87;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    let five = 0;
    for (let run = 0; run < 100; run++) {
      const next = createWordJourney(rng);
      for (let i = 0; i < WORD_STAGES.length + 20; i++) next();
      five += Array.from({ length: 20 }, next).filter(t => t.word.length === 5).length;
    }
    expect(five).toBeGreaterThan(1200);
  });
  it("excludes the four ambiguous words and composes every remaining target without Space", () => {
    const words = [...WORD_STAGES, ...Object.values(EXTRA_WORDS).flat()].map(t => t.word);
    expect(words).toHaveLength(132);
    expect(EXTRA_WORDS[3].find(t => t.word === "휴대폰")?.translation).toBe("mobile phone");
    expect(words).not.toContain("휴대전화");
    for (const word of ["학교", "초등학교", "국립박물관", "반짝반짝"]) expect(words).not.toContain(word);
    for (const word of words) expect.soft(composeTokens(requiredBoardSymbols(word)), word).toBe(word);
  });
  it("keeps the old saved remaining words before refilling with all 100 additions", () => {
    const saved = { index: 100, history: [], bags: [], introduced: [], firstEndlessBag: false, endless: [EXTRA_WORDS[3][0]!, EXTRA_WORDS[4][0]!] };
    const next = createWordJourney(() => .4, saved);
    expect(next()).toEqual(saved.endless[0]);
    expect(next()).toEqual(saved.endless[1]);
    expect(new Set(Array.from({ length: 100 }, next).map(t => t.word)))
      .toEqual(new Set(Object.values(EXTRA_WORDS).flat().map(t => t.word)));
  });
  it("adds no words with an identical final basic consonant and next initial", () => {
    const added = [...EXTRA_WORDS[3].slice(21), ...EXTRA_WORDS[4].slice(17), ...EXTRA_WORDS[5].slice(48)];
    expect(added).toHaveLength(14);
    for (const {word} of added) for (let i = 0; i < word.length - 1; i++) {
      if ((word.charCodeAt(i) - 0xac00) % 28 !== 0) {
        expect(requiredBoardSymbols(word[i]!).at(-1), word).not.toBe(requiredBoardSymbols(word[i + 1]!)[0]);
      }
    }
    expect(Object.values(EXTRA_WORDS).flat().some(t => t.word === "수족관")).toBe(false);
  });
});
