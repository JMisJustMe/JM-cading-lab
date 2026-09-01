(()=>{
'use strict';
const NS=window.JMVisualCampaign;
const live=document.createElement('div');live.id='jmvc-live';live.className='jmvc-sr';live.setAttribute('aria-live','polite');live.setAttribute('aria-atomic','true');document.body.append(live);
NS.announce=text=>{live.textContent='';setTimeout(()=>live.textContent=text,12)};
NS.on('signal',event=>NS.announce(`${NS.profile.name}: ${event.type}. ${event.message||''}`));
addEventListener('keydown',event=>{
 if(event.key==='F2'){event.preventDefault();document.querySelector('#jmvc-toggle')?.click()}
 if(event.key==='F3'){event.preventDefault();NS.set('highContrast',!NS.settings.highContrast)}
 if(event.key==='F4'){event.preventDefault();NS.set('debug',!NS.settings.debug)}
});
})();
