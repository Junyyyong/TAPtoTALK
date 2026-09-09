import { describe, expect, it } from "vitest";
import { composeTokens } from "../core/hangul/compose";
import { createAlphabetStageBoard, createMixedLearningBoard } from "../core/hangul/alphabetGame";
import { ALPHABET_ORDER, ALPHABET_STAGES } from "./prompts";
import { learningStageAt, LEARNING_TRAP_RATIO, SYLLABLE_STAGES } from "./learningJourney";

describe("continuous learning journeys", () => {
  it("continues after fixed Alphabet lessons with three random targets on 8×8", () => {
    expect(learningStageAt("alphabet", 0).target).toBe("ㄱ");
    expect(learningStageAt("alphabet", ALPHABET_STAGES.length - 1).boardSide).toBe(6);
    for (const index of [ALPHABET_STAGES.length, 100, 10000]) {
      const stage = learningStageAt("alphabet", index);
      expect(stage.boardSide).toBe(8);
      expect(stage.sequence).toHaveLength(3);
      expect(stage.sequence.every((value) => ALPHABET_ORDER.includes(value))).toBe(true);
      const board = createMixedLearningBoard(stage.sequence, ALPHABET_ORDER, 8, LEARNING_TRAP_RATIO);
      expect(board).toHaveLength(64);
      expect(board.filter((tile) => tile.transform || tile.shape)).toHaveLength(13);
      for (const value of ALPHABET_ORDER) expect(board.some((tile) => tile.value === value && !tile.transform && !tile.shape)).toBe(true);
    }
  });
  it("starts 가 then 나, and reserves every individual composition tap", () => {
    expect(learningStageAt("syllable", 0).sequence).toEqual(["ㄱ", "ㅣ", "ㆍ"]);
    expect(learningStageAt("syllable", 1).target).toBe("나");
    for (const stage of SYLLABLE_STAGES) {
      expect(composeTokens(stage.sequence)).toBe(stage.target);
      const board = stage.boardSide === 2
        ? createAlphabetStageBoard(stage.sequence, ALPHABET_ORDER, 2)
        : createMixedLearningBoard(stage.sequence, ALPHABET_ORDER, stage.boardSide, LEARNING_TRAP_RATIO);
      expect(board.filter((tile) => tile.required).map((tile) => tile.value).sort()).toEqual([...stage.sequence].sort());
      expect(board.some((tile) => tile.value === stage.target)).toBe(false);
    }
    expect(learningStageAt("syllable", 10000).boardSide).toBe(8);
  });
});
