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
    expect(alphabetTargetNote("ㆍ")).toBe("[ʌ]");
  });

  it("uses only visibly transformed copies of the target consonant", () => {
    const board = createAlphabetStageBoard(["ㄱ"], ALPHABET_ORDER, 2, () => .999);

    expect(board).toHaveLength(4);
    expect(board.filter(({ required }) => required)).toEqual([{ id: 0, value: "ㄱ", required: true }]);
    const choices = board.filter(({ required }) => !required);
    expect(choices).toHaveLength(3);
    expect(choices.every(({ value }) => value === "ㄱ")).toBe(true);
    expect(choices.map(({ transform }) => transform)).toEqual(["rotate-90", "rotate-180", "rotate-270"]);
  });

  it("keeps writing-game transforms separate from Alphabet rotations", () => {
    expect(trapTransformsFor("ㅁ")).toEqual([]);
    expect(trapTransformsFor("ㅂ")).toEqual(["rotate-90", "rotate-180", "rotate-270"]);
    expect(trapTransformsFor("ㅅ")).not.toContain("flip-x");
    expect(trapTransformsFor("ㅈ")).not.toContain("flip-x");
    expect(trapTransformsFor("ㅅ")).toContain("rotate-90");
    expect(trapTransformsFor("ㅅ")).toContain("rotate-270");

    const bieupBoard = createAlphabetStageBoard(["ㅂ"], ALPHABET_ORDER, 2, () => .999);
    expect(bieupBoard.some(({ value, transform }) => value === "ㅂ" && transform === "rotate-90")).toBe(true);
    expect(bieupBoard.some(({ value, transform }) => value === "ㅂ" && transform === "flip-x")).toBe(false);
    expect(bieupBoard.filter(({ required }) => !required).every(({ value }) => value === "ㅂ")).toBe(true);
    const mieumBoard = createAlphabetStageBoard(["ㅁ"], ALPHABET_ORDER, 2, () => .999);
    expect(mieumBoard.filter(({ required }) => !required).map(({ value }) => value)).toEqual(expect.arrayContaining(["ㅱ", "△", "○"]));
    expect(mieumBoard.some(({ value, transform }) => value === "ㅁ" && transform)).toBe(false);
  });

  it("never borrows another consonant to fill any single-target board", () => {
    for (const target of ALPHABET_ORDER.slice(0, 14).filter((value) => value !== "ㅁ" && value !== "ㅇ")) {
      const choices = createAlphabetStageBoard([target], ALPHABET_ORDER, 2, () => .999).filter(({ required }) => !required);

      expect(choices).toHaveLength(3);
      expect(choices.every(({ value }) => value === target)).toBe(true);
      expect(choices.every(({ transform }) => transform !== undefined)).toBe(true);
      expect(new Set(choices.map(({ transform }) => transform)).size).toBe(3);
    }
  });

  it("gives ㄱ and ㄴ distinct center-based angles", () => {
    const rotate = (x: number, y: number, degrees: number) => {
      const angle = degrees * Math.PI / 180;
      return `${Math.round(x * Math.cos(angle) - y * Math.sin(angle))},${Math.round(x * Math.sin(angle) + y * Math.cos(angle))}`;
    };
    for (const target of ["ㄱ", "ㄴ"]) {
      const board = createAlphabetStageBoard([target], ALPHABET_ORDER, 2, () => .999);
      const corners = board.map(({ transform }) => rotate(1, -1, transform ? Number(transform.slice(7)) : 0));
      expect(new Set(corners).size).toBe(4);
    }
  });

  it("compares ieung with three historical Hangul letterforms", () => {
    const choices = createAlphabetStageBoard(["ㅇ"], ALPHABET_ORDER, 2, () => .999).filter(({ required }) => !required);

    expect(choices.map(({ value }) => value)).toEqual(expect.arrayContaining(["ㆁ", "ㆆ", "ㆀ"]));
    expect(choices.every(({ shape }) => shape)).toBe(true);
    expect(choices.some(({ transform }) => transform)).toBe(false);
  });

  it("uses only line shapes for stroke vowels and simple symbols for the Cheonjiin dot", () => {
    for (const target of ["ㅣ", "ㅡ"]) {
      const choices = createAlphabetStageBoard([target], ALPHABET_ORDER, 2, () => .999).filter(({ required }) => !required);
      expect(choices.map(({ value }) => value)).toEqual(expect.arrayContaining(["╱", "╲", target === "ㅣ" ? "ㅡ" : "ㅣ"]));
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
    expect(board.filter(({ required }) => !required).every(({ value }) => ["ㄱ", "ㄴ", "ㄷ"].includes(value))).toBe(true);
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

  it("uses centered rotations for rieul and uploaded stem counts for pieup", () => {
    expect(createAlphabetStageBoard(["ㄹ"], ALPHABET_ORDER, 2, () => .999).filter(t => !t.required).map(t => t.transform)).toEqual(["flip-x", "rotate-90", "flip-x-rotate-90"]);
    expect(createAlphabetStageBoard(["ㅍ"], ALPHABET_ORDER, 2, () => .999).filter(t => !t.required).map(t => t.transform)).toEqual(["stem-one", "stem-three", "rotate-90"]);
  });

  it("gives rieul four distinct outlines, not just differently named transforms", () => {
    const path = [[-1, -1], [1, -1], [1, 0], [-1, 0], [-1, 1], [1, 1]];
    const outline = (transform = "") => {
      const points = path.map(([x = 0, y = 0]) => {
        if (transform.includes("flip-x")) x = -x;
        if (transform === "flip-y") y = -y;
        if (transform === "flip-x-rotate-90") [x, y] = [-y, x];
        if (transform.startsWith("rotate-")) {
          const a = Number(transform.slice(7)) * Math.PI / 180;
          [x, y] = [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
        }
        return `${x.toFixed(4)},${y.toFixed(4)}`;
      });
      return points.slice(1).map((point, index) => [points[index], point].sort().join(":")).sort().join(";");
    };
    expect(outline("flip-x")).toBe(outline("flip-y"));
    const board = createAlphabetStageBoard(["ㄹ"], ALPHABET_ORDER, 2);
    expect(new Set(board.map(tile => outline(tile.transform))).size).toBe(4);
  });

  it("still decomposes tense initials and compound finals into basic jamo", () => {
    expect(decomposeAlphabetTarget("꾀")).toEqual(["ㄱ", "ㄱ", "ㅚ"]);
    expect(decomposeAlphabetTarget("읽")).toEqual(["ㅇ", "ㅣ", "ㄹ", "ㄱ"]);
  });
});
