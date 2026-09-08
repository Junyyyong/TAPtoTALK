import { describe, expect, it } from "vitest";
import { ALPHABET_BOARD_SIDES, ALPHABET_ORDER, ALPHABET_STAGES, alphabetTargetNote } from "../../content/prompts";
import { checkSequenceTap, createAlphabetStageBoard, decomposeAlphabetTarget } from "./alphabetGame";

describe("Alphabet journey", () => {
  it("repeats the full learning order on 2×2, 4×4, and 6×6 boards", () => {
    expect(ALPHABET_STAGES).toHaveLength(ALPHABET_ORDER.length * 3);
    expect([...new Set(ALPHABET_STAGES.map(({ boardSide }) => boardSide))]).toEqual(ALPHABET_BOARD_SIDES);
    for (const boardSide of ALPHABET_BOARD_SIDES) {
      expect(ALPHABET_STAGES.filter((stage) => stage.boardSide === boardSide).map(({ target }) => target)).toEqual(ALPHABET_ORDER);
    }
    expect(ALPHABET_ORDER).toEqual([..."ㄱㄴㄷㄹㅁㅂㅅㅇㅈㅊㅋㅌㅍㅎ", "ㅣ", "ㅡ", "ㆍ"]);
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

  it("opens with one answer, one normal distractor, and two mirrored traps", () => {
    const board = createAlphabetStageBoard("ㄱ", ALPHABET_ORDER, 2, () => .999);

    expect(board).toHaveLength(4);
    expect(board.filter(({ required }) => required)).toEqual([{ id: 0, value: "ㄱ", required: true }]);
    expect(board.filter(({ mirror }) => mirror).map(({ value, mirror }) => ({ value, mirror }))).toEqual(expect.arrayContaining([
      { value: "ㄱ", mirror: "horizontal" },
      { value: "ㄱ", mirror: "vertical" },
    ]));
    expect(board.some(({ value, mirror }) => value === "ㄴ" && !mirror)).toBe(true);
  });

  it("grows the board without adding another valid copy of the answer", () => {
    for (const boardSide of ALPHABET_BOARD_SIDES) {
      const board = createAlphabetStageBoard("ㄱ", ALPHABET_ORDER, boardSide, () => .42);
      expect(board).toHaveLength(boardSide * boardSide);
      expect(board.filter(({ value, mirror }) => value === "ㄱ" && !mirror)).toHaveLength(1);
      expect(board.some(({ mirror }) => mirror !== undefined)).toBe(true);
    }
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
