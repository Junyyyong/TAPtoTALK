import type { StageMode } from "../content/stageNumber";
import { savedObject, type PersistentStore } from "./persistentStore";
import { RECORDS_KEY, talkStore } from "./talkStorage";

interface StageRecords { version: 1; alphabet: number; syllable: number; word: number }
export function validStageRecords(value: Record<string, unknown>): boolean {
  return value.version === 1 && [value.alphabet, value.syllable, value.word]
    .every(n => typeof n === "number" && Number.isSafeInteger(n) && n >= 0);
}

/** Separate from resumable checkpoints: retrying an earlier item never lowers a best. */
export function recordReachedStage(mode: StageMode, stage: number, store: PersistentStore = talkStore): number {
  if (!Number.isSafeInteger(stage) || stage < 0) throw new RangeError("Invalid reached stage");
  const raw = store.read(RECORDS_KEY);
  const value = raw === null ? { version: 1, alphabet: 0, syllable: 0, word: 0 } : savedObject(raw);
  if (!validStageRecords(value)) throw Error("Saved stage records need recovery");
  const records = value as unknown as StageRecords;
  if (stage > records[mode]) {
    records[mode] = stage;
    store.write(RECORDS_KEY, JSON.stringify(records));
  }
  return records[mode];
}
