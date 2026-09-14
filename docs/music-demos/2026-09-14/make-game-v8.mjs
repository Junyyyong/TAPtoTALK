// V8: no bass/pedal layer. New coherent four-bar melody with small steps and returns.
// Synthetic plucked string + breath tone + two drum heads + toe/heel taps.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out=process.argv[2];
if(!out)throw Error('Pass a new output directory');
mkdirSync(out,{recursive:true});
const SR=44100, TAU=2*Math.PI, bpm=142, beat=60/bpm, bars=24;
const frames=Math.ceil((bars*4*beat+1.2)*SR);
const L=new Float64Array(frames),R=new Float64Array(frames);
let seed=91436;
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
 // Damped delay-line string differs from the first draft's bell-like additive voice.
 const f=freq(midi),size=Math.round(SR/f),line=new Float64Array(size);
 for(let i=0;i<size;i++)line[i]=rand();
 let at=0,previous=0,soft=0;
 put(time,length+.3,gain,pan,(x)=>{
  const v=line[at],next=line[(at+1)%size];
  line[at]=.495*(v+next);at=(at+1)%size;
  const release=Math.exp(-Math.max(0,x-length)*35);
  // Quiet fundamental helps small speakers retain the pitch after the pluck.
  const body=.12*Math.sin(TAU*f*x)*Math.exp(-x*5);
  const filtered=.7*v+.3*previous;previous=v;
  soft += .14 * (filtered + body - soft);
  return soft*Math.sin(Math.min(1,x/.025)*Math.PI/2)**2*release;
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
 put(time,low?.13:.11,gain*(low?.22:slap?.09:toe?.045:.10),pan,x=>{
  const attack=1-Math.exp(-x*400);
  if(low)return attack*Math.exp(-x*48)*(.65*Math.sin(TAU*155*x)+.12*Math.sin(TAU*310*x));
  if(slap)return attack*Math.exp(-x*48)*(.65*Math.sin(TAU*385*x)+.34*rand()+.18*Math.sin(TAU*692*x));
  if(toe)return attack*Math.exp(-x*110)*(.35*rand()+.08*Math.sin(TAU*2350*x)+.025*Math.sin(TAU*3270*x));
  return attack*Math.exp(-x*65)*(.8*Math.sin(TAU*690*x)+.12*rand());
 });
}
// G-major, G4–D5. Four-bar question/answer motifs, even beats/eighths.
// Stored at sounding pitch: no hidden octave transposition.
const A=[
 [[0,67,.8],[1,69,.4],[1.5,71,.4],[2,71,.8],[3,69,.8]],
 [[0,67,.8],[1,71,.8],[2,74,1.6]],
 [[0,72,.8],[1,71,.8],[2,69,.8],[3,71,.8]],
 [[0,69,.8],[1,67,.8],[2,67,1.6]],
];
const B=[
 [[0,71,.8],[1,72,.4],[1.5,74,.4],[2,74,.8],[3,72,.8]],
 [[0,71,.8],[1,69,.8],[2,71,1.6]],
 [[0,72,.8],[1,71,.8],[2,69,.8],[3,67,.8]],
 [[0,69,.8],[1,71,.8],[2,74,1.6]],
];
const A2=[
 A[0],
 [[0,67,.8],[1,69,.4],[1.5,71,.4],[2,74,.8],[3,71,.8]],
 A[2],
 [[0,69,.8],[1,67,.8],[2,67,1.6]],
];
const ending=[
 A[0],A[1],
 [[0,72,.8],[1,71,.8],[2,69,.8],[3,69,.8]],
 [[0,67,2.8]],
];
const phrases=[...A,...A2,...B,...B,...A2,...ending];
for(let bar=0;bar<bars;bar++){
 const start=bar*4*beat,last=bar===bars-1,breakBar=bar%4===3;
 // Deliberately no continuous bass, drone, or low string pedal.
 for(const [offset,pitch,length] of phrases[bar]){
  string(start+offset*beat,pitch,length*beat,.20);
  if(bar>=8&&bar<16)pipe(start+offset*beat,pitch,length*beat,0);
 }
 if(!last){
  // Quiet on-beat support increases momentum without bright metallic hits.
  for(const offset of [1,2])hit(start+offset*beat,'low',.4);
  for(const offset of [0,1.5,3])hit(start+offset*beat,'low',offset===0?1:.6);
  for(const offset of [.75,2,2.5,3.75])hit(start+offset*beat,'slap',offset===2?1:.6);
  for(const offset of [.5,1,2.75,3.5])hit(start+offset*beat,'toe',.85);
  for(const offset of [0,2])hit(start+offset*beat,'heel',.65);
  if(breakBar)for(const [j,offset] of [2.5,2.75,3,3.25,3.5,3.75].entries())hit(start+offset*beat,j%2?'toe':'heel',.65);
  if(bar%4===1)pipe(start+2.75*beat,bar<8?86:88,.65*beat,0);
 }else hit(start,'low',.8);
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
const name='13-game-jamo-flow-v8-no-bass-142bpm';
writeFileSync(join(out,name+'.wav'),buffer,{flag:'wx'});
const stats={name,bpm,bars,seconds:frames/SR,peakCeiling:.70,rmsDbFS:20*Math.log10(Math.sqrt(power/(frames*2))),swing:false,synthetic:true,loopReady:false};
writeFileSync(join(out,name+'.json'),JSON.stringify(stats,null,2)+'\n',{flag:'wx'});console.log(stats);
