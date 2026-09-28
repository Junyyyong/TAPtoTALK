import { expect, it } from "vitest";
import { loadTalkProgress, restartCheckpoint, saveTalkProgress, validProgress, validateTalkSave, type TalkProgress } from "./talkProgress";
import { PersistentStore } from "./persistentStore";
import { PROGRESS_KEYS, TALK_STORAGE_KEYS } from "./talkStorage";
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
it("stores independent durable checkpoints; discards transient board/input on load",async()=>{
 const data=new Map<string,string>();const store=new PersistentStore(()=>({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}}));
 await store.initialize(TALK_STORAGE_KEYS,validateTalkSave);
 const a=fixture();expect(validProgress(a,"alphabet")).toBe(true);expect(saveTalkProgress(a,store)).toBe(true);
 const w={...fixture(),mode:"word" as const,elapsedMs:23000,roundUnits:4};saveTalkProgress(w,store);
 expect(loadTalkProgress("alphabet",store)).toMatchObject({mode:"alphabet",alphabetStageIndex:0,alphabetTiles:[],input:[]});
 expect(loadTalkProgress("word",store)).toMatchObject({mode:"word",elapsedMs:23000,roundUnits:4});expect(loadTalkProgress("syllable",store)).toBeUndefined();
});
it("blocks incompatible durable data instead of silently starting over",async()=>{
 const a=fixture();
 for(const patch of [{version:0},{elapsedMs:Infinity},{roundUnits:-1},{roundNumber:0},{wordJourney:{}},{practice:null},{stage:{}}])expect(validProgress({...a,...patch},"alphabet")).toBe(false);
 expect(validProgress(a,"word")).toBe(false);
 const store=new PersistentStore(()=>({getItem:()=>"{broken",setItem:()=>{throw Error("must not write");}}));
 await expect(store.initialize(TALK_STORAGE_KEYS,validateTalkSave)).rejects.toThrow();
 expect(()=>loadTalkProgress("alphabet",store)).toThrow();
});
it("accepts older tutorial counts and disposable board formats across updates",async()=>{
 const a={...fixture(),mode:"syllable" as const};a.practice=[...a.practice,...a.practice.slice(0,12)];
 const raw=JSON.stringify({...a,alphabetTiles:[{unknownOldFormat:true}],used:[999],part:99,input:null});
 const store=new PersistentStore(()=>({getItem:k=>k===PROGRESS_KEYS.syllable?raw:null,setItem:()=>{}}));
 await store.initialize(TALK_STORAGE_KEYS,validateTalkSave);
 const restored=loadTalkProgress("syllable",store)!;
 expect(restored.practice).toHaveLength(30);expect(restored.alphabetTiles).toEqual([]);expect(restored.part).toBe(0);
});
it("restarts unfinished stages; skips completed items and completed result rounds once",()=>{
 const a={...fixture(),alphabetStageIndex:9,elapsedMs:45000,roundUnits:3};
 expect(restartCheckpoint(a)).toMatchObject({alphabetStageIndex:9,roundNumber:1,advance:false});
 expect(restartCheckpoint({...a,pending:true})).toMatchObject({alphabetStageIndex:10,advance:true});
 expect(restartCheckpoint({...a,alphabetStageIndex:16,result:true,pending:true,cleared:true})).toMatchObject({alphabetStageIndex:17,roundNumber:1});
 const s={...a,mode:"syllable" as const,alphabetStageIndex:40,result:true,roundUnits:8};
 expect(restartCheckpoint(s)).toMatchObject({alphabetStageIndex:40,roundNumber:2,syllableDifficulty:1});
 expect(restartCheckpoint({...a,mode:"word",wordTargetIndex:9,result:true,pending:true})).toMatchObject({wordTargetIndex:10,roundNumber:2});
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
