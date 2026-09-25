(()=>{"use strict";

const SEL={
  rootGrid:".eco-gripcube .gc-grid",
  moneyGrid:"#grid",
  moneyFront:"#frontOffers",
  moneyProof:".proof",
  moneyForm:".form-grid",
  moneySelected:".selected-list",
  earnGrid:"#offerGrid",
  earnTruth:".truth",
  earnSteps:".steps",
  earnForm:".formGrid",
  earnSelected:".selection"
};

const enhanced=new WeakSet();
const observers=new WeakMap();

function step(track,dir){
  const amount=Math.max(220,track.clientWidth*.82);
  track.scrollBy({left:dir*amount,behavior:document.documentElement.classList.contains("ecostate-reduce-motion")?"auto":"smooth"});
}

function toolbar(track,label,mobileOnly=false){
  if(track.previousElementSibling?.classList.contains("griprail-toolbar")) return track.previousElementSibling;
  const bar=document.createElement("div");
  bar.className="griprail-toolbar"+(mobileOnly?" griprail-mobile-only":"");
  bar.innerHTML=`<strong>${label} · SIDE ROUTE ↔</strong><button class="griprail-arrow" type="button" aria-label="Previous ${label}">←</button><button class="griprail-arrow" type="button" aria-label="Next ${label}">→</button>`;
  const [prev,next]=bar.querySelectorAll("button");
  prev.onclick=()=>step(track,-1);
  next.onclick=()=>step(track,1);
  track.before(bar);
  return bar;
}

function enhanceTrack(track,label,{simple=true,mobileOnly=true}={}){
  if(!track) return;
  track.classList.add("griprail-track");
  if(simple) track.classList.add("griprail-simple");
  if(!track.hasAttribute("tabindex")) track.tabIndex=0;
  if(!track.hasAttribute("role")) track.setAttribute("role","region");
  if(!track.hasAttribute("aria-label")) track.setAttribute("aria-label",`${label}. Scroll sideways for more.`);
  if(!enhanced.has(track)){
    track.addEventListener("keydown",e=>{
      if(e.key==="ArrowRight"){e.preventDefault();step(track,1)}
      if(e.key==="ArrowLeft"){e.preventDefault();step(track,-1)}
    });
    enhanced.add(track);
  }
  toolbar(track,label,mobileOnly);
}

function groupCards(container,keyAttr,label){
  if(!container) return;
  const cards=[...container.children].filter(x=>x.matches(".card") && x.dataset[keyAttr]);
  if(!cards.length) return;

  const groups=[];
  const map=new Map();
  for(const card of cards){
    const key=card.dataset[keyAttr]||"Other";
    if(!map.has(key)){const a=[];map.set(key,a);groups.push([key,a])}
    map.get(key).push(card);
  }

  container.classList.add("griprail-groups");
  container.innerHTML="";
  for(const [name,items] of groups){
    const section=document.createElement("section");
    section.className="griprail-group";
    section.innerHTML=`<div class="griprail-group-head"><h3>${escapeHtml(name)}</h3><span>${items.length} ${items.length===1?"route":"routes"}</span></div><div class="griprail-track" tabindex="0" role="region" aria-label="${escapeAttr(name)} side-scroll routes"></div>`;
    const track=section.querySelector(".griprail-track");
    items.forEach(card=>track.append(card));
    container.append(section);
    enhanceTrack(track,name,{simple:false,mobileOnly:false});
  }
}

function escapeHtml(v){
  return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function escapeAttr(v){return escapeHtml(v)}

function watchGrouped(container,keyAttr,label){
  if(!container||observers.has(container)) return;
  let busy=false;
  const regroup=()=>{
    if(busy) return;
    const raw=[...container.children].some(x=>x.matches(".card")&&x.dataset[keyAttr]);
    if(!raw) return;
    busy=true;
    groupCards(container,keyAttr,label);
    busy=false;
  };
  const mo=new MutationObserver(()=>queueMicrotask(regroup));
  mo.observe(container,{childList:true});
  observers.set(container,mo);
  regroup();
}

function installSimple(selector,label){
  document.querySelectorAll(selector).forEach(el=>enhanceTrack(el,label,{simple:true,mobileOnly:true}));
}

function installForms(){
  document.querySelectorAll(`${SEL.moneyForm},${SEL.earnForm}`).forEach(el=>{
    el.classList.add("griprail-form","griprail-track");
    enhanceTrack(el,"enquiry fields",{simple:false,mobileOnly:true});
  });
}

function install(){
  installSimple(SEL.rootGrid,"local GripCube routes");
  installSimple(SEL.moneyFront,"front-window offers");
  installSimple(SEL.moneyProof,"proof cards");
  installSimple(SEL.moneySelected,"shortlisted routes");
  installSimple(SEL.earnTruth,"service truths");
  installSimple(SEL.earnSteps,"contact steps");
  installSimple(SEL.earnSelected,"selected offers");
  installForms();

  const money=document.querySelector(SEL.moneyGrid);
  if(money) watchGrouped(money,"gripHouse","Money Menu");

  const earn=document.querySelector(SEL.earnGrid);
  if(earn) watchGrouped(earn,"gripCat","Earn-Now");

  document.documentElement.dataset.griprail="v6";
}

const rootObserver=new MutationObserver(()=>{
  installSimple(SEL.rootGrid,"local GripCube routes");
  installSimple(SEL.moneyFront,"front-window offers");
  installSimple(SEL.moneyProof,"proof cards");
  installSimple(SEL.moneySelected,"shortlisted routes");
  installSimple(SEL.earnTruth,"service truths");
  installSimple(SEL.earnSteps,"contact steps");
  installSimple(SEL.earnSelected,"selected offers");
  installForms();
});

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{
  install();
  rootObserver.observe(document.body,{childList:true,subtree:true});
});
else{
  install();
  rootObserver.observe(document.body,{childList:true,subtree:true});
}

window.JMGripRail={
  version:"6.0",
  law:"HORIZONTAL REPEAT REDUCES UNNECESSARY VERTICAL TRAVEL; VERTICAL REMAINS AVAILABLE WHERE THE BODY ACTUALLY NEEDS DEPTH.",
  install,
  proof:()=>({
    version:"6.0",
    groupedMoney:document.querySelectorAll("#grid .griprail-group").length,
    groupedEarnNow:document.querySelectorAll("#offerGrid .griprail-group").length,
    sideTracks:document.querySelectorAll(".griprail-track").length,
    formRails:document.querySelectorAll(".griprail-form").length,
    rootGripCube:!!document.querySelector(".eco-gripcube .gc-grid.griprail-track")
  })
};
})();
