/** Pure scoring: retained correct input only; undo/retype cannot farm points. */
export function correctPrefix(expected: readonly string[], actual: readonly string[]): number {
  let count = 0;
  while (count < expected.length && expected[count] === actual[count]) count++;
  return count;
}

export function timedScore(units: number, target: number, elapsed: number, duration: number, cleared: boolean,
  fullScoreMs: number | null, points: { progress: number; speed: number; endlessTarget: number; max: number }): number {
  if (!(target > 0) || !(duration > 0) || !Number.isFinite(units) || !Number.isFinite(elapsed)) return 0;
  const progress = Math.max(0, units) / target;
  if (fullScoreMs === null) return Math.min(points.max, Math.floor(progress * points.endlessTarget));
  if (!(fullScoreMs >= 0 && fullScoreMs < duration)) return 0;
  const base = cleared ? points.progress : Math.min(1, progress) * points.progress;
  const bonus = cleared ? points.speed * Math.max(0, Math.min(1, (duration - elapsed) / (duration - fullScoreMs))) : 0;
  return Math.min(points.max, Math.floor(base + bonus));
}
