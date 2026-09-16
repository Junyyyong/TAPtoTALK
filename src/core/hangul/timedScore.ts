/** Only fully completed targets count. No partial-input or speed bonus. */
export function timedScore(completed: number, fullScoreTargets: number, cap = 1500, multiplier = 1): number {
  if (!Number.isFinite(completed) || !Number.isFinite(fullScoreTargets) || fullScoreTargets <= 0 || !Number.isFinite(multiplier) || multiplier < 0) return 0;
  return Math.min(cap, Math.floor(Math.max(0, Math.floor(completed)) * 1500 * multiplier / fullScoreTargets));
}
