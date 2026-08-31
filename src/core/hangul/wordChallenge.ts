/** A word round accepts only the exact composed target, ignoring edge spaces. */
export function isWordMatch(input: string, target: string): boolean {
  return input.trim().normalize("NFC") === target.trim().normalize("NFC");
}

export function wordCountLabel(count: number): string {
  return `${count} word${count === 1 ? "" : "s"}`;
}
