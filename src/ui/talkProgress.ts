import type { AlphabetStage, WordTarget } from "../content/prompts";
import type { WordJourneyState } from "../content/wordJourney";
import type { SyllableJourneyState } from "../content/learningJourney";
import type { AlphabetTile } from "../core/hangul/alphabetGame";
import type { LetterTile } from "../core/hangul/board";
import { PROGRESS_KEYS, RECORDS_KEY, talkStore } from "./talkStorage";
import { validStageRecords } from "./stageRecords";
import { savedObject, type PersistentStore } from "./persistentStore";
import { nextSyllableDifficulty, POINTS_PER_TARGET, stageSection } from "../content/timedStages";
import { timedScore } from "../core/hangul/timedScore";

export type ProgressMode = "alphabet" | "syllable" | "word";
export interface TalkProgress {
  version: 1; mode: ProgressMode;
  alphabetStageIndex: number; wordTargetIndex: number; roundNumber: number;
  elapsedMs: number; roundUnits: number; syllableDifficulty: 0 | 1;
  practice: readonly AlphabetStage[]; stage: AlphabetStage; word: WordTarget;
  alphabetTiles: AlphabetTile[]; tiles: LetterTile[];
  part: number; used: number[]; input: { value: string; tileId?: number }[];
  pending: boolean; result: boolean; cleared: boolean;
  wordJourney: WordJourneyState; syllableJourney: SyllableJourneyState;
}
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const str = (v: unknown) => typeof v === "string" && v.length <= 500;
const list = (v: unknown, check: (item: any) => boolean, max = 200): boolean => Array.isArray(v) && v.length <= max && v.every(check);
const strings = (v: unknown) => list(v, str);
const stage = (v: unknown): boolean => obj(v) && str(v.id) && integer(v.number) && [2,4,6,8].includes(v.boardSide) && str(v.target) && str(v.note) && (v.category === undefined || str(v.category)) && strings(v.sequence) && v.sequence.length > 0;
const word = (v: unknown): boolean => obj(v) && str(v.id) && str(v.word) && v.word.length > 0 && str(v.translation);
/** Validate durable checkpoint data, not disposable boards/input from an old release. */
export function validProgress(v: unknown, mode: ProgressMode): v is TalkProgress {
  if (!obj(v) || v.version !== 1 || v.mode !== mode) return false;
  if (![v.alphabetStageIndex,v.wordTargetIndex,v.roundUnits,v.part].every(integer) || !integer(v.roundNumber) || v.roundNumber < 1) return false;
  if (typeof v.elapsedMs !== "number" || !Number.isFinite(v.elapsedMs) || v.elapsedMs < 0 || v.elapsedMs > 60000 || ![0,1].includes(v.syllableDifficulty)) return false;
  if (![v.pending,v.result,v.cleared].every(x=>typeof x === "boolean")) return false;
  // Preserve already-started tutorial selections even if a release changes lesson counts.
  if (!stage(v.stage) || !word(v.word) || !list(v.practice,stage,100) || (mode === "syllable" && !v.practice.length)) return false;
  const w=v.wordJourney,s=v.syllableJourney;
  return obj(w)&&integer(w.index)&&strings(w.history)&&strings(w.introduced)&&typeof w.firstEndlessBag==="boolean"&&list(w.endless,word)&&list(w.bags,b=>Array.isArray(b)&&b.length===2&&[3,4,5].includes(b[0])&&list(b[1],word),3)
    &&obj(s)&&strings(s.bag)&&strings(s.history)&&Number.isSafeInteger(s.currentIndex)&&s.currentIndex>=-1&&str(s.current);
}
export function validateTalkSave(key: string, raw: string): void {
  if (raw.length > 200000) throw Error("Saved data is too large");
  const value = savedObject(raw);
  if (key === RECORDS_KEY && !validStageRecords(value)) throw Error("Saved stage records need recovery");
  const mode = (Object.keys(PROGRESS_KEYS) as ProgressMode[]).find(mode => PROGRESS_KEYS[mode] === key);
  if (mode && !validProgress(value, mode)) throw Error("Saved progress needs recovery");
}
export function loadTalkProgress(mode: ProgressMode, store: PersistentStore = talkStore): TalkProgress | undefined {
  const raw = store.read(PROGRESS_KEYS[mode]);
  if (raw === null) return;
  validateTalkSave(PROGRESS_KEYS[mode], raw);
  // Boards and partial input are rebuilt. Never reuse stale tile IDs or a spent clock.
  return { ...JSON.parse(raw), alphabetTiles: [], tiles: [], used: [], input: [], part: 0 };
}
export function saveTalkProgress(progress: TalkProgress, store: PersistentStore = talkStore): boolean {
  try { store.write(PROGRESS_KEYS[progress.mode],JSON.stringify(progress)); return true; }
  catch { return false; }
}

/** Return to the unfinished item; a completed item waiting for its animation is not replayed. */
export function restartCheckpoint(saved: TalkProgress) {
  const section = stageSection(saved.mode, saved.mode === "word" ? saved.wordTargetIndex : saved.alphabetStageIndex, saved.roundNumber, saved.practice);
  const advance = saved.pending || (saved.result && saved.cleared);
  return {
    alphabetStageIndex: saved.alphabetStageIndex + (saved.mode !== "word" && advance ? 1 : 0),
    wordTargetIndex: saved.wordTargetIndex + (saved.mode === "word" && advance ? 1 : 0),
    roundNumber: saved.result ? section.tutorial ? 1 : saved.roundNumber + 1 : saved.roundNumber,
    syllableDifficulty: saved.mode === "syllable" && saved.result && !section.tutorial
      ? nextSyllableDifficulty(saved.syllableDifficulty, timedScore(saved.roundUnits, POINTS_PER_TARGET.syllable)) : saved.syllableDifficulty,
    advance,
  };
}
