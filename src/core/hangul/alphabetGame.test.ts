import { describe, expect, it } from "vitest";
import { ALPHABET_BOARD_SIDES, ALPHABET_ORDER, ALPHABET_STAGES, alphabetTargetNote } from "../../content/prompts";
import { trapTransformsFor } from "./board";
import { checkSequenceTap, createAlphabetStageBoard, decomposeAlphabetTarget } from "./alphabetGame";

describe("Alphabet journey", () => {
  it("moves from single jamo to ordered groups of three and five", () => {
    expect(ALPHABET_STAGES).toHaveLength(27);
    expect([...new Set(ALPHABET_STAGES.map(({ boardSide }) => boardSide))]).toEqual(ALPHABET_BOARD_SIDES);
    expect(ALPHABET_ORDER).toEqual([..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ", "ㅣ", "ㅡ", "ㆍ"]);
    expect(ALPHABET_STAGES.filter(({ boardSide }) => boardSide === 2).map(({ target }) => target)).toEqual(ALPHABET_ORDER);
    expect(ALPHABET_STAGES.filter(({ boardSide }) => boardSide === 4).map(({ target }) => target)).toEqual([
      "ㄱㄴㄷ", "ㄹㅁㅂ", "ㅅㅇㅈ", "ㅊㅋㅌ", "ㅍㅎㅣ", "ㅡㆍ",
    ]);
    expect(ALPHABET_STAGES.filter(({ boardSide }) => boardSide === 6).map(({ target }) => target)).toEqual([
      "ㄱㄴㄷㄹㅁ", "ㅂㅅㅇㅈㅊ", "ㅋㅌㅍㅎㅣ", "ㅡㆍ",
    ]);
    expect(ALPHABET_STAGES.every(({ sequence, target }) => sequence.join("") === target)).toBe(true);
  });

  it("uses one compact bracket for positional sound variants", () => {
    expect(alphabetTargetNote("ㄱ")).toBe("[k/g]");
    expect(alphabetTargetNote("ㄷ")).toBe("[t/d]");
    expect(alphabetTargetNote("ㄹ")).toBe("[ɾ/l]");
    expect(alphabetTargetNote("ㅇ")).toBe("[∅/ŋ]");
    expect(alphabetTargetNote("ㅣ")).toBe("[i]");
    expect(alphabetTargetNote("ㅡ")).toBe("[ɯ]");
    expect(alphabetTargetNote("ㆍ")).toBe("CHEON · SKY");
  });

  it("opens a consonant with horizontal, vertical, and 90-degree transformed choices", () => {
    const board = createAlphabetStageBoard(["ㄱ"], ALPHABET_ORDER, 2, () => .999);

    expect(board).toHaveLength(4);
    expect(board.filter(({ required }) => required)).toEqual([{ id: 0, value: "ㄱ", required: true }]);
    expect(board.filter(({ transform }) => transform).map(({ transform }) => transform)).toEqual(expect.arrayContaining([
      "flip-x", "flip-y", "rotate-90",
    ]));
    expect(board.filter(({ required }) => !required)).toHaveLength(3);
  });

  it("never uses an unchanged symmetry and keeps rotation to 90 degrees", () => {
    expect(trapTransformsFor("ㅁ")).toEqual([]);
    expect(trapTransformsFor("ㅂ")).toEqual(["rotate-90"]);
    expect(trapTransformsFor("ㅅ")).not.toContain("flip-x");
    expect(trapTransformsFor("ㅈ")).not.toContain("flip-x");
    expect(trapTransformsFor("ㅅ")).toContain("rotate-90");
    expect(trapTransformsFor("ㅅ")).not.toContain("rotate-270" as never);

    const bieupBoard = createAlphabetStageBoard(["ㅂ"], ALPHABET_ORDER, 2, () => .999);
    expect(bieupBoard.some(({ value, transform }) => value === "ㅂ" && transform === "rotate-90")).toBe(true);
    expect(bieupBoard.some(({ value, transform }) => value === "ㅂ" && transform === "flip-x")).toBe(false);
    const mieumBoard = createAlphabetStageBoard(["ㅁ"], ALPHABET_ORDER, 2, () => .999);
    expect(mieumBoard.filter(({ required }) => !required).map(({ value }) => value)).toEqual(expect.arrayContaining(["○", "△", "ㅇ"]));
    expect(mieumBoard.some(({ value, transform }) => value === "ㅁ" && transform)).toBe(false);
  });

  it("uses only line shapes for stroke vowels and simple symbols for the Cheonjiin dot", () => {
    for (const target of ["ㅣ", "ㅡ"]) {
      const choices = createAlphabetStageBoard([target], ALPHABET_ORDER, 2, () => .999).filter(({ required }) => !required);
      expect(choices.map(({ value }) => value)).toEqual(expect.arrayContaining(["╱", "∿", "╲"]));
      expect(choices.every(({ shape }) => shape)).toBe(true);
    }
    const dotChoices = createAlphabetStageBoard(["ㆍ"], ALPHABET_ORDER, 2, () => .999).filter(({ required }) => !required);
    expect(dotChoices.map(({ value }) => value)).toEqual(expect.arrayContaining(["★", "♥", ","]));
    expect(dotChoices.every(({ shape }) => shape)).toBe(true);
  });

  it("grows the board without adding another valid copy of the answer", () => {
    for (const boardSide of ALPHABET_BOARD_SIDES) {
      const sequence = boardSide === 2 ? ["ㄱ"] : boardSide === 4 ? ["ㄱ", "ㄴ", "ㄷ"] : ["ㄱ", "ㄴ", "ㄷ", "ㄹ", "ㅁ"];
      const board = createAlphabetStageBoard(sequence, ALPHABET_ORDER, boardSide, () => .42);
      expect(board).toHaveLength(boardSide * boardSide);
      for (const target of sequence) expect(board.filter(({ value, transform }) => value === target && !transform)).toHaveLength(1);
      expect(board.some(({ transform }) => transform !== undefined)).toBe(true);
    }
  });

  it("keeps one required tile for every part of a grouped stage", () => {
    const board = createAlphabetStageBoard(["ㄱ", "ㄴ", "ㄷ"], ALPHABET_ORDER, 4, () => .31);
    expect(board.filter(({ required }) => required).map(({ value }) => value)).toEqual(expect.arrayContaining(["ㄱ", "ㄴ", "ㄷ"]));
    expect(board.filter(({ required }) => required)).toHaveLength(3);
  });

  it("keeps consonants out of a vowel-only grouped board", () => {
    const board = createAlphabetStageBoard(["ㅡ", "ㆍ"], ALPHABET_ORDER, 4, () => .17);
    const choices = board.filter(({ required }) => !required);
    expect(choices.every(({ shape }) => shape)).toBe(true);
    expect(choices.some(({ value }) => ALPHABET_ORDER.slice(0, 14).includes(value as never))).toBe(false);
  });

  it("keeps ordinary wrong choices from advancing the target", () => {
    expect(checkSequenceTap(["ㄱ"], 0, "ㄴ")).toEqual({ correct: false, nextIndex: 0, complete: false });
    expect(checkSequenceTap(["ㄱ"], 0, "ㄱ")).toEqual({ correct: true, nextIndex: 1, complete: true });
  });

  it("still decomposes tense initials and compound finals into basic jamo", () => {
    expect(decomposeAlphabetTarget("꾀")).toEqual(["ㄱ", "ㄱ", "ㅚ"]);
    expect(decomposeAlphabetTarget("읽")).toEqual(["ㅇ", "ㅣ", "ㄹ", "ㄱ"]);
  });
});
