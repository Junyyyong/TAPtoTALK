/** Only fully completed targets count. No cap, partial-input or speed bonus. */
export function timedScore(completed: number, pointsPerTarget: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(pointsPerTarget) || pointsPerTarget <= 0) return 0;
  return Math.floor(Math.max(0, Math.floor(completed)) * pointsPerTarget);
}
