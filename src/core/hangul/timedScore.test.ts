import { expect, it } from "vitest";
import { correctPrefix, timedScore } from "./timedScore";
import { stageSection, SCORE_POINTS, FULL_SCORE_MS } from "../../content/timedStages";

it("awards no points for mistakes or zero input, but retains correct partial input", () => {
  expect(correctPrefix(["ㄱ", "ㄱ", "ㅣ"], ["ㄱ", "×", "ㅣ"])).toBe(1);
  expect(correctPrefix(["ㄱ", "ㄱ"], ["ㄱ"])).toBe(1);
  expect(timedScore(0, 40, 60000, 60000, false, 20000, SCORE_POINTS)).toBe(0);
  expect(timedScore(20, 40, 60000, 60000, false, 20000, SCORE_POINTS)).toBe(300);
});
it("awards a bounded early clear bonus and caps endless scores", () => {
  for (const [seconds, score] of [[12,1500], [20,1500], [30,1275], [40,1050], [50,825], [60,600]]) {
    expect(timedScore(40, 40, seconds! * 1000, 60000, true, 20000, SCORE_POINTS)).toBe(score);
  }
  expect(timedScore(400, 40, 60000, 60000, false, null, SCORE_POINTS)).toBe(1500);
  expect(timedScore(20, 40, 60000, 60000, false, null, SCORE_POINTS)).toBe(500);
});
it("uses a valid, separately tunable full-score time for each fixed section", () => {
  for (const mode of ["alphabet", "syllable"] as const) {
    for (const time of Object.values(FULL_SCORE_MS[mode])) {
      expect(time).toBeGreaterThan(0); expect(time).toBeLessThan(60000);
      expect(timedScore(40, 40, time, 60000, true, time, SCORE_POINTS)).toBe(1500);
      expect(timedScore(40, 40, 60000, 60000, true, time, SCORE_POINTS)).toBe(600);
    }
  }
});
it("groups by board size, including retries at the beginning of a section", () => {
  expect(stageSection("alphabet", 10)).toMatchObject({ start: 0, end: 17, side: 2 });
  expect(stageSection("alphabet", 18)).toMatchObject({ start: 17, end: 23, side: 4 });
  expect(stageSection("alphabet", 26)).toMatchObject({ start: 23, end: 27, side: 6 });
  expect(stageSection("alphabet", 27).end).toBe(Infinity);
  expect(stageSection("syllable", 15)).toMatchObject({ start: 14, end: 42, side: 4 });
  expect(stageSection("word", 0).end).toBe(Infinity);
});
