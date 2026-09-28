/** Reserve each required tap first, then bounded spare copies of each distinct answer. */
export function reserveAnswerCopies<T>(sequence: readonly T[], extraCopies: number, capacity: number): T[] {
  if (!Number.isSafeInteger(extraCopies) || extraCopies < 0 || !Number.isSafeInteger(capacity) || capacity < 0 || !sequence.length || sequence.length > capacity) {
    throw new RangeError("Invalid answer reserve.");
  }
  const reserved = [...sequence];
  const distinct = [...new Set(sequence)];
  for (let copy = 0; copy < extraCopies && reserved.length < capacity; copy++) {
    for (const value of distinct) {
      if (reserved.length === capacity) break;
      reserved.push(value);
    }
  }
  return reserved;
}
