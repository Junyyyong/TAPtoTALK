import { ALPHABET_STAGES } from "./prompts";

export type StageMode = "alphabet" | "syllable" | "word";

/** One-based main-game problem number; tutorials have no recordable stage. */
export function mainStageNumber(mode: StageMode, index: number, syllablePracticeCount = 0): number {
  if (![index, syllablePracticeCount].every(n => Number.isSafeInteger(n) && n >= 0)) throw new RangeError("Invalid stage index");
  const tutorialCount = mode === "alphabet" ? ALPHABET_STAGES.length : mode === "syllable" ? syllablePracticeCount : 0;
  return Math.max(0, index - tutorialCount + 1);
}
