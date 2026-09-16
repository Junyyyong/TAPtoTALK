import { ALPHABET_STAGES, type AlphabetStage } from "./prompts";
import { SYLLABLE_STAGES } from "./learningJourney";
export const ROUND_MS = 60_000;
export const RESULT_CARD_MS = 2_000;
// Initial tuning: fully completed targets per minute, no tap or speed bonus.
// 15 syllables = 1406 (OH MY GOD); 16 = 1500. Fourteen remains UNBELIEVABLE.
export const FULL_SCORE_TARGETS = { alphabet: 10, syllable: 16, word: 10 } as const;
export type SyllableDifficulty = 0 | 1;
export function nextSyllableDifficulty(current: SyllableDifficulty, score: number): SyllableDifficulty {
  return score >= 1400 ? 1 : current;
}
export const SCORE_CAPS = { alphabet: Infinity, syllable: 1500, word: 1500 } as const;
export type TimedMode = keyof typeof FULL_SCORE_TARGETS;
export function stageSection(mode: TimedMode, item: number, roundNumber = 1, practice: readonly AlphabetStage[] = SYLLABLE_STAGES) {
  const lessons = mode === "alphabet" ? ALPHABET_STAGES : mode === "syllable" ? practice : [];
  const current = lessons[item];
  if (!current) return { start: item, end: Infinity, side: mode === "syllable" && roundNumber === 1 ? 6 : 8, tutorial: false };
  let start = item, end = item + 1;
  while (start > 0 && lessons[start - 1]!.boardSide === current.boardSide) start--;
  while (end < lessons.length && lessons[end]!.boardSide === current.boardSide) end++;
  return { start, end, side: current.boardSide, tutorial: true };
}
export const SCORE_GRADES = [
  { at: 1400, text: "OH MY GOD~!" },
  { at: 1000, text: "UNBELIEVABLE!!" },
  { at: 600, text: "AMAZING!" },
  { at: 300, text: "GREAT!" },
  { at: 1, text: "GOOD TRY" },
  { at: 0, text: "NOT BAD" },
] as const;
