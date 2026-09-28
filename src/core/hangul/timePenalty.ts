import { MISTAKE_PENALTY_MS, ROUND_MS } from "../../content/timedStages";
import { COMMIT_BOUNDARY } from "./compose";
import { materializeTargetTokens, targetToTokens } from "./target";

export const penalizedElapsed = (elapsedMs: number): number => Math.min(ROUND_MS, Math.max(0, elapsedMs) + MISTAKE_PENALTY_MS);

/** Only a newly accepted wrong tap is charged; re-rendering existing errors is free. */
export function isWrongTargetTap(target: string, input: readonly string[], next: string): boolean {
  const expected = materializeTargetTokens(targetToTokens(target));
  const typed = [...input.filter(value => value !== COMMIT_BOUNDARY), next];
  return typed.some((value, index) => value !== expected[index]);
}
