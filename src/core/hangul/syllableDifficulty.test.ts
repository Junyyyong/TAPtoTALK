import { expect, it } from "vitest";
import { nextSyllableDifficulty, POINTS_PER_TARGET } from "../../content/timedStages";
import { timedScore } from "./timedScore";
import { createMixedLearningBoard } from "./alphabetGame";
import { ALPHABET_ORDER } from "../../content/prompts";
import { requiredBoardSymbols } from "./target";

it("unlocks 30% traps but never adds another difficulty tier", () => {
  expect(timedScore(9, POINTS_PER_TARGET.syllable)).toBe(1350);
  expect(timedScore(10, POINTS_PER_TARGET.syllable)).toBe(1500);
  expect(timedScore(11, POINTS_PER_TARGET.syllable)).toBe(1650);
  expect(nextSyllableDifficulty(0, 1499)).toBe(0);
  expect(nextSyllableDifficulty(0, 1500)).toBe(1);
  expect(nextSyllableDifficulty(1, 1500)).toBe(1);
  expect(nextSyllableDifficulty(1, 1500)).toBe(1);
  expect(nextSyllableDifficulty(1, 0)).toBe(1);
});
it("reserves every answer even with 30% traps", () => {
  const seq = requiredBoardSymbols("닭");
  for (let n = 0; n < 100; n++) {
    const board = createMixedLearningBoard(seq, ALPHABET_ORDER, 8, .3);
    expect(board.filter(t => t.shape || t.transform)).toHaveLength(19);
    for (const symbol of new Set(seq)) expect(board.filter(t => t.value === symbol && !t.shape && !t.transform).length)
      .toBeGreaterThanOrEqual(seq.filter(t => t === symbol).length);
  }
});
