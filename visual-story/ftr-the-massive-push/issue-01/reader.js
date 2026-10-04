const pages=[
{n:1,title:"ORDINARY ROOM",deck:"Frozen owner-accepted visual-direction keeper.",caption:"A simple request opens the route: something dubbed, something unseen, nothing crowned yet.",visual:"room",labels:["SOMETHING DUBBED.","SOMETHING I HAVEN'T SEEN.","ROUTE BEFORE CROWN"]},
{n:2,title:"SUBTITLES AS INTRUSION",deck:"The carrier fights divided attention.",caption:"The same story can become a worse fit when the route demands the wrong kind of attention.",visual:"subtitles",labels:["SUBTITLES: INTRUSIVE","PAUSED 02:41","OH, PISS OFF."]},
{n:3,title:"DUBBED AS COOPERATION",deck:"A carrier can cooperate with the participant.",caption:"The task stays alive while attention is freed. Better is relational, not absolute.",visual:"cooperation",labels:["BETTER.","COOPERATIVE","ATTENTION FREED"]},
{n:4,title:"THE PENDULUM CORRECTION",deck:"Correction is cooperative steering, not rejection.",caption:"Too high. Too low. From there. Preserve motion; correct the route.",visual:"pendulum",labels:["TOO HIGH","TOO LOW","CORRECTION WASN'T REJECTION"]},
{n:5,title:"CONTACT",deck:"Fresh donor pressure enters; observation before interpretation.",caption:"The screen does not become brighter. Its edges become sharper. Something has become salient.",visual:"contact",labels:["AI / SCIENCE PROGRAMME","LOCAL CLARITY ↑","NOT PROOF. CONTACT."]},
{n:6,title:"THE SPOTLIGHT",deck:"Same carrier, different readings; the operation has not yet been crowned.",caption:"Observation first. Interpretation second.",visual:"spotlight",labels:["SCIENTIFIC","ASTROLOGICAL","NUMEROLOGICAL"]},
{n:7,title:"DON’T CROWN IT",deck:"Interesting contact is not automatic universal law.",caption:"Status is earned by route, not by excitement.",visual:"crown",labels:["UNIVERSAL LAW","ONE INTERESTING CONTACT","THAT'LL DO."]},
{n:8,title:"YESTERDAY’S WEATHER",deck:"Past pattern gives a searchlight, not a verdict.",caption:"Appearance ≠ causal equivalence. Preserve the receipt; test the new case.",visual:"weather",labels:["YESTERDAY: CLOUD → RAIN","TODAY: …NO RAIN","PAST PATTERN = SEARCHLIGHT"]},
{n:9,title:"THE FIRST CUT",deck:"Structure / Aesthetic: a useful distinction, not two final worlds.",caption:"The cut helps inspection. The cut does not prove ultimate separation.",visual:"cut",labels:["STRUCTURE","AESTHETIC","A USEFUL DISTINCTION"]},
{n:10,title:"REMOVE IT",deck:"What survives stripping, substitution and translation?",caption:"Colour, material, language and carrier can change while a tested relation continues to operate.",visual:"remove",labels:["REMOVE COLOUR","CHANGE MATERIAL","CHANGE CARRIER"]},
{n:11,title:"FUNCTION BITES BACK",deck:"Same form can change function; repeated function can reshape form.",caption:"Function is not essence; sustained function can become form.",visual:"function",labels:["SAME FORM","SAME FUNCTION","DESCENDANT"]},
{n:12,title:"THREE MASKS",deck:"Mechanism. Consequence. Meaning. Then the masks swap.",caption:"Carrier is not function.",visual:"masks",labels:["EQUATION","THEATRE","SACRED"]},
{n:13,title:"CARRIER ERROR",deck:"A label cannot confiscate every operation available to a body.",caption:"A scientific paper can carry worldview. A cartoon can expose mechanism. A parable can simulate.",visual:"carrier",labels:["SCIENCE → MECHANISM","ANIME → SIMULATION","RELIGION → MEANING"]},
{n:14,title:"BETTER WORDS",deck:"Wording changes route availability.",caption:"Better wording allows quicker richer growth.",visual:"words",labels:["STEAL AN IDEA","GET INSPIRED","WHAT DOES THIS MAKE AVAILABLE?"]},
{n:15,title:"THE FTR CORRIDOR",deck:"Forgotten. Trance. Reclaimed.",caption:"Reclaimed doesn’t mean put back where it was. Recovery can preserve transformation while restoring route.",visual:"corridor",labels:["FORGOTTEN","TRANCE","RECLAIMED"]},
{n:16,title:"INFLUENCE",deck:"Threads move through attention; some accompany, some bind.",caption:"Influence is not automatically ownership. The missing route back is the problem.",visual:"influence",labels:["LOOSE","STICKY","CHAIN"]},
{n:17,title:"RETURN",deck:"A state can change without the route being stolen.",caption:"You can return with change still inside you. Participation can alter you without owning what you become.",visual:"return",labels:["NO EXIT","RECOVERY","RETURN"]},
{n:18,title:"MAGIC",deck:"Do not worship the appearance. Find the route.",caption:"Not ‘magic confirmed.’ Not ‘nothing happened.’ Preserve the unresolved route.",visual:"magic",labels:["THEATRE: ROUTE FOUND","LAB: ROUTE UNRESOLVED","SAME EFFECT"]},
{n:19,title:"THE BLACK ROOM",deck:"P/Q: extraction is easy; continuity is the test.",caption:"The bottleneck is not extraction. It is stable placement.",visual:"blackroom",labels:["PP → 11 · QQ → 00","PQP → 110 · QPQ → 001","WHICH PART SURVIVES?"]},
{n:20,title:"EXTRACTION ISN’T THE PROBLEM",deck:"Connections are cheap; dependable survivors are rarer.",caption:"Another run breaks most lines. A few remain.",visual:"network",labels:["EVERYTHING CONNECTS","ANOTHER RUN","A FEW REMAIN"]},
{n:21,title:"ONE BECOMES TWO",deck:"The cut makes something visible; the cut does not create the whole.",caption:"You needed the cut to see it. The cut didn’t create it.",visual:"oneTwo",labels:["CUT = OVERLAY","WHOLE REMAINS","SALIENCY IS TEMPORARY"]},
{n:22,title:"BACKGROUND NOISE",deck:"Return without restart.",caption:"Nothing had become more connected. I had become able to see a connection. FTR WILL RETURN… apparently.",visual:"returnRoom",labels:["THERE YOU ARE.","I CAN SEE A CONNECTION.","FTR WILL RETURN."]}
];

