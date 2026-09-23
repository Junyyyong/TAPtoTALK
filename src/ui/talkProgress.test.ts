import { afterEach, expect, it, vi } from "vitest";
import { loadTalkProgress, saveTalkProgress, validProgress, type TalkProgress } from "./talkProgress";
import { ALPHABET_STAGES, ALPHABET_ORDER, WORD_TARGETS } from "../content/prompts";
import { createSyllablePractice, createSyllableGameJourney } from "../content/learningJourney";
import { createWordJourney } from "../content/wordJourney";
import { createAlphabetStageBoard } from "../core/hangul/alphabetGame";
import { createWordBoard } from "../core/hangul/board";
const fixture = (): TalkProgress => ({
 version:1,mode:"alphabet",alphabetStageIndex:0,wordTargetIndex:0,roundNumber:1,elapsedMs:0,roundUnits:0,syllableDifficulty:0,
 practice:createSyllablePractice(),stage:ALPHABET_STAGES[0]!,word:WORD_TARGETS[0]!,
 alphabetTiles:createAlphabetStageBoard(["ㄱ"],ALPHABET_ORDER,2),tiles:createWordBoard(WORD_TARGETS[0]!.word),part:0,used:[],input:[],pending:false,result:false,cleared:false,
 wordJourney:createWordJourney().snapshot(),syllableJourney:createSyllableGameJourney().snapshot(),
});
afterEach(()=>vi.unstubAllGlobals());
it("stores independent mode saves and survives a JSON round trip",()=>{
 const data=new Map<string,string>();vi.stubGlobal("localStorage",{getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>data.set(k,v)});
 const a=fixture();expect(validProgress(a,"alphabet")).toBe(true);expect(saveTalkProgress(a)).toBe(true);
 const w={...fixture(),mode:"word" as const,elapsedMs:23000,roundUnits:4};saveTalkProgress(w);
 expect(loadTalkProgress("alphabet")).toEqual(a);expect(loadTalkProgress("word")).toEqual(w);expect(loadTalkProgress("syllable")).toBeUndefined();
});
it("rejects corrupt, outdated, wrong-mode and inconsistent board saves",()=>{
 const a=fixture();
 for(const patch of [{version:0},{elapsedMs:Infinity},{roundUnits:-1},{roundNumber:0},{alphabetTiles:[]},{part:99},{used:[999]},{wordJourney:{}},{practice:null},{stage:{}}])expect(validProgress({...a,...patch},"alphabet")).toBe(false);
 expect(validProgress(a,"word")).toBe(false);
 vi.stubGlobal("localStorage",{getItem:()=>"{broken"});expect(loadTalkProgress("alphabet")).toBeUndefined();
});
it("handles blocked or full storage without interrupting play",()=>{
 vi.stubGlobal("localStorage",{getItem:()=>{throw Error("blocked");},setItem:()=>{throw Error("quota");}});
 expect(loadTalkProgress("alphabet")).toBeUndefined();expect(saveTalkProgress(fixture())).toBe(false);
});
it("continues Word shuffle bags and history exactly after restoration",()=>{
 const next=createWordJourney(()=>.37);for(let i=0;i<70;i++)next();
 const restored=createWordJourney(()=>.37,JSON.parse(JSON.stringify(next.snapshot())));
 for(let i=0;i<160;i++)expect(restored()).toEqual(next());
});
it("continues Syllable bags, repeated current item and history after restoration",()=>{
 const next=createSyllableGameJourney(()=>.37,["산","강"]);let prev="";
 for(let i=18;i<48;i++)prev=next(i,prev);
 const restored=createSyllableGameJourney(()=>.37,[],JSON.parse(JSON.stringify(next.snapshot())));
 expect(restored(47,prev)).toBe(prev);
 for(let i=48;i<150;i++){const expected=next(i,prev);expect(restored(i,prev)).toBe(expected);prev=expected;}
});
