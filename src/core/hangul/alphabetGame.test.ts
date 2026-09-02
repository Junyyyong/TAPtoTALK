import { describe, expect, it } from "vitest";
import { ALPHABET_COURSES } from "../../content/prompts";
import { checkSequenceTap, createAlphabetBoard, createRandomAlphabetTargets, decomposeAlphabetTarget } from "./alphabetGame";

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

  it("randomizes consonant memory targets at lengths 3–6 and 7–9", () => {
    const [, , short, long] = ALPHABET_COURSES[0]!.levels;
    expect(short!.sequence.map((target) => target.length)).toEqual([3, 4, 5, 6]);
    expect(long!.sequence.map((target) => target.length)).toEqual([7, 8, 9]);
    expect(short!.randomizeTargets).toBe(true);
    expect(long!.randomizeTargets).toBe(true);
    const targets = createRandomAlphabetTargets([3, 4], ["ㄱ", "ㄴ", "ㄷ", "ㄹ"], () => 0);
    expect(targets.map((target) => target.length)).toEqual([3, 4]);
    expect(targets.every((target) => new Set(target).size === target.length)).toBe(true);
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
    ALPHABET_COURSES[1]!.levels.forEach((level, index) => {
      expect(level.sequence).toHaveLength(4);
      expect(level.pool).toEqual(index < 2 ? ["ㆍ", "ㅡ", "ㅣ"] : ["ㆍ", "ㅡ", "ㅣ", "."]);
      for (const tap of level.tapGroups.flat()) expect(["ㆍ", "ㅡ", "ㅣ"]).toContain(tap);
    });
    expect(ALPHABET_COURSES[1]!.levels[0]!.tapGroups[0]).toEqual(["ㅣ", "ㆍ"]);
    expect(ALPHABET_COURSES[1]!.levels[1]!.tapGroups[0]).toEqual(["ㅣ", "ㆍ", "ㆍ"]);
  });

  it("decomposes displayed syllables into jamo-only boards", () => {
    expect(decomposeAlphabetTarget("가")).toEqual(["ㄱ", "ㅏ"]);
    expect(decomposeAlphabetTarget("쾅")).toEqual(["ㅋ", "ㅘ", "ㅇ"]);
    for (const level of ALPHABET_COURSES[2]!.levels) {
      expect(level.sequence).toHaveLength(4);
      expect(level.tapGroups.flat().every((tap) => !["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅗ", "ㅘ", "ㅙ", "ㅚ", "ㅛ", "ㅜ", "ㅝ", "ㅞ", "ㅟ", "ㅠ", "ㅢ"].includes(tap))).toBe(true);
      const board = createAlphabetBoard(level.tapGroups.flat(), level.pool, 81, () => 0.42, level.trapChance);
      expect(board.some((tile) => level.sequence.includes(tile.value))).toBe(false);
    }
    expect(ALPHABET_COURSES[2]!.levels[0]!.tapGroups[0]).toEqual(["ㅅ", "ㅣ", "ㆍ", "ㄴ"]);
    expect(ALPHABET_COURSES[2]!.levels[2]!.sequence).toEqual(["개", "게", "내", "네"]);
    expect(ALPHABET_COURSES[2]!.levels[3]!.sequence).toEqual(["왜", "와", "꾀", "외"]);
    expect(ALPHABET_COURSES[2]!.levels[2]!.tapGroups[0]).toEqual(["ㄱ", "ㅣ", "ㆍ", "ㅣ"]);
    expect(ALPHABET_COURSES[2]!.levels[3]!.tapGroups[0]).toEqual(["ㅇ", "ㆍ", "ㅡ", "ㅣ", "ㆍ", "ㅣ"]);
  });

  it("advances only when the expected symbol is tapped", () => {
    const sequence = ["ㄱ", "ㄴ"];
    expect(checkSequenceTap(sequence, 0, "ㄷ")).toEqual({ correct: false, nextIndex: 0, complete: false });
    expect(checkSequenceTap(sequence, 0, "ㄱ")).toEqual({ correct: true, nextIndex: 1, complete: false });
    expect(checkSequenceTap(sequence, 1, "ㄴ")).toEqual({ correct: true, nextIndex: 2, complete: true });
  });
});
