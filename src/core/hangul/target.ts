import { isBoardSymbol, type BoardSymbol } from "./keys";
import { composeTokens } from "./compose";
import { CHOSEONG, FINAL_PARTS, JONGSEONG, JUNGSEONG, TENSE_PARTS, VOWEL_STROKES } from "./layout";

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

export type TargetToken = BoardSymbol | { control: "space" };

function pushConsonant(tokens: TargetToken[], consonant: (typeof CHOSEONG)[number]): void {
  tokens.push(...(TENSE_PARTS[consonant] ?? [consonant]));
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
        tokens.push(stroke);
      }
      if (jongseong) FINAL_PARTS[jongseong].forEach((part) => pushConsonant(tokens, part));
      continue;
    }

    if (character === " ") tokens.push({ control: "space" });
    else if (isBoardSymbol(character)) tokens.push(character);
  }

  return tokens;
}

export function requiredBoardSymbols(text: string): BoardSymbol[] {
  return targetToTokens(text).filter((token): token is BoardSymbol => typeof token === "string");
}

/** Use the prompt's syllable boundaries while typing, without correcting wrong taps. */
export function composeTargetInput(target: string, input: readonly string[]): string {
  const expected = materializeTargetTokens(targetToTokens(target));
  if (input.length > expected.length || input.some((value, index) => value !== expected[index])) {
    return composeTokens(input);
  }
  let cursor = 0;
  let result = "";
  for (const character of target.normalize("NFC")) {
    const length = materializeTargetTokens(targetToTokens(character)).length;
    if (cursor >= input.length) break;
    if (length === 0) continue;
    if (cursor + length <= input.length) result += character;
    else result += composeTokens(input.slice(cursor));
    cursor += length;
  }
  return result;
}

/** Resolves fixed-key actions to the stream consumed by the Hangul composer. */
export function materializeTargetTokens(tokens: readonly TargetToken[]): string[] {
  const values: string[] = [];
  for (const token of tokens) {
    if (typeof token === "string") values.push(token);
    else if (token.control === "space") values.push(" ");
  }
  return values;
}

export type TargetCharacterState = "done" | "current" | "wrong" | "pending";
export interface TargetCharacterProgress {
  character: string;
  state: TargetCharacterState;
}

/** Maps raw jamo input back onto the visible Korean characters in a target. */
export function targetCharacterProgress(text: string, input: readonly string[]): TargetCharacterProgress[] {
  let cursor = 0;
  let firstWrong = -1;
  const expected = materializeTargetTokens(targetToTokens(text));
  for (let index = 0; index < input.length; index += 1) {
    if (input[index] !== expected[index]) { firstWrong = index; break; }
  }
  return [...text.normalize("NFC")].map((character) => {
    const length = materializeTargetTokens(targetToTokens(character)).length;
    const start = cursor; const end = cursor + length; cursor = end;
    if (firstWrong >= start && firstWrong < end) return { character, state: "wrong" };
    if (length > 0 && end <= input.length && (firstWrong < 0 || end <= firstWrong)) return { character, state: "done" };
    if (length > 0 && input.length >= start && input.length < end && firstWrong < 0) return { character, state: "current" };
    return { character, state: "pending" };
  });
}
