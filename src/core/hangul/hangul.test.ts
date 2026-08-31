import { describe, expect, it } from "vitest";
import { createLetterBoard } from "./board";
import { composeTokens } from "./compose";
import { ASPIRATED_CONSONANTS, BOARD_SYMBOLS, DOUBLE_CONSONANTS } from "./keys";
import { materializeTargetTokens, requiredBoardSymbols, targetToTokens } from "./target";

describe("TAPtoTALK Hangul domain", () => {
  it("keeps only primitive consonants and vowels on the random board", () => {
    expect(BOARD_SYMBOLS).toHaveLength(12);
    expect(new Set(BOARD_SYMBOLS).size).toBe(12);
    expect(BOARD_SYMBOLS).not.toContain("ㆍ");
  });

  it("round-trips a target sentence through Cheonjiin board taps", () => {
    const target = "나는 너를 사랑해";
    const input = materializeTargetTokens(targetToTokens(target));
    expect(composeTokens(input)).toBe(target);
  });

  it("builds tense and aspirated consonants through separate fixed keys", () => {
    const target = "까 타 빠 싸 짜 차";
    expect(composeTokens(materializeTargetTokens(targetToTokens(target)))).toBe(target);
  });

  it("keeps the requested gahoeck and byeongseo mappings separate", () => {
    expect(ASPIRATED_CONSONANTS).toEqual({ "ㄱ": "ㅋ", "ㄷ": "ㅌ", "ㅂ": "ㅍ", "ㅈ": "ㅊ" });
    expect(DOUBLE_CONSONANTS).toEqual({ "ㄱ": "ㄲ", "ㄷ": "ㄸ", "ㅂ": "ㅃ", "ㅅ": "ㅆ", "ㅈ": "ㅉ" });
  });

  it("reserves every symbol needed by the target and fills 81 cells", () => {
    const target = "나는 너를 사랑해";
    const board = createLetterBoard(target, () => 0.42);
    const needed = requiredBoardSymbols(target);
    const reserved = board.filter((tile) => tile.required).map((tile) => tile.symbol);

    expect(board).toHaveLength(81);
    expect(reserved.sort()).toEqual([...needed].sort());
  });

  it("rejects a target that cannot fit on one board", () => {
    expect(() => createLetterBoard("가".repeat(41))).toThrow(RangeError);
  });
});
