import type { BoardSymbol } from "./keys";
import { CHOSEONG, FINAL_PARTS, JONGSEONG, JUNGSEONG, VOWEL_STROKES } from "./layout";

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

export type TargetToken = BoardSymbol | { control: "space" } | { control: "punctuation"; value: string };

/** Converts display text into the exact board taps and fixed controls it needs. */
export function targetToTokens(text: string): TargetToken[] {
  const tokens: TargetToken[] = [];

  for (const character of text.normalize("NFC")) {
    const code = character.codePointAt(0)!;
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const offset = code - HANGUL_BASE;
      const choseong = CHOSEONG[Math.floor(offset / (JUNG_COUNT * JONG_COUNT))]!;
      const jungseong = JUNGSEONG[Math.floor((offset % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT)]!;
      const jongseong = JONGSEONG[offset % JONG_COUNT]!;

      tokens.push(choseong, ...VOWEL_STROKES[jungseong]);
      if (jongseong) tokens.push(...FINAL_PARTS[jongseong]);
      continue;
    }

    if (character === " ") tokens.push({ control: "space" });
    else tokens.push({ control: "punctuation", value: character });
  }

  return tokens;
}

export function requiredBoardSymbols(text: string): BoardSymbol[] {
  return targetToTokens(text).filter((token): token is BoardSymbol => typeof token === "string");
}