const issues=["BACKGROUND NOISE","THE SWING","YESTERDAY'S WEATHER","THE THREE MASKS","THE SHAPE OF USE","THE MAGIC DOOR","FORGOTTEN. TRANCE. RECLAIMED.","THE RECLAIMED WORKSHOP","THE SUGGESTION ROOM","THE EXIT STAYS LIT","LYRICS THAT REMEMBER","BETTER WORDS","THE P/Q CHAMBER","HIDDEN STATE","VALIDATE THAT SYSTEM","PRIVATE WEATHER","MIND / MATTER","BRAIN / BODY","THE THIRD THING","SALIENCY","THE CUT IS NOT THE TERRITORY","GAME OF CONSEQUENCES","MESH WITHOUT MERGE","ONE REALITY, MANY CUTS","THE DONOR RETURNS","WHAT SURVIVES TRANSLATION","THE DIFFERENCE-MAKER","FUNCTION BECOMES FORM","THE DESCENDANT LOOKS BACK","THE ESTATE THAT REMEMBERS","THE CONTINUOUS PAGE","RETURN WITHOUT RESTART"];

let index=0;
function el(id){return document.getElementById(id);}
const scene=el("scene"),pageNo=el("pageNo"),pageTitle=el("pageTitle"),pageDeck=el("pageDeck"),pageCaption=el("pageCaption"),progress=el("progressBar"),dots=el("pageDots");

