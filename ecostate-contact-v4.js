(()=>{const d=document,b=d.body;if(!b||!b.dataset.ecostateSurface)return;
const surface=b.dataset.ecostateSurface;
const names={"front-door":"ECOSTATE","games":"GAMES","theory":"THEORY","lyrics":"LYRICS","apps":"APPS","creator":"AUTHUSER","work":"WORK","navigator":"NAVIGATOR","recovery":"RECOVERY","recent":"RECENT"};
const verbs={"front-door":"ROUTE","games":"PLAY","theory":"READ","lyrics":"HEAR","apps":"USE","creator":"AUTHOR","work":"SCOPE","navigator":"TRACE","recovery":"RECOVER","recent":"CONTINUE"};
b.dataset.ecostateContact="v4";b.dataset.eco4Phase="entering";
const hero=d.querySelector(".hero");
if(hero&&!hero.querySelector(".eco4-story")){const story=d.createElement("div");story.className="eco4-story";story.setAttribute("aria-hidden","true");const thread=d.createElement("span");thread.className="eco4-route-thread";story.append(thread);hero.prepend(story)}
let veil=d.querySelector(".eco4-veil");if(!veil){veil=d.createElement("div");veil.className="eco4-veil";veil.setAttribute("aria-hidden","true");b.append(veil)}
let state=d.querySelector(".eco4-state");
if(!state){state=d.createElement("div");state.className="eco4-state";state.setAttribute("role","status");state.setAttribute("aria-live","polite");state.innerHTML="<i aria-hidden=\"true\"></i><span></span>";b.append(state)}
const label=state.querySelector("span");
const setState=(phase,text)=>{b.dataset.eco4Phase=phase;if(label)label.textContent=text};
setState("entering","ENTERED "+(names[surface]||surface.toUpperCase()));
requestAnimationFrame(()=>setTimeout(()=>setState("idle",(verbs[surface]||"CONTACT")+" READY · "+(names[surface]||surface.toUpperCase())),900));
let timer;
const contact=(target,kind="CONTACT")=>{clearTimeout(timer);d.querySelectorAll("[data-eco4-contacted]").forEach(n=>n.removeAttribute("data-eco4-contacted"));if(target&&target.setAttribute)target.setAttribute("data-eco4-contacted","true");const text=(target?.getAttribute?.("aria-label")||target?.textContent||"").replace(/\s+/g," ").trim().slice(0,44);setState("contact",(verbs[surface]||kind)+" · "+(text||names[surface]||"ECOSTATE"));timer=setTimeout(()=>{if(target?.removeAttribute)target.removeAttribute("data-eco4-contacted");setState("idle",(verbs[surface]||"CONTACT")+" READY · "+(names[surface]||surface.toUpperCase()))},620)};
d.addEventListener("pointerdown",e=>{b.dataset.eco4Input="pointer";const t=e.target.closest?.("a,button,summary,[role='button']");if(t)contact(t)}, {passive:true});
d.addEventListener("keydown",()=>{b.dataset.eco4Input="keyboard"},{passive:true});
d.addEventListener("focusin",e=>{const t=e.target.closest?.("a,button,summary,[tabindex]");if(t)contact(t,"FOCUS")});
d.addEventListener("pointermove",e=>{b.style.setProperty("--eco4-contact-x",(e.clientX/Math.max(innerWidth,1)*100).toFixed(1)+"%");b.style.setProperty("--eco4-contact-y",(e.clientY/Math.max(innerHeight,1)*100).toFixed(1)+"%")},{passive:true});
d.addEventListener("click",e=>{const a=e.target.closest?.("a[href]");if(!a||e.defaultPrevented||e.button>0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;let u;try{u=new URL(a.href,location.href)}catch{return}if(u.origin!==location.origin||a.target==="_blank"||a.hasAttribute("download"))return;const dest=(a.textContent||u.pathname).replace(/\s+/g," ").trim().slice(0,34)||"NEXT ROUTE";setState("leaving",(names[surface]||"ECOSTATE")+" → "+dest);},true);
addEventListener("pageshow",()=>{if(b.dataset.eco4Phase==="leaving")setState("idle",(verbs[surface]||"CONTACT")+" READY · "+(names[surface]||surface.toUpperCase()))});
})();