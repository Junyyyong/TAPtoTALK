import { consonantInput, transformedConsonant, type BoardSymbol } from "./keys";
import { CHOSEONG, FINAL_PARTS, JONGSEONG, JUNGSEONG, VOWEL_STROKES } from "./layout";

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

export type TargetToken =
  | BoardSymbol
  | { control: "dot" | "aspirate" | "double" | "space" }
  | { control: "punctuation"; value: string };

function pushConsonant(tokens: TargetToken[], consonant: (typeof CHOSEONG)[number]): void {
  const input = consonantInput(consonant);
  tokens.push(input.base);
  if (input.transform) tokens.push({ control: input.transform });
}

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

      pushConsonant(tokens, choseong);
      for (const stroke of VOWEL_STROKES[jungseong]) {
        tokens.push(stroke === "ㆍ" ? { control: "dot" } : stroke);
      }
      if (jongseong) FINAL_PARTS[jongseong].forEach((part) => pushConsonant(tokens, part));
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

/** Resolves fixed-key actions to the stream consumed by the Hangul composer. */
export function materializeTargetTokens(tokens: readonly TargetToken[]): string[] {
  const values: string[] = [];
  let transform: { index: number; base: BoardSymbol } | undefined;
  for (const token of tokens) {
    if (typeof token === "string") {
      values.push(token);
      transform = { index: values.length - 1, base: token };
    } else if ((token.control === "aspirate" || token.control === "double") && transform) {
      values[transform.index] = transformedConsonant(transform.base, token.control) ?? transform.base;
    } else {
      transform = undefined;
      if (token.control === "dot") values.push("ㆍ");
      else if (token.control === "space") values.push(" ");
      else if (token.control === "punctuation") values.push(token.value);
    }
  }
  return values;
}
