import { expect, it } from "vitest";
import { alphabetLabels } from "./learningLabels";
import { ALPHABET_STAGES, alphabetTargetNote } from "./prompts";
import { learningStageAt } from "./learningJourney";
import { syllableTargetNote } from "./syllableNotes";

it("uses category and Korean names instead of duplicated board size", () => {
  expect(alphabetLabels(ALPHABET_STAGES[0]!)).toEqual({category:"자음 / Consonant",names:"기역",note:"[k/g]"});
  const vowels = ALPHABET_STAGES.find(s => s.target === "ㆍㅡㅣ")!;
  expect(alphabetLabels(vowels)).toEqual({category:"모음 / Vowel",names:"아래아 · 으 · 이",note:"[ah] · [eu] · [i]"});
  for (const stage of ALPHABET_STAGES) expect(alphabetLabels(stage).names).not.toMatch(/[0-9×]/);
});
it("shows readings in 2x2 and 4x4 only, never in 6x6 or endless 8x8", () => {
  for (const stage of ALPHABET_STAGES) expect(Boolean(alphabetLabels(stage).note)).toBe(stage.boardSide <= 4);
  expect(alphabetLabels(learningStageAt("alphabet",100)).note).toBe("");
});
it("preserves every supplied product reading literally", () => {
  const targets = [..."가나다라마바사아자차카타파하까따빠싸짜"];
  const readings = ["ga/ka","na","da/ta","la/ra","ma","ba/va","sa","a","ja","tcha","ka","ta","pa","ha","gga","dda","bba","ssa","zza"];
  targets.forEach((target,index)=>expect(syllableTargetNote(target)).toBe(`[${readings[index]}]`));
  for (const [target, reading] of [["ㆍ","[ah]"],["ㅡ","[eu]"],["ㅣ","[i]"]]) expect(alphabetTargetNote(target!)).toBe(reading);
  expect(syllableTargetNote("닭")).toBe("chicken");
});
