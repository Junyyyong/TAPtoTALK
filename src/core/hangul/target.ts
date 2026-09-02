import { isBoardSymbol, type BoardSymbol } from "./keys";
import { CHOSEONG, FINAL_PARTS, JONGSEONG, JUNGSEONG, VOWEL_STROKES } from "./layout";

const HANGUL_BASE = 0xac00;
const HANGUL_END = 0xd7a3;
const JUNG_COUNT = 21;
const JONG_COUNT = 28;

export type TargetToken = BoardSymbol | { control: "space" };

function pushConsonant(tokens: TargetToken[], consonant: (typeof CHOSEONG)[number]): void {
  tokens.push(consonant);
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
export type TargetComponentKind = "initial" | "vowel" | "final" | "whole";
export type TargetSyllableLayout = "vertical" | "horizontal" | "compound" | "whole";
export interface TargetComponentProgress {
  kind: TargetComponentKind;
  state: TargetCharacterState;
}
export interface TargetCharacterProgress {
  character: string;
  state: TargetCharacterState;
  completedRatio: number;
  activeRatio: number;
  layout: TargetSyllableLayout;
  hasFinal: boolean;
  components: readonly TargetComponentProgress[];
}

const VERTICAL_VOWELS = new Set(["ㅏ", "ㅐ", "ㅑ", "ㅒ", "ㅓ", "ㅔ", "ㅕ", "ㅖ", "ㅣ"]);
const HORIZONTAL_VOWELS = new Set(["ㅗ", "ㅛ", "ㅜ", "ㅠ", "ㅡ"]);

function componentState(start: number, end: number, inputLength: number, firstWrong: number): TargetCharacterState {
  if (firstWrong >= start && firstWrong < end) return "wrong";
  if (end <= inputLength && (firstWrong < 0 || end <= firstWrong)) return "done";
  if (inputLength > start && inputLength < end && firstWrong < 0) return "current";
  return "pending";
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
    const correctCount = Math.max(0, Math.min(length, (firstWrong >= 0 ? firstWrong : input.length) - start));
    const completedRatio = length ? correctCount / length : 0;
    const code = character.codePointAt(0)!;
    let layout: TargetSyllableLayout = "whole"; let hasFinal = false;
    let components: TargetComponentProgress[] = [{ kind: "whole", state: componentState(start, end, input.length, firstWrong) }];
    if (code >= HANGUL_BASE && code <= HANGUL_END) {
      const offset = code - HANGUL_BASE;
      const vowel = JUNGSEONG[Math.floor((offset % (JUNG_COUNT * JONG_COUNT)) / JONG_COUNT)]!;
      const final = JONGSEONG[offset % JONG_COUNT]!;
      const finalLength = final ? FINAL_PARTS[final].length : 0;
      const vowelLength = Math.max(1, length - 1 - finalLength);
      hasFinal = finalLength > 0;
      layout = VERTICAL_VOWELS.has(vowel) ? "vertical" : HORIZONTAL_VOWELS.has(vowel) ? "horizontal" : "compound";
      const vowelStart = start + 1; const finalStart = vowelStart + vowelLength;
      components = [
        { kind: "initial", state: componentState(start, vowelStart, input.length, firstWrong) },
        { kind: "vowel", state: componentState(vowelStart, finalStart, input.length, firstWrong) },
        ...(hasFinal ? [{ kind: "final" as const, state: componentState(finalStart, end, input.length, firstWrong) }] : []),
      ];
    }
    const state = componentState(start, end, input.length, firstWrong);
    return { character, state, completedRatio, activeRatio: state === "wrong" ? Math.min(1, (correctCount + 1) / length) : completedRatio, layout, hasFinal, components };
  });
}
