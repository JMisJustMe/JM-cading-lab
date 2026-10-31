(()=>{'use strict';
// CP09 boundary: the exact-body source editor is the existing v0.5 House.
// The inherited v0.6 compressed catalogue expects a different catalogue DOM;
// do not execute it inside a direct editor contact. Its compressed source and
// ordinary catalogue entry behaviour remain unchanged.
if(new URLSearchParams(location.search).has('jm-edit'))return;
const b64=window.__JM_GB_V06_CORE_B64||'';if(!b64||!window.LZMA){console.error('Games&Beyond v0.6 core unavailable');return}const raw=atob(b64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));LZMA.decompress([...bytes],(value,error)=>{if(error){console.error('Games&Beyond v0.6 core BUGG',error);return}const text=typeof value==='string'?value:new TextDecoder().decode(Uint8Array.from(value));try{Function(text)();window.dispatchEvent(new Event('jm-games-beyond-legacy-catalogue-ready'))}catch(e){console.error('Games&Beyond v0.6 core execution BUGG',e)}})})();
