import type { AlphabetStage, WordTarget } from "../content/prompts";
import type { WordJourneyState } from "../content/wordJourney";
import type { SyllableJourneyState } from "../content/learningJourney";
import type { AlphabetTile } from "../core/hangul/alphabetGame";
import type { LetterTile } from "../core/hangul/board";

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
const key = (mode: ProgressMode) => `taptotalk.progress.v1.${mode}`;
const obj = (v: unknown): v is Record<string, any> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown) => typeof v === "number" && Number.isSafeInteger(v) && v >= 0;
const str = (v: unknown) => typeof v === "string" && v.length <= 500;
const list = (v: unknown, check: (item: any) => boolean, max = 200): boolean => Array.isArray(v) && v.length <= max && v.every(check);
const strings = (v: unknown) => list(v, str);
const stage = (v: unknown): boolean => obj(v) && str(v.id) && integer(v.number) && [2,4,6,8].includes(v.boardSide) && str(v.target) && str(v.note) && (v.category === undefined || str(v.category)) && strings(v.sequence) && v.sequence.length > 0;
const word = (v: unknown): boolean => obj(v) && str(v.id) && str(v.word) && v.word.length > 0 && str(v.translation);
const tile = (v: unknown): boolean => obj(v) && integer(v.id) && v.id < 81 && typeof v.required === "boolean" && (v.transform === undefined || ["flip-x","flip-y","flip-x-rotate-90","rotate-45","rotate-90","rotate-135","rotate-180","rotate-270","stem-one","stem-three"].includes(v.transform));

/** Reject incompatible/corrupt saves without making the game unbootable. */
export function validProgress(v: unknown, mode: ProgressMode): v is TalkProgress {
  if (!obj(v) || v.version !== 1 || v.mode !== mode) return false;
  if (![v.alphabetStageIndex,v.wordTargetIndex,v.roundUnits,v.part].every(integer) || !integer(v.roundNumber) || v.roundNumber < 1) return false;
  if (typeof v.elapsedMs !== "number" || !Number.isFinite(v.elapsedMs) || v.elapsedMs < 0 || v.elapsedMs > 60000 || ![0,1].includes(v.syllableDifficulty)) return false;
  if (![v.pending,v.result,v.cleared].every(x=>typeof x === "boolean")) return false;
  if (!stage(v.stage) || !word(v.word) || !list(v.practice,stage,18) || (mode === "syllable" && v.practice.length !== 18)) return false;
  if (!list(v.alphabetTiles,t=>tile(t)&&str(t.value)&&(t.shape===undefined||t.shape===true),64) || !list(v.tiles,t=>tile(t)&&str(t.symbol)&&(t.shape===undefined||["♥","★",",","╱","╲"].includes(t.shape)),64)) return false;
  const board = mode === "word" ? v.tiles : v.alphabetTiles;
  const ids = new Set(board.map((t: any)=>t.id));
  if (board.length !== (mode === "word" ? 64 : v.stage.boardSide ** 2) || ids.size !== board.length) return false;
  if (!list(v.used,id=>integer(id)&&ids.has(id),64) || new Set(v.used).size !== v.used.length || v.part > v.stage.sequence.length) return false;
  if (!list(v.input,t=>obj(t)&&str(t.value)&&(t.tileId===undefined||ids.has(t.tileId)),200)) return false;
  const w=v.wordJourney,s=v.syllableJourney;
  return obj(w)&&integer(w.index)&&strings(w.history)&&strings(w.introduced)&&typeof w.firstEndlessBag==="boolean"&&list(w.endless,word)&&list(w.bags,b=>Array.isArray(b)&&b.length===2&&[3,4,5].includes(b[0])&&list(b[1],word),3)
    &&obj(s)&&strings(s.bag)&&strings(s.history)&&Number.isSafeInteger(s.currentIndex)&&s.currentIndex>=-1&&str(s.current);
}
export function loadTalkProgress(mode: ProgressMode): TalkProgress | undefined {
  try {
    const raw=localStorage.getItem(key(mode));
    if (!raw || raw.length>200000) return;
    const value: unknown=JSON.parse(raw);
    return validProgress(value,mode) ? value : undefined;
  } catch { return; }
}
export function saveTalkProgress(progress: TalkProgress): boolean {
  try { localStorage.setItem(key(progress.mode),JSON.stringify(progress)); return true; }
  catch { return false; }
}
