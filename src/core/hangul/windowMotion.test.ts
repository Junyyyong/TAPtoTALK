import { expect, it } from "vitest";
import { windowMotion } from "./windowMotion";
import { nextSyllableDifficulty, FULL_SCORE_TARGETS } from "../../content/timedStages";
import { timedScore } from "./timedScore";
import { createMixedLearningBoard } from "./alphabetGame";
import { ALPHABET_ORDER } from "../../content/prompts";
import { requiredBoardSymbols } from "./target";

it("unlocks traps and windows one result at a time, never from a lower grade", () => {
  expect(timedScore(14, FULL_SCORE_TARGETS.syllable)).toBe(1312);
  expect(timedScore(15, FULL_SCORE_TARGETS.syllable)).toBe(1406);
  expect(timedScore(16, FULL_SCORE_TARGETS.syllable)).toBe(1500);
  expect(nextSyllableDifficulty(0, 1399)).toBe(0);
  expect(nextSyllableDifficulty(0, 1406)).toBe(1);
  expect(nextSyllableDifficulty(1, 1406)).toBe(2);
  expect(nextSyllableDifficulty(2, 1500)).toBe(2);
  expect(nextSyllableDifficulty(1, 0)).toBe(1);
});
it("uses TAPtoPICK's exact door phases", () => {
  expect(windowMotion(5999).phase).toBe("ready");
  expect(windowMotion(6180)).toMatchObject({ phase: "closing", closure: .5 });
  expect(windowMotion(6360)).toMatchObject({ phase: "closed", closure: 1 });
  expect(windowMotion(6480).phase).toBe("opening");
  expect(windowMotion(6660).closure).toBe(.5);
  expect(windowMotion(6840)).toMatchObject({ phase: "ready", cycle: 1 });
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
