// Original listening sketches; no reference audio or melodies are sampled.
// Run with a NEW output directory; never overwrite previous listening drafts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2];
if (!out) throw Error('Pass a new output directory');
mkdirSync(out, { recursive: true });
const SR = 44100, TAU = Math.PI * 2;
let seed = 9142026;
const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const hz = n => 440 * 2 ** ((n - 69) / 12);
const lobby = [
 [74,-1,78,81,83,-1,81,-1], [78,76,74,-1,71,-1,74,-1],
 [76,-1,78,81,78,76,-1,74], [71,-1,69,-1,74,-1,-1,-1],
 [78,81,83,-1,86,-1,83,81], [78,-1,76,74,76,-1,78,-1],
 [81,-1,78,76,74,-1,71,69], [74,-1,-1,76,74,-1,-1,-1],
 [83,-1,86,88,86,-1,83,-1], [81,78,76,-1,78,-1,81,-1],
 [83,81,78,-1,76,74,71,-1], [69,-1,71,74,76,-1,-1,-1],
 [78,-1,81,83,81,78,76,-1], [74,76,78,-1,76,-1,74,-1],
 [71,-1,76,78,76,74,71,69], [74,-1,-1,-1,-1,-1,-1,-1],
];
const game = [
 [77,79,84,81,-1,79,77,72], [74,-1,77,79,81,79,77,-1],
 [81,84,86,-1,84,81,79,77], [79,77,74,72,74,-1,77,-1],
 [84,-1,81,79,77,79,81,84], [86,84,81,79,-1,77,74,-1],
 [77,81,79,84,81,-1,79,77], [74,72,74,77,79,-1,-1,-1],
 [86,89,86,84,81,-1,84,86], [84,-1,81,79,77,74,77,79],
 [81,79,77,72,74,77,79,-1], [84,81,79,77,74,-1,72,-1],
 [77,79,84,86,84,81,79,77], [81,-1,79,77,74,77,79,81],
 [79,77,74,72,74,77,79,72], [77,-1,-1,-1,-1,-1,-1,-1],
];
function render(name, bpm, melody, active) {
 const beat = 60 / bpm, seconds = 64 * beat + 1.5;
 const L = new Float64Array(Math.ceil(seconds * SR)), R = new Float64Array(L.length);
 function add(t, length, gain, pan, wave) {
  const start = Math.round(t * SR), end = Math.min(L.length, start + Math.ceil(length * SR));
  for (let i = start; i < end; i++) {
   const v = wave((i-start)/SR) * gain;
   L[i] += v * Math.sqrt((1-pan)/2); R[i] += v * Math.sqrt((1+pan)/2);
  }
 }
 function note(t, pitch, length, gain, kind = 'pluck', pan = 0) {
  const f = hz(pitch);
  add(t, length + .4, gain, pan, x => {
   const attack = 1-Math.exp(-x * (kind === 'flute' ? 45 : 550));
   const release = Math.exp(-Math.max(0,x-length)*22);
   if (kind === 'bass') return attack*release*Math.exp(-3*x)*(Math.sin(TAU*f*x)+.16*Math.sin(TAU*f*2*x));
   if (kind === 'flute') return attack*release*(.65*Math.sin(TAU*f*x+.009*Math.sin(TAU*5*x))+.12*Math.sin(TAU*f*2*x))*(.96+.04*Math.sin(TAU*5*x));
   // Subtle downward attack bend and delayed vibrato evoke a plucked string.
   const phase = TAU*f*(x+.00035*(1-Math.exp(-x*35)))+.018*Math.sin(TAU*5.2*x)*Math.min(1,x*3);
   return attack*release*(Math.exp(-3.8*x)*Math.sin(phase)+.34*Math.exp(-7*x)*Math.sin(2.002*phase)+.18*Math.exp(-10*x)*Math.sin(3.006*phase)+.06*Math.exp(-16*x)*Math.sin(5.01*phase));
  });
 }
 function hit(t, kind, gain, pan=0) {
  const toe = kind === 'toe', heel = kind === 'heel';
  add(t, toe ? .075 : .18, gain, pan, x => {
   const env = (1-Math.exp(-x*2200))*Math.exp(-x*(toe ? 85 : 32));
   if (toe) return env*(.3*(random()*2-1)+.32*Math.sin(TAU*1860*x)+.2*Math.sin(TAU*2810*x));
   if (heel) return env*(.65*Math.sin(TAU*510*x)+.17*(random()*2-1));
   return env*(Math.sin(TAU*(145*x+.6*(1-Math.exp(-x*24))))+.12*Math.sin(TAU*390*x));
  });
 }
 const roots = active ? [41,38,46,36,41,38,46,36,46,41,38,36,41,46,36,41] : [38,35,43,33,38,35,43,33,43,38,35,33,38,43,33,38];
 for (let bar=0; bar<16; bar++) {
  const t=bar*4*beat, root=roots[bar];
  note(t,root,beat*.65,.2,'bass',-.12);
  if(bar<15) note(t+2*beat,root+7,beat*.55,.14,'bass',-.12);
  for (let b=0;b<(bar===15?1:4);b++) {
   hit(t+b*beat,b%2?'toe':'heel',active?.16:.13,b%2?.25:-.25);
   if (active || b===1 || b===3) hit(t+(b+.6)*beat,'toe',.07,-.3);
   if (b===0 || b===2) hit(t+b*beat,'drum',.085,.15);
   if (b===1 || b===3) [root+24,root+31].forEach((n,i)=>note(t+b*beat+i*.018,n,beat*.22,.055,'pluck',-.5));
  }
  melody[bar].forEach((n,i)=>{
   if(n<0)return;
   const offset=Math.floor(i/2)+(i%2?.6:0);
   note(t+offset*beat,n,beat*(active?.33:.5),active?.17:.2,'pluck',.25);
  });
  if (!active && bar%4===1) note(t+2.5*beat,melody[bar][0]+12,beat*.8,.045,'flute',-.2);
  if (active && bar%4===3 && bar<15) for (const [j,v] of [3.25,3.5,3.75].entries()) hit(t+v*beat,j%2?'heel':'toe',.085,j%2?-.4:.4);
 }
 const dl=L.slice(),dr=R.slice();
 for (const [delay,gain] of [[.047,.1],[.091,.07],[.149,.035]]) {
  const d=Math.round(delay*SR);
  for(let i=d;i<L.length;i++){ L[i]+=dr[i-d]*gain;R[i]+=dl[i-d]*gain; }
 }
 let peak=0;
 for(let i=0;i<L.length;i++)peak=Math.max(peak,Math.abs(L[i]),Math.abs(R[i]));
 const gain=.72/peak, wav=Buffer.alloc(44+L.length*4);
 wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
 wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);
 wav.writeUInt32LE(SR,24);wav.writeUInt32LE(SR*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);
 wav.write('data',36);wav.writeUInt32LE(L.length*4,40);
 let energy=0;
 for(let i=0;i<L.length;i++){
  const fade=Math.min(1,i/(SR*.01),(L.length-i)/(SR*.5));
  const l=L[i]*gain*fade,r=R[i]*gain*fade;
  wav.writeInt16LE(Math.round(l*32767),44+i*4);wav.writeInt16LE(Math.round(r*32767),46+i*4);energy+=l*l+r*r;
 }
 writeFileSync(join(out,name+'.wav'),wav,{flag:'wx'});
 const stats={name,bpm,seconds,sampleRate:SR,channels:2,peakCeiling:.72,rmsDbFS:20*Math.log10(Math.sqrt(energy/(L.length*2))),synthetic:true,loopReady:false};
 writeFileSync(join(out,name+'.json'),JSON.stringify(stats,null,2)+'\n',{flag:'wx'});
 console.log(stats);
}
render('01-lobby-hangul-hop',112,lobby,false);
render('02-game-jamo-jump',124,game,true);
