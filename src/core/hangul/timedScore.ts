/** Only fully completed targets count. No partial-input or speed bonus. */
export function timedScore(completed: number, fullScoreTargets: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(fullScoreTargets) || fullScoreTargets <= 0) return 0;
  return Math.min(1500, Math.floor(Math.max(0, Math.floor(completed)) / fullScoreTargets * 1500));
}
