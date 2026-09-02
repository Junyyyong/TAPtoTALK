import { describe, expect, it } from "vitest";
import { ALPHABET_COURSES } from "../../content/prompts";
import { checkSequenceTap, createAlphabetBoard, decomposeAlphabetTarget } from "./alphabetGame";

describe("Korean Alphabet courses", () => {
  it("offers three courses with four mandatory levels", () => {
    expect(ALPHABET_COURSES.map((course) => course.id)).toEqual(["consonants", "vowels", "syllables"]);
    expect(ALPHABET_COURSES.flatMap((course) => course.levels.map((level) => level.number))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    for (const course of ALPHABET_COURSES) {
      expect(course.levels).toHaveLength(4);
      for (const level of course.levels) {
        expect(level.sequence.length).toBeGreaterThan(0);
        expect(level.tapGroups).toHaveLength(level.sequence.length);
        expect(level.tapGroups.flat().length).toBeLessThanOrEqual(81);
      }
    }
  });

  it("runs the full consonant order once before the added-stroke groups", () => {
    const [basic, strokes] = ALPHABET_COURSES[0]!.levels;
    expect(basic!.durationMs).toBe(60_000);
    expect(basic!.sequence).toEqual(["ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ"]);
    expect(strokes!.durationMs).toBe(75_000);
    expect(strokes!.sequence).toEqual(["ㄱㅋ", "ㄴㄷㄹ", "ㅁㅂㅍ", "ㅅㅈㅊ", "ㅇㅎ"]);
  });

  it("adds mirrored traps from the first consonant level", () => {
    const consonants = ALPHABET_COURSES[0]!;
    expect(consonants.levels[0]!.trapChance).toBeGreaterThan(0);
    expect(consonants.levels[1]!.trapChance).toBeGreaterThan(consonants.levels[0]!.trapChance);
    const board = createAlphabetBoard(["ㄱ"], ["ㄱ"], 81, () => 0.42, 1);
    expect(board.filter((tile) => tile.required).every((tile) => !tile.mirror)).toBe(true);
    expect(board.some((tile) => tile.mirror === "horizontal")).toBe(true);
  });

  it("builds every vowel level using only Cheonjiin strokes", () => {
    for (const level of ALPHABET_COURSES[1]!.levels) {
      expect(level.pool).toEqual(["ㆍ", "ㅡ", "ㅣ"]);
      for (const tap of level.tapGroups.flat()) expect(["ㆍ", "ㅡ", "ㅣ"]).toContain(tap);
    }
    expect(ALPHABET_COURSES[1]!.levels[0]!.tapGroups[0]).toEqual(["ㅣ", "ㆍ"]);
    expect(ALPHABET_COURSES[1]!.levels[1]!.tapGroups[0]).toEqual(["ㅣ", "ㆍ", "ㆍ"]);
  });

  it("decomposes displayed syllables into jamo-only boards", () => {
    expect(decomposeAlphabetTarget("가")).toEqual(["ㄱ", "ㅏ"]);
    expect(decomposeAlphabetTarget("쾅")).toEqual(["ㅋ", "ㅘ", "ㅇ"]);
    for (const level of ALPHABET_COURSES[2]!.levels) {
      const board = createAlphabetBoard(level.tapGroups.flat(), level.pool, 81, () => 0.42, level.trapChance);
      expect(board.some((tile) => level.sequence.includes(tile.value))).toBe(false);
    }
  });

  it("advances only when the expected symbol is tapped", () => {
    const sequence = ["ㄱ", "ㄴ"];
    expect(checkSequenceTap(sequence, 0, "ㄷ")).toEqual({ correct: false, nextIndex: 0, complete: false });
    expect(checkSequenceTap(sequence, 0, "ㄱ")).toEqual({ correct: true, nextIndex: 1, complete: false });
    expect(checkSequenceTap(sequence, 1, "ㄴ")).toEqual({ correct: true, nextIndex: 2, complete: true });
  });
});
