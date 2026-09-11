/** Pure scoring: retained correct input only; undo/retype cannot farm points. */
export function correctPrefix(expected: readonly string[], actual: readonly string[]): number {
  let count = 0;
  while (count < expected.length && expected[count] === actual[count]) count++;
  return count;
}

export function timedScore(units: number, target: number, elapsed: number, duration: number, cleared: boolean): number {
  if (!(target > 0) || !(duration > 0) || !Number.isFinite(units) || !Number.isFinite(elapsed)) return 0;
  const progress = Math.max(0, units) / target;
  const base = cleared ? 1000 : Math.min(1500, progress * 1000);
  const bonus = cleared ? 500 * Math.max(0, Math.min(1, 1 - elapsed / duration)) : 0;
  return Math.min(1500, Math.floor(base + bonus));
}
