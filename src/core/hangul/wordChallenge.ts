/** Visible spaces matter; deleting them retains only the composition boundary. */
export function isWordMatch(input: string, target: string): boolean {
  const normalized = target.trim().normalize("NFC");
  const value = input.trim().normalize("NFC");
  return value === normalized;
}

export function wordCountLabel(count: number): string {
  return `${count} word${count === 1 ? "" : "s"}`;
}

/** Pick a non-repeating lesson subset without depending on UI or content types. */
export function pickLessonTargets<T>(values: readonly T[], count: number, rng: () => number = Math.random): T[] {
  if (count < 1 || count > values.length) throw new RangeError("Lesson target count is outside the available range.");
  const shuffled = [...values];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [shuffled[index], shuffled[other]] = [shuffled[other]!, shuffled[index]!];
  }
  return shuffled.slice(0, count);
}
