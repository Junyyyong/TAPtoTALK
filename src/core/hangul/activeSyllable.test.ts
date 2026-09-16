import { expect, it } from "vitest";
import { activeTargetSyllable, requiredBoardSymbols } from "./target";
it("advances one syllable at a time and moves back after deletion", () => {
  const target = "어슬렁어슬렁", taps = requiredBoardSymbols(target);
  const first = requiredBoardSymbols("어").length;
  expect(activeTargetSyllable(target, [])).toMatchObject({ character: "어", current: 0, sequence: ["ㅇ", "ㆍ", "ㅣ"] });
  expect(activeTargetSyllable(target, taps.slice(0, first))).toMatchObject({ character: "슬", current: 0 });
  expect(activeTargetSyllable(target, taps.slice(0, first - 1))).toMatchObject({ character: "어", current: first - 1 });
  expect(activeTargetSyllable(target, taps)).toMatchObject({ character: "렁", index: 5, current: requiredBoardSymbols("렁").length });
});
it("stalls on errors until deleted and supports repeated consonants/compound finals", () => {
  expect(activeTargetSyllable("아뿔사", ["×", "ㅇ"])).toMatchObject({ character: "아", current: 0 });
  const taps = requiredBoardSymbols("아");
  expect(activeTargetSyllable("아뿔사", [...taps, "ㅂ", "×", "ㅂ"])).toMatchObject({ character: "뿔", current: 1 });
  expect(activeTargetSyllable("꾀", [])).toMatchObject({ sequence: ["ㄱ", "ㄱ", "ㆍ", "ㅡ", "ㅣ"] });
  expect(activeTargetSyllable("닭", [])).toMatchObject({ sequence: requiredBoardSymbols("닭") });
  expect(activeTargetSyllable("", [])).toMatchObject({ sequence: [], current: 0 });
});
