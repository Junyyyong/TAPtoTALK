import { composeTokens } from "../core/hangul/compose";
import { targetToTokens } from "../core/hangul/target";

/** Prevents accidental taps from consuming tiles or overflowing the target line. */
export function canAcceptInput(input: readonly string[], nextValue: string, targetText: string): boolean {
  if (input.length >= targetToTokens(targetText).length) return false;
  return composeTokens([...input, nextValue]).length <= targetText.length;
}
