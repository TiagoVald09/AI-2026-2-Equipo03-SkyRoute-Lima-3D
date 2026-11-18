/* Audio sintético generado localmente mediante Web Audio API; no requiere archivos externos. */
(() => {
 'use strict';
 let ctx=null, master=null, musicBus=null, effectsBus=null, ambienceBus=null;
 let weatherNode=null, activeWeather=null, timer=null, nextNote=0, beat=0, lastStep=-1, lastEncounter=-1, climate='clear', muted=false;
 const levels={music:.26,effects:.65,ambience:.36};
 const pattern=[220,329.63,392,329.63,246.94,369.99,440,369.99,196,293.66,392,293.66,174.61,261.63,349.23,261.63];
 function gain(value){const n=ctx.createGain();n.gain.value=value;return n}
 function setup(){
  if(ctx)return true;const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;
  ctx=new Audio();master=gain(muted?0:.65);musicBus=gain(levels.music);effectsBus=gain(levels.effects);ambienceBus=gain(levels.ambience);
  master.connect(ctx.destination);musicBus.connect(master);effectsBus.connect(master);ambienceBus.connect(master);return true;
 }
 function tone(frequency,when,duration,volume,type='sine',bus=effectsBus,endFrequency=null){
  if(!ctx||ctx.state!=='running')return;const oscillator=ctx.createOscillator(),envelope=gain(0);
  oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,when);if(endFrequency)oscillator.frequency.exponentialRampToValueAtTime(endFrequency,when+duration);
  envelope.gain.setValueAtTime(.0001,when);envelope.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),when+.025);envelope.gain.exponentialRampToValueAtTime(.0001,when+duration);
  oscillator.connect(envelope);envelope.connect(bus);oscillator.start(when);oscillator.stop(when+duration+.03);
 }
 function scheduleMusic(){
  if(!ctx||ctx.state!=='running'||document.hidden)return;const now=ctx.currentTime;if(nextNote<now-.2)nextNote=now+.04;
  while(nextNote<now+.25){const hz=pattern[beat%pattern.length];tone(hz,nextNote,.32,.12,'triangle',musicBus);if(beat%4===0)tone(hz/2,nextNote,.7,.07,'sine',musicBus);beat++;nextNote+=.38}
 }
 function setClimate(value){
  climate=value;if(!ctx||ctx.state!=='running')return;const now=ctx.currentTime;
  if(weatherNode){weatherNode.envelope.gain.cancelScheduledValues(now);weatherNode.envelope.gain.setTargetAtTime(.0001,now,.25);try{weatherNode.source.stop(now+1.3)}catch(_){}weatherNode=null}
  const profiles={clear:{type:'lowpass',frequency:240,volume:.035},cloudy:{type:'lowpass',frequency:480,volume:.07},rain:{type:'bandpass',frequency:1400,volume:.15},fog:{type:'lowpass',frequency:130,volume:.085}},p=profiles[value]||profiles.clear;
  const buffer=ctx.createBuffer(1,ctx.sampleRate*3,ctx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const source=ctx.createBufferSource(),filter=ctx.createBiquadFilter(),envelope=gain(.0001);source.buffer=buffer;source.loop=true;filter.type=p.type;filter.frequency.value=p.frequency;filter.Q.value=.5;
  source.connect(filter);filter.connect(envelope);envelope.connect(ambienceBus);source.start(now);envelope.gain.setTargetAtTime(p.volume,now,.35);weatherNode={source,envelope};activeWeather=climate;
 }
 async function unlock(){try{if(!setup())return false;if(ctx.state==='suspended')await ctx.resume();if(ctx.state!=='running')return false;if(!weatherNode||activeWeather!==climate)setClimate(climate);if(!timer){nextNote=ctx.currentTime+.05;timer=window.setInterval(scheduleMusic,120)}return true}catch(_){return false}}
 function effect(name){if(!ctx||ctx.state!=='running'||muted)return;const now=ctx.currentTime;
  if(name==='move'){if(now-lastStep<.25)return;lastStep=now;tone(520,now,.07,.025,'sine');return}
  if(name==='capture'){tone(600,now,.16,.16,'triangle');tone(900,now+.11,.25,.12,'sine');return}
  if(name==='encounter'){if(now-lastEncounter<.6)return;lastEncounter=now;tone(180,now,.38,.16,'sawtooth',effectsBus,75);tone(360,now+.05,.22,.06,'triangle',effectsBus,120);return}
  if(name==='chargeStart'){tone(300,now,.22,.12,'sine');tone(420,now+.13,.3,.11,'sine');return}
  if(name==='chargeDone'){tone(400,now,.14,.1,'sine');tone(520,now+.11,.14,.1,'sine');tone(720,now+.22,.28,.12,'sine')}
 }
 function setVolume(channel,value){if(!(channel in levels))return;levels[channel]=Math.max(0,Math.min(1,Number(value)||0));if(!ctx)return;const bus={music:musicBus,effects:effectsBus,ambience:ambienceBus}[channel];bus.gain.setTargetAtTime(levels[channel],ctx.currentTime,.05)}
 function setMuted(value){muted=Boolean(value);if(ctx)master.gain.setTargetAtTime(muted?0:.65,ctx.currentTime,.05)}
 window.SkyAudio={unlock,setClimate,effect,setVolume,setMuted};
})();
