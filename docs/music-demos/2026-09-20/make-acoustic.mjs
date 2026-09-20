// Original composition; actual recorded CC0 VCSL instruments, no oscillators.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const out=path.dirname(new URL(import.meta.url).pathname);
const cache='/tmp/talk-vcsl-samples';fs.mkdirSync(cache,{recursive:true});
const sources={
 piano:'Chordophones/Zithers/Grand Piano, Kawai - Legacy/Sustains/GrandPno_Main_Sus_C3_v2_rr1.wav',
 marimba:'Idiophones/Struck Idiophones/Marimba/Marimba_hit_Outrigger_C4_soft_01.wav',
 xylo:'Idiophones/Struck Idiophones/Xylophone/Hard Mallets/Xylo_Hard_C4_pp_01_far.wav',
 wood:'Idiophones/Struck Idiophones/Woodblock/wood_click_pp_rr1.wav',
 shaker:'Idiophones/Struck Idiophones/Shaker, Small/Mid_ShakerDouble_Down_rr1.wav',
 bongo:'Membranophones/Struck Membranophones/Bongos/BongoH_Hit1_v1_rr1_Mid.wav',
};
const bpm=Number(process.argv[2] ?? 136);
if (![136,142].includes(bpm)) throw Error('Supported tempos: 136, 142');
const SR=44100,beat=60/bpm,bars=24,N=Math.round(bars*4*beat*SR);
const mix=new Float64Array(N*2),samples={};
for(const [key,p] of Object.entries(sources)) {
 const url='https://raw.githubusercontent.com/sgossner/VCSL/master/'+p.split('/').map(encodeURIComponent).join('/');
 const file=path.join(cache,key+'.wav');
 if(!fs.existsSync(file))execFileSync('curl',['-L','--fail','--silent',url,'-o',file]);
 const raw=execFileSync('ffmpeg',['-v','error','-i',file,'-f','f32le','-ar',String(SR),'-ac','1','pipe:1'],{maxBuffer:64*1024*1024});
 const values=new Float32Array(raw.buffer,raw.byteOffset,raw.length/4);let peak=0;
 for(const v of values)peak=Math.max(peak,Math.abs(v));
 // Remove sample lead-in silence without modifying the recorded attack.
 let first=0;while(first<values.length&&Math.abs(values[first])<peak*.005)first++;
 samples[key]=Float32Array.from(values.subarray(Math.max(0,first-100)),v=>v/Math.max(peak,.001));
}
function note(key,b,midi,duration,gain,pan=0){
 const s=samples[key],rate=midi===null?1:2**((midi-60)/12);
 const count=Math.min(Math.floor((s.length-1)/rate),Math.floor((duration+.15)*SR));
 const start=Math.round(b*beat*SR);
 for(let i=0;i<count;i++){
  const pos=i*rate,j=Math.floor(pos),fraction=pos-j;
  const envelope=Math.min(1,i/90)*Math.min(1,(count-i)/(.12*SR));
  const v=(s[j]*(1-fraction)+s[j+1]*fraction)*gain*envelope;
  const at=((start+i)%N)*2;mix[at]+=v*Math.sqrt((1-pan)/2);mix[at+1]+=v*Math.sqrt((1+pan)/2);
 }
}
// C major, A/A'/B form. Plain eighth-note pulse; no swing or electronic bass.
const melody=[
 [[0,64],[1,67],[2,69],[3,67]],[[0,64],[1,62],[2,60]],
 [[0,65],[1,69],[2,67],[3,65]],[[0,64],[1,62],[2,67]],
 [[0,64],[.5,67],[1.5,69],[2.5,72]],[[0,71],[1,69],[2,67]],
 [[0,65],[1,64],[2,62],[3,67]],[[0,64],[2,60]],
 [[0,69],[1,72],[2,71],[3,69]],[[0,67],[1,64],[2,67]],
 [[0,65],[1,69],[2,72],[3,69]],[[0,67],[1,65],[2,62]],
 [[0,64],[1,67],[2,69],[3,72]],[[0,71],[1,69],[2,67]],
 [[0,65],[1,62],[2,67],[3,71]],[[0,72],[2,67]],
 [[0,64],[1,67],[2,69],[3,67]],[[0,64],[1,62],[2,60]],
 [[0,65],[1,69],[2,67],[3,65]],[[0,64],[1,62],[2,67]],
 [[0,69],[1,67],[2,64],[3,62]],[[0,65],[1,64],[2,62]],
 [[0,67],[1,65],[2,62],[3,59]],[[0,60],[2,62]],
];
const chords=[[48,52,55],[45,48,52],[53,57,60],[43,47,50]];
for(let bar=0;bar<bars;bar++){
 const base=bar*4,chord=chords[bar%4];
 melody[bar].forEach(([offset,pitch],i)=>{
  note('marimba',base+offset,pitch,.32,.22,-.18);
  if(bar%4===2&&i%2===0)note('xylo',base+offset,pitch,.22,.035,.2);
 });
 // Short piano chords, never a sustained drone.
 for(const t of [0,2])chord.forEach((pitch,i)=>note('piano',base+t+i*.018,pitch+12,.24,.055,.12));
 for(const t of [0,2])note('bongo',base+t,null,.13,.075);
 for(const t of [1,3])note('wood',base+t,null,.09,.035,-.2);
 for(const t of [.5,1.5,2.5,3.5])note('shaker',base+t,null,.12,.025,.25);
}
// Gentle low-pass: retain wooden attacks without sharp metallic top end.
let l=0,r=0,peak=0;
for(let i=0;i<N;i++){l+=.38*(mix[i*2]-l);r+=.38*(mix[i*2+1]-r);mix[i*2]=l;mix[i*2+1]=r;peak=Math.max(peak,Math.abs(l),Math.abs(r));}
const wav=Buffer.alloc(44+N*4);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(SR,24);wav.writeUInt32LE(SR*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(N*4,40);
for(let i=0;i<N*2;i++)wav.writeInt16LE(Math.round(mix[i]*.65/peak*32767),44+i*2);
const dest=path.join(out,`${bpm===136?'15':'16'}-game-acoustic-percussion-${bpm}bpm`);
fs.writeFileSync(dest+'.wav',wav);
execFileSync('ffmpeg',['-v','error','-y','-i',dest+'.wav','-codec:a','libmp3lame','-b:a','192k',dest+'.mp3']);
fs.writeFileSync(path.join(out,bpm===136?'sources.json':`sources-${bpm}.json`),JSON.stringify({library:'Versilian Community Sample Library',license:'CC0',url:'https://versilian-studios.com/vcsl/',bpm,seconds:N/SR,sources},null,2));
console.log(dest+'.mp3');
