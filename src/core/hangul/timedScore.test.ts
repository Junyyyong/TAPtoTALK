import { expect, it } from "vitest";
import { correctPrefix, timedScore } from "./timedScore";
import { stageSection } from "../../content/timedStages";

it("awards no points for mistakes or zero input, but retains correct partial input", () => {
  expect(correctPrefix(["ㄱ", "ㄱ", "ㅣ"], ["ㄱ", "×", "ㅣ"])).toBe(1);
  expect(correctPrefix(["ㄱ", "ㄱ"], ["ㄱ"])).toBe(1);
  expect(timedScore(0, 40, 60000, 60000, false)).toBe(0);
  expect(timedScore(20, 40, 60000, 60000, false)).toBe(500);
});
it("awards a bounded early clear bonus and caps endless scores", () => {
  expect(timedScore(40, 40, 12000, 60000, true)).toBe(1400);
  expect(timedScore(40, 40, 60000, 60000, true)).toBe(1000);
  expect(timedScore(400, 40, 60000, 60000, false)).toBe(1500);
});
it("groups by board size, including retries at the beginning of a section", () => {
  expect(stageSection("alphabet", 10)).toMatchObject({ start: 0, end: 17, side: 2 });
  expect(stageSection("alphabet", 18)).toMatchObject({ start: 17, end: 23, side: 4 });
  expect(stageSection("alphabet", 26)).toMatchObject({ start: 23, end: 27, side: 6 });
  expect(stageSection("alphabet", 27).end).toBe(Infinity);
  expect(stageSection("syllable", 15)).toMatchObject({ start: 14, end: 42, side: 4 });
  expect(stageSection("word", 0).end).toBe(Infinity);
});
