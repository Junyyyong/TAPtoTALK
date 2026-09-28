import { expect, it } from "vitest";
import { isWrongTargetTap, penalizedElapsed } from "./timePenalty";
import { materializeTargetTokens, targetToTokens } from "./target";
it("charges exactly one second per mistake, accumulates and clamps at zero remaining",()=>{
 expect(penalizedElapsed(12000)).toBe(13000);
 expect(penalizedElapsed(penalizedElapsed(12000))).toBe(14000);
 expect(penalizedElapsed(59999)).toBe(60000);
});
it("accepts every basic jamo in tense consonants/compound vowels/finals",()=>{
 for(const word of ["꾀","닭","아뿔사","사랑","어슬렁어슬렁"]){
  const tokens=materializeTargetTokens(targetToTokens(word));
  tokens.forEach((token,index)=>expect(isWrongTargetTap(word,tokens.slice(0,index),token)).toBe(false));
 }
});
it("charges wrong symbols, traps and further additions to an uncorrected prefix",()=>{
 expect(isWrongTargetTap("나비",[],"ㄱ")).toBe(true);
 expect(isWrongTargetTap("나비",["ㄴ"],"×")).toBe(true);
 expect(isWrongTargetTap("나비",["ㄱ"],"ㅣ")).toBe(true);
 expect(isWrongTargetTap("나비",[],"ㄴ")).toBe(false);
});
