import { describe, expect, it } from "vitest";
import { materializeTargetTokens, targetToTokens } from "../core/hangul/target";
import { canAcceptInput } from "./inputCapacity";

describe("typing capacity", () => {
  it("stops accepting taps at the target key count", () => {
    const target = "저는 학생이에요!";
    const input = materializeTargetTokens(targetToTokens(target));
    expect(canAcceptInput(input.slice(0, -1), input.at(-1)!, target)).toBe(true);
    expect(canAcceptInput(input, "ㆍ", target)).toBe(false);
    expect(canAcceptInput([...input, ...Array(20).fill("ㆍ")], "ㆍ", target)).toBe(false);
  });

  it("allows another tap after Delete reduces the input count", () => {
    const target = "사랑";
    const input = materializeTargetTokens(targetToTokens(target));
    expect(canAcceptInput(input, "ㆍ", target)).toBe(false);
    expect(canAcceptInput(input.slice(0, -1), input.at(-1)!, target)).toBe(true);
  });

  it("stops uncombined consonants from overflowing the visible target line", () => {
    expect(canAcceptInput(["ㄱ", "ㄴ"], "ㄷ", "사랑해")).toBe(true);
    expect(canAcceptInput(["ㄱ", "ㄴ", "ㄷ"], "ㄹ", "사랑해")).toBe(false);
  });
});
