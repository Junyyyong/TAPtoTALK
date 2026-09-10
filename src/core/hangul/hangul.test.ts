import { describe, expect, it } from "vitest";
import { createLetterBoard, inputValueForTile, trapTransformFor, trapTransformsFor, MIRROR_TRAP_CHANCE, MIRROR_TRAP_TOKEN, TARGET_SYMBOL_BUFFER } from "./board";
import { composeTokens } from "./compose";
import { BOARD_SYMBOLS, CHEONJIIN_STROKES, CONSONANTS, PUNCTUATION_SYMBOLS } from "./keys";
import { materializeTargetTokens, requiredBoardSymbols, targetCharacterProgress, targetToTokens } from "./target";
import { SENTENCE_LEVELS } from "../../content/prompts";

describe("TAPtoTALK Hangul domain", () => {
  it("maps jamo progress onto the visible target character", () => {
    expect(targetCharacterProgress("아뿔사", ["ㅇ"]).map(({ state }) => state)).toEqual(["current", "pending", "pending"]);
    expect(targetCharacterProgress("아뿔사", ["ㅇ", "ㅣ", "ㆍ"]).map(({ state }) => state)).toEqual(["done", "current", "pending"]);
    expect(targetCharacterProgress("아뿔사", ["ㅇ", "ㄱ"]).map(({ state }) => state)).toEqual(["wrong", "pending", "pending"]);
  });
  it("deals consonants, Cheonjiin strokes, and punctuation without a comma", () => {
    expect(BOARD_SYMBOLS).toHaveLength(25);
    expect(new Set(BOARD_SYMBOLS).size).toBe(25);
    expect(BOARD_SYMBOLS).toEqual([...CONSONANTS, ...CHEONJIIN_STROKES, ...PUNCTUATION_SYMBOLS]);
    expect(PUNCTUATION_SYMBOLS).toEqual([".", "!", "?"]);
    expect(BOARD_SYMBOLS).not.toContain(",");
    expect(BOARD_SYMBOLS).not.toContain("~");
  });

  it("round-trips a target sentence through Cheonjiin board taps", () => {
    const target = "나는 너를 사랑해";
    const input = materializeTargetTokens(targetToTokens(target));
    expect(composeTokens(input)).toBe(target);
  });

  it("builds tense consonants from repeated base taps", () => {
    const target = "까 타 빠 싸 짜 차";
    expect(composeTokens(materializeTargetTokens(targetToTokens(target)))).toBe(target);
  });

  it("keeps tense tiles as decoys but requires repeated base taps for targets", () => {
    expect(BOARD_SYMBOLS).toContain("ㄱ");
    expect(BOARD_SYMBOLS).toContain("ㅋ");
    expect(BOARD_SYMBOLS).toContain("ㄲ");
    expect(targetToTokens("까").slice(0, 2)).toEqual(["ㄱ", "ㄱ"]);
    expect(requiredBoardSymbols("꾀")).toEqual(["ㄱ", "ㄱ", "ㆍ", "ㅡ", "ㅣ"]);
    expect(composeTokens(materializeTargetTokens(targetToTokens("꾀")))).toBe("꾀");
  });

  it("composes combined final consonants in entered order", () => {
    expect(composeTokens(["ㅂ", "ㅡ", "ㆍ", "ㆍ", "ㅣ", "ㅣ", "ㄹ", "ㄱ"])).toBe("뷁");
    expect(composeTokens(materializeTargetTokens(targetToTokens("뷁")))).toBe("뷁");
  });

  it("decomposes tense initials, tense finals, and compound finals into base consonant taps", () => {
    expect(materializeTargetTokens(targetToTokens("꾀 밖 읽 값 있어"))).toEqual([
      "ㄱ", "ㄱ", "ㆍ", "ㅡ", "ㅣ", " ",
      "ㅂ", "ㅣ", "ㆍ", "ㄱ", "ㄱ", " ",
      "ㅇ", "ㅣ", "ㄹ", "ㄱ", " ",
      "ㄱ", "ㅣ", "ㆍ", "ㅂ", "ㅅ", " ",
      "ㅇ", "ㅣ", "ㅅ", "ㅅ", "ㅇ", "ㆍ", "ㅣ",
    ]);
    expect(composeTokens(materializeTargetTokens(targetToTokens("꾀 밖 읽 값 있어")))).toBe("꾀 밖 읽 값 있어");
  });

  it("reserves every symbol needed by the target and fills 81 cells", () => {
    const target = "나는 너를 사랑해";
    const board = createLetterBoard(target, () => 0.42);
    const needed = requiredBoardSymbols(target);
    const reserved = board.filter((tile) => tile.required).map((tile) => tile.symbol);

    expect(board).toHaveLength(81);
    expect(reserved).toHaveLength(Math.ceil(needed.length * TARGET_SYMBOL_BUFFER));
    for (const symbol of needed) expect(reserved).toContain(symbol);
  });

  it("provides about 1.5 times as many target jamo as the sample needs", () => {
    const needed = requiredBoardSymbols("사랑해");
    const reserved = createLetterBoard("사랑해", () => 0.42).filter((tile) => tile.required);
    expect(reserved).toHaveLength(Math.ceil(needed.length * 1.5));
    for (const stroke of CHEONJIIN_STROKES) expect(BOARD_SYMBOLS).toContain(stroke);
  });

  it("replaces punctuation with visibly transformed trap blocks on word boards", () => {
    expect(MIRROR_TRAP_CHANCE).toBe(0.2);
    let rngCall = 0;
    const board = createLetterBoard("사랑", () => rngCall++ % 2 === 0 ? 0.42 : 0.1);
    expect(board.some((tile) => PUNCTUATION_SYMBOLS.includes(tile.symbol as never))).toBe(false);
    const transformed = board.filter((tile) => tile.transform);
    expect(transformed.length).toBeGreaterThan(0);
    for (const tile of transformed) expect(trapTransformsFor(tile.symbol)).toContain(tile.transform);
    expect(trapTransformFor("ㄱ", () => 0)).toBe("rotate-90");
    expect(trapTransformFor("ㅂ", () => .99)).toBe("rotate-270");
    expect(trapTransformsFor("ㅁ")).toEqual([]);
    expect(inputValueForTile({ symbol: "ㄱ", transform: "flip-x" })).toBe(MIRROR_TRAP_TOKEN);
    expect(inputValueForTile({ symbol: "ㄱ" })).toBe("ㄱ");
  });

  it("rejects a target that cannot fit on one board", () => {
    expect(() => createLetterBoard("가".repeat(41))).toThrow(RangeError);
  });

  it("keeps every lesson phrase solvable on one 81-block board", () => {
    expect(SENTENCE_LEVELS).toHaveLength(6);
    for (const level of SENTENCE_LEVELS) {
      expect(level.prompts).toHaveLength(5);
      for (const prompt of level.prompts) {
        expect(prompt.text).not.toContain(",");
        expect(() => createLetterBoard(prompt.text)).not.toThrow();
      }
    }
  });
});
