import { ALPHABET_STAGES } from "./prompts";
import { SYLLABLE_STAGES } from "./learningJourney";

export const ROUND_MS = 60_000;
export const RESULT_CARD_MS = 2_000;
export const COMPLETION_UNITS = 3;
export const RANDOM_TARGET_UNITS = { alphabet: 45, syllable: 54, word: 60 } as const;
export type TimedMode = keyof typeof RANDOM_TARGET_UNITS;
export const SCORE_POINTS = { progress: 600, speed: 900, endlessTarget: 1000, max: 1500 } as const;
// Initial tuning, not measured human benchmarks. More taps/larger boards get more time.
export const FULL_SCORE_MS = {
  alphabet: { 2: 20_000, 4: 24_000, 6: 28_000 },
  syllable: { 2: 25_000, 4: 35_000, 6: 45_000 },
} as const;

export function stageSection(mode: TimedMode, item: number) {
  const lessons = mode === "alphabet" ? ALPHABET_STAGES : mode === "syllable" ? SYLLABLE_STAGES : [];
  const current = lessons[item];
  if (!current) return { start: item, end: Infinity, side: 8, targetUnits: RANDOM_TARGET_UNITS[mode], fullScoreMs: null };
  let start = item, end = item + 1;
  while (start > 0 && lessons[start - 1]!.boardSide === current.boardSide) start--;
  while (end < lessons.length && lessons[end]!.boardSide === current.boardSide) end++;
  const fullScoreMs = FULL_SCORE_MS[mode === "alphabet" ? "alphabet" : "syllable"][current.boardSide as 2 | 4 | 6];
  return { start, end, side: current.boardSide, fullScoreMs, targetUnits: lessons.slice(start, end).reduce((n, s) => n + s.sequence.length + COMPLETION_UNITS, 0) };
}

export const SCORE_GRADES = [
  { at: 1400, text: "OH MY GOD~!" },
  { at: 1000, text: "UNBELIEVABLE!!" },
  { at: 600, text: "AMAZING!" },
  { at: 300, text: "GREAT!" },
  { at: 0, text: "NOT BAD" },
] as const;
