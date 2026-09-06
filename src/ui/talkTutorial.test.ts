import { describe, expect, it } from "vitest";
import { materializeTargetTokens, targetToTokens } from "../core/hangul/target";
import { TUTORIAL_STEPS } from "./talkApp";

describe("How to play tutorial", () => {
  it("shows 가 as the syllable target and teaches its three input blocks", () => {
    const step = TUTORIAL_STEPS.find(({ title }) => title === "Build a syllable");

    expect(step).toMatchObject({ target: "가", keys: ["ㄱ", "ㅣ", "ㆍ"] });
  });

  it("keeps each tutorial key sequence consistent with its displayed target", () => {
    for (const step of TUTORIAL_STEPS) {
      expect(step.keys, step.title).toEqual(materializeTargetTokens(targetToTokens(step.target)));
    }
  });

  it("keeps repeated jamo as separate visible blocks", () => {
    const compoundVowel = TUTORIAL_STEPS.find(({ target }) => target === "개")!;
    const word = TUTORIAL_STEPS.find(({ target }) => target === "사랑")!;

    expect(compoundVowel.keys).toEqual(["ㄱ", "ㅣ", "ㆍ", "ㅣ"]);
    expect(word.keys).toEqual(["ㅅ", "ㅣ", "ㆍ", "ㄹ", "ㅣ", "ㆍ", "ㅇ"]);
  });
});
