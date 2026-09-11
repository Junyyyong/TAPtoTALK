import { describe, expect, it } from "vitest";
import { composeTokens } from "../core/hangul/compose";
import { CHOSEONG, JONGSEONG, JUNGSEONG } from "../core/hangul/layout";
import { composeTargetInput, requiredBoardSymbols } from "../core/hangul/target";
import { createAlphabetStageBoard, createMixedLearningBoard } from "../core/hangul/alphabetGame";
import { ALPHABET_ORDER, ALPHABET_STAGES } from "./prompts";
import { learningStageAt, LEARNING_TRAP_RATIO, SYLLABLE_STAGES, WORD_STAGES, WORD_JOURNEY_SCORE_TIME_MS } from "./learningJourney";

describe("continuous learning journeys", () => {
  it("uses noun finals and all tense initials on 4x4 with enough separate tiles", () => {
    const advanced = SYLLABLE_STAGES.filter(s => s.boardSide === 4);
    const finals = new Set(advanced.map(s => JONGSEONG[(s.target.charCodeAt(0) - 0xac00) % 28]).filter(Boolean));
    expect(finals).toEqual(new Set(["ㄴ", "ㅇ", "ㄹ", "ㅂ", "ㅅ", "ㅁ", "ㄺ", "ㅄ", "ㄻ", "ㄳ"]));
    const initials = advanced.map(s => CHOSEONG[Math.floor((s.target.charCodeAt(0) - 0xac00) / 588)]);
    for (const tense of ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"]) expect(initials).toContain(tense);
    for (const stage of advanced) {
      expect(stage.target).toHaveLength(1);
      expect(stage.sequence.some(t => ["ㄲ", "ㄸ", "ㅃ", "ㅆ", "ㅉ"].includes(t))).toBe(false);
      expect(stage.sequence.length).toBeLessThanOrEqual(16);
    }
  });
  it("teaches all 21 vowels and randomizes only practiced syllables", () => {
    const vowels = SYLLABLE_STAGES.map(s => JUNGSEONG[Math.floor((s.target.charCodeAt(0) - 0xac00) % 588 / 28)]);
    expect(new Set(vowels)).toEqual(new Set(JUNGSEONG));
    expect(SYLLABLE_STAGES.filter(s => s.boardSide === 4).map(s => s.target).join("")).toBe("아야어여오요우유으이애에얘예와왜외워웨위의까따빠싸짜산강물불눈손발집밥옷달별입몸닭흙값삶몫");
    expect(SYLLABLE_STAGES.some(s => s.boardSide === 6)).toBe(false);
    for (let i = 0; i < 100; i++) {
      const target = learningStageAt("syllable", SYLLABLE_STAGES.length + i).target;
      expect(SYLLABLE_STAGES.some(s => s.target === target)).toBe(true);
    }
  });
  it("keeps grouped consonants separate from cheonjiin in sky-earth-person order", () => {
    expect(ALPHABET_STAGES.filter(stage => stage.boardSide === 2).slice(-3).map(stage => stage.target)).toEqual(["ㆍ", "ㅡ", "ㅣ"]);
    expect(ALPHABET_STAGES.filter(stage => stage.boardSide === 4).map(stage => stage.target)).toEqual(["ㄱㄴㄷ", "ㄹㅁㅂ", "ㅅㅇㅈ", "ㅊㅋㅌ", "ㅍㅎ", "ㆍㅡㅣ"]);
    expect(ALPHABET_STAGES.filter(stage => stage.boardSide === 6).map(stage => stage.target)).toEqual(["ㄱㄴㄷㄹㅁ", "ㅂㅅㅇㅈㅊ", "ㅋㅌㅍㅎ", "ㆍㅡㅣ"]);
  });
  it("merges all word lessons into one ordered 33-stage course", () => {
    expect(ALPHABET_STAGES).toHaveLength(27);
    expect(SYLLABLE_STAGES).toHaveLength(59);
    expect(WORD_STAGES).toHaveLength(33);
    expect(new Set(WORD_STAGES.map((stage) => stage.word)).size).toBe(33);
    expect(WORD_STAGES[0]!.word).toBe("아기");
    expect(WORD_STAGES[6]!.word).toBe("사랑");
    expect(WORD_STAGES[32]!.word).toBe("외");
    expect(WORD_JOURNEY_SCORE_TIME_MS).toBeGreaterThan(0);
    for (const stage of WORD_STAGES) expect(composeTargetInput(stage.word, [...stage.word].flatMap(c => [...requiredBoardSymbols(c), "\u0000"]))).toBe(stage.word);
    expect(composeTargetInput("오빠", ["ㅇ", "ㆍ", "ㅡ", "ㅂ", "ㅂ", "ㅣ", "ㆍ"])).toBe("오빠");
    expect(composeTargetInput("오빠", ["ㅇ"])).toBe("ㅇ");
    expect(composeTargetInput("오빠", [...requiredBoardSymbols("오빠"), "ㄱ"])).not.toBe("오빠");
  });
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
    expect(learningStageAt("syllable", 10000).boardSide).toBe(6);
    expect(learningStageAt("syllable", 10000, "", Math.random, 2).boardSide).toBe(8);
  });
});
