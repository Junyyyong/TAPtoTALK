// New lobby composition: straight 120 BPM, warm midrange legato voice.
// Shares only the V2 synthesis engine, not the game melody or arrangement.
// Synthetic plucked string + breath tone + two drum heads + toe/heel taps.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out=process.argv[2];
if(!out)throw Error('Pass a new output directory');
mkdirSync(out,{recursive:true});
const SR=44100, TAU=2*Math.PI, bpm=120, beat=60/bpm, bars=16;
const frames=Math.ceil((bars*4*beat+1.2)*SR);
const L=new Float64Array(frames),R=new Float64Array(frames);
let seed=914120;
const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296)*2-1;
const freq=n=>440*2**((n-69)/12);
function put(time,duration,gain,pan,sound){
 const start=Math.round(time*SR),count=Math.min(Math.ceil(duration*SR),frames-start);
 for(let i=0;i<count;i++){
  const v=sound(i/SR,i)*gain;
  L[start+i]+=v*Math.sqrt((1-pan)/2);R[start+i]+=v*Math.sqrt((1+pan)/2);
 }
}
function string(time,midi,length,gain=.22,pan=-.22){
 // Replace the noisy pluck attack with a rounded 35ms attack and sustained body.
 const f=freq(midi);
 put(time,length+.22,gain,pan,x=>{
  const attack=Math.sin(Math.min(1,x/.035)*Math.PI/2)**2;
  const release=Math.exp(-Math.max(0,x-length)*18);
  const phase=TAU*f*x+.012*Math.sin(TAU*4.5*x);
  return attack*release*Math.exp(-x*.65)*(.72*Math.sin(phase)+.12*Math.sin(2*phase)+.025*Math.sin(3*phase));
 });
}
function pipe(time,midi,length,gain=.075){
 const f=freq(midi);
 put(time,length+.14,gain,.25,x=>{
  const envelope=(1-Math.exp(-x*60))*Math.exp(-Math.max(0,x-length)*40);
  return envelope*(Math.sin(TAU*f*x+.035*Math.sin(TAU*5.5*x))+.16*Math.sin(TAU*f*2*x)+.025*rand());
 });
}
function hit(time,kind,gain=1){
 const low=kind==='low',slap=kind==='slap',toe=kind==='toe';
 const pan=low?-.1:slap?.12:toe?.35:-.35;
 put(time,low?.3:.11,gain*(low?.22:slap?.13:toe?.10:.13),pan,x=>{
  const attack=1-Math.exp(-x*2200);
  if(low)return attack*Math.exp(-x*20)*(Math.sin(TAU*(108*x+.9*(1-Math.exp(-x*28))))+.27*Math.sin(TAU*243*x)*Math.exp(-x*12));
  if(slap)return attack*Math.exp(-x*48)*(.65*Math.sin(TAU*385*x)+.34*rand()+.18*Math.sin(TAU*692*x));
  if(toe)return attack*Math.exp(-x*110)*(.35*rand()+.4*Math.sin(TAU*2350*x)+.18*Math.sin(TAU*3270*x));
  return attack*Math.exp(-x*65)*(.8*Math.sin(TAU*690*x)+.12*rand());
 });
}
// C/D/F/G/A pentatonic, independent 16-bar melody. No sped-down game phrases.
const phrases=[
 [[0,77,.65],[1.5,72,.45],[3,74,.55]],
 [[.5,77,.6],[2,79,1]],
 [[0,81,.5],[1,79,.4],[2.5,77,.8]],
 [[0,74,.6],[2,72,1.1]],
 [[0,77,.5],[1.25,81,.4],[2.5,84,.65]],
 [[.5,81,.5],[2,79,.8]],
 [[0,77,.7],[1.75,74,.45],[3,72,.55]],
 [[0,74,.5],[1.5,77,1.2]],
 [[0,84,.7],[2,81,.8]],
 [[.5,79,.5],[2,77,.8]],
 [[0,81,.5],[1.5,84,.55],[3,86,.45]],
 [[.5,84,.65],[2,79,1]],
 [[0,77,.6],[1.5,72,.4],[3,74,.45]],
 [[.5,77,.5],[2,81,.65]],
 [[0,79,.6],[1.5,74,.55],[3,72,.4]],
 [[0,77,1.8]],
];
for(let bar=0;bar<bars;bar++){
 const start=bar*4*beat,last=bar===bars-1;
 // Occasional sustained low string; no walking bass and no chord stabs.
 if(bar%4===0)string(start,bar===8?60:53,1.8*beat,.14,0);
 for(const [offset,pitch,length] of phrases[bar]){
  string(start+offset*beat,pitch-12,Math.max(.75,length*1.6)*beat,.22,-.18);
  // No high doubling voice: keep the melody in the middle register.
 }
 if(!last){
  hit(start,'low',.32);
  hit(start+2*beat,'heel',.20);
  hit(start+1.5*beat,'toe',.12);
  hit(start+3.5*beat,'toe',.14);
  if(bar%2===1)hit(start+2.75*beat,'slap',.12);
  // Soft answering breath motif in the spaces; not a busy doubling voice.
  if(bar%4===1){pipe(start+3*beat,72,.6*beat,.022);pipe(start+3.5*beat,69,.5*beat,.018);}
 }else hit(start,'low',.4);
}
const a=L.slice(),b=R.slice();
for(const [delay,gain]of [[.061,.10],[.127,.065],[.193,.04]]){
 const n=Math.round(delay*SR);for(let i=n;i<frames;i++){L[i]+=b[i-n]*gain;R[i]+=a[i-n]*gain;}
}
let peak=0;for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
const gain=.70/peak,buffer=Buffer.alloc(44+frames*4);let power=0;
buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(SR,24);
buffer.writeUInt32LE(SR*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(frames*4,40);
for(let i=0;i<frames;i++){
 const fade=Math.min(1,i/(.01*SR),(frames-i)/(.4*SR));
 const l=L[i]*gain*fade,r=R[i]*gain*fade;power+=l*l+r*r;
 buffer.writeInt16LE(Math.round(l*32767),44+4*i);buffer.writeInt16LE(Math.round(r*32767),46+4*i);
}
const name='05-lobby-soft-steps-v3-120bpm';
writeFileSync(join(out,name+'.wav'),buffer,{flag:'wx'});
const stats={name,bpm,bars,seconds:frames/SR,peakCeiling:.70,rmsDbFS:20*Math.log10(Math.sqrt(power/(frames*2))),swing:false,synthetic:true,loopReady:false};
writeFileSync(join(out,name+'.json'),JSON.stringify(stats,null,2)+'\n',{flag:'wx'});console.log(stats);
