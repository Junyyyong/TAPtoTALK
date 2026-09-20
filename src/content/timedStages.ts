import { ALPHABET_STAGES, type AlphabetStage } from "./prompts";
import { SYLLABLE_STAGES } from "./learningJourney";
export const ROUND_MS = 60_000;
export const RESULT_CARD_MS = 2_000;
export const POINTS_PER_TARGET = { alphabet: 187.5, syllable: 187.5, word: 250 } as const;
export type SyllableDifficulty = 0 | 1;
export function nextSyllableDifficulty(current: SyllableDifficulty, score: number): SyllableDifficulty {
  return score >= 1500 ? 1 : current;
}
export type TimedMode = keyof typeof POINTS_PER_TARGET;
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
  { at: 1500, text: "OH MY GOD~!" },
  { at: 1000, text: "UNBELIEVABLE!!" },
  { at: 600, text: "AMAZING!" },
  { at: 300, text: "GREAT!" },
  { at: 1, text: "GOOD TRY" },
  { at: 0, text: "NOT BAD" },
] as const;

/** Board-size milestones: GREAT, AMAZING, UNBELIEVABLE, then OH MY GOD. */
export function tutorialReward(side: number) {
  const at = side === 2 ? 300 : side === 4 ? 600 : side === 6 ? 1000 : 1500;
  return SCORE_GRADES.find(grade => grade.at === at)!;
}
