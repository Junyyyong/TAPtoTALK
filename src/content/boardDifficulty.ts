/** One-based main-game problem number, independent of the 60-second round. */
export const ANSWER_COPY_TIERS = [
  { from: 1, extraCopies: 2 },
  { from: 11, extraCopies: 1 },
  { from: 21, extraCopies: 0 },
] as const;

export function extraAnswerCopiesAt(stage: number): number {
  if (!Number.isSafeInteger(stage) || stage < 1) throw new RangeError("Invalid main-game stage.");
  return [...ANSWER_COPY_TIERS].reverse().find(tier => stage >= tier.from)!.extraCopies;
}
