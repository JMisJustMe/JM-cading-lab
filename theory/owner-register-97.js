/* JM Theory Wing · owner-selected 97-record register.
 * SOURCE-ONLY: no raw/private registry bundled, no network, no storage.
 * Genuine full bodies remain in their independently protected custody.
 */
(function () {
  "use strict";
  const pick=document.getElementById("jmOwnerTheory97File");
  const search=document.getElementById("jmOwnerTheory97Search");
  const clear=document.getElementById("jmOwnerTheory97Clear");
  const status=document.getElementById("jmOwnerTheory97Status");
  const list=document.getElementById("jmOwnerTheory97Rows");
  const bookDoor=document.getElementById("jmOwnerTheory97BookDoor");
  if(!pick || !search || !clear || !status || !list || !bookDoor) return;
  let entries=[],sourcebookUrl="";
  const allowed=new Set([
    "JM.H02.Theory97.OwnerCustody/1.0",
    "JM Master Theory Register v0.3"
  ]);
  function text(tag,str,cls) {
    const n=document.createElement(tag);
    n.textContent=String(str == null ? "" : str);
    if(cls) n.className=cls;
    return n;
  }
  function assert(condition,message) {
    if(!condition) throw new Error(message);
  }
  // Only owner-provided authenticated Drive file links can open. No arbitrary
  // user-supplied URI, script, data URL, onClick code or network call is used.
  function safeDriveFileUrl(value) {
    if(typeof value!=="string" || value.length>350) return "";
    return /^https:\/\/drive\.google\.com\/file\/d\/[A-Za-z0-9_-]{12,}\/view(?:\?[A-Za-z0-9_=&-]+)?$/.test(value) ? value : "";
  }
  function sourceLink(caption,url) {
    const a=text("a",caption,"jm-theory-private-source-link");
    a.href=url;
    a.target="_blank";
    a.rel="noopener noreferrer";
    return a;
  }
  function validate(data) {
    assert(data && typeof data==="object" && !Array.isArray(data),
      "The selected file is not a theory register.");
    const owner=data.schema==="JM.H02.Theory97.OwnerCustody/1.0";
    const original=data.title==="JM Master Theory Register" && /^v0\.3/.test(data.version || "");
    assert(owner || original, "Only the original JM theory v0.3 or its verified private H02 contact overlay is accepted.");
    assert(Array.isArray(data.entries) && data.entries.length===97,
      "The file does not contain the 97 independently registered identities.");
    const ids=new Set();
    const out=data.entries.map((r,i)=>{
      assert(r && typeof r==="object" && typeof r.id==="string" && /^JM-THE-\d{3}$/.test(r.id),
        "Invalid JM theory ID at row "+(i+1));
      assert(!ids.has(r.id), "Duplicate theory identity: "+r.id);
      assert(typeof r.name==="string" && r.name.trim().length>0 && r.name.length<180,
        "Empty or invalid theory title: "+r.id);
      ids.add(r.id);
      return {
        id:r.id,name:r.name.trim(),family:String(r.family || "Unclassified"),
        type:String(r.type || "Theory register"),keeper:String(r.keeper || ""),
        contact:String(r.original_source_contact || r.source_contact_class || "REGISTER_OR_SHELF_SOURCE_ONLY"),
        recovery:String(r.source_recovery_level || ""),
        anomaly:!!r.source_card_anomaly,sourceLimit:String(r.source_limit || r.known_limits || ""),
        publication:String(r.publication_state || "UNKNOWN"),
        cp12Candidates:Array.isArray(r.cp12_archived_candidates?.files)
          ? r.cp12_archived_candidates.files.slice(0,12).map(f=>({
              name:String(f?.filename || "").slice(0,180),
              url:safeDriveFileUrl(f?.owner_drive),
              sourceClass:"EXACT_ARCHIVED_CANDIDATE_BYTES_NOT_FULL_ORIGINAL_THEORY"
            })).filter(x=>x.name && x.url)
          : []
      };
    });
    const src=out.filter(x=>x.contact==="RETRIEVAL_INDEX_SOURCE_CARD").length;
    assert(src===58 && out.length-src===39,
      "Theory source-contact census does not match the original 58/39 register.");
    assert(allowed.has(owner ? data.schema : "JM Master Theory Register v0.3"),
      "Unexpected theory schema.");
    const sourcebookUrl=owner
      ? safeDriveFileUrl(data.authority?.strict51_private_body_reading?.owner_google_drive_url)
      : "";
    return {items:out,owner,sourcebookUrl};
  }
  function render() {
    list.replaceChildren();
    bookDoor.replaceChildren();
    if(sourcebookUrl){
      bookDoor.append(sourceLink("Open existing private strict 51-seat source-union reading PDF (a separate source collection)",sourcebookUrl));
    }
    const q=search.value.trim().toLocaleLowerCase();
    const filtered=entries.filter(r=>(r.id+" "+r.name+" "+r.family+" "+r.type+" "+r.keeper)
      .toLocaleLowerCase().includes(q));
    for(const r of filtered) {
      const row=document.createElement("details");
      row.className="jm-theory-private-entry";
      const head=document.createElement("summary");
      head.append(text("strong",r.name));
      head.append(text("small"," · "+r.id+" · "+r.family,"jm-theory-private-muted"));
      row.append(head);
      const grade=r.anomaly
        ?"SOURCE MATCH HOLD · earlier retrieval pointer flagged"
        :(r.contact==="RETRIEVAL_INDEX_SOURCE_CARD"
          ?"Source card located · manuscript completeness not certified"
          :"Register/shelf contact · original source still open");
      row.append(text("p",grade,"jm-theory-private-grade"));
      if(r.keeper) row.append(text("p",r.keeper));
      if(r.sourceLimit) row.append(text("p","Known boundary: "+r.sourceLimit,
        "jm-theory-private-muted"));
      if(r.cp12Candidates.length){
        row.append(text("p","Exact archived document candidates · NOT authenticated founding full-theory bodies","jm-theory-private-grade"));
        for(const candidate of r.cp12Candidates){
          row.append(sourceLink("Open archived "+(/\.pdf$/i.test(candidate.name)?"PDF":"DOCX")+" source candidate · "+candidate.name,candidate.url));
        }
      }
      row.append(text("small",r.publication+" · Identity listed, not a claim of public full body.",
        "jm-theory-private-muted"));
      list.append(row);
    }
    status.textContent=entries.length
      ? filtered.length+" of 97 theory identities shown · 58 source cards / 39 register-shelf · separate from the 51 strict manuscript seats. No manuscripts promoted."
      : "Owner-private 97 register not loaded. Existing public 17 full bodies / 42 rooms remain independent.";
  }
  pick.addEventListener("change",async()=>{
    try {
      const file=pick.files && pick.files[0];
      if(!file) return;
      assert(file.size>0 && file.size<=2000000,
        "Expected a bounded JSON register (maximum 2 MB).");
      const parsed=JSON.parse(await file.text());
      const ready=validate(parsed);
      entries=ready.items;
      sourcebookUrl=ready.sourcebookUrl;
      search.disabled=false;
      clear.disabled=false;
      search.value="";
      render();
      const warning=ready.owner
        ?" 32 historical source-match anomalies remain marked as HOLD in their individual cards."
        :" This uncorrected original register has a separate 32-match source audit. Do not treat old source-card pointers as proven manuscript links.";
      status.textContent+=" "+warning;
    } catch(e) {
      entries=[];
      sourcebookUrl="";
      bookDoor.replaceChildren();
      search.disabled=true;
      clear.disabled=true;
      list.replaceChildren();
      status.textContent="HOLD · "+String(e.message || "Invalid owner register")+
        " · No data accepted or saved.";
    } finally { pick.value=""; }
  });
  search.addEventListener("input",render);
  clear.addEventListener("click",()=>{
    entries=[];
    sourcebookUrl="";
    search.value="";
    search.disabled=true;
    clear.disabled=true;
    render();
  });
  render();
})();