function sceneMarkup(p){
  var labels=p.labels.map(function(t,i){
    var cls=i===0?"blue":i===1?"gold":"violet";
    return "<span class='label "+cls+"' style='left:"+(10+i*18)+"%;top:"+(16+i*26)+"%'>"+t+"</span>";
  }).join("");
  var panels="<span class='panel' style='left:8%;top:12%;width:36%;height:34%'></span>"+
             "<span class='panel' style='right:8%;top:18%;width:38%;height:28%'></span>"+
             "<span class='panel' style='left:18%;bottom:10%;width:64%;height:28%'></span>";
  return "<div class='motif motif-"+p.visual+"'>"+panels+labels+"</div>";
}

function render(){
  var p=pages[index];
  pageNo.textContent="PAGE "+String(p.n).padStart(2,"0")+" / 22";
  pageTitle.textContent=p.title;
  pageDeck.textContent=p.deck;
  pageCaption.textContent=p.caption;
  progress.style.width=((p.n/22)*100)+"%";
  scene.innerHTML=sceneMarkup(p);
  Array.from(dots.children).forEach(function(b,i){b.classList.toggle("active",i===index);});
  el("prevBtn").disabled=index===0;
  el("nextBtn").disabled=index===pages.length-1;
  document.title="FTR · "+p.title+" · Page "+p.n;
  try{localStorage.setItem("ftr-issue01-page",String(index));}catch(e){}
}
function go(n){
  var next=Math.max(0,Math.min(pages.length-1,n));
  if(next===index)return;
  index=next;render();el("comicPage").focus({preventScroll:true});
}
pages.forEach(function(p,i){
  var b=document.createElement("button");
  b.type="button";b.textContent=p.n;b.title="Page "+p.n+": "+p.title;
  b.addEventListener("click",function(){go(i);});dots.appendChild(b);
});
el("prevBtn").onclick=function(){go(index-1);};
el("nextBtn").onclick=function(){go(index+1);};
el("tapPrev").onclick=function(){go(index-1);};
el("tapNext").onclick=function(){go(index+1);};
document.addEventListener("keydown",function(e){if(e.key==="ArrowLeft")go(index-1);if(e.key==="ArrowRight")go(index+1);});
var sx=0,sy=0;
el("comicPage").addEventListener("pointerdown",function(e){sx=e.clientX;sy=e.clientY;});
el("comicPage").addEventListener("pointerup",function(e){var dx=e.clientX-sx,dy=e.clientY-sy;if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.4)go(index+(dx<0?1:-1));});

function toggleDrawer(id,button){
  var d=el(id),open=d.hidden;
  document.querySelectorAll(".drawer").forEach(function(x){x.hidden=true;});
  document.querySelectorAll(".top-actions button").forEach(function(x){x.setAttribute("aria-expanded","false");});
  d.hidden=!open;button.setAttribute("aria-expanded",open?"true":"false");
}
el("infoBtn").onclick=function(e){toggleDrawer("infoDrawer",e.currentTarget);};
el("mapBtn").onclick=function(e){toggleDrawer("mapDrawer",e.currentTarget);};
document.querySelectorAll("[data-close]").forEach(function(b){b.onclick=function(){el(b.dataset.close).hidden=true;};});
el("fullBtn").onclick=function(){if(!document.fullscreenElement){if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen();}else if(document.exitFullscreen)document.exitFullscreen();};

var map=el("issueMap");
issues.forEach(function(name,i){
  var a=document.createElement("article");
  a.className="issue"+(i===0?" active":"");
  a.innerHTML="<b>"+String(i+1).padStart(2,"0")+"</b><strong>"+name+"</strong><span>"+(i===0?"PUBLIC READER · THIS DESCENDANT":"SEATED UPSTREAM · SERIES MASTER v1.0")+"</span>";
  map.appendChild(a);
});
try{var saved=Number(localStorage.getItem("ftr-issue01-page"));if(Number.isInteger(saved)&&saved>=0&&saved<22)index=saved;}catch(e){}
render();
