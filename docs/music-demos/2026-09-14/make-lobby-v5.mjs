// V5 brighter mix of the approved lobby composition. Melody/128 BPM unchanged.
// Shares only the V2 synthesis engine, not the game melody or arrangement.
// Synthetic plucked string + breath tone + two drum heads + toe/heel taps.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out=process.argv[2];
if(!out)throw Error('Pass a new output directory');
mkdirSync(out,{recursive:true});
const SR=44100, TAU=2*Math.PI, bpm=128, beat=60/bpm, bars=16;
const loop=process.argv.includes('--loop');
const frames=Math.ceil((bars*4*beat+1.2)*SR);
const L=new Float64Array(frames),R=new Float64Array(frames);
let seed=914128;
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
  return attack*release*Math.exp(-x*.65)*(.72*Math.sin(phase)+.17*Math.sin(2*phase)+.035*Math.sin(3*phase));
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
// Original melody: all entrances on beats or even eighths, no swing or pickups.
const phrases=[
 [[0,71,.85],[1,74,.85],[2,76,.4],[2.5,74,.4],[3,71,.85]],
 [[0,69,.85],[1,67,.85],[2,69,.85],[3,71,.85]],
 [[0,72,.85],[1,76,.85],[2,74,.85],[3,72,.85]],
 [[0,69,.85],[1,66,.85],[2,67,1.8]],
 [[0,71,.85],[1,74,.4],[1.5,76,.4],[2,78,.85],[3,76,.85]],
 [[0,74,.85],[1,71,.85],[2,69,.85],[3,67,.85]],
 [[0,69,.85],[1,72,.85],[2,71,.4],[2.5,69,.4],[3,66,.85]],
 [[0,67,1.8],[2,69,.85],[3,71,.85]],
 [[0,76,.85],[1,79,.85],[2,78,.85],[3,76,.85]],
 [[0,74,.85],[1,71,.85],[2,72,.4],[2.5,71,.4],[3,69,.85]],
 [[0,72,.85],[1,74,.85],[2,76,.85],[3,74,.85]],
 [[0,69,.85],[1,66,.85],[2,69,1.8]],
 [[0,71,.85],[1,74,.85],[2,76,.4],[2.5,74,.4],[3,71,.85]],
 [[0,72,.85],[1,76,.85],[2,74,.85],[3,72,.85]],
 [[0,69,.85],[1,71,.4],[1.5,69,.4],[2,66,.85],[3,69,.85]],
 [[0,67,2.8]],
];
const chords=[[55,59,62,64],[52,55,59,62],[48,52,55,59],[50,54,57,60],
 [55,59,62,66],[52,55,59,62],[57,60,64,67],[50,54,57,62],
 [48,52,55,59],[55,59,62,64],[57,60,64,67],[50,54,57,60],
 [55,59,62,64],[48,52,55,59],[50,54,57,60],[55,59,62,64]];
function guitar(time,pitch,gain=.065){
 const f=freq(pitch);
 put(time,.62,gain,-.35,x=>{
  const env=(1-Math.exp(-x*95))*Math.exp(-x*6);
  return env*(Math.sin(TAU*f*x)+.25*Math.sin(TAU*f*2*x)+.08*Math.sin(TAU*f*3*x));
 });
}
for(let bar=0;bar<bars;bar++){
 const start=bar*4*beat,last=bar===bars-1, chord=chords[bar];
 for(const [offset,pitch,length]of phrases[bar]){
  string(start+offset*beat,pitch,length*beat,.15,.12);
 }
 for(let step=0;step<(last?4:8);step++){
  guitar(start+step*.5*beat,chord[[0,2,1,3,0,2,1,2][step]],.11);
 }
 for(let k=0;k<(last?1:4);k++){
  hit(start+k*beat,k%2?'heel':'low',k%2?.16:.21);
  // Quiet smooth shaker on an even eighth, not a metallic pitched tap.
  put(start+(k+.5)*beat,.08,.015,.28,x=>rand()*Math.sin(Math.PI*Math.min(1,x/.08))**2);
 }
 if(!last){
  string(start,chord[0]-12,.8*beat,.08,0);
  string(start+2*beat,chord[0]-12,.8*beat,.065,0);
 }
}
const a=L.slice(),b=R.slice();
for(const [delay,gain]of [[.061,.10],[.127,.065],[.193,.04]]){
 const n=Math.round(delay*SR);for(let i=n;i<frames;i++){L[i]+=b[i-n]*gain;R[i]+=a[i-n]*gain;}
}
const outputFrames=loop?Math.round(bars*4*beat*SR):frames;
if(loop)for(let i=outputFrames;i<frames;i++){L[i-outputFrames]+=L[i];R[i-outputFrames]+=R[i];}
let peak=0;for(let i=0;i<frames;i++)peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
const gain=.70/peak,buffer=Buffer.alloc(44+outputFrames*4);let power=0;
buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);
buffer.writeUInt32LE(16,16);buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(SR,24);
buffer.writeUInt32LE(SR*4,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(outputFrames*4,40);
for(let i=0;i<outputFrames;i++){
 const fade=loop?1:Math.min(1,i/(.01*SR),(frames-i)/(.4*SR));
 const l=L[i]*gain*fade,r=R[i]*gain*fade;power+=l*l+r*r;
 buffer.writeInt16LE(Math.round(l*32767),44+4*i);buffer.writeInt16LE(Math.round(r*32767),46+4*i);
}
const name='08-lobby-sunny-stroll-bright-v5-128bpm';
writeFileSync(join(out,name+'.wav'),buffer,{flag:'wx'});
const stats={name,bpm,bars,seconds:outputFrames/SR,peakCeiling:.70,rmsDbFS:20*Math.log10(Math.sqrt(power/(outputFrames*2))),swing:false,synthetic:true,loopReady:loop};
writeFileSync(join(out,name+'.json'),JSON.stringify(stats,null,2)+'\n',{flag:'wx'});console.log(stats);
