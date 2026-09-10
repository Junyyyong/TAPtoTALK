import { describe, expect, it } from "vitest";
import { trapLooksLikeTarget } from "./visualTraps";
import { createAlphabetStageBoard, createMixedLearningBoard } from "./alphabetGame";
import { createWordBoard } from "./board";
import { requiredBoardSymbols } from "./target";
import { ALPHABET_ORDER, ALPHABET_STAGES } from "../../content/prompts";

describe("visually ambiguous traps", () => {
  it("recognizes rotated corners and the shared ieung/circle outline", () => {
    expect(trapLooksLikeTarget("ㄱ", "rotate-180", ["ㄴ"])).toBe(true);
    expect(trapLooksLikeTarget("ㄴ", "rotate-180", ["ㄱ"])).toBe(true);
    expect(trapLooksLikeTarget("○", undefined, ["ㅇ"])).toBe(true);
    expect(trapLooksLikeTarget("ㄱ", "rotate-180", ["ㄱ"])).toBe(false);
  });
  it("keeps single-letter choices but filters conflicts from fixed and mixed boards", () => {
    expect(createAlphabetStageBoard(["ㄱ"], ALPHABET_ORDER, 2).some(t => t.transform === "rotate-180")).toBe(true);
    for (const stage of ALPHABET_STAGES) {
      const board = createAlphabetStageBoard(stage.sequence, ALPHABET_ORDER, stage.boardSide);
      expect(board).toHaveLength(stage.boardSide ** 2);
      for (const t of board.filter(t => t.shape || t.transform)) expect(trapLooksLikeTarget(t.value, t.transform, stage.sequence)).toBe(false);
    }
    for (const sequence of [["ㄱ", "ㄴ", "ㄷ"], ["ㅁ", "ㅇ", "ㅣ"]]) {
      const board = createMixedLearningBoard(sequence, ALPHABET_ORDER, 8, .2);
      expect(board).toHaveLength(64);
      expect(board.filter(t => t.required).map(t => t.value).sort()).toEqual([...sequence].sort());
      for (const t of board.filter(t => t.shape || t.transform)) expect(trapLooksLikeTarget(t.value, t.transform, sequence)).toBe(false);
    }
  });
  it("also avoids rotated ㄱ/ㄴ conflicts while composing words", () => {
    const target = requiredBoardSymbols("강아지");
    for (let n = 0; n < 30; n++) for (const t of createWordBoard("강아지")) {
      if (t.transform) expect(trapLooksLikeTarget(t.symbol, t.transform, target)).toBe(false);
    }
  });
});
