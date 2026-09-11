import { ALPHABET_STAGES } from "./prompts";
import { SYLLABLE_STAGES } from "./learningJourney";
export const ROUND_MS = 60_000;
export const RESULT_CARD_MS = 2_000;
// Initial tuning: fully completed targets per minute, no tap or speed bonus.
export const FULL_SCORE_TARGETS = { alphabet: 15, syllable: 20, word: 10 } as const;
export type TimedMode = keyof typeof FULL_SCORE_TARGETS;
export function stageSection(mode: TimedMode, item: number) {
  const lessons = mode === "alphabet" ? ALPHABET_STAGES : mode === "syllable" ? SYLLABLE_STAGES : [];
  const current = lessons[item];
  if (!current) return { start: item, end: Infinity, side: 8, tutorial: false };
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
