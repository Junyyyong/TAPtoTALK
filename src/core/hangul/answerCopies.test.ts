import { expect, it } from "vitest";
import { reserveAnswerCopies } from "./answerCopies";
import { createWordBoard, inputValueForTile, MIRROR_TRAP_TOKEN } from "./board";
import { createMixedLearningBoard } from "./alphabetGame";
import { requiredBoardSymbols } from "./target";
import { trapLooksLikeTarget } from "./visualTraps";
import { ALPHABET_ORDER } from "../../content/prompts";
import { SYLLABLE_GAME_TARGETS, WORD_STAGES } from "../../content/learningJourney";
import { EXTRA_WORDS } from "../../content/wordJourney";
import { extraAnswerCopiesAt } from "../../content/boardDifficulty";

const counts = (values: readonly string[]) => [...new Set(values)].map(value => [value, values.filter(v => v === value).length] as const);
function random(seed: number) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }

it("reduces spare copies at main-game stages 11 and 21, never by round number", () => {
  expect([1,10,11,20,21,1000000].map(extraAnswerCopiesAt)).toEqual([2,2,1,1,0,0]);
  for (const invalid of [0,-1,1.5,Infinity,NaN]) expect(() => extraAnswerCopiesAt(invalid)).toThrow();
});
it("reserves duplicate taps before spare copies, and handles tight capacity", () => {
  expect(reserveAnswerCopies(["ㄱ","ㄱ","ㅣ"],0,4)).toEqual(["ㄱ","ㄱ","ㅣ"]);
  expect(reserveAnswerCopies(["ㄱ","ㄱ","ㅣ"],2,4)).toEqual(["ㄱ","ㄱ","ㅣ","ㄱ"]);
  expect(() => reserveAnswerCopies(["ㄱ","ㄱ"],0,1)).toThrow();
  expect(() => reserveAnswerCopies(["ㄱ"],-1,64)).toThrow();
  expect(() => reserveAnswerCopies([],0,64)).toThrow();
});
it("강 has exactly 3 → 2 → 1 of each answer; no filler leaks extra answers", () => {
  for (const stage of [1,11,21]) {
    const extra = extraAnswerCopiesAt(stage);
    const board = createWordBoard("강",random(42),extra);
    for (const value of requiredBoardSymbols("강")) expect(board.filter(tile => inputValueForTile(tile) === value)).toHaveLength(1 + extra);
  }
});
it("all Vocabulary words remain solvable at all tiers with every shape trap and exact counts", () => {
  for (const {word} of [...WORD_STAGES,...Object.values(EXTRA_WORDS).flat()]) for (const extra of [2,1,0]) for (const seed of [1,42,947]) {
    const board = createWordBoard(word,random(seed),extra);
    const taps = requiredBoardSymbols(word);
    expect(board).toHaveLength(64);expect(new Set(board.map(t => t.id)).size).toBe(64);
    for (const [symbol, needed] of counts(taps)) expect(board.filter(t => inputValueForTile(t) === symbol)).toHaveLength(needed + extra);
    expect(board.filter(t => t.shape).map(t => t.shape).sort()).toEqual([",","╱","╲","★","♥"].sort());
    expect(board.filter(t => t.required).every(t => inputValueForTile(t) !== MIRROR_TRAP_TOKEN)).toBe(true);
    expect(board.some(t => "ㄲㄸㅃㅆㅉ".includes(t.symbol))).toBe(false);
    for (const tile of board.filter(t => t.transform)) expect(trapLooksLikeTarget(tile.symbol,tile.transform,taps)).toBe(false);
    // Every repeated basic tap can use a different physical button, even at the last tier.
    const unused = [...board];
    for (const tap of taps) { const index=unused.findIndex(t => inputValueForTile(t) === tap);expect(index).toBeGreaterThanOrEqual(0);unused.splice(index,1); }
  }
});
it("Syllable and Alphabet keep exact answer counts on 6×6/8×8 and preserve trap ratios", () => {
  const sequences = [...SYLLABLE_GAME_TARGETS.map(requiredBoardSymbols),["ㄱ","ㄴ","ㅇ"],["ㆍ","ㅡ","ㅣ"],["ㄱ","ㄱ","ㄹ","ㄱ"]];
  for (const sequence of sequences) for (const extra of [2,1,0]) for (const side of [6,8] as const) for (const ratio of [.2,.3]) {
    const board=createMixedLearningBoard(sequence,ALPHABET_ORDER,side,ratio,random(555),extra);
    expect(board).toHaveLength(side**2);expect(new Set(board.map(t => t.id)).size).toBe(side**2);
    for (const [value,needed] of counts(sequence)) expect(board.filter(t => !t.shape&&!t.transform&&t.value===value)).toHaveLength(needed+extra);
    expect(board.filter(t => t.shape||t.transform)).toHaveLength(Math.round(side**2*ratio));
    for (const tile of board.filter(t => t.shape||t.transform)) expect(trapLooksLikeTarget(tile.value,tile.transform,sequence)).toBe(false);
  }
});
it("an all-answer filler pool produces only traps, not hidden surplus answers",()=>{
  const board=createMixedLearningBoard(["ㄱ"],["ㄱ"],8,.2,random(8),0);
  expect(board.filter(t=>!t.shape&&!t.transform)).toHaveLength(1);
  expect(board).toHaveLength(64);
});
