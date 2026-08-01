(()=>{
'use strict';
const NS=window.JMVisualCampaign;let audio=null,master=null;
function ensure(){if(audio)return audio;const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;audio=new C();master=audio.createGain();master.gain.value=NS.settings.volume;master.connect(audio.destination);return audio}
function note(freq,start,duration,type='sine',gain=.05){const a=ensure();if(!a||!NS.settings.sound)return;const o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(freq,a.currentTime+start);g.gain.setValueAtTime(.0001,a.currentTime+start);g.gain.exponentialRampToValueAtTime(Math.max(.001,gain),a.currentTime+start+.012);g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+start+duration);o.connect(g);g.connect(master);o.start(a.currentTime+start);o.stop(a.currentTime+start+duration+.03)}
NS.audio={
 unlock(){const a=ensure();if(a?.state==='suspended')a.resume();if(master)master.gain.value=NS.settings.volume},
 cue(type='contact'){
  if(!NS.settings.sound)return;
  const sets={contact:[[420,0,.07,'triangle',.035]],build:[[220,0,.08,'square',.025],[330,.055,.08,'square',.025],[520,.11,.12,'triangle',.035]],pass:[[440,0,.08,'sine',.035],[660,.07,.13,'sine',.04]],fault:[[160,0,.12,'sawtooth',.045],[105,.06,.18,'square',.025]],recovery:[[240,0,.08,'triangle',.025],[360,.07,.09,'triangle',.03],[540,.14,.14,'sine',.035]],ding:[[523,0,.11,'triangle',.04],[659,.09,.11,'triangle',.04],[784,.18,.2,'sine',.05]]};
  for(const n of sets[type]||sets.contact)note(...n);
 }
};
NS.on('settings',()=>{if(master)master.gain.value=NS.settings.volume});
for(const event of ['pointerdown','keydown'])addEventListener(event,()=>NS.audio.unlock(),{once:true,capture:true});
})();
